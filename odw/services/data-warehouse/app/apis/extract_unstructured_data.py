from moose_lib import ConsumptionApi, EgressConfig
from pydantic import BaseModel
from typing import Optional

# An API to trigger unstructured data extraction and processing workflows.
# This processes S3 patterns directly using the workflow system.

# Extract API models (similar to other extract APIs)
class ExtractUnstructuredDataQueryParams(BaseModel):
  source_file_pattern: str = "s3://unstructured-data/*"  # S3 pattern to process
  processing_instructions: Optional[str] = "Extract dental appointment information from this document"
  batch_size: Optional[int] = 100
  fail_percentage: Optional[int] = 0

class ExtractUnstructuredDataResponse(BaseModel):
  success: bool
  body: str

def extract_unstructured_data(client, params: ExtractUnstructuredDataQueryParams):
  """
  Execute the unstructured data workflow directly without querying database tables.
  The workflow processes S3 patterns and creates Medical records directly.
  
  Note: This completely bypasses any automatic extract logic to prevent
  database queries for non-existent UnstructuredData table.
  """
  workflow_params = {
    "source_file_pattern": params.source_file_pattern,
    "processing_instructions": params.processing_instructions
  }
  result = client.workflow.execute("unstructured-data-workflow", workflow_params)
  
  # Return a standard response to prevent any fallback to automatic extract
  return ExtractUnstructuredDataResponse(
    success=True,
    body=f"Workflow started: {result}"
  )

# Create the extract API
extract_unstructured_data_api = ConsumptionApi[ExtractUnstructuredDataQueryParams, ExtractUnstructuredDataResponse](
    "extractUnstructuredData",
    query_function=extract_unstructured_data,
    source="",  # No source table - workflow processes S3 directly
    config=EgressConfig()
) 