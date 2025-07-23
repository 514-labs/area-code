from moose_lib import ConsumptionApi, EgressConfig
from app.ingest.models import Log, LogStatus
from pydantic import BaseModel
from typing import List, Optional

# An API to get a list of Logs from the data warehouse.
# For more information on consumption apis, see: https://docs.fiveonefour.com/moose/building/consumption-apis.

# Define the query params
class GetLogsQuery(BaseModel):
    status: Optional[str] = None
    limit: int = 1000
    offset: int = 0
    tag: Optional[str] = None

# Define the response model
class GetLogsResponse(BaseModel):
    items: List[Log] = []
    total: int = 0

# Define the query function
def get_logs(client, params: GetLogsQuery) -> GetLogsResponse:
    """
    Retrieve Log records with optional filtering and pagination.

    Args:
        client: Database client for executing queries
        params: Contains status filter and pagination parameters

    Returns:
        GetLogsResponse object containing Log items and total count
    """

    # Build the query with parameters
    query = """
        SELECT id, name, description, status, priority, is_active, tags, score, large_text, transform_timestamp
        FROM Log
        WHERE 1=1
    """

    query_params = {}

    # Add status filter if provided
    if params.status is not None:
        # Validate that the status is a valid enum value
        try:
            LogStatus(params.status)  # This will raise ValueError if invalid
            query += " AND status = {status}"
            query_params["status"] = params.status
        except ValueError:
            # If invalid status, return empty result
            return GetLogsResponse(items=[], total=0)

    # Add tag filter if provided and not 'All'
    if params.tag is not None and params.tag != "All":
        # Use ClickHouse has() function to filter by tag
        query += f" AND has(tags, '{params.tag}')"

    # Add pagination to the main query
    query += " LIMIT {limit} OFFSET {offset}"
    query_params["limit"] = params.limit
    query_params["offset"] = params.offset

    # Execute main query
    print("Final SQL query:", query)
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