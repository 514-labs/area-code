from moose_lib import ConsumptionApi
from pydantic import BaseModel
from typing import Optional

# An API to trigger the blob extract workflow.
# For more information on consumption apis, see: https://docs.fiveonefour.com/moose/building/consumption-apis.

class ExtractBlobQueryParams(BaseModel):
  batch_size: Optional[int] = 100
  fail_percentage: Optional[int] = 0

class ExtractBlobResponse(BaseModel):
  status: int
  body: str

def extract_blob(client, params: ExtractBlobQueryParams):
  return client.workflow.execute("blob-workflow", params)

extract_blob_api = ConsumptionApi[ExtractBlobQueryParams, ExtractBlobResponse](
    "extract-blob",
    query_function=extract_blob
)