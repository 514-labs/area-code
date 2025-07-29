from app.ingest.models import UnstructuredDataSource
from app.utils.simulator import simulate_failures
from app.utils.file_reader import FileReader
from app.utils.batch_workflow_manager import BatchWorkflowManager
from app.utils.s3_pattern_validator import S3PatternValidator
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
#
# When the data lands in ingest, it goes through a stream where it is transformed.
# See app/ingest/transforms.py for the transformation logic.

class UnstructuredDataExtractParams(BaseModel):
    batch_size: Optional[int] = 100
    fail_percentage: Optional[int] = 0

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
    Perform basic extraction of file content to structured JSON.
    
    Args:
        item: UnstructuredDataSource to update
        file_content: Raw content from the file
        file_type: Type of file (txt, pdf, json, etc.)
        
    Returns:
        Updated UnstructuredDataSource with extracted_data_json
    """
    
    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Performing basic extraction for {file_type} file",
        message_type="Info"
    ))
    
    try:
        # Basic extraction based on file type
        if file_type in ['json']:
            # For JSON files, try to parse the content
            try:
                parsed_json = json.loads(file_content)
                extracted_data = {
                    "file_type": file_type,
                    "extraction_method": "json_parse",
                    "data": parsed_json
                }
            except json.JSONDecodeError:
                extracted_data = {
                    "file_type": file_type,
                    "extraction_method": "text_fallback",
                    "raw_content": file_content[:1000] + "..." if len(file_content) > 1000 else file_content
                }
        else:
            # For other file types, store as text content
            extracted_data = {
                "file_type": file_type,
                "extraction_method": "text_content",
                "raw_content": file_content[:1000] + "..." if len(file_content) > 1000 else file_content,
                "content_length": len(file_content)
            }
        
        # Add metadata
        extracted_data.update({
            "source_file_path": item.source_file_path,
            "processed_timestamp": item.processed_at
        })
        
        item.extracted_data_json = json.dumps(extracted_data)
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Successfully extracted data from {file_type} file",
            message_type="Info"
        ))
        
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Basic extraction failed: {str(e)}",
            message_type="Error"
        ))
        
        # Fallback extraction
        item.extracted_data_json = json.dumps({
            "error": "extraction_failed",
            "error_message": str(e),
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

    # Initialize batch workflow manager for S3 pattern processing
    batch_manager = BatchWorkflowManager()
    all_processed_data = []

    # Phase 1: Process S3 patterns with wildcards (new functionality)
    if has_s3_patterns_to_process(connector):
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="Processing S3 patterns with wildcards",
            message_type="Info"
        ))
        
        pattern_processed_data = extract_and_process_s3_patterns(connector, batch_manager)
        all_processed_data.extend(pattern_processed_data)

    # Phase 2: Process regular items (legacy functionality)
    if connector.has_pending_data():
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="Processing regular single-file items",
            message_type="Info"
        ))
        
        # Extract remaining regular data from connector
        regular_data = connector.extract()

        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Extracted {len(regular_data)} regular items for processing",
            message_type="Info"
        ))

        # Process each regular item: read file and perform basic extraction
        for item in regular_data:
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