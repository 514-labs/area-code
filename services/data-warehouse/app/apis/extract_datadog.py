from moose_lib import ConsumptionApi
from pydantic import BaseModel
from typing import Optional

# An API to trigger a the datadog extract workflow.

class ExtractDatadogQueryParams(BaseModel):
  batch_size: Optional[int] = 100
  fail_percentage: Optional[int] = 0

class ExtractDatadogResponse(BaseModel):
  status: int
  body: str

def extract_datadog(client, params: ExtractDatadogQueryParams):
  return client.workflow.execute("datadog-workflow", params)

extract_datadog_api = ConsumptionApi[ExtractDatadogQueryParams, ExtractDatadogResponse](
    "extract-datadog",
    query_function=extract_datadog
)