from moose_lib import Api
from typing import Optional, List
from pydantic import BaseModel
from app.external_models import foo, foo_model
import time
from datetime import datetime, timezone


def safe_datetime_convert(value) -> str:
    """
    Safely convert a value to JavaScript-compatible ISO datetime string.
    Handles various input formats from ClickHouse.
    """
    if value is None or value == "":
        return "1970-01-01T00:00:00.000Z"  # Return epoch time for null/empty values
    
    if isinstance(value, datetime):
        # Ensure timezone info and return ISO format with Z suffix
        if value.tzinfo is None:
            # Assume UTC if no timezone info
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat().replace('+00:00', 'Z')
    
    if isinstance(value, str):
        # Try to parse and reformat the string
        try:
            # Try ISO format first
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat().replace('+00:00', 'Z')
        except ValueError:
            # Try other common formats
            try:
                dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
                dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat().replace('+00:00', 'Z')
            except ValueError:
                try:
                    dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S.%f')
                    dt = dt.replace(tzinfo=timezone.utc)
                    return dt.isoformat().replace('+00:00', 'Z')
                except ValueError:
                    # Last resort - return current time in ISO format
                    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    
    # If it's some other type, try to convert to string first
    try:
        dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat().replace('+00:00', 'Z')
    except (ValueError, TypeError):
        # Final fallback - return epoch time
        return "1970-01-01T00:00:00.000Z"


class GetFoosParams(BaseModel):
    limit: Optional[int] = 10
    offset: Optional[int] = 0
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = "DESC"


class FooWithCDCForConsumption(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    priority: int
    is_active: bool
    metadata: Optional[str] = None
    tags: List[str]
    score: Optional[float] = None
    large_text: Optional[str] = None
    created_at: str
    updated_at: str
    _peerdb_synced_at: str
    _peerdb_is_deleted: int
    _peerdb_version: int


class PaginationInfo(BaseModel):
    limit: int
    offset: int
    total: int
    hasMore: bool


class GetFoosResponse(BaseModel):
    data: List[FooWithCDCForConsumption]
    pagination: PaginationInfo
    queryTime: int


def foo_consumption_api_handler(context, params: GetFoosParams) -> GetFoosResponse:
    """
    Consumption API for foo data following Moose documentation pattern
    """
    # Convert sort_order to uppercase for consistency
    upper_sort_order = params.sort_order.upper()

    # Get total count
    count_query = f"SELECT count() as total FROM foo"
    count_result = context.query(count_query, {})
    total_count = count_result[0]["total"] if count_result else 0

    start_time = time.time()

    # Build dynamic query including CDC fields
    query = f"""
        SELECT *
        FROM foo
        ORDER BY {params.sort_by} {upper_sort_order}
        LIMIT {params.limit}
        OFFSET {params.offset}
    """

    results = context.query(query, {})

    query_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds

    # Create pagination metadata (matching transactional API format)
    has_more = params.offset + len(results) < total_count

    # Convert results to response format
    data = [
        FooWithCDCForConsumption(
            id=str(row["id"]),
            name=row["name"],
            description=row.get("description"),
            status=str(row["status"]),  # Convert status to string for consumption
            priority=row["priority"],
            is_active=row["is_active"],
            metadata=row.get("metadata"),
            tags=row["tags"] or [],
            score=float(row["score"]) if row.get("score") is not None else None,
            large_text=row.get("large_text"),
            created_at=safe_datetime_convert(row["created_at"]),
            updated_at=safe_datetime_convert(row["updated_at"]),
            _peerdb_synced_at=safe_datetime_convert(row["_peerdb_synced_at"]),
            _peerdb_is_deleted=row["_peerdb_is_deleted"],
            _peerdb_version=row["_peerdb_version"]
        )
        for row in results
    ]

    return GetFoosResponse(
        data=data,
        pagination=PaginationInfo(
            limit=params.limit,
            offset=params.offset,
            total=total_count,
            hasMore=has_more
        ),
        queryTime=query_time
    )

# Create the API instance
foo_consumption_api = Api[GetFoosParams, GetFoosResponse](
    name="foo",
    query_function=foo_consumption_api_handler
)