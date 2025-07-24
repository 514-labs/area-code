from moose_lib import MaterializedView, MaterializedViewOptions, ClickHouseEngines, AggregateFunction
from pydantic import BaseModel
from typing import Annotated
from app.ingest.models import eventModel

# Target schema for daily page views aggregation
class DailyPageViewsSchema(BaseModel):
    view_date: str  # YYYY-MM-DD format
    total_pageviews: Annotated[int, AggregateFunction(agg_func="sum", param_types=[int])]
    unique_visitors: Annotated[int, AggregateFunction(agg_func="uniq", param_types=[str])]

# SQL query using State functions
# Aggregates pageview events by date, counting total views and unique visitors
query = f"""
  SELECT 
    toString(toDate(timestamp)) as view_date,
    sumState(toInt64(1)) as total_pageviews,
    uniqState(distinct_id) as unique_visitors
  FROM {eventModel.get_table().name}
  WHERE event_name = 'pageview'
  GROUP BY toString(toDate(timestamp))
"""

# Materialized view definition
daily_pageviews_mv = MaterializedView[DailyPageViewsSchema](
    MaterializedViewOptions(
        select_statement=query,
        table_name="daily_pageviews_table",
        materialized_view_name="daily_pageviews_mv",
        select_tables=[eventModel.get_table()],
        engine=ClickHouseEngines.AggregatingMergeTree,
        order_by_fields=["view_date"]
    )
) 