from moose_lib import ConsumptionApi, EgressConfig
from app.ingest.models import Foo, FooStatus
from pydantic import BaseModel
from typing import List, Optional

# Define the query parameters model
class GetFoosQuery(BaseModel):
    status: Optional[str] = None  # Changed from FooStatus to str
    limit: int = 100
    offset: int = 0
    tag: Optional[str] = None  # New: filter by tag

# Define the response model
class GetFoosResponse(BaseModel):
    items: List[Foo] = []
    total: int = 0

# Define the query function
def get_foos(client, params: GetFoosQuery) -> GetFoosResponse:
    """
    Retrieve Foo records with optional filtering and pagination.
    
    Args:
        client: Database client for executing queries
        params: Contains status filter and pagination parameters
        
    Returns:
        GetFoosResponse object containing Foo items and total count
    """
    
    # Build the query with parameters
    query = """
        SELECT id, name, description, status, priority, is_active, tags, score, large_text 
        FROM Foo
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
            return GetFoosResponse(items=[], total=0)

    # Add tag filter if provided and not 'All'
    if params.tag is not None and params.tag != "All":
        # ClickHouse array filter
        query += " AND has(tags, {tag})"
        query_params["tag"] = params.tag

    # Add count query to get total records
    count_query = query.replace("SELECT id, name, description, status, priority, is_active, tags, score, large_text", "SELECT COUNT(*) as total_count")
    
    # Add pagination to the main query
    query += " LIMIT {limit} OFFSET {offset}"
    query_params["limit"] = params.limit
    query_params["offset"] = params.offset
    
    # Execute count query
    count_result = client.query.execute(count_query, query_params)
    total = 0
    if count_result and len(count_result) > 0:
        # Try different possible column names for the count
        first_row = count_result[0]
        if 'total_count' in first_row:
            total = first_row['total_count']
        elif 'count()' in first_row:
            total = first_row['count()']
        elif len(first_row) > 0:
            # Get the first value if column name is unknown
            total = list(first_row.values())[0]
    
    # Execute main query
    result = client.query.execute(query, query_params)
    
    # Convert results to Foo objects
    items = [Foo(**item) for item in result]
    
    # Return the response
    return GetFoosResponse(
        items=items,
        total=total
    )

# Create the consumption API
get_foos_api = ConsumptionApi[GetFoosQuery, GetFoosResponse](
    "getFoos",
    query_function=get_foos,
    source="Foo",
    config=EgressConfig()
)