from app.ingest.models import Medical, UnstructuredDataSource
from app.utils.simulator import simulate_failures
from app.utils.file_reader import FileReader
from app.utils.batch_workflow_manager import BatchWorkflowManager
from app.utils.s3_pattern_validator import S3PatternValidator
from app.utils.llm_service import get_llm_service
# Connector imports removed - no longer using connector-based processing
from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import requests
import json
import uuid


# For more information on workflows, see: https://docs.fiveonefour.com/moose/building/workflows.

class UnstructuredDataExtractParams(BaseModel):
    source_file_pattern: str  # Required S3 pattern to process
    processing_instructions: Optional[str] = "Extract dental appointment information from this document"

def create_medical_record_from_extracted_data(source_file_path: str, extracted_data: Dict[str, Any]) -> Optional[Medical]:
    """
    Create a Medical record directly from extracted data
    
    Args:
        source_file_path: Path to the source file
        extracted_data: Dictionary containing extracted medical data
        
    Returns:
        Medical record or None if validation fails
    """
    try:
        # Validate that this contains medical appointment data
        required_fields = ["patient_name", "phone_number", "scheduled_appointment_date", 
                          "dental_procedure_name", "doctor"]
        
        # Check if at least 4 of 5 medical fields are present and non-empty
        present_fields = sum(1 for field in required_fields 
                           if field in extracted_data and extracted_data[field])
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Medical validation for {source_file_path}: {present_fields}/5 fields present. Fields: {list(extracted_data.keys())}",
            message_type="Info"
        ))
        
        if present_fields < 4:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Skipping {source_file_path}: insufficient medical data ({present_fields}/5 fields)",
                message_type="Warning"
            ))
            return None  # Skip incomplete medical data
        
        # Generate unique ID for medical record
        medical_id = f"med_{str(uuid.uuid4())}"
        
        return Medical(
            id=medical_id,
            patient_name=extracted_data.get("patient_name", ""),
            phone_number=extracted_data.get("phone_number", ""), 
            scheduled_appointment_date=extracted_data.get("scheduled_appointment_date", ""),
            dental_procedure_name=extracted_data.get("dental_procedure_name", ""),
            doctor=extracted_data.get("doctor", ""),
            transform_timestamp=datetime.now().isoformat(),
            source_file_path=source_file_path
        )
        
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Medical record creation failed for {source_file_path}: {e}",
            message_type="Error"
        ))
        return None

def run_task(input: UnstructuredDataExtractParams) -> None:
    """
    Simplified workflow: Process S3 pattern directly and output Medical records
    """
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow", 
        message=f"Processing S3 pattern: {input.source_file_pattern}", 
        message_type="Info"
    ))

    # Initialize batch workflow manager for S3 pattern processing
    batch_manager = BatchWorkflowManager()
    medical_records = []

    try:
        # Process the S3 pattern directly
        batch_result = batch_manager.process_s3_pattern(
            s3_pattern=input.source_file_pattern,
            processing_instructions=input.processing_instructions,
            batch_id=str(uuid.uuid4())
        )
        
        if batch_result['success']:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Successfully processed pattern {input.source_file_pattern}: {batch_result['summary']['files_succeeded']} files",
                message_type="Info"
            ))
            
            # Convert successful results to Medical records
            for result in batch_manager._last_processing_results if hasattr(batch_manager, '_last_processing_results') else []:
                if result['success'] and 'record' in result:
                    try:
                        # Extract data from the UnstructuredDataSource record
                        unstructured_record = result['record']
                        source_file_path = unstructured_record.source_file_path
                        
                        # Parse the extracted data JSON
                        extracted_data = json.loads(unstructured_record.extracted_data_json) if unstructured_record.extracted_data_json else {}
                        
                        medical_record = create_medical_record_from_extracted_data(
                            source_file_path=source_file_path,
                            extracted_data=extracted_data
                        )
                        if medical_record:
                            medical_records.append(medical_record)
                    except Exception as e:
                        cli_log(CliLogData(
                            action="UnstructuredDataWorkflow",
                            message=f"Failed to create medical record from {result.get('file_path', 'unknown')}: {e}",
                            message_type="Error"
                        ))
        else:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Pattern processing failed: {batch_result.get('error_message', 'Unknown error')}",
                message_type="Error"
            ))
            return
            
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Failed to process pattern {input.source_file_pattern}: {str(e)}",
            message_type="Error"
        ))
        return

    # Send Medical records directly to ingest API
    if medical_records:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Sending {len(medical_records)} medical records to ingest API",
            message_type="Info"
        ))
        
        ingest_url = "http://localhost:4200/ingest/Medical"
        
        try:
            for medical_record in medical_records:
                # Convert Pydantic model to dict for JSON serialization
                record_dict = medical_record.model_dump() if hasattr(medical_record, 'model_dump') else medical_record.__dict__
                response = requests.post(ingest_url, json=record_dict)
                response.raise_for_status()
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Successfully sent {len(medical_records)} medical records to ingest API",
                message_type="Info"
            ))
            
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to send medical records to ingest API: {str(e)}",
                message_type="Error"
            ))
    else:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="No medical records were created from the processed files",
            message_type="Info"
        ))

unstructured_data_task = Task[UnstructuredDataExtractParams, None](
    name="unstructured-data-task",
    config=TaskConfig(run=run_task)
)

unstructured_data_workflow = Workflow(
    name="unstructured-data-workflow",
    config=WorkflowConfig(starting_task=unstructured_data_task)
)