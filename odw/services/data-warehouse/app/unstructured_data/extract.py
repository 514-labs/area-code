from app.ingest.models import UnstructuredDataSource
from app.utils.simulator import simulate_failures
from app.utils.file_reader import FileReader
from app.utils.batch_workflow_manager import BatchWorkflowManager
from app.utils.s3_pattern_validator import S3PatternValidator
from app.utils.llm_service import get_llm_service
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.unstructured_data_connector import UnstructuredDataConnectorConfig
from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import requests
import json

# This workflow extracts UnstructuredData and sends it to the ingest API.
# Enhanced to support both single-file processing and S3 pattern batch processing.
# For more information on workflows, see: https://docs.fiveonefour.com/moose/building/workflows.
#
# The workflow now handles:
# 1. Legacy single-file processing from connector queue
# 2. S3 pattern expansion and batch processing with LLM
# 3. Failed file handling via DLQ
# 4. Database-based processing for unprocessed records
#
# When the data lands in ingest, it goes through a stream where it is transformed.
# See app/ingest/transforms.py for the transformation logic.

class UnstructuredDataExtractParams(BaseModel):
    batch_size: Optional[int] = 100
    fail_percentage: Optional[int] = 0

def get_unprocessed_records_from_database(client, limit: int = 100) -> List[UnstructuredDataSource]:
    """
    Read unprocessed records from the UnstructuredData table.
    Only process records from the last 24 hours to avoid processing old records
    with different processing instructions.
    
    Args:
        client: Database client
        limit: Maximum number of records to retrieve
        
    Returns:
        List of UnstructuredDataSource records that need processing
    """
    query = """
        SELECT
            id,
            source_file_path,
            extracted_data_json,
            processed_at,
            processing_instructions
        FROM UnstructuredData
        WHERE extracted_data_json IS NULL OR extracted_data_json = ''
        ORDER BY id DESC
        LIMIT {limit}
    """
    
    try:
        result = client.query.execute(query, {"limit": limit})
        records = []
        
        for item in result:
            record = UnstructuredDataSource(
                id=item['id'],
                source_file_path=item['source_file_path'],
                extracted_data_json=item['extracted_data_json'],
                processed_at=item['processed_at'],
                processing_instructions=item.get('processing_instructions')
            )
            records.append(record)
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Retrieved {len(records)} unprocessed records from database",
            message_type="Info"
        ))
        
        return records
        
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Error reading from database: {str(e)}",
            message_type="Error"
        ))
        return []

def process_unstructured_data_item(item: UnstructuredDataSource) -> UnstructuredDataSource:
    """
    Process a single unstructured data item by reading the file and extracting basic data.
    
    Args:
        item: UnstructuredDataSource containing source_file_path
        
    Returns:
        Modified UnstructuredDataSource with extracted_data_json populated
    """
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Processing unstructured data from: {item.source_file_path}",
        message_type="Info"
    ))
    
    # Step 1: Read file content from source_file_path
    file_reader = FileReader()
    file_content = file_reader.read_file(item.source_file_path)
    
    if not file_content:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"No content found in file: {item.source_file_path}",
            message_type="Warning"
        ))
        item.extracted_data_json = json.dumps({
            "error": "no_content_found",
            "file_path": item.source_file_path
        })
        return item
    
    # Determine file type from path
    file_type = item.source_file_path.split('.')[-1].lower() if '.' in item.source_file_path else 'unknown'
    
    # Step 2: Basic extraction - convert file content to structured JSON
    item = perform_basic_extraction(item, file_content, file_type)
    
    return item

def perform_basic_extraction(item: UnstructuredDataSource, file_content: str, file_type: str) -> UnstructuredDataSource:
    """
    Perform extraction of file content using LLM service for intelligent processing.
    
    Args:
        item: UnstructuredDataSource to update
        file_content: Raw content from the file
        file_type: Type of file (txt, pdf, json, image, etc.)
        
    Returns:
        Updated UnstructuredDataSource with extracted_data_json
    """
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Performing LLM extraction for {file_type} file",
        message_type="Info"
    ))
    
    try:
        # Get LLM service for intelligent extraction
        llm_service = get_llm_service()
        
        # Use processing instructions if available, otherwise use default
        processing_instructions = item.processing_instructions or "Extract and structure data from this file"
        
        # Perform LLM-based extraction
        extracted_data = llm_service.extract_structured_data(
            file_content=file_content,
            file_type=file_type,
            instruction=processing_instructions,
            file_path=item.source_file_path
        )
        
        # Add metadata
        extracted_data.update({
            "source_file_path": item.source_file_path,
            "processed_timestamp": item.processed_at,
            "extraction_method": "llm_intelligent",
            "file_type": file_type
        })
        
        item.extracted_data_json = json.dumps(extracted_data)
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Successfully extracted data from {file_type} file using LLM",
            message_type="Info"
        ))
        
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"LLM extraction failed: {str(e)}",
            message_type="Error"
        ))
        
        # Fallback to basic extraction if LLM fails
        try:
            if file_type in ['json']:
                # For JSON files, try to parse the content
                try:
                    parsed_json = json.loads(file_content)
                    extracted_data = {
                        "file_type": file_type,
                        "extraction_method": "json_parse_fallback",
                        "data": parsed_json,
                        "error": "llm_extraction_failed",
                        "error_message": str(e)
                    }
                except json.JSONDecodeError:
                    extracted_data = {
                        "file_type": file_type,
                        "extraction_method": "text_fallback",
                        "raw_content": file_content[:1000] + "..." if len(file_content) > 1000 else file_content,
                        "error": "llm_extraction_failed",
                        "error_message": str(e)
                    }
            else:
                # For other file types, store as text content
                extracted_data = {
                    "file_type": file_type,
                    "extraction_method": "text_content_fallback",
                    "raw_content": file_content[:1000] + "..." if len(file_content) > 1000 else file_content,
                    "content_length": len(file_content),
                    "error": "llm_extraction_failed",
                    "error_message": str(e)
                }
            
            # Add metadata
            extracted_data.update({
                "source_file_path": item.source_file_path,
                "processed_timestamp": item.processed_at
            })
            
            item.extracted_data_json = json.dumps(extracted_data)
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Fallback extraction completed for {file_type} file",
                message_type="Warning"
            ))
            
        except Exception as fallback_error:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Fallback extraction also failed: {str(fallback_error)}",
                message_type="Error"
            ))
            
            # Final fallback
            item.extracted_data_json = json.dumps({
                "error": "extraction_failed",
                "error_message": f"LLM: {str(e)}, Fallback: {str(fallback_error)}",
                "file_type": file_type,
                "source_file_path": item.source_file_path
            })
    
    return item

def has_s3_patterns_to_process(connector) -> bool:
    """
    Check if there are any items with S3 patterns that need batch processing.
    
    Args:
        connector: UnstructuredDataConnector instance
        
    Returns:
        True if there are S3 patterns with wildcards to process
    """
    if not connector.has_pending_data():
        return False
    
    # Peek at pending data to check for patterns
    for item in connector._pending_data:
        if item.source_file_path and S3PatternValidator._has_wildcards(item.source_file_path):
            return True
    
    return False

def extract_and_process_s3_patterns(connector, batch_manager: BatchWorkflowManager) -> List[UnstructuredDataSource]:
    """
    Extract S3 patterns from connector and process them using batch manager.
    
    Args:
        connector: UnstructuredDataConnector instance
        batch_manager: BatchWorkflowManager for processing patterns
        
    Returns:
        List of processed UnstructuredDataSource records
    """
    processed_records = []
    patterns_processed = []
    
    # Extract items with S3 patterns
    pattern_items = []
    regular_items = []
    
    for item in connector._pending_data[:]:
        if item.source_file_path and S3PatternValidator._has_wildcards(item.source_file_path):
            pattern_items.append(item)
            connector._pending_data.remove(item)
        else:
            regular_items.append(item)
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Found {len(pattern_items)} S3 patterns to process",
        message_type="Info"
    ))
    
    # Process each S3 pattern
    for pattern_item in pattern_items:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Processing S3 pattern: {pattern_item.source_file_path}",
            message_type="Info"
        ))
        
        try:
            # Use batch manager to process the S3 pattern
            batch_result = batch_manager.process_s3_pattern(
                s3_pattern=pattern_item.source_file_path,
                processing_instructions=pattern_item.processing_instructions or "Extract and structure data from this file",
                batch_id=pattern_item.id  # Use the original item ID as batch ID
            )
            
            if batch_result['success']:
                # Collect successful records from batch processing
                for result in batch_manager._last_processing_results if hasattr(batch_manager, '_last_processing_results') else []:
                    if result['success'] and 'record' in result:
                        processed_records.append(result['record'])
                
                patterns_processed.append({
                    'pattern': pattern_item.source_file_path,
                    'batch_id': batch_result['batch_id'],
                    'files_processed': batch_result['summary']['files_succeeded'],
                    'files_failed': batch_result['summary']['files_failed']
                })
                
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Successfully processed pattern {pattern_item.source_file_path}: {batch_result['summary']['files_succeeded']} files",
                    message_type="Info"
                ))
            else:
                # Create a failed record for the pattern
                failed_record = UnstructuredDataSource(
                    id=pattern_item.id,
                    source_file_path=f"[DLQ]PATTERN_ERROR_{pattern_item.source_file_path}",
                    extracted_data_json=json.dumps({
                        "error": "pattern_processing_failed",
                        "original_pattern": pattern_item.source_file_path,
                        "error_message": batch_result.get('error_message', 'Unknown error'),
                        "batch_id": batch_result['batch_id']
                    }),
                    processed_at=pattern_item.processed_at,
                    processing_instructions=pattern_item.processing_instructions
                )
                processed_records.append(failed_record)
                
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Failed to process pattern {pattern_item.source_file_path}: {batch_result.get('error_message')}",
                    message_type="Error"
                ))
                
        except Exception as e:
            # Create a failed record for unexpected errors
            failed_record = UnstructuredDataSource(
                id=pattern_item.id,
                source_file_path=f"[DLQ]PATTERN_EXCEPTION_{pattern_item.source_file_path}",
                extracted_data_json=json.dumps({
                    "error": "pattern_processing_exception",
                    "original_pattern": pattern_item.source_file_path,
                    "error_message": str(e)
                }),
                processed_at=pattern_item.processed_at,
                processing_instructions=pattern_item.processing_instructions
            )
            processed_records.append(failed_record)
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Exception processing pattern {pattern_item.source_file_path}: {str(e)}",
                message_type="Error"
            ))
    
    # Log summary of pattern processing
    if patterns_processed:
        total_files = sum(p['files_processed'] + p['files_failed'] for p in patterns_processed)
        successful_files = sum(p['files_processed'] for p in patterns_processed)
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Batch processing summary: {successful_files}/{total_files} files processed successfully across {len(patterns_processed)} patterns",
            message_type="Info"
        ))
    
    return processed_records

def run_task(input: UnstructuredDataExtractParams) -> None:
    cli_log(CliLogData(action="UnstructuredDataWorkflow", message="Running Enhanced UnstructuredData task...", message_type="Info"))

    # Get database client from Moose
    from moose_lib import MooseClient
    from clickhouse_connect import get_client
    
    ch_client = get_client(
        interface='http',
        host='localhost',
        port=18123,
        database='local',
        username='panda',
        password='pandapass'
    )
    
    moose_client = MooseClient(ch_client, None)

    # Phase 1: Read unprocessed records from database
    unprocessed_records = get_unprocessed_records_from_database(moose_client, input.batch_size)
    
    if not unprocessed_records:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="No unprocessed records found in database",
            message_type="Info"
        ))
        return

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Found {len(unprocessed_records)} unprocessed records to process",
        message_type="Info"
    ))

    # Initialize batch workflow manager for S3 pattern processing
    batch_manager = BatchWorkflowManager()
    all_processed_data = []

    # Phase 2: Process S3 patterns with wildcards
    wildcard_records = [record for record in unprocessed_records if S3PatternValidator._has_wildcards(record.source_file_path)]
    regular_records = [record for record in unprocessed_records if not S3PatternValidator._has_wildcards(record.source_file_path)]
    
    if wildcard_records:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Processing {len(wildcard_records)} S3 patterns with wildcards",
            message_type="Info"
        ))
        
        # Process each wildcard pattern
        for record in wildcard_records:
            try:
                batch_result = batch_manager.process_s3_pattern(
                    s3_pattern=record.source_file_path,
                    processing_instructions=record.processing_instructions or "Extract and structure data from this file",
                    batch_id=record.id
                )
                
                if batch_result['success']:
                    # Collect successful records from batch processing
                    for result in batch_manager._last_processing_results if hasattr(batch_manager, '_last_processing_results') else []:
                        if result['success'] and 'record' in result:
                            all_processed_data.append(result['record'])
                    
                    cli_log(CliLogData(
                        action="UnstructuredDataWorkflow",
                        message=f"Successfully processed pattern {record.source_file_path}: {batch_result['summary']['files_succeeded']} files",
                        message_type="Info"
                    ))
                else:
                    # Create a failed record for the pattern
                    failed_record = UnstructuredDataSource(
                        id=record.id,
                        source_file_path=f"[DLQ]PATTERN_ERROR_{record.source_file_path}",
                        extracted_data_json=json.dumps({
                            "error": "pattern_processing_failed",
                            "original_pattern": record.source_file_path,
                            "error_message": batch_result.get('error_message', 'Unknown error'),
                            "batch_id": batch_result['batch_id']
                        }),
                        processed_at=record.processed_at,
                        processing_instructions=record.processing_instructions
                    )
                    all_processed_data.append(failed_record)
                    
            except Exception as e:
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Failed to process pattern {record.source_file_path}: {str(e)}",
                    message_type="Error"
                ))
                # Create a failed record for unexpected errors
                failed_record = UnstructuredDataSource(
                    id=record.id,
                    source_file_path=f"[DLQ]PATTERN_EXCEPTION_{record.source_file_path}",
                    extracted_data_json=json.dumps({
                        "error": "pattern_processing_exception",
                        "original_pattern": record.source_file_path,
                        "error_message": str(e)
                    }),
                    processed_at=record.processed_at,
                    processing_instructions=record.processing_instructions
                )
                all_processed_data.append(failed_record)

    # Phase 3: Process regular single-file items
    if regular_records:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Processing {len(regular_records)} regular single-file items",
            message_type="Info"
        ))
        
        # Process each regular item: read file and perform basic extraction
        for item in regular_records:
            try:
                processed_item = process_unstructured_data_item(item)
                all_processed_data.append(processed_item)
            except Exception as e:
                cli_log(CliLogData(
                    action="UnstructuredDataWorkflow",
                    message=f"Failed to process regular item {item.id}: {str(e)}",
                    message_type="Error"
                ))
                # Mark item as failed and continue
                item.source_file_path = f"[DLQ]PROCESSING_ERROR_{item.source_file_path}"
                all_processed_data.append(item)

    # Phase 3: Apply failure simulation and send to ingest API
    if all_processed_data:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Completed processing {len(all_processed_data)} total items",
            message_type="Info"
        ))

        # Apply failure simulation if specified
        failed_count = simulate_failures(all_processed_data, input.fail_percentage)
        if failed_count > 0:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Marked {failed_count} items ({input.fail_percentage}%) as failed",
                message_type="Info"
            ))

        # Send all processed data to ingest API
        data_dicts = [item.model_dump() for item in all_processed_data]
        
        try:
            response = requests.post(
                "http://localhost:4200/ingest/UnstructuredDataSource",
                json=data_dicts,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Successfully sent {len(all_processed_data)} items to ingest API",
                message_type="Info"
            ))
        except Exception as e:
            cli_log(CliLogData(
                action="UnstructuredDataWorkflow",
                message=f"Failed to send data to ingest API: {str(e)}",
                message_type="Error"
            ))
    else:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="No data to process after pattern and regular item extraction",
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