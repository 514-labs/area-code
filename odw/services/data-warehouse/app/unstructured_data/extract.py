from app.ingest.models import Medical, UnstructuredDataSource
from app.utils.llm_service import get_llm_service
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.s3_connector import S3ConnectorConfig, S3FileContent
from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import requests
import json
import uuid


# For more information on workflows, see: https://docs.fiveonefour.com/moose/building/workflows.

class UnstructuredDataExtractParams(BaseModel):
    source_file_pattern: str  # Required S3 pattern to process
    processing_instructions: Optional[str] = "Extract dental appointment information from this document"

def create_medical_record_from_extracted_data(source_file_path: str, extracted_data: dict) -> Medical:
    """
    Create a Medical record from extracted data, using empty strings for missing fields.
    
    Args:
        source_file_path: Path to the source file
        extracted_data: Dictionary containing extracted medical data
        
    Returns:
        Medical record with empty strings for missing fields
    """
    # Generate unique ID for medical record
    medical_id = f"med_{str(uuid.uuid4())}"
    
    # Create Medical record using empty strings for missing fields (no skipping)
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

def create_dlq_record(file_path: str, error_message: str) -> UnstructuredDataSource:
    """
    Create an UnstructuredDataSource record for DLQ with [DLQ] prefix.
    
    Args:
        file_path: Path to the file that failed
        error_message: Error message describing the failure
        
    Returns:
        UnstructuredDataSource record marked for DLQ
    """
    dlq_id = f"dlq_{str(uuid.uuid4())}"
    
    return UnstructuredDataSource(
        id=dlq_id,
        source_file_path=f"[DLQ]{file_path}",  # Mark for DLQ with prefix
        extracted_data_json=json.dumps({"error": error_message}),
        processed_at=datetime.now().isoformat(),
        processing_instructions=f"Failed: {error_message}"
    )

def run_task(input: UnstructuredDataExtractParams) -> None:
    """
    Unstructured data workflow following the same pattern as blob/logs/events workflows.
    Uses S3 connector to get files, processes each with LLM, creates Medical records.
    """
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow", 
        message="Running Unstructured Data task...", 
        message_type="Info"
    ))

    # Create S3 connector to extract files from pattern
    connector = ConnectorFactory[S3FileContent].create(
        ConnectorType.S3,
        S3ConnectorConfig(s3_pattern=input.source_file_pattern)
    )

    # Extract files from S3
    files = connector.extract()

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Extracted {len(files)} files from S3",
        message_type="Info"
    ))

    # Process each file individually
    medical_records = []
    dlq_records = []
    llm_service = get_llm_service()

    for file_content in files:
        try:
            # Use LLM to extract structured data from file content
            extracted_data = llm_service.extract_structured_data(
                file_content=file_content.content,
                file_type=file_content.content_type,
                instruction=input.processing_instructions,
                file_path=file_content.file_path
            )
            
            # Create Medical record (no skipping, use "" for missing fields)
            medical_record = create_medical_record_from_extracted_data(
                source_file_path=file_content.file_path,
                extracted_data=extracted_data
            )
            
            medical_records.append(medical_record)
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Successfully processed file: {file_content.file_path}",
                message_type="Info"
            ))
            
        except Exception as e:
            # Create DLQ record for failed file processing
            dlq_record = create_dlq_record(file_content.file_path, str(e))
            dlq_records.append(dlq_record)
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to process file {file_content.file_path}: {str(e)}",
                message_type="Error"
            ))

    # Send Medical records to ingest API (same pattern as other workflows)
    if medical_records:
        medical_dicts = [record.model_dump() for record in medical_records]
        
        try:
            response = requests.post(
                "http://localhost:4200/ingest/Medical",
                json=medical_dicts,
                headers={"Content-Type": "application/json"}
            )
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

    # Send DLQ records to ingest API for error handling
    if dlq_records:
        dlq_dicts = [record.model_dump() for record in dlq_records]
        
        try:
            response = requests.post(
                "http://localhost:4200/ingest/UnstructuredDataSource",
                json=dlq_dicts,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Successfully sent {len(dlq_records)} failed records to DLQ",
                message_type="Info"
            ))
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to send DLQ records to ingest API: {str(e)}",
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