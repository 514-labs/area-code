# from moose_lib import ConsumptionApi
# from pydantic import BaseModel
# from typing import Optional

# class GetEventAnalyticsQueryParams(BaseModel):
#     hours: Optional[int] = 24  # Time window in hours

# def get_event_analytics(client, params: GetEventAnalyticsQueryParams):
#     # Event counts by type
#     event_counts_query = f"""
#     SELECT event_name, count() as count 
#     FROM Event 
#     WHERE timestamp >= now() - INTERVAL {params.hours} HOUR
#     GROUP BY event_name 
#     ORDER BY count DESC
#     """
    
#     # User activity metrics  
#     user_metrics_query = f"""
#     SELECT 
#         uniq(distinct_id) as unique_users,
#         uniq(session_id) as unique_sessions,
#         count() as total_events
#     FROM Event 
#     WHERE timestamp >= now() - INTERVAL {params.hours} HOUR
#     """
    
#     # Project breakdown
#     project_breakdown_query = f"""
#     SELECT project_id, count() as events
#     FROM Event 
#     WHERE timestamp >= now() - INTERVAL {params.hours} HOUR  
#     GROUP BY project_id
#     ORDER BY events DESC
#     """
    
#     event_counts = client.execute(event_counts_query)
#     user_metrics = client.execute(user_metrics_query)
#     project_breakdown = client.execute(project_breakdown_query)
    
#     return {
#         "event_counts": [{"event_name": row[0], "count": row[1]} for row in event_counts],
#         "user_metrics": {
#             "unique_users": user_metrics[0][0] if user_metrics else 0,
#             "unique_sessions": user_metrics[0][1] if user_metrics else 0,
#             "total_events": user_metrics[0][2] if user_metrics else 0
#         } if user_metrics else {},
#         "project_breakdown": [{"project_id": row[0], "events": row[1]} for row in project_breakdown]
#     }

# get_event_analytics_api = ConsumptionApi[GetEventAnalyticsQueryParams, dict](
#     "getEventAnalytics",
#     query_function=get_event_analytics
# ) 