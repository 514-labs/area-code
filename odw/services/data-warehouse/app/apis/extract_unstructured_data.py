from moose_lib import ConsumptionApi, EgressConfig, cli_log, CliLogData
from pydantic import BaseModel
from typing import Optional

# An API to trigger unstructured data extraction and processing workflows.
# This processes S3 patterns directly using the workflow system.

# Extract API models (similar to other extract APIs)
class ExtractUnstructuredDataQueryParams(BaseModel):
  source_file_pattern: str = "s3://unstructured-data/*"  # S3 pattern to process
  processing_instructions: Optional[str] = """Extract the following information from this dental appointment document and return it as JSON with these exact field names:

{
  "patient_name": "[full patient name]",
  "phone_number": "[patient phone number with any extensions]", 
  "patient_age": "[patient age]",
  "scheduled_appointment_date": "[appointment date in original format]",
  "dental_procedure_name": "[specific dental procedure or treatment]",
  "doctor": "[doctor's name including title]"
}

Return only the JSON object with no additional text or formatting."""
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

  # Log the parameters being passed to the workflow
  cli_log(CliLogData(
      action="ExtractUnstructuredData",
      message=f"Starting unstructured data workflow with params: {workflow_params}",
      message_type="Info"
  ))
    
  result = client.workflow.execute("unstructured-data-workflow", workflow_params)
  
  # Return a standard response to prevent any fallback to automatic extract
  return ExtractUnstructuredDataResponse(
    success=True,
    body=f"Workflow started: {result}"
  )

# Create the extract API
extract_unstructured_data_api = ConsumptionApi[ExtractUnstructuredDataQueryParams, ExtractUnstructuredDataResponse](
    "extract-unstructured-data",
    query_function=extract_unstructured_data,
    source="",  # No source table - workflow processes S3 directly
    config=EgressConfig()
) 