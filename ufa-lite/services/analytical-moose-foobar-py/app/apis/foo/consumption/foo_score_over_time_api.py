from moose_lib import Api
from typing import Optional, List
from pydantic import BaseModel
import time
from datetime import datetime, timedelta


class FoosScoreOverTimeDataPoint(BaseModel):
    date: str
    averageScore: float
    totalCount: int


class GetFoosScoreOverTimeParams(BaseModel):
    days: Optional[int] = 90


class GetFoosScoreOverTimeResponse(BaseModel):
    data: List[FoosScoreOverTimeDataPoint]
    queryTime: int


def foo_score_over_time_api_handler(
    context,
    params: GetFoosScoreOverTimeParams
) -> GetFoosScoreOverTimeResponse:
    """
    Score over time consumption API for foo data
    """
    # Calculate date range
    start_date = datetime.now() - timedelta(days=params.days)
    end_date = datetime.now()

    # Format dates for SQL
    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")

    # Query to get daily score aggregations
    query = f"""
        SELECT 
            formatDateTime(toDate(created_at), '%Y-%m-%d') as date,
            AVG(score) as averageScore,
            COUNT(*) as totalCount
        FROM foo
        WHERE toDate(created_at) >= toDate('{start_date_str}')
          AND toDate(created_at) <= toDate('{end_date_str}')
          AND score IS NOT NULL
        GROUP BY toDate(created_at)
        ORDER BY toDate(created_at) ASC
    """

    start_time = time.time()

    results = context.query(query, {})

    query_time = int((time.time() - start_time) * 1000)

    # Convert results to response format
    data = [
        FoosScoreOverTimeDataPoint(
            date=str(row["date"]),  # Date is already formatted as YYYY-MM-DD string
            averageScore=round(float(row["averageScore"]), 2),  # Round to 2 decimal places
            totalCount=int(row["totalCount"])
        )
        for row in results
    ]

    return GetFoosScoreOverTimeResponse(
        data=data,
        queryTime=query_time
    )


# Create the API instance
foo_score_over_time_api = Api[GetFoosScoreOverTimeParams, GetFoosScoreOverTimeResponse](
    name="foo-score-over-time",
    query_function=foo_score_over_time_api_handler
)