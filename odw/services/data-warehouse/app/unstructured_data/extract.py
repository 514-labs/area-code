from app.ingest.models import Medical, UnstructuredData, UnstructuredDataSource
from app.utils.llm_service import get_llm_service
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.s3_connector import S3ConnectorConfig, S3FileContent
from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import requests
import json
import uuid


def _get_field_value(data: Dict[str, Any], field_names: List[str]) -> str:
    """
    Flexibly extract field value from LLM results using multiple possible field names.
    
    Args:
        data: Extracted data dictionary from LLM
        field_names: List of possible field names to look for (in order of preference)
        
    Returns:
        The first matching field value found, or empty string if none found
    """
    for field_name in field_names:
        if field_name in data and data[field_name]:
            value = data[field_name]
            # Handle cases where LLM returns placeholder text
            if isinstance(value, str) and value not in ["", "N/A", "Not available", "Unknown", "[no data]", "null"]:
                return value.strip()
    return ""


# For more information on workflows, see: https://docs.fiveonefour.com/moose/building/workflows.

class UnstructuredDataExtractParams(BaseModel):
    source_file_pattern: str  # Required S3 pattern to process
    processing_instructions: Optional[str] = """Extract the following information from this dental appointment document and return it as JSON with these exact field names:

{
  "patient_name": "[full patient name]",
  "phone_number": "[patient phone number with any extensions]", 
  "patient_age": "[patient age]",
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
        patient_age=extracted_data.get("patient_age", ""),
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
        extracted_data=json.dumps({"error": error_message}),
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
                extracted_data=file_content.content,  # Store raw file content for LLM processing
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
    # Add retry logic to handle eventual consistency between write and read
    import time
    max_retries = 3
    retry_delay = 2  # seconds
    
    target_records = []
    all_records = []
    
    for attempt in range(max_retries):
        try:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"DEBUG: Querying UnstructuredData table for records (attempt {attempt + 1}/{max_retries}): {record_ids_to_process}",
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
            
            # Check if we found our target records
            target_records = [record for record in all_records if record.get('id') in record_ids_to_process]
            
            if len(target_records) == len(record_ids_to_process):
                # Found all records, break out of retry loop
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"✅ Found all {len(target_records)} target records on attempt {attempt + 1}",
                    message_type="Info"
                ))
                break
            elif len(target_records) > 0:
                # Found some but not all records
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"⚠️ Found {len(target_records)}/{len(record_ids_to_process)} records on attempt {attempt + 1}, retrying...",
                    message_type="Info"
                ))
            else:
                # Found no records
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"⚠️ Found 0/{len(record_ids_to_process)} records on attempt {attempt + 1}, retrying...",
                    message_type="Info"
                ))
            
            # If not last attempt, wait before retrying
            if attempt < max_retries - 1:
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"⏳ Waiting {retry_delay} seconds before retry...",
                    message_type="Info"
                ))
                time.sleep(retry_delay)
                
        except Exception as e:
            if attempt == max_retries - 1:
                # Last attempt failed, re-raise the exception
                raise e
            else:
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"❌ API query failed on attempt {attempt + 1}: {str(e)}, retrying...",
                    message_type="Info"
                ))
                time.sleep(retry_delay)
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"DEBUG: Retrieved {len(all_records)} total UnstructuredData records from API",
        message_type="Info"
    ))
    
    # Use target_records from the retry loop (already filtered)
    unprocessed_records = target_records
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Found {len(unprocessed_records)} of {len(record_ids_to_process)} target records to process",
        message_type="Info"
    ))
    
    if len(unprocessed_records) == 0:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"❌ STAGE 2 ISSUE: No records found matching target IDs after {max_retries} attempts.",
            message_type="Error"
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
        return

    # Process UnstructuredData records with batch LLM processing
    medical_records = []
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message="DEBUG: Initializing LLM service for batch processing",
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

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Processing {len(unprocessed_records)} records using optimized batch processing",
        message_type="Info"
    ))
    
    # Prepare all records for batch processing (LLMService will handle optimal batching)
    batch_for_llm = []
    processing_instructions = None
    
    for record in unprocessed_records:
        record_id = record.get('id')
        source_file_path = record.get('source_file_path')
        file_content = record.get('extracted_data')  # Raw file content stored from Stage 1
        processing_instructions = record.get('processing_instructions')  # Use last one (should be same for all)
        
        batch_for_llm.append({
            'record_id': record_id,
            'file_content': file_content,
            'file_type': 'text',  # Assume text for now, could be enhanced later
            'file_path': source_file_path
        })
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Prepared {len(batch_for_llm)} records for optimized batch LLM processing",
        message_type="Info"
    ))

    try:
        # Use optimized batch LLM processing (handles chunking automatically)
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"DEBUG: Calling optimized batch LLM service for all {len(batch_for_llm)} records",
            message_type="Info"
        ))
        
        batch_results = llm_service.extract_structured_data_batch(
            batch_records=batch_for_llm,
            instruction=processing_instructions
        )
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"DEBUG: Optimized batch LLM extraction completed. Got {len(batch_results)} results",
            message_type="Info"
        ))
        
        # Process all results and create Medical records
        for i, extracted_data in enumerate(batch_results):
            try:
                # Get corresponding original record
                if i < len(unprocessed_records):
                    original_record = unprocessed_records[i]
                    record_id = original_record.get('id')
                    source_file_path = original_record.get('source_file_path')
                    
                    # Log extraction results with detailed field mapping
                    cli_log(CliLogData(
                        action="UnstructuredDataWorkflow",
                        message=f"DEBUG: Processing result {i+1} for record {record_id}. Extracted keys: {list(extracted_data.keys()) if extracted_data else 'None'}",
                        message_type="Info"
                    ))
                    
                    # Log detailed field extraction for debugging
                    if extracted_data and not "extraction_error" in extracted_data:
                        patient_name = _get_field_value(extracted_data, ["patient_name", "name", "patient", "full_name"])
                        patient_age = _get_field_value(extracted_data, ["patient_age", "age"])
                        cli_log(CliLogData(
                            action="UnstructuredDataWorkflow",
                            message=f"DEBUG: Field mapping for {record_id} - patient_name: '{patient_name}', patient_age: '{patient_age}', full_data: {json.dumps(extracted_data, indent=2)}",
                            message_type="Info"
                        ))
                    
                    # Check if this result contains an error
                    if "extraction_error" in extracted_data:
                        cli_log(CliLogData(
                            action="UnstructuredDataWorkflow",
                            message=f"Extraction error for record {record_id}: {extracted_data.get('extraction_error')}",
                            message_type="Error"
                        ))
                        continue  # Skip this record, don't create a Medical record
                    
                    # Create Medical record with SAME ID as UnstructuredData record
                    # Use flexible field mapping to handle LLM variations in field names
                    medical_record = Medical(
                        id=record_id,  # Use same ID to maintain relationship!
                        patient_name=_get_field_value(extracted_data, ["patient_name", "name", "patient", "full_name"]),
                        patient_age=_get_field_value(extracted_data, ["patient_age", "age"]),
                        phone_number=_get_field_value(extracted_data, ["phone_number", "phone", "telephone", "contact_number"]),
                        scheduled_appointment_date=_get_field_value(extracted_data, ["scheduled_appointment_date", "appointment_date", "date", "scheduled_date"]),
                        dental_procedure_name=_get_field_value(extracted_data, ["dental_procedure_name", "procedure", "treatment", "procedure_name"]),
                        doctor=_get_field_value(extracted_data, ["doctor", "doctor_name", "physician", "treating_doctor"]),
                        transform_timestamp=datetime.now().isoformat(),
                        source_file_path=source_file_path
                    )
                    
                    medical_records.append(medical_record)
                    
                    cli_log(CliLogData(
                        action="UnstructuredDataWorkflow",
                        message=f"Successfully processed UnstructuredData record {record_id} to Medical record",
                        message_type="Info"
                    ))
                else:
                    cli_log(CliLogData(
                        action="UnstructuredDataWorkflow",
                        message=f"WARNING: Got more results ({len(batch_results)}) than input records ({len(unprocessed_records)})",
                        message_type="Info"
                    ))
                    
            except Exception as e:
                record_id = unprocessed_records[i].get('id', 'unknown') if i < len(unprocessed_records) else f'result_{i}'
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Failed to create Medical record for {record_id}: {str(e)}",
                    message_type="Error"
                ))
        
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Optimized batch processing failed: {str(e)} - attempting individual fallback processing",
            message_type="Error"
        ))
        
        # Fallback to individual processing for all records
        fallback_success_count = 0
        fallback_dlq_records = []
        
        for record in unprocessed_records:
            try:
                record_id = record.get('id')
                source_file_path = record.get('source_file_path')
                file_content = record.get('extracted_data')
                processing_instructions = record.get('processing_instructions')
                
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Attempting individual fallback processing for record {record_id}",
                    message_type="Info"
                ))
                
                # Use individual LLM processing as fallback
                extracted_data = llm_service.extract_structured_data(
                    file_content=file_content,
                    file_type="text",
                    instruction=processing_instructions,
                    file_path=source_file_path
                )
                
                # Check if extraction was successful
                if "extraction_error" in extracted_data:
                    cli_log(CliLogData(
                        action="UnstructuredDataWorkflow",
                        message=f"Individual fallback also failed for record {record_id}: {extracted_data.get('extraction_error')}",
                        message_type="Error"
                    ))
                    
                    # Send to DLQ
                    dlq_record = create_dlq_record(source_file_path, f"Batch and individual processing failed: {extracted_data.get('extraction_error')}")
                    fallback_dlq_records.append(dlq_record)
                    continue
                
                # Create Medical record from successful individual processing
                medical_record = Medical(
                    id=record_id,
                    patient_name=extracted_data.get("patient_name", ""),
                    phone_number=extracted_data.get("phone_number", ""),
                    scheduled_appointment_date=extracted_data.get("scheduled_appointment_date", ""),
                    dental_procedure_name=extracted_data.get("dental_procedure_name", ""),
                    doctor=extracted_data.get("doctor", ""),
                    transform_timestamp=datetime.now().isoformat(),
                    source_file_path=source_file_path
                )
                
                medical_records.append(medical_record)
                fallback_success_count += 1
                
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Individual fallback successful for record {record_id}",
                    message_type="Info"
                ))
                
            except Exception as individual_error:
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Individual fallback failed for record {record.get('id', 'unknown')}: {str(individual_error)}",
                    message_type="Error"
                ))
                
                # Send to DLQ
                dlq_record = create_dlq_record(
                    record.get('source_file_path', 'unknown_path'), 
                    f"Both batch and individual processing failed: {str(individual_error)}"
                )
                fallback_dlq_records.append(dlq_record)
        
        # Log fallback results
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Global fallback processing completed: {fallback_success_count} successes, {len(fallback_dlq_records)} sent to DLQ",
            message_type="Info"
        ))
        
        # Send DLQ records if any
        if fallback_dlq_records:
            try:
                dlq_dicts = [record.model_dump() for record in fallback_dlq_records]
                response = requests.post(
                    "http://localhost:4200/ingest/UnstructuredDataSource",
                    json=dlq_dicts,
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Successfully sent {len(fallback_dlq_records)} failed records to DLQ",
                    message_type="Info"
                ))
            except Exception as dlq_error:
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Failed to send DLQ records: {str(dlq_error)}",
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

    # Stage 1: Extract files from S3 and create UnstructuredData staging records
    cli_log(CliLogData(action="UnstructuredDataWorkflow", message="🔵 Starting Stage 1: S3 to UnstructuredData", message_type="Info"))
    record_ids_created = stage_1_s3_to_unstructured(input)
    
    # Stage 2: Process UnstructuredData records to create Medical records using LLM
    cli_log(CliLogData(action="UnstructuredDataWorkflow", message="🟢 Starting Stage 2: UnstructuredData to Medical", message_type="Info"))
    stage_2_unstructured_to_medical(input, record_ids_created)
    
    cli_log(CliLogData(action="UnstructuredDataWorkflow", message="✅ Completed both stages of UnstructuredData workflow", message_type="Info"))

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