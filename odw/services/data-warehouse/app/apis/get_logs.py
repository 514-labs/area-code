from moose_lib import ConsumptionApi, EgressConfig
from app.ingest.models import Log
from pydantic import BaseModel
from typing import List, Optional

# An API to get a list of Logs from the data warehouse.
# For more information on consumption apis, see: https://docs.fiveonefour.com/moose/building/consumption-apis.

# Define the query params
class GetLogsQuery(BaseModel):
    limit: Optional[int] = None
    offset: int = 0

# Define the response model
class GetLogsResponse(BaseModel):
    items: List[Log] = []
    total: int = 0

# Define the query function
def get_logs(client, params: GetLogsQuery) -> GetLogsResponse:
    """
    Retrieve Log records with pagination.

    Args:
        client: Database client for executing queries
        params: Contains pagination parameters

    Returns:
        GetLogsResponse object containing Log items and count
    """

    query = """
        SELECT
            id,
            timestamp,
            level,
            message,
            source,
            trace_id,
            transform_timestamp
        FROM Log
        ORDER BY transform_timestamp DESC
    """

    query_params = {}
    
    # Only add LIMIT if specified
    if params.limit is not None:
        query += " LIMIT {limit}"
        query_params["limit"] = params.limit
    
    # Only add OFFSET if limit is specified and offset > 0
    if params.limit is not None and params.offset > 0:
        query += " OFFSET {offset}"
        query_params["offset"] = params.offset

    # Execute query
    result = client.query.execute(query, query_params)

    # Convert results to Log objects
    items = [Log(**item) for item in result]

    # Return the response
    return GetLogsResponse(
        items=items,
        total=len(items)
    )

# Create the consumption API
get_logs_api = ConsumptionApi[GetLogsQuery, GetLogsResponse](
    "getLogs",
    query_function=get_logs,
    source="Log",
    config=EgressConfig()
) 