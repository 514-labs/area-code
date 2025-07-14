from moose_lib import ConsumptionApi
from pydantic import BaseModel
from typing import Optional

class ExtractS3QueryParams(BaseModel):
  batch_size: Optional[int] = 100

class ExtractS3Response(BaseModel):
  status: int
  body: str

def extract_s3(client, params: ExtractS3QueryParams):
  return client.workflow.execute("s3-workflow", params)

extract_s3_api = ConsumptionApi[ExtractS3QueryParams, ExtractS3Response](
    "extract-s3",
    query_function=extract_s3
)