from moose_lib import ConsumptionApi
from pydantic import BaseModel
from typing import Optional

# An API to trigger the logs extract workflow.
# For more information on consumption apis, see: https://docs.fiveonefour.com/moose/building/consumption-apis.

class ExtractLogsQueryParams(BaseModel):
  batch_size: Optional[int] = 100
  fail_percentage: Optional[int] = 0

class ExtractLogsResponse(BaseModel):
  status: int
  body: str

def extract_logs(client, params: ExtractLogsQueryParams):
  return client.workflow.execute("logs-workflow", params)

extract_logs_api = ConsumptionApi[ExtractLogsQueryParams, ExtractLogsResponse](
    "extract-logs",
    query_function=extract_logs
)