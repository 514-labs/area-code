from moose_lib import ConsumptionApi, EgressConfig
from app.ingest.models import Blob
from pydantic import BaseModel
from typing import List

# An API to get a list of Blobs from the data warehouse.
# For more information on consumption apis, see: https://docs.fiveonefour.com/moose/building/consumption-apis.

# Define the query params
class GetBlobsQuery(BaseModel):
    limit: int = 1000
    offset: int = 0

# Define the response model
class GetBlobsResponse(BaseModel):
    items: List[Blob] = []
    total: int = 0

# Define the query function
def get_blobs(client, params: GetBlobsQuery) -> GetBlobsResponse:
    """
    Retrieve Blob records with pagination.
    
    Args:
        client: Database client for executing queries
        params: Contains pagination parameters
        
    Returns:
        GetBlobsResponse object containing Blob items and count
    """
    
    query = """
        SELECT
            id,
            bucket_name,
            file_path,
            file_name,
            file_size,
            permissions,
            content_type,
            ingested_at,
            transform_timestamp
        FROM Blob
        ORDER BY transform_timestamp DESC
        LIMIT {limit} OFFSET {offset}
    """
    
    query_params = {
        "limit": params.limit,
        "offset": params.offset
    }
    
    # Execute query
    result = client.query.execute(query, query_params)
    
    # Convert results to Blob objects
    items = [Blob(**item) for item in result]
    
    # Return the response
    return GetBlobsResponse(
        items=items,
        total=len(items)
    )

# Create the consumption API
get_blobs_api = ConsumptionApi[GetBlobsQuery, GetBlobsResponse](
    "getBlobs",
    query_function=get_blobs,
    source="Blob",
    config=EgressConfig()
)