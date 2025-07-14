from moose_lib import ConsumptionApi, EgressConfig
from app.ingest.models import Bar, Foo, FooStatus
from pydantic import BaseModel
from typing import List, Optional

class GetBarsQuery(BaseModel):
    status: Optional[str] = None
    limit: int = 100
    offset: int = 0
    tag: Optional[str] = None

class GetBarsResponse(BaseModel):
    items: List[Bar] = []
    total: int = 0

def get_bars(client, params: GetBarsQuery) -> GetBarsResponse:
    query = """
        SELECT id, name, description, status, priority, is_active, tags, score, large_text, transform_timestamp
        FROM Bar
        WHERE 1=1
    """

    query_params = {}

    # Add status filter if provided
    if params.status is not None:
        # Validate that the status is a valid enum value
        try:
            FooStatus(params.status)  # This will raise ValueError if invalid
            query += " AND status = {status}"
            query_params["status"] = params.status
        except ValueError:
            # If invalid status, return empty result
            return GetBarsResponse(items=[], total=0)

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

    # Convert results to Bar objects
    items = [Bar(**item) for item in result]

    # Return the response
    return GetBarsResponse(
        items=items,
        total=len(items)
    )

# Create the consumption API
get_bars_api = ConsumptionApi[GetBarsQuery, GetBarsResponse](
    "getBars",
    query_function=get_bars,
    source="Bar",
    config=EgressConfig()
)