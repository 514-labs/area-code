from moose_lib import ConsumptionApi, EgressConfig
from app.services.instruction_store import get_instruction_store
from app.ingest.models import ProcessingInstruction
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# An API to list and manage processing instructions.
# For more information on consumption apis, see: https://docs.fiveonefour.com/moose/building/consumption-apis.

# Define the query params
class GetProcessingInstructionsQuery(BaseModel):
    target_data_source: Optional[str] = None  # Filter by target data source
    instruction_type: Optional[str] = None  # Filter by instruction type
    status: Optional[str] = "pending"  # Filter by status
    include_expired: bool = False  # Include expired instructions

# Define the response model
class GetProcessingInstructionsResponse(BaseModel):
    instructions: List[ProcessingInstruction] = []
    total: int = 0
    stats: Dict[str, Any] = {}

# Define the query function
def get_processing_instructions(client, params: GetProcessingInstructionsQuery) -> GetProcessingInstructionsResponse:
    """
    Retrieve processing instructions with optional filtering.
    
    Args:
        client: Database client (not used for this operation)
        params: Contains filtering parameters
        
    Returns:
        GetProcessingInstructionsResponse containing instructions and statistics
    """
    
    try:
        # Get the instruction store service
        instruction_store = get_instruction_store()
        
        # Get instructions based on filters
        if params.target_data_source:
            instructions = instruction_store.get_instructions_for_target(
                target_data_source=params.target_data_source,
                instruction_type=params.instruction_type,
                status=params.status or "pending"
            )
        else:
            instructions = instruction_store.list_all_instructions(
                include_expired=params.include_expired
            )
            
            # Apply additional filters if specified
            if params.instruction_type:
                instructions = [i for i in instructions if i.instruction_type == params.instruction_type]
            if params.status:
                instructions = [i for i in instructions if i.status == params.status]
        
        # Get statistics
        stats = instruction_store.get_stats()
        
        return GetProcessingInstructionsResponse(
            instructions=instructions,
            total=len(instructions),
            stats=stats
        )
        
    except Exception as e:
        return GetProcessingInstructionsResponse(
            instructions=[],
            total=0,
            stats={"error": str(e)}
        )

# Create the consumption API
get_processing_instructions_api = ConsumptionApi[GetProcessingInstructionsQuery, GetProcessingInstructionsResponse](
    "getProcessingInstructions",
    query_function=get_processing_instructions,
    source="ProcessingInstruction",
    config=EgressConfig()
) 