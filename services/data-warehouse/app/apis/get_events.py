from moose_lib import ConsumptionApi, EgressConfig
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class EventResponse(BaseModel):
    id: str
    event_name: str
    timestamp: str
    distinct_id: str
    session_id: Optional[str]
    project_id: str
    properties: Optional[str]  # JSON string
    ip_address: Optional[str]
    user_agent: Optional[str]
    ingested_at: str
    transform_timestamp: Optional[str] = None

class GetEventsResponse(BaseModel):
    items: List[EventResponse] = []
    total: int = 0
class GetEventsQueryParams(BaseModel):
    limit: Optional[int] = 100
    offset: Optional[int] = 0
    tag: Optional[str] = None
    event_name: Optional[str] = None
    project_id: Optional[str] = None
    distinct_id: Optional[str] = None

def get_events(client, params: GetEventsQueryParams):
    query = """
        SELECT
            id,
            event_name,
            timestamp,
            distinct_id,
            session_id,
            project_id,
            properties,
            ip_address,
            user_agent,
            ingested_at,
            transform_timestamp
        FROM Event
        WHERE 1=1
    """
    
    query_params = {}
    
    # Add filtering conditions
    if params.event_name:
        query += " AND event_name = {event_name}"
        query_params["event_name"] = params.event_name
        
    if params.project_id:
        query += " AND project_id = {project_id}"
        query_params["project_id"] = params.project_id
        
    if params.distinct_id:
        query += " AND distinct_id = {distinct_id}"
        query_params["distinct_id"] = params.distinct_id
    
    query += " ORDER BY timestamp DESC LIMIT {limit} OFFSET {offset}"
    query_params["limit"] = params.limit
    query_params["offset"] = params.offset
    
    result = client.query.execute(query, query_params)
    
    # Convert results to EventResponse objects
    items = [EventResponse(**item) for item in result]
    
    return GetEventsResponse(
        items=items,
        total=len(items)
    )

get_events_api = ConsumptionApi[GetEventsQueryParams, GetEventsResponse](
    "getEvents",
    query_function=get_events,
    source="Event",
    config=EgressConfig()
) 