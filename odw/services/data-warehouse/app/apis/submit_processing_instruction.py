from moose_lib import ConsumptionApi, EgressConfig
from app.services.instruction_store import get_instruction_store
from pydantic import BaseModel, validator
from typing import Optional

# An API to submit processing instructions that will be used during workflow execution.
# Processing instructions allow users to dynamically configure how data should be processed.

# Define the input model for submitting processing instructions
class SubmitProcessingInstructionRequest(BaseModel):
    instruction_type: str  # "extraction", "transformation", "validation", "routing"
    target_data_source: str  # "unstructured_data", "blob", "events", "logs" 
    content: str  # Natural language instruction for LLM interpretation
    expires_in_minutes: Optional[int] = None  # Minutes until instruction expires
    
    @validator('instruction_type')
    def validate_instruction_type(cls, v):
        valid_types = ["extraction", "transformation", "validation", "routing"]
        if v not in valid_types:
            raise ValueError(f"instruction_type must be one of: {valid_types}")
        return v
    
    @validator('target_data_source')
    def validate_target_data_source(cls, v):
        valid_sources = ["unstructured_data", "blob", "events", "logs"]
        if v not in valid_sources:
            raise ValueError(f"target_data_source must be one of: {valid_sources}")
        return v
    
    @validator('content')
    def validate_content(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("content cannot be empty")
        if len(v) > 2000:
            raise ValueError("content must be 2000 characters or less")
        return v.strip()
    
    @validator('expires_in_minutes')
    def validate_expires_in_minutes(cls, v):
        if v is not None and v <= 0:
            raise ValueError("expires_in_minutes must be positive")
        return v

# Define the response model
class SubmitProcessingInstructionResponse(BaseModel):
    success: bool
    message: str
    instruction_id: Optional[str] = None

# Define the submission function
def submit_processing_instruction(client, params: SubmitProcessingInstructionRequest) -> SubmitProcessingInstructionResponse:
    """
    Submit a processing instruction that will be used during workflow execution.
    
    Args:
        client: Database client (not used for this operation)
        params: Contains the instruction details
        
    Returns:
        SubmitProcessingInstructionResponse indicating success/failure and instruction ID
    """
    
    try:
        # Get the instruction store service
        instruction_store = get_instruction_store()
        
        # Store the instruction
        instruction_id = instruction_store.store_instruction(
            instruction_type=params.instruction_type,
            target_data_source=params.target_data_source,
            content=params.content,
            expires_in_minutes=params.expires_in_minutes
        )
        
        return SubmitProcessingInstructionResponse(
            success=True,
            message=f"Successfully stored processing instruction for {params.target_data_source}",
            instruction_id=instruction_id
        )
        
    except ValueError as e:
        return SubmitProcessingInstructionResponse(
            success=False,
            message=f"Validation error: {str(e)}"
        )
    except Exception as e:
        return SubmitProcessingInstructionResponse(
            success=False,
            message=f"Failed to store processing instruction: {str(e)}"
        )

# Create the submission API
submit_processing_instruction_api = ConsumptionApi[SubmitProcessingInstructionRequest, SubmitProcessingInstructionResponse](
    "submitProcessingInstruction",
    query_function=submit_processing_instruction,
    source="ProcessingInstruction",  # Source for documentation purposes
    config=EgressConfig()
) 