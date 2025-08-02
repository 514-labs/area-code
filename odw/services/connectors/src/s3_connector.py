from typing import List, TypeVar, Generic, Optional
from pydantic import BaseModel
from moose_lib import cli_log, CliLogData
from .s3_wildcard_resolver import S3WildcardResolver
from .s3_file_reader import S3FileReader
import mimetypes
from pathlib import Path
import base64

T = TypeVar('T')

class S3ConnectorConfig:
    def __init__(self, s3_pattern: str):
        """
        Initialize S3 connector configuration.
        
        Args:
            s3_pattern: S3 pattern to process (e.g., "s3://bucket/*/reports/*.txt")
        """
        self.s3_pattern = s3_pattern

class S3FileContent(BaseModel):
    """Model representing S3 file content for processing."""
    file_path: str
    content: str  # Base64 for binary files, plain text for text files
    content_type: str  # MIME type
    file_size: int
    is_binary: bool

class S3Connector(Generic[T]):
    """
    S3 connector for discovering and reading files from S3 patterns.
    Follows the same pattern as other connectors but interfaces with S3.
    """
    
    def __init__(self, config: S3ConnectorConfig):
        """
        Initialize S3 connector.
        
        Args:
            config: S3 connector configuration
        """
        self.s3_pattern = config.s3_pattern
        self.s3_resolver = S3WildcardResolver()
        self.s3_reader = S3FileReader()
    
    def extract(self) -> List[S3FileContent]:
        """
        Extract files from S3 pattern and return file content objects.
        
        Returns:
            List of S3FileContent objects with file data
        """
        cli_log(CliLogData(
            action="S3Connector",
            message=f"Starting S3 extraction for pattern: {self.s3_pattern}",
            message_type="Info"
        ))
        
        try:
            # Phase 1: Resolve S3 pattern to file list
            resolution_result = self.s3_resolver.resolve_pattern(self.s3_pattern)
            
            if not resolution_result['success']:
                cli_log(CliLogData(
                    action="S3Connector",
                    message=f"Failed to resolve S3 pattern: {resolution_result['error_message']}",
                    message_type="Error"
                ))
                return []
            
            files_found = resolution_result['files_found']
            cli_log(CliLogData(
                action="S3Connector",
                message=f"Resolved {len(files_found)} files for processing",
                message_type="Info"
            ))
            
            if not files_found:
                cli_log(CliLogData(
                    action="S3Connector",
                    message="No files found matching the S3 pattern",
                    message_type="Info"
                ))
                return []
            
            # Phase 2: Read each file and create S3FileContent objects
            file_contents = []
            successful_reads = 0
            failed_reads = 0
            
            for file_path in files_found:
                try:
                    file_content = self._read_file_content(file_path)
                    if file_content:
                        file_contents.append(file_content)
                        successful_reads += 1
                    else:
                        failed_reads += 1
                        
                except Exception as e:
                    cli_log(CliLogData(
                        action="S3Connector",
                        message=f"Failed to read file {file_path}: {str(e)}",
                        message_type="Error"
                    ))
                    failed_reads += 1
                    continue
            
            cli_log(CliLogData(
                action="S3Connector",
                message=f"S3 extraction completed: {successful_reads} successful, {failed_reads} failed",
                message_type="Info"
            ))
            
            return file_contents
            
        except Exception as e:
            cli_log(CliLogData(
                action="S3Connector",
                message=f"S3 connector extraction failed: {str(e)}",
                message_type="Error"
            ))
            return []
    
    def _read_file_content(self, file_path: str) -> Optional[S3FileContent]:
        """
        Read content from a single S3 file.
        
        Args:
            file_path: S3 path to read
            
        Returns:
            S3FileContent object or None if reading fails
        """
        try:
            # Read file using S3FileReader
            content, file_type = self.s3_reader.read_file(file_path)
            
            # Determine if content is binary
            is_binary = self._is_binary_content(content, file_type)
            
            # Get file size estimation
            file_size = self._estimate_file_size(content, is_binary)
            
            # Determine MIME type
            content_type = self._get_content_type(file_path, file_type)
            
            # Process content based on type
            if is_binary:
                # Content is already base64 encoded by S3FileReader for binary files
                processed_content = content
            else:
                # Text content - keep as is
                processed_content = content
            
            cli_log(CliLogData(
                action="S3Connector",
                message=f"Successfully read S3 file: {file_path} (type: {file_type}, binary: {is_binary})",
                message_type="Info"
            ))
            
            return S3FileContent(
                file_path=file_path,
                content=processed_content,
                content_type=content_type,
                file_size=file_size,
                is_binary=is_binary
            )
            
        except Exception as e:
            cli_log(CliLogData(
                action="S3Connector",
                message=f"Error reading S3 file {file_path}: {str(e)}",
                message_type="Error"
            ))
            # Return None to indicate failure - workflow will handle DLQ
            return None
    
    def _is_binary_content(self, content: str, file_type: str) -> bool:
        """Determine if content is binary based on file type and content."""
        # S3FileReader prefixes binary content with special markers
        return (content.startswith("[IMAGE_DATA]") or 
                content.startswith("[PDF_DATA]") or 
                content.startswith("[DOC_DATA]") or
                file_type.startswith("image_") or
                file_type in ["pdf", "doc", "docx"])
    
    def _estimate_file_size(self, content: str, is_binary: bool) -> int:
        """Estimate file size from content."""
        if is_binary:
            # For base64 content, estimate original size
            # Base64 encoding increases size by ~33%
            return int(len(content) * 0.75)
        else:
            # Text content - use string length as approximation
            return len(content.encode('utf-8'))
    
    def _get_content_type(self, file_path: str, file_type: str) -> str:
        """Determine MIME type from file path and type."""
        # Try to get MIME type from file extension
        mime_type, _ = mimetypes.guess_type(file_path)
        
        if mime_type:
            return mime_type
        
        # Fallback based on our file type classifications
        if file_type == "text":
            return "text/plain"
        elif file_type == "pdf":
            return "application/pdf"
        elif file_type.startswith("image_"):
            image_format = file_type.split("_")[-1] if "_" in file_type else "jpeg"
            return f"image/{image_format}"
        elif file_type == "doc":
            return "application/msword"
        elif file_type == "docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:
            return "application/octet-stream"