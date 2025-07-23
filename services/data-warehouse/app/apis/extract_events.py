from moose_lib import ConsumptionApi
from pydantic import BaseModel
from typing import Optional

# An API to trigger the events extract workflow.
# For more information on consumption apis, see: https://docs.fiveonefour.com/moose/building/consumption-apis.

class ExtractEventsQueryParams(BaseModel):
  batch_size: Optional[int] = 100
  fail_percentage: Optional[int] = 0

class ExtractEventsResponse(BaseModel):
  status: int
  body: str

def extract_events(client, params: ExtractEventsQueryParams):
  return client.workflow.execute("events-workflow", params)

extract_events_api = ConsumptionApi[ExtractEventsQueryParams, ExtractEventsResponse](
    "extract-events",
    query_function=extract_events
) 