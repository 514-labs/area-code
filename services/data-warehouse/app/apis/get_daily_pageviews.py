from app.views.daily_pageviews import daily_pageviews_mv
from moose_lib import ConsumptionApi, EgressConfig
from pydantic import BaseModel
from typing import Optional, List

# Response model for daily page views API
class DailyPageViewsItem(BaseModel):
    view_date: str
    total_pageviews: int
    unique_visitors: int

class GetDailyPageViewsResponse(BaseModel):
    items: List[DailyPageViewsItem] = []
    total: int = 0

class GetDailyPageViewsQueryParams(BaseModel):
    limit: Optional[int] = 14  # Default to last 14 days
    days_back: Optional[int] = 14  # How many days back to fetch

def get_daily_pageviews(client, params: GetDailyPageViewsQueryParams):
    # Using Merge functions to query aggregated data as per Moose documentation
    query = """
    SELECT 
        view_date,
        sumMerge(total_pageviews) as total_pageviews,
        uniqMerge(unique_visitors) as unique_visitors
    FROM daily_pageviews_table
    WHERE view_date >= toString(today() - {days_back})
    GROUP BY view_date
    ORDER BY view_date DESC
    LIMIT {limit}
    """
    
    query_params = {
        "days_back": params.days_back,
        "limit": params.limit
    }
    
    result = client.query.execute(query, query_params)
    
    # Convert results to DailyPageViewsItem objects
    items = [DailyPageViewsItem(**item) for item in result]
    
    return GetDailyPageViewsResponse(
        items=items,
        total=len(items)
    )

# Consumption API definition following Moose patterns
get_daily_pageviews_api = ConsumptionApi[GetDailyPageViewsQueryParams, GetDailyPageViewsResponse](
    "getDailyPageViews",
    query_function=get_daily_pageviews,
    source="daily_pageviews_table",
    config=EgressConfig()
) 