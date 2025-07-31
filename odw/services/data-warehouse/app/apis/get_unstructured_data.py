from moose_lib import ConsumptionApi, EgressConfig
from app.ingest.models import UnstructuredData
from pydantic import BaseModel
from typing import List, Optional

# An API to get a list of UnstructuredData records from the data warehouse.
# This is used by Stage 2 of the workflow to query staging records for processing.

# Define the query params
class GetUnstructuredDataQuery(BaseModel):
    limit: Optional[int] = None
    offset: int = 0
    source_file_path: Optional[str] = None  # Filter by source file path

# Define the response model
class GetUnstructuredDataResponse(BaseModel):
    items: List[UnstructuredData] = []
    total: int = 0

# Define the query function
def get_unstructured_data(client, params: GetUnstructuredDataQuery) -> GetUnstructuredDataResponse:
    """
    Retrieve UnstructuredData records with pagination and optional filtering.
    
    Args:
        client: Database client for executing queries
        params: Contains pagination parameters and optional filters
        
    Returns:
        GetUnstructuredDataResponse object containing UnstructuredData items and count
    """
    
    query = """
        SELECT
            id,
            source_file_path,
            extracted_data_json,
            processed_at,
            processing_instructions,
            transform_timestamp
        FROM UnstructuredData
    """
    
    query_params = {}
    where_clauses = []
    
    # Add source file path filter if specified
    if params.source_file_path is not None:
        where_clauses.append("source_file_path LIKE {source_file_path}")
        query_params["source_file_path"] = f"%{params.source_file_path}%"
    
    # Add WHERE clause if any filters are specified
    if where_clauses:
        query += " WHERE " + " AND ".join(where_clauses)
    
    query += " ORDER BY transform_timestamp DESC"
    
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
    
    # Convert results to UnstructuredData objects
    items = [UnstructuredData(**item) for item in result]
    
    # Return the response
    return GetUnstructuredDataResponse(
        items=items,
        total=len(items)
    )

# Create the consumption API
get_unstructured_data_api = ConsumptionApi[GetUnstructuredDataQuery, GetUnstructuredDataResponse](
    "getUnstructuredData",
    query_function=get_unstructured_data,
    source="UnstructuredData",
    config=EgressConfig()
)