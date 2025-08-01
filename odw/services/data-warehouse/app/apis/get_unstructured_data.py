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
        GetUnstructuredDataResponse object containing UnstructuredData items and total count
    """
    
    # Build WHERE clause and params (shared between count and data queries)
    query_params = {}
    where_clauses = []
    
    # Add source file path filter if specified
    if params.source_file_path is not None:
        where_clauses.append("source_file_path LIKE {source_file_path}")
        query_params["source_file_path"] = f"%{params.source_file_path}%"
    
    # Build WHERE clause
    where_clause = ""
    if where_clauses:
        where_clause = " WHERE " + " AND ".join(where_clauses)
    
    # First, get the total count of records (without LIMIT/OFFSET)
    count_query = f"SELECT COUNT(*) as total FROM UnstructuredData{where_clause}"
    count_result = client.query.execute(count_query, query_params)
    total_count = count_result[0]["total"] if count_result else 0
    
    # Then, get the actual data with pagination
    data_query = f"""
        SELECT
            id,
            source_file_path,
            extracted_data,
            processed_at,
            processing_instructions,
            transform_timestamp
        FROM UnstructuredData{where_clause}
        ORDER BY transform_timestamp DESC
    """
    
    # Add pagination to data query
    data_params = query_params.copy()
    if params.limit is not None:
        data_query += " LIMIT {limit}"
        data_params["limit"] = params.limit
        
        # Only add OFFSET if limit is specified and offset > 0
        if params.offset > 0:
            data_query += " OFFSET {offset}"
            data_params["offset"] = params.offset
    
    # Execute data query
    result = client.query.execute(data_query, data_params)
    
    # Convert results to UnstructuredData objects
    items = [UnstructuredData(**item) for item in result]
    
    # Return the response with actual total count from database
    return GetUnstructuredDataResponse(
        items=items,
        total=total_count
    )

# Create the consumption API
get_unstructured_data_api = ConsumptionApi[GetUnstructuredDataQuery, GetUnstructuredDataResponse](
    "getUnstructuredData",
    query_function=get_unstructured_data,
    source="UnstructuredData",
    config=EgressConfig()
)