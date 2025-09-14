from moose_lib import Api
from typing import Optional, List
from pydantic import BaseModel
from app.external_models import foo_model
import time
from datetime import datetime, timedelta


class GetFooCubeAggregationsParams(BaseModel):
    months: Optional[int] = 6
    status: Optional[str] = None
    tag: Optional[str] = None
    priority: Optional[int] = None
    limit: Optional[int] = 20
    offset: Optional[int] = 0
    sort_by: Optional[str] = None
    sort_order: Optional[str] = "ASC"


class FooCubeAggregationRow(BaseModel):
    month: Optional[str] = None
    status: Optional[str] = None
    tag: Optional[str] = None
    priority: Optional[int] = None
    n: int
    avgScore: float
    p50: float
    p90: float


class GetFooCubeAggregationsResponse(BaseModel):
    data: List[FooCubeAggregationRow]
    queryTime: int
    pagination: dict


def foo_cube_aggregations_api_handler(
    context,
    params: GetFooCubeAggregationsParams
) -> GetFooCubeAggregationsResponse:
    """
    Cube aggregations API for foo data with monthly grouping and statistical analysis
    """
    start_time = time.time()

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=max(1, min(params.months, 36)) * 30)

    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")

    # Build optional WHERE fragments
    where_clauses = [
        f"toDate(created_at) >= toDate('{start_date_str}')",
        f"toDate(created_at) <= toDate('{end_date_str}')",
        "score IS NOT NULL"
    ]

    if params.status:
        where_clauses.append(f"status = '{params.status}'")

    if params.priority is not None:
        where_clauses.append(f"priority = {params.priority}")

    limited = max(1, min(params.limit, 200))
    paged_offset = max(0, params.offset)

    # Map sort column safely
    sort_column = {
        "month": "month",
        "status": "status",
        "tag": "tag",
        "priority": "priority",
        "n": "n",
        "avgScore": "avgScore",
        "avg_score": "avgScore",
        "p50": "p50",
        "p90": "p90"
    }.get(params.sort_by, "month, status, tag, priority")

    sort_dir = "DESC" if params.sort_order.upper() == "DESC" else "ASC"

    # Build the main query
    where_clause = " AND ".join(where_clauses)
    having_clause = f"HAVING tag = '{params.tag}'" if params.tag else ""

    query = f"""
        SELECT
            formatDateTime(toStartOfMonth(created_at), '%Y-%m-01') AS month,
            status,
            arrayJoin(tags) AS tag,
            priority,
            count() AS n,
            avg(score) AS avgScore,
            quantileTDigest(0.5)(toFloat64(score)) AS p50,
            quantileTDigest(0.9)(toFloat64(score)) AS p90,
            COUNT() OVER() AS total
        FROM foo
        WHERE {where_clause}
        GROUP BY month, status, tag, priority
        {having_clause}
        ORDER BY {sort_column} {sort_dir}
        LIMIT {limited} OFFSET {paged_offset}
    """

    results = context.query(query, {})

    query_time = int((time.time() - start_time) * 1000)
    total = results[0]["total"] if results else 0

    # Convert results to response format
    data = [
        FooCubeAggregationRow(
            month=row["month"],
            status=row["status"],
            tag=row["tag"],
            priority=int(row["priority"]) if row["priority"] is not None else None,
            n=int(row["n"]),
            avgScore=float(row["avgScore"]),
            p50=float(row["p50"]),
            p90=float(row["p90"])
        )
        for row in results
    ]

    return GetFooCubeAggregationsResponse(
        data=data,
        queryTime=query_time,
        pagination={
            "limit": limited,
            "offset": paged_offset,
            "total": total
        }
    )


# Create the API instance
foo_cube_aggregations_api = Api[GetFooCubeAggregationsParams, GetFooCubeAggregationsResponse](
    name="foo-cube-aggregations",
    query_function=foo_cube_aggregations_api_handler
)