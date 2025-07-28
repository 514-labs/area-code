from app.ingest.models import UnstructuredDataSource
from app.utils.simulator import simulate_failures
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
# Unlike other connectors, this workflow only processes user-submitted data
# and does not generate random data.
#
# When the data lands in ingest, it goes through a stream where it is transformed.
# See app/ingest/transforms.py for the transformation logic.

class UnstructuredDataExtractParams(BaseModel):
    batch_size: Optional[int] = 100
    fail_percentage: Optional[int] = 0

def apply_processing_instructions(data: List[UnstructuredDataSource]) -> List[UnstructuredDataSource]:
    """
    Apply processing instructions to the unstructured data.
    
    Args:
        data: List of UnstructuredDataSource objects to process
        
    Returns:
        Modified list of UnstructuredDataSource objects
    """
    instruction_store = get_instruction_store()
    
    # Get all pending instructions for unstructured data
    instructions = instruction_store.get_instructions_for_target(
        target_data_source="unstructured_data",
        status="pending"
    )
    
    if not instructions:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="No processing instructions found",
            message_type="Info"
        ))
        return data
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Applying {len(instructions)} processing instructions",
        message_type="Info"
    ))
    
    processed_data = []
    
    for item in data:
        processed_item = item
        
        # Apply each instruction in priority order
        for instruction in instructions:
            try:
                # Mark instruction as active
                instruction_store.update_instruction_status(instruction.id, "active")
                
                if instruction.instruction_type == "transformation":
                    processed_item = apply_transformation_instruction(processed_item, instruction)
                elif instruction.instruction_type == "validation":
                    processed_item = apply_validation_instruction(processed_item, instruction)
                elif instruction.instruction_type == "routing":
                    processed_item = apply_routing_instruction(processed_item, instruction)
                
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
                    message=f"Failed to apply instruction {instruction.id}: {str(e)}",
                    message_type="Error"
                ))
                # Don't fail the entire process, just log and continue
        
        processed_data.append(processed_item)
    
    return processed_data

def apply_transformation_instruction(item: UnstructuredDataSource, instruction) -> UnstructuredDataSource:
    """Apply transformation instruction to a data item."""
    content = instruction.content
    
    # Example transformation: modify extracted JSON based on instruction
    if "json_transform" in content:
        try:
            original_json = json.loads(item.extracted_data_json)
            transform_rules = content["json_transform"]
            
            # Apply transformation rules
            for rule in transform_rules:
                if rule["type"] == "add_field":
                    original_json[rule["field"]] = rule["value"]
                elif rule["type"] == "remove_field":
                    original_json.pop(rule["field"], None)
                elif rule["type"] == "rename_field":
                    if rule["old_field"] in original_json:
                        original_json[rule["new_field"]] = original_json.pop(rule["old_field"])
            
            item.extracted_data_json = json.dumps(original_json)
            
        except (json.JSONDecodeError, KeyError) as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Transformation failed for item {item.id}: {str(e)}",
                message_type="Error"
            ))
    
    return item

def apply_validation_instruction(item: UnstructuredDataSource, instruction) -> UnstructuredDataSource:
    """Apply validation instruction to a data item."""
    content = instruction.content
    
    # Example validation: check required fields in JSON
    if "required_fields" in content:
        try:
            original_json = json.loads(item.extracted_data_json)
            required_fields = content["required_fields"]
            
            missing_fields = [field for field in required_fields if field not in original_json]
            
            if missing_fields:
                # Mark the file path with validation error for DLQ handling
                item.source_file_path = f"[DLQ]VALIDATION_ERROR_MISSING_FIELDS_{','.join(missing_fields)}_{item.source_file_path}"
                
        except json.JSONDecodeError as e:
            item.source_file_path = f"[DLQ]VALIDATION_ERROR_INVALID_JSON_{item.source_file_path}"
    
    return item

def apply_routing_instruction(item: UnstructuredDataSource, instruction) -> UnstructuredDataSource:
    """Apply routing instruction to a data item."""
    content = instruction.content
    
    # Example routing: modify file path based on content
    if "route_by_content" in content:
        try:
            original_json = json.loads(item.extracted_data_json)
            routing_rules = content["route_by_content"]
            
            for rule in routing_rules:
                field = rule.get("field")
                value = rule.get("value")
                prefix = rule.get("prefix", "")
                
                if field in original_json and original_json[field] == value:
                    item.source_file_path = f"{prefix}{item.source_file_path}"
                    break
                    
        except json.JSONDecodeError:
            # Don't modify routing if JSON is invalid
            pass
    
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
        message=f"Extracted {len(data)} items",
        message_type="Info"
    ))

    # Apply processing instructions to the data
    data = apply_processing_instructions(data)

    # Apply failure simulation if specified
    failed_count = simulate_failures(data, input.fail_percentage)
    if failed_count > 0:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Marked {failed_count} items ({input.fail_percentage}%) as failed",
            message_type="Info"
        ))

    data_dicts = [item.model_dump() for item in data]
    
    try:
        response = requests.post(
            "http://localhost:4200/ingest/UnstructuredDataSource",
            json=data_dicts,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Successfully sent {len(data)} items to ingest API",
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