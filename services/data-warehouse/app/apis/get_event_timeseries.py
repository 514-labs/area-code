# from moose_lib import ConsumptionApi
# from app.ingest.models import Event
# from pydantic import BaseModel
# from typing import Optional, List

# class GetEventTimeseriesResponse(BaseModel):
#     items: List[Event] = []
#     total: int = 0
# class GetEventTimeseriesQueryParams(BaseModel):
#     days: Optional[int] = 7  # Time window in days
#     granularity: Optional[str] = "hour"  # hour, day

# def get_event_timeseries(client, params: GetEventTimeseriesQueryParams):
#     # Choose the appropriate time function based on granularity
#     if params.granularity == "day":
#         time_func = "toStartOfDay"
#         interval = f"{params.days} DAY"
#     else:  # default to hour
#         time_func = "toStartOfHour"
#         interval = f"{params.days} DAY"
    
#     query = f"""
#     SELECT 
#         {time_func}(timestamp) as time_bucket,
#         event_name,
#         count() as events
#     FROM Event 
#     WHERE timestamp >= now() - INTERVAL {interval}
#     GROUP BY time_bucket, event_name
#     ORDER BY time_bucket DESC, events DESC
#     """
    
#     result = client.execute(query)
    
#     # Format the response
#     timeseries_data = []
#     for row in result:
#         timeseries_data.append({
#             "time": row[0].strftime('%Y-%m-%d %H:%M:%S') if hasattr(row[0], 'strftime') else str(row[0]),
#             "event_name": row[1],
#             "events": row[2]
#         })
    
#     return {"timeseries": timeseries_data}

# get_event_timeseries_api = ConsumptionApi[GetEventTimeseriesQueryParams, dict](
#     "getEventTimeseries",
#     query_function=get_event_timeseries
# ) 