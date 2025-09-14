from moose_lib import Api, MooseClient
from typing import Optional, List
from pydantic import BaseModel
from app.external_models import bar, bar_table
import time
from datetime import datetime, timezone

class GetBarsParams(BaseModel):
    limit: Optional[int] = 10
    offset: Optional[int] = 0
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = "DESC"

class PaginationInfo(BaseModel):
    limit: int
    offset: int
    total: int
    hasMore: bool


class GetBarsResponse(BaseModel):
    data: List[bar]
    pagination: PaginationInfo
    queryTime: int


def bar_consumption_api_handler(client: MooseClient, params: GetBarsParams) -> GetBarsResponse:
    """
    Consumption API for bar data following Moose documentation pattern
    """
    # Convert sort_order to uppercase for consistency
    upper_sort_order = params.sort_order.upper()

    # Get total count
    count_query = f"SELECT count() as total FROM {bar_table.name}"
    count_result = client.query(count_query, {})
    total_count = count_result[0]["total"] if count_result else 0

    start_time = time.time()

    # Build dynamic query including CDC fields
    query = f"""
        SELECT *
        FROM {bar_table.name}
        ORDER BY {params.sort_by} {upper_sort_order}
        LIMIT {params.limit}
        OFFSET {params.offset}
    """
    # Run the query
    results = client.query(query, {})

    # Calculate query time
    query_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds

    # Create pagination metadata
    has_more = params.offset + len(results) < total_count

    return GetBarsResponse(
        data=results,
        pagination=PaginationInfo(
            limit=params.limit,
            offset=params.offset,
            total=total_count,
            hasMore=has_more
        ),
        queryTime=query_time
    )


# Create the API instance
bar_consumption_api = Api[GetBarsParams, GetBarsResponse](
    name="bar",
    query_function=bar_consumption_api_handler
)