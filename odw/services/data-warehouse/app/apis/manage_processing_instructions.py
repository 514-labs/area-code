from moose_lib import ConsumptionApi, EgressConfig
from app.services.instruction_store import get_instruction_store
from pydantic import BaseModel, validator
from typing import Optional

# An API to manage processing instructions (delete, clear, update status).
# For more information on consumption apis, see: https://docs.fiveonefour.com/moose/building/consumption-apis.

# Define the request model for managing instructions
class ManageProcessingInstructionsRequest(BaseModel):
    action: str  # "delete", "clear", "update_status"
    instruction_id: Optional[str] = None  # Required for "delete" and "update_status"
    target_data_source: Optional[str] = None  # Optional filter for "clear"
    status: Optional[str] = None  # Required for "update_status", optional filter for "clear"
    
    @validator('action')
    def validate_action(cls, v):
        valid_actions = ["delete", "clear", "update_status"]
        if v not in valid_actions:
            raise ValueError(f"action must be one of: {valid_actions}")
        return v
    
    @validator('instruction_id')
    def validate_instruction_id_for_actions(cls, v, values):
        action = values.get('action')
        if action in ["delete", "update_status"] and not v:
            raise ValueError(f"instruction_id is required for action '{action}'")
        return v
    
    @validator('status')
    def validate_status_for_update(cls, v, values):
        action = values.get('action')
        if action == "update_status" and not v:
            raise ValueError("status is required for action 'update_status'")
        if v and v not in ["pending", "active", "completed", "expired"]:
            raise ValueError("status must be one of: pending, active, completed, expired")
        return v

# Define the response model
class ManageProcessingInstructionsResponse(BaseModel):
    success: bool
    message: str
    affected_count: Optional[int] = None

# Define the management function
def manage_processing_instructions(client, params: ManageProcessingInstructionsRequest) -> ManageProcessingInstructionsResponse:
    """
    Manage processing instructions with various operations.
    
    Args:
        client: Database client (not used for this operation)
        params: Contains the management operation details
        
    Returns:
        ManageProcessingInstructionsResponse indicating success/failure and details
    """
    
    try:
        # Get the instruction store service
        instruction_store = get_instruction_store()
        
        if params.action == "delete":
            success = instruction_store.delete_instruction(params.instruction_id)
            if success:
                return ManageProcessingInstructionsResponse(
                    success=True,
                    message=f"Successfully deleted instruction {params.instruction_id}",
                    affected_count=1
                )
            else:
                return ManageProcessingInstructionsResponse(
                    success=False,
                    message=f"Instruction {params.instruction_id} not found"
                )
        
        elif params.action == "clear":
            affected_count = instruction_store.clear_instructions(
                target_data_source=params.target_data_source,
                status=params.status
            )
            
            filter_desc = []
            if params.target_data_source:
                filter_desc.append(f"target_data_source={params.target_data_source}")
            if params.status:
                filter_desc.append(f"status={params.status}")
            
            filter_str = f" with filters: {', '.join(filter_desc)}" if filter_desc else ""
            
            return ManageProcessingInstructionsResponse(
                success=True,
                message=f"Successfully cleared {affected_count} instructions{filter_str}",
                affected_count=affected_count
            )
        
        elif params.action == "update_status":
            success = instruction_store.update_instruction_status(
                params.instruction_id,
                params.status
            )
            if success:
                return ManageProcessingInstructionsResponse(
                    success=True,
                    message=f"Successfully updated instruction {params.instruction_id} status to {params.status}",
                    affected_count=1
                )
            else:
                return ManageProcessingInstructionsResponse(
                    success=False,
                    message=f"Instruction {params.instruction_id} not found"
                )
        
        else:
            return ManageProcessingInstructionsResponse(
                success=False,
                message=f"Unknown action: {params.action}"
            )
        
    except ValueError as e:
        return ManageProcessingInstructionsResponse(
            success=False,
            message=f"Validation error: {str(e)}"
        )
    except Exception as e:
        return ManageProcessingInstructionsResponse(
            success=False,
            message=f"Failed to manage processing instructions: {str(e)}"
        )

# Create the management API
manage_processing_instructions_api = ConsumptionApi[ManageProcessingInstructionsRequest, ManageProcessingInstructionsResponse](
    "manageProcessingInstructions",
    query_function=manage_processing_instructions,
    source="ProcessingInstruction",
    config=EgressConfig()
) 