from moose_lib import ConsumptionApi
from app.ingest.models import Foo, FooStatus
from typing import Optional
from pydantic import BaseModel

# An API to get a Foo from the data warehouse.

class FooQueryParams(BaseModel):
    status: Optional[str] = None
    is_active: Optional[bool] = None
    limit: Optional[int] = 1000
    offset: Optional[int] = 0

# Define the query function
def get_foo(client, params: FooQueryParams):
    """
    Retrieve Foo records with optional filtering and pagination.
    """
    # Build the query with parameters
    query = """
        SELECT 
            id, 
            name, 
            description, 
            status, 
            priority, 
            is_active, 
            tags, 
            score, 
            large_text 
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
            return []
    
    # Add is_active filter if provided
    if params.is_active is not None:
        query += " AND is_active = {is_active}"
        query_params["is_active"] = params.is_active
    
    # Add pagination
    query += " ORDER BY priority DESC, score DESC LIMIT {limit} OFFSET {offset}"
    query_params["limit"] = params.limit
    query_params["offset"] = params.offset
    
    # Execute query
    result = client.query.execute(query, query_params)
    
    # Convert results to Foo objects
    items = [Foo(**item) for item in result]
    
    return items

get_foo = ConsumptionApi[FooQueryParams, Foo](
    "getFoos",
    query_function=get_foo
)