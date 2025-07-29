from moose_lib import ConsumptionApi, EgressConfig
from app.ingest.models import UnstructuredDataSource
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.unstructured_data_connector import UnstructuredDataConnectorConfig
from pydantic import BaseModel
from typing import List, Optional

# An API to submit unstructured data for extraction and processing.
# This allows users to submit processed unstructured data that will be picked up
# by the extraction workflow.
#
# The source_file_path now supports both local filesystem paths and S3 paths:
# - Local paths: /path/to/file.txt
# - S3 paths: s3://bucket/key or minio://bucket/key

# Extract API models (similar to other extract APIs)
class ExtractUnstructuredDataQueryParams(BaseModel):
  batch_size: Optional[int] = 100
  fail_percentage: Optional[int] = 0

class ExtractUnstructuredDataResponse(BaseModel):
  success: bool
  body: str

def extract_unstructured_data(client, params: ExtractUnstructuredDataQueryParams):
  return client.workflow.execute("unstructured-data-workflow", params)

# Define the input model for submitting unstructured data
class SubmitUnstructuredDataRequest(BaseModel):
    source_file_path: str  # Local path, s3://bucket/key, or minio://bucket/key
    extracted_data_json: Optional[str] = None
    processing_instructions: Optional[str] = None

# Define the response model
class SubmitUnstructuredDataResponse(BaseModel):
    success: bool
    message: str
    data_id: Optional[str] = None

# Define the submission function
def submit_unstructured_data(client, params: SubmitUnstructuredDataRequest) -> SubmitUnstructuredDataResponse:
    """
    Submit unstructured data for processing.
    
    Args:
        client: Database client (not used for this submission)
        params: Contains the file path and extracted JSON data
        
    Returns:
        SubmitUnstructuredDataResponse indicating success/failure
    """
    
    try:
        # Create a connector to submit the data
        connector = ConnectorFactory[UnstructuredDataSource].create(
            ConnectorType.UnstructuredData,
            UnstructuredDataConnectorConfig()
        )
        
        # Submit the data to the connector
        data_id = connector.submit_data(
            source_file_path=params.source_file_path,
            extracted_data_json=params.extracted_data_json,
            processing_instructions=params.processing_instructions
        )
        
        return SubmitUnstructuredDataResponse(
            success=True,
            message=f"Successfully submitted unstructured data for processing",
            data_id=data_id
        )
        
    except ValueError as e:
        return SubmitUnstructuredDataResponse(
            success=False,
            message=f"Validation error: {str(e)}"
        )
    except Exception as e:
        return SubmitUnstructuredDataResponse(
            success=False,
            message=f"Failed to submit unstructured data: {str(e)}"
        )

# Create the extract API
extract_unstructured_data_api = ConsumptionApi[ExtractUnstructuredDataQueryParams, ExtractUnstructuredDataResponse](
    "extractUnstructuredData",
    query_function=extract_unstructured_data,
    source="UnstructuredDataSource",
    config=EgressConfig()
)

# Create the submission API
submit_unstructured_data_api = ConsumptionApi[SubmitUnstructuredDataRequest, SubmitUnstructuredDataResponse](
    "submitUnstructuredData",
    query_function=submit_unstructured_data,
    source="UnstructuredDataSource",  # Source for documentation purposes
    config=EgressConfig()
) 