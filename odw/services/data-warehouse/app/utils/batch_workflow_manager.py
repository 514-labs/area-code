import json
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from moose_lib import cli_log, CliLogData
from app.ingest.models import UnstructuredDataSource
from .s3_wildcard_resolver import S3WildcardResolver
from .file_reader import FileReader
from .llm_service import LLMService

class BatchWorkflowManager:
    """
    Manages batch processing of multiple files from S3 patterns.
    Handles file discovery, processing, LLM integration, and record creation.
    """
    
    def __init__(self, config_path: str = "moose.config.toml"):
        """
        Initialize the batch workflow manager.
        
        Args:
            config_path: Path to the moose configuration file
        """
        self.s3_resolver = S3WildcardResolver(config_path)
        self.file_reader = FileReader()
        self.llm_service = LLMService()
        self.batch_id = None
        self.abort_requested = False
        self._last_processing_results = []  # Store results for workflow access
    
    def process_s3_pattern(
        self, 
        s3_pattern: str, 
        processing_instructions: str,
        batch_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process an S3 pattern by discovering files and processing each one.
        
        Args:
            s3_pattern: S3 pattern with wildcards (e.g., "s3://bucket/*/reports/*.txt")
            processing_instructions: Instructions for LLM processing
            batch_id: Optional batch ID for tracking (generates one if not provided)
            
        Returns:
            Dictionary with batch processing results
        """
        
        # Generate batch ID if not provided
        if not batch_id:
            self.batch_id = str(uuid.uuid4())
        else:
            self.batch_id = batch_id
        
        self.abort_requested = False
        
        cli_log(CliLogData(
            action="BatchWorkflowManager",
            message=f"Starting batch processing for pattern: {s3_pattern} (Batch ID: {self.batch_id})",
            message_type="Info"
        ))
        
        try:
            # Phase 1: Resolve S3 pattern to file list
            resolution_result = self.s3_resolver.resolve_pattern(s3_pattern)
            
            if not resolution_result['success']:
                return {
                    'success': False,
                    'batch_id': self.batch_id,
                    'error_message': resolution_result['error_message'],
                    'phase': 'pattern_resolution',
                    'summary': {
                        'pattern': s3_pattern,
                        'files_found': 0,
                        'files_processed': 0,
                        'files_succeeded': 0,
                        'files_failed': 0,
                        'files_aborted': 0
                    }
                }
            
            files_found = resolution_result['files_found']
            total_files = len(files_found)
            
            cli_log(CliLogData(
                action="BatchWorkflowManager",
                message=f"Resolved {total_files} files for processing",
                message_type="Info"
            ))
            
            if total_files == 0:
                return {
                    'success': True,
                    'batch_id': self.batch_id,
                    'message': 'No files found matching the pattern',
                    'phase': 'completed',
                    'summary': {
                        'pattern': s3_pattern,
                        'files_found': 0,
                        'files_processed': 0,
                        'files_succeeded': 0,
                        'files_failed': 0,
                        'files_aborted': 0
                    }
                }
            
            # Phase 2: Process each file individually
            processing_results = self._process_file_batch(
                files_found, 
                processing_instructions, 
                s3_pattern
            )
            
            # Store results for workflow access
            self._last_processing_results = processing_results
            
            # Compile final results
            files_succeeded = len([r for r in processing_results if r['success']])
            files_failed = len([r for r in processing_results if not r['success'] and not r.get('aborted', False)])
            files_aborted = len([r for r in processing_results if r.get('aborted', False)])
            
            success_rate = (files_succeeded / total_files) * 100 if total_files > 0 else 0
            
            result = {
                'success': True,
                'batch_id': self.batch_id,
                'message': f'Batch processing completed. Success rate: {success_rate:.1f}%',
                'phase': 'completed',
                'summary': {
                    'pattern': s3_pattern,
                    'files_found': total_files,
                    'files_processed': len(processing_results),
                    'files_succeeded': files_succeeded,
                    'files_failed': files_failed,
                    'files_aborted': files_aborted
                },
                'processing_info': resolution_result.get('processing_info', {}),
                'successful_records': [r['record_id'] for r in processing_results if r['success']],
                'failed_files': [
                    {
                        'file_path': r['file_path'],
                        'error': r['error_message']
                    } 
                    for r in processing_results 
                    if not r['success'] and not r.get('aborted', False)
                ]
            }
            
            cli_log(CliLogData(
                action="BatchWorkflowManager",
                message=f"Batch processing completed: {files_succeeded}/{total_files} files succeeded",
                message_type="Info"
            ))
            
            return result
            
        except Exception as e:
            error_msg = f"Batch processing failed: {str(e)}"
            cli_log(CliLogData(
                action="BatchWorkflowManager",
                message=error_msg,
                message_type="Error"
            ))
            
            return {
                'success': False,
                'batch_id': self.batch_id,
                'error_message': error_msg,
                'phase': 'error',
                'summary': {
                    'pattern': s3_pattern,
                    'files_found': 0,
                    'files_processed': 0,
                    'files_succeeded': 0,
                    'files_failed': 0,
                    'files_aborted': 0
                }
            }
    
    def _process_file_batch(
        self, 
        file_paths: List[str], 
        processing_instructions: str,
        original_pattern: str
    ) -> List[Dict[str, Any]]:
        """
        Process a batch of files with LLM and create records.
        
        Args:
            file_paths: List of S3 file paths to process
            processing_instructions: Instructions for LLM processing
            original_pattern: Original S3 pattern for reference
            
        Returns:
            List of processing results for each file
        """
        results = []
        
        for i, file_path in enumerate(file_paths):
            # Check for abort request
            if self.abort_requested:
                cli_log(CliLogData(
                    action="BatchWorkflowManager",
                    message=f"Processing aborted at file {i+1}/{len(file_paths)}",
                    message_type="Warning"
                ))
                
                # Mark remaining files as aborted
                for remaining_path in file_paths[i:]:
                    results.append({
                        'success': False,
                        'aborted': True,
                        'file_path': remaining_path,
                        'error_message': 'Processing aborted by user',
                        'record_id': None
                    })
                break
            
            cli_log(CliLogData(
                action="BatchWorkflowManager",
                message=f"Processing file {i+1}/{len(file_paths)}: {file_path}",
                message_type="Info"
            ))
            
            file_result = self._process_single_file(
                file_path, 
                processing_instructions, 
                original_pattern
            )
            
            results.append(file_result)
        
        return results
    
    def _process_single_file(
        self, 
        file_path: str, 
        processing_instructions: str,
        original_pattern: str
    ) -> Dict[str, Any]:
        """
        Process a single file with LLM and create an UnstructuredDataSource record.
        
        Args:
            file_path: S3 path to the file
            processing_instructions: Instructions for LLM processing
            original_pattern: Original S3 pattern for reference
            
        Returns:
            Dictionary with processing results
        """
        
        try:
            # Step 1: Read file content
            file_content, file_type = self.file_reader.read_file(file_path)
            
            if not file_content:
                return {
                    'success': False,
                    'aborted': False,
                    'file_path': file_path,
                    'error_message': 'No content found in file',
                    'record_id': None
                }
            
            # Step 2: Process with LLM
            extracted_data = self.llm_service.extract_structured_data(
                file_content=file_content,
                file_type=file_type,
                instruction=processing_instructions,
                file_path=file_path
            )
            
            # Step 3: Create UnstructuredDataSource record
            record_id = str(uuid.uuid4())
            
            # Add batch metadata to extracted data
            if isinstance(extracted_data, dict):
                extracted_data['batch_info'] = {
                    'batch_id': self.batch_id,
                    'original_pattern': original_pattern,
                    'file_path': file_path,
                    'processing_timestamp': datetime.now().isoformat()
                }
            
            unstructured_data_record = UnstructuredDataSource(
                id=record_id,
                source_file_path=file_path,
                extracted_data_json=json.dumps(extracted_data),
                processed_at=datetime.now().isoformat(),
                processing_instructions=processing_instructions
            )
            
            cli_log(CliLogData(
                action="BatchWorkflowManager",
                message=f"Successfully processed file: {file_path}",
                message_type="Info"
            ))
            
            return {
                'success': True,
                'aborted': False,
                'file_path': file_path,
                'error_message': None,
                'record_id': record_id,
                'record': unstructured_data_record
            }
            
        except Exception as e:
            error_msg = f"Failed to process file {file_path}: {str(e)}"
            cli_log(CliLogData(
                action="BatchWorkflowManager",
                message=error_msg,
                message_type="Error"
            ))
            
            return {
                'success': False,
                'aborted': False,
                'file_path': file_path,
                'error_message': error_msg,
                'record_id': None
            }
    
    def request_abort(self) -> bool:
        """
        Request abortion of the current batch processing.
        
        Returns:
            True if abort was requested successfully
        """
        if self.batch_id:
            self.abort_requested = True
            cli_log(CliLogData(
                action="BatchWorkflowManager",
                message=f"Abort requested for batch: {self.batch_id}",
                message_type="Warning"
            ))
            return True
        return False
    
    def get_batch_status(self, batch_id: str) -> Dict[str, Any]:
        """
        Get the current status of a batch processing operation.
        
        Args:
            batch_id: ID of the batch to check
            
        Returns:
            Dictionary with batch status information
        """
        # This would integrate with a batch tracking system in a production environment
        # For now, return basic status
        
        if batch_id == self.batch_id:
            return {
                'batch_id': batch_id,
                'status': 'processing' if not self.abort_requested else 'aborting',
                'abort_requested': self.abort_requested
            }
        else:
            return {
                'batch_id': batch_id,
                'status': 'unknown',
                'error': 'Batch ID not found or completed'
            }
    
    def estimate_processing_time(self, file_count: int) -> Dict[str, Any]:
        """
        Estimate processing time based on file count and system capabilities.
        
        Args:
            file_count: Number of files to process
            
        Returns:
            Dictionary with time estimates
        """
        # Basic estimation (would be calibrated based on actual performance)
        base_time_per_file = 10  # seconds per file (rough estimate)
        llm_enabled = self.llm_service.enabled
        
        if not llm_enabled:
            base_time_per_file = 2  # Much faster without LLM
        
        estimated_seconds = file_count * base_time_per_file
        estimated_minutes = estimated_seconds / 60
        
        return {
            'file_count': file_count,
            'estimated_seconds': estimated_seconds,
            'estimated_minutes': round(estimated_minutes, 1),
            'llm_enabled': llm_enabled,
            'recommendation': self._get_processing_recommendation(file_count, estimated_minutes)
        }
    
    def _get_processing_recommendation(self, file_count: int, estimated_minutes: float) -> str:
        """Get recommendation based on processing estimates."""
        if file_count == 0:
            return "No files to process"
        elif file_count <= 10:
            return "Quick processing - should complete in a few minutes"
        elif file_count <= 100:
            return "Moderate processing time - consider running in background"
        elif estimated_minutes > 60:
            return "Long processing time - recommend running during off-peak hours"
        else:
            return "Standard processing time expected" 