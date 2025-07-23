# from moose_lib import ConsumptionApi
# from pydantic import BaseModel
# from typing import Optional

# class GetUserJourneyQueryParams(BaseModel):
#     distinct_id: str
#     limit: Optional[int] = 50

# def get_user_journey(client, params: GetUserJourneyQueryParams):
#     query = """
#     SELECT 
#         event_name,
#         timestamp,
#         session_id,
#         project_id,
#         properties,
#         ip_address,
#         user_agent
#     FROM Event 
#     WHERE distinct_id = %(distinct_id)s
#     ORDER BY timestamp DESC
#     LIMIT %(limit)s
#     """
    
#     result = client.execute(query, {
#         "distinct_id": params.distinct_id,
#         "limit": params.limit
#     })
    
#     # Format the journey data
#     journey_data = []
#     for row in result:
#         journey_data.append({
#             "event_name": row[0],
#             "timestamp": row[1],
#             "session_id": row[2],
#             "project_id": row[3],
#             "properties": row[4],
#             "ip_address": row[5],
#             "user_agent": row[6]
#         })
    
#     return {"journey": journey_data}

# get_user_journey_api = ConsumptionApi[GetUserJourneyQueryParams, dict](
#     "getUserJourney",
#     query_function=get_user_journey
# ) 