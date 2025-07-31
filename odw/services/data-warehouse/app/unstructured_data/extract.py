from app.ingest.models import Medical, UnstructuredData, UnstructuredDataSource
from app.utils.llm_service import get_llm_service
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.s3_connector import S3ConnectorConfig, S3FileContent
from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import requests
import json
import uuid


# For more information on workflows, see: https://docs.fiveonefour.com/moose/building/workflows.

class UnstructuredDataExtractParams(BaseModel):
    source_file_pattern: str  # Required S3 pattern to process
    processing_instructions: Optional[str] = """Extract the following information from this dental appointment document and return it as JSON with these exact field names:

{
  "patient_name": "[full patient name]",
  "phone_number": "[patient phone number with any extensions]", 
  "scheduled_appointment_date": "[appointment date in original format]",
  "dental_procedure_name": "[specific dental procedure or treatment]",
  "doctor": "[doctor's name including title]"
}

Return only the JSON object with no additional text or formatting."""

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

def stage_1_s3_to_unstructured(input: UnstructuredDataExtractParams) -> List[str]:
    """
    Stage 1: Extract files from S3 and create UnstructuredData staging records.
    Each file gets a unique ID that will be shared with the Medical record.
    """
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow", 
        message="🔵 STAGE 1 FUNCTION ENTRY: Starting S3 to UnstructuredData staging...", 
        message_type="Info"
    ))

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"🔍 S3 PATTERN: '{input.source_file_pattern}'",
        message_type="Info"
    ))

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"DEBUG: Processing instructions: '{input.processing_instructions}'",
        message_type="Info"
    ))

    # Create S3 connector to extract files from pattern
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"DEBUG: Creating S3 connector with pattern: {input.source_file_pattern}",
        message_type="Info"
    ))

    connector = ConnectorFactory[S3FileContent].create(
        ConnectorType.S3,
        S3ConnectorConfig(s3_pattern=input.source_file_pattern)
    )

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message="DEBUG: S3 connector created successfully, starting file extraction...",
        message_type="Info"
    ))

    # Extract files from S3
    files = connector.extract()

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"DEBUG: S3 connector returned {len(files)} files",
        message_type="Info"
    ))

    if len(files) == 0:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"⚠️ S3 ISSUE: No files found matching pattern '{input.source_file_pattern}'. Pattern may not match any files.",
            message_type="Warning"
        ))
    else:
        # Log first few file names for debugging
        sample_files = [f.file_path for f in files[:5]]
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"📁 S3 SUCCESS: Found {len(files)} files. Sample: {sample_files}",
            message_type="Info"
        ))

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Extracted {len(files)} files from S3",
        message_type="Info"
    ))

    # Create UnstructuredData staging records and track their IDs
    unstructured_records = []
    created_record_ids = []
    dlq_records = []

    for file_content in files:
        try:
            # Generate unique ID that will be shared between UnstructuredData and Medical
            record_id = f"unstr_{str(uuid.uuid4())}"
            
            # Create UnstructuredData staging record
            unstructured_record = UnstructuredData(
                id=record_id,
                source_file_path=file_content.file_path,
                extracted_data_json=file_content.content,  # Store raw file content for LLM processing
                processed_at=datetime.now().isoformat(),
                processing_instructions=input.processing_instructions,
                transform_timestamp=datetime.now().isoformat()
            )
            
            unstructured_records.append(unstructured_record)
            created_record_ids.append(record_id)  # Track this ID for Stage 2
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Staged file for processing: {file_content.file_path} (ID: {record_id})",
                message_type="Info"
            ))
            
        except Exception as e:
            # Create DLQ record for failed file staging
            dlq_record = create_dlq_record(file_content.file_path, str(e))
            dlq_records.append(dlq_record)
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to stage file {file_content.file_path}: {str(e)}",
                message_type="Error"
            ))

    # Send UnstructuredData records to ingest API for staging
    if unstructured_records:
        unstructured_dicts = [record.model_dump() for record in unstructured_records]
        
        try:
            response = requests.post(
                "http://localhost:4200/ingest/UnstructuredData",
                json=unstructured_dicts,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Successfully staged {len(unstructured_records)} files in UnstructuredData table",
                message_type="Info"
            ))
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to send UnstructuredData records to ingest API: {str(e)}",
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
    
    # Return the list of IDs that were created for Stage 2 to process
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"🔵 STAGE 1 FUNCTION EXIT: Created {len(created_record_ids)} UnstructuredData records",
        message_type="Info"
    ))
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"🔑 STAGE 1 OUTPUT: Returning record IDs for Stage 2: {created_record_ids}",
        message_type="Info"
    ))
    
    return created_record_ids


def stage_2_unstructured_to_medical(input: UnstructuredDataExtractParams, record_ids_to_process: List[str]) -> None:
    """
    Stage 2: Process specific UnstructuredData records (created by Stage 1) and create Medical records.
    Uses the same ID from UnstructuredData for the Medical record to maintain relationship.
    
    Args:
        input: Extract parameters
        record_ids_to_process: List of UnstructuredData record IDs to process (from Stage 1)
    """
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow", 
        message=f"🟢 STAGE 2 FUNCTION ENTRY: Processing {len(record_ids_to_process)} specific UnstructuredData records", 
        message_type="Info"
    ))
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow", 
        message=f"🔑 STAGE 2 INPUT: Target record IDs from Stage 1: {record_ids_to_process}", 
        message_type="Info"
    ))

    if not record_ids_to_process:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="❌ STAGE 2 ABORT: No records to process - Stage 1 didn't create any UnstructuredData records",
            message_type="Info"
        ))
        return

    # Query UnstructuredData table for the specific records we need to process
    try:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"DEBUG: Querying UnstructuredData table for records: {record_ids_to_process}",
            message_type="Info"
        ))
        
        # Get all UnstructuredData records and filter to our specific IDs
        response = requests.get(
            "http://localhost:4200/consumption/getUnstructuredData?limit=1000",
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        
        unstructured_data = response.json()
        all_records = unstructured_data.get('items', [])
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"DEBUG: Retrieved {len(all_records)} total UnstructuredData records from API",
            message_type="Info"
        ))
        
        # Filter to only the records we want to process
        unprocessed_records = [record for record in all_records if record.get('id') in record_ids_to_process]
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Found {len(unprocessed_records)} of {len(record_ids_to_process)} target records to process",
            message_type="Info"
        ))
        
        if len(unprocessed_records) == 0:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"WARNING: No records found matching target IDs.",
                message_type="Warning"
            ))
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"DEBUG: Target IDs: {record_ids_to_process}",
                message_type="Info"
            ))
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"DEBUG: Available IDs: {[r.get('id') for r in all_records[:10]]}",
                message_type="Info"
            ))
        
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Could not query UnstructuredData table: {str(e)}",
            message_type="Error"
        ))
        return

    # Process each UnstructuredData record with LLM
    medical_records = []
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message="DEBUG: Initializing LLM service for processing",
        message_type="Info"
    ))
    
    try:
        llm_service = get_llm_service()
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="DEBUG: LLM service initialized successfully",
            message_type="Info"
        ))
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"ERROR: Failed to initialize LLM service: {str(e)}",
            message_type="Error"
        ))
        return

    for record in unprocessed_records:
        try:
            # Extract data from the record
            record_id = record.get('id')
            source_file_path = record.get('source_file_path')
            file_content = record.get('extracted_data_json')  # Raw file content stored from Stage 1
            processing_instructions = record.get('processing_instructions')
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Processing record {record_id} from {source_file_path}",
                message_type="Info"
            ))

            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"DEBUG: File content length: {len(file_content) if file_content else 0} chars, Instructions: {processing_instructions[:50] if processing_instructions else 'None'}...",
                message_type="Info"
            ))

            # Use LLM to extract structured data from file content
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"DEBUG: Calling LLM service for record {record_id}",
                message_type="Info"
            ))
            
            extracted_data = llm_service.extract_structured_data(
                file_content=file_content,
                file_type="text",  # Assume text for now, could be enhanced later
                instruction=processing_instructions,
                file_path=source_file_path
            )
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"DEBUG: LLM extraction completed for {record_id}. Extracted keys: {list(extracted_data.keys()) if extracted_data else 'None'}",
                message_type="Info"
            ))
            
            # Create Medical record with SAME ID as UnstructuredData record
            medical_record = Medical(
                id=record_id,  # Use same ID to maintain relationship!
                patient_name=extracted_data.get("patient_name", ""),
                phone_number=extracted_data.get("phone_number", ""),
                scheduled_appointment_date=extracted_data.get("scheduled_appointment_date", ""),
                dental_procedure_name=extracted_data.get("dental_procedure_name", ""),
                doctor=extracted_data.get("doctor", ""),
                transform_timestamp=datetime.now().isoformat(),
                source_file_path=source_file_path
            )
            
            medical_records.append(medical_record)
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Successfully processed UnstructuredData record {record_id} to Medical record",
                message_type="Info"
            ))
            
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to process UnstructuredData record {record.get('id', 'unknown')}: {str(e)}",
                message_type="Error"
            ))

    # Send Medical records to ingest API
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
                message=f"Successfully created {len(medical_records)} Medical records from UnstructuredData",
                message_type="Info"
            ))
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to send Medical records to ingest API: {str(e)}",
                message_type="Error"
            ))
    else:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="❌ STAGE 2 ISSUE: No Medical records created - no UnstructuredData records were successfully processed",
            message_type="Info"
        ))
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message="🟢 STAGE 2 FUNCTION EXIT: Completed UnstructuredData → Medical processing",
        message_type="Info"
    ))

def run_task(input: UnstructuredDataExtractParams) -> None:
    cli_log(CliLogData(action="UnstructuredDataWorkflow", message="Running UnstructuredData task...", message_type="Info"))

    # Create S3 connector to extract files matching the pattern
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

    # Create UnstructuredDataSource records and send to ingest API (following standard pattern)
    unstructured_source_records = []
    
    for file_content in files:
        try:
            # Generate unique ID
            record_id = f"unstr_{str(uuid.uuid4())}"
            
            # Create UnstructuredDataSource record (source model, like other workflows)
            source_record = UnstructuredDataSource(
                id=record_id,
                source_file_path=file_content.file_path,
                extracted_data_json=file_content.content,  # Store raw file content
                processed_at=datetime.now().isoformat(),
                processing_instructions=input.processing_instructions or ""
            )
            
            unstructured_source_records.append(source_record)
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Prepared source record for: {file_content.file_path}",
                message_type="Info"
            ))
            
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to prepare source record for {file_content.file_path}: {str(e)}",
                message_type="Error"
            ))

    # Send UnstructuredDataSource records to ingest API (standard pattern)
    if unstructured_source_records:
        source_data_dicts = [record.model_dump() for record in unstructured_source_records]
        
        try:
            response = requests.post(
                "http://localhost:4200/ingest/UnstructuredDataSource",
                json=source_data_dicts,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Successfully sent {len(unstructured_source_records)} items to ingest API",
                message_type="Info"
            ))
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to send data to ingest API: {str(e)}",
                message_type="Error"
            ))

# Standard task following project pattern
unstructured_data_task = Task[UnstructuredDataExtractParams, None](
    name="unstructured-data-task",
    config=TaskConfig(run=run_task)
)

# Standard workflow following project pattern
unstructured_data_workflow = Workflow(
    name="unstructured-data-workflow",
    config=WorkflowConfig(starting_task=unstructured_data_task)
)