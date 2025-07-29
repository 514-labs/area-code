from app.ingest.models import UnstructuredDataSource
from app.utils.simulator import simulate_failures
from app.utils.file_reader import FileReader
from app.utils.llm_service import get_llm_service
from app.services.instruction_store import get_instruction_store
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.unstructured_data_connector import UnstructuredDataConnectorConfig
from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import requests
import json

# This workflow extracts UnstructuredData and sends it to the ingest API.
# For more information on workflows, see: https://docs.fiveonefour.com/moose/building/workflows.
#
# The workflow now handles:
# 1. Reading raw file content from source_file_path
# 2. Using LLM + natural language instructions to extract structured data
# 3. Applying post-processing instructions (validation, transformation, routing)
#
# When the data lands in ingest, it goes through a stream where it is transformed.
# See app/ingest/transforms.py for the transformation logic.

class UnstructuredDataExtractParams(BaseModel):
    batch_size: Optional[int] = 100
    fail_percentage: Optional[int] = 0

def process_unstructured_data_item(item: UnstructuredDataSource) -> UnstructuredDataSource:
    """
    Process a single unstructured data item by reading the file and applying extraction instructions.
    
    Args:
        item: UnstructuredDataSource with source_file_path and potentially empty extracted_data_json
        
    Returns:
        Updated UnstructuredDataSource with extracted and processed data
    """
    
    # Step 1: Read the actual file content
    try:
        file_content, file_type = FileReader.read_file(item.source_file_path)
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Successfully read file: {item.source_file_path} (type: {file_type})",
            message_type="Info"
        ))
        
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Failed to read file {item.source_file_path}: {str(e)}",
            message_type="Error"
        ))
        # Mark for DLQ processing
        item.source_file_path = f"[DLQ]FILE_READ_ERROR_{item.source_file_path}"
        return item
    
    # Step 2: Apply extraction instructions to generate structured JSON
    item = apply_extraction_instructions(item, file_content, file_type)
    
    # Step 3: Apply post-processing instructions (validation, transformation, routing)
    item = apply_post_processing_instructions(item)
    
    return item

def apply_extraction_instructions(item: UnstructuredDataSource, file_content: str, file_type: str) -> UnstructuredDataSource:
    """
    Apply extraction instructions to convert unstructured file content to structured JSON.
    """
    instruction_store = get_instruction_store()
    
    # Get extraction instructions only
    extraction_instructions = instruction_store.get_instructions_for_target(
        target_data_source="unstructured_data",
        instruction_type="extraction",
        status="pending"
    )
    
    if not extraction_instructions:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="No extraction instructions found, using default extraction",
            message_type="Info"
        ))
        # Default extraction: return file content as JSON
        item.extracted_data_json = json.dumps({
            "raw_content": file_content[:1000] + "..." if len(file_content) > 1000 else file_content,
            "file_type": file_type,
            "extraction_method": "default"
        })
        return item
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Applying {len(extraction_instructions)} extraction instructions",
        message_type="Info"
    ))
    
    # Apply each extraction instruction
    extracted_json = {}
    
    for instruction in extraction_instructions:
        try:
            instruction_store.update_instruction_status(instruction.id, "active")
            
            # Perform LLM-based extraction
            extraction_result = perform_llm_extraction(file_content, file_type, instruction.content)
            
            # Merge extraction results
            if isinstance(extraction_result, dict):
                extracted_json.update(extraction_result)
            
            instruction_store.update_instruction_status(instruction.id, "completed")
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Applied extraction instruction {instruction.id}",
                message_type="Info"
            ))
            
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to apply extraction instruction {instruction.id}: {str(e)}",
                message_type="Error"
            ))
            # Continue with other instructions
    
    # Set the extracted JSON
    item.extracted_data_json = json.dumps(extracted_json) if extracted_json else json.dumps({
        "error": "extraction_failed",
        "file_type": file_type
    })
    
    return item

def perform_llm_extraction(file_content: str, file_type: str, instruction: str) -> Dict[str, Any]:
    """
    Perform LLM-based extraction from file content using natural language instruction.
    
    Args:
        file_content: Raw content from the file
        file_type: Type of file (text, pdf, image, etc.)
        instruction: Natural language instruction for what to extract
        
    Returns:
        Dictionary with extracted structured data
    """
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Performing LLM extraction: {instruction[:100]}...",
        message_type="Info"
    ))
    
    try:
        # Get LLM service
        llm_service = get_llm_service()
        
        # Use the LLM service to extract structured data
        extraction_result = llm_service.extract_structured_data(
            file_content=file_content,
            file_type=file_type,
            instruction=instruction
        )
        
        return extraction_result
        
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"LLM extraction failed: {str(e)}",
            message_type="Error"
        ))
        
        # Return error information but don't fail completely
        return {
            "extraction_error": str(e),
            "extraction_instruction": instruction,
            "file_type": file_type,
            "extracted_at": json.loads(json.dumps({"timestamp": "2024-01-01T00:00:00Z"}))["timestamp"]
        }

def apply_post_processing_instructions(item: UnstructuredDataSource) -> UnstructuredDataSource:
    """
    Apply post-processing instructions (validation, transformation, routing) to the unstructured data.
    
    Args:
        item: UnstructuredDataSource with extracted_data_json
        
    Returns:
        Modified UnstructuredDataSource with post-processed data
    """
    instruction_store = get_instruction_store()
    
    # Get non-extraction instructions (validation, transformation, routing)
    instructions = []
    for instruction_type in ["validation", "transformation", "routing"]:
        type_instructions = instruction_store.get_instructions_for_target(
            target_data_source="unstructured_data",
            instruction_type=instruction_type,
            status="pending"
        )
        instructions.extend(type_instructions)
    
    # Sort by creation time (oldest first)
    instructions.sort(key=lambda x: x.created_at)
    
    if not instructions:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="No post-processing instructions found",
            message_type="Info"
        ))
        return item
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Applying {len(instructions)} post-processing instructions using LLM interpretation",
        message_type="Info"
    ))
    
    # Apply each instruction in creation order (oldest first)
    for instruction in instructions:
        try:
            # Mark instruction as active
            instruction_store.update_instruction_status(instruction.id, "active")
            
            # Apply instruction using LLM interpretation
            item = apply_llm_instruction(item, instruction)
            
            # Mark instruction as completed after successful application
            instruction_store.update_instruction_status(instruction.id, "completed")
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Applied {instruction.instruction_type} instruction {instruction.id}",
                message_type="Info"
            ))
            
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to apply post-processing instruction {instruction.id}: {str(e)}",
                message_type="Error"
            ))
            # Don't fail the entire process, just log and continue
    
    return item

def apply_llm_instruction(item: UnstructuredDataSource, instruction) -> UnstructuredDataSource:
    """
    Apply a natural language instruction to a data item using LLM interpretation.
    
    Note: This now uses the real Anthropic LLM service for instruction interpretation
    and application of transformations, validations, and routing.
    """
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Processing {instruction.instruction_type} instruction: {instruction.content[:100]}...",
        message_type="Info"
    ))
    
    try:
        # Get LLM service
        llm_service = get_llm_service()
        
        if instruction.instruction_type == "validation":
            # Use LLM service for validation
            validation_result = llm_service.validate_data(
                data_json=item.extracted_data_json,
                instruction=instruction.content
            )
            
            # If validation fails, mark for DLQ
            if not validation_result.get("is_valid", True):
                issues = validation_result.get("issues", ["validation_failed"])
                issue_summary = "_".join(issues[:3])  # Limit length
                item.source_file_path = f"[DLQ]VALIDATION_ERROR_{issue_summary}_{item.source_file_path}"
                
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Validation failed: {validation_result.get('validation_message', 'Unknown error')}",
                    message_type="Warning"
                ))
        
        elif instruction.instruction_type == "transformation":
            # Use LLM service for transformation
            transformed_json = llm_service.transform_data(
                data_json=item.extracted_data_json,
                instruction=instruction.content
            )
            
            # Update the extracted data with transformed version
            item.extracted_data_json = transformed_json
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message="Data transformation completed successfully",
                message_type="Info"
            ))
        
        elif instruction.instruction_type == "routing":
            # Use LLM service for routing
            new_path = llm_service.route_data(
                data_json=item.extracted_data_json,
                current_path=item.source_file_path,
                instruction=instruction.content
            )
            
            # Update the file path with routing result
            item.source_file_path = new_path
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Routing applied: new path = {new_path}",
                message_type="Info"
            ))
        
        return item
        
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"LLM instruction processing failed: {str(e)}",
            message_type="Error"
        ))
        
        # Don't fail the entire process, just log and return original item
        return item

def run_task(input: UnstructuredDataExtractParams) -> None:
    cli_log(CliLogData(action="UnstructuredDataWorkflow", message="Running UnstructuredData task...", message_type="Info"))

    # Create a connector to extract data from UnstructuredData
    connector = ConnectorFactory[UnstructuredDataSource].create(
        ConnectorType.UnstructuredData,
        UnstructuredDataConnectorConfig(batch_size=input.batch_size)
    )

    # Check if there's any pending data
    if not connector.has_pending_data():
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="No pending unstructured data to process",
            message_type="Info"
        ))
        return

    # Extract data from UnstructuredData
    data = connector.extract()

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Extracted {len(data)} items for processing",
        message_type="Info"
    ))

    # Process each item: read file, extract with LLM, apply post-processing
    processed_data = []
    for item in data:
        try:
            processed_item = process_unstructured_data_item(item)
            processed_data.append(processed_item)
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to process item {item.id}: {str(e)}",
                message_type="Error"
            ))
            # Mark item as failed and continue
            item.source_file_path = f"[DLQ]PROCESSING_ERROR_{item.source_file_path}"
            processed_data.append(item)

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Completed processing {len(processed_data)} items",
        message_type="Info"
    ))

    # Apply failure simulation if specified
    failed_count = simulate_failures(processed_data, input.fail_percentage)
    if failed_count > 0:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Marked {failed_count} items ({input.fail_percentage}%) as failed",
            message_type="Info"
        ))

    data_dicts = [item.model_dump() for item in processed_data]
    
    try:
        response = requests.post(
            "http://localhost:4200/ingest/UnstructuredDataSource",
            json=data_dicts,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Successfully sent {len(processed_data)} items to ingest API",
            message_type="Info"
        ))
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Failed to send data to ingest API: {str(e)}",
            message_type="Error"
        ))

unstructured_data_task = Task[UnstructuredDataExtractParams, None](
    name="unstructured-data-task",
    config=TaskConfig(run=run_task)
)

unstructured_data_workflow = Workflow(
    name="unstructured-data-workflow",
    config=WorkflowConfig(starting_task=unstructured_data_task)
) 