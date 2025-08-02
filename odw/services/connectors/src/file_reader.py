from typing import Tuple
from moose_lib import cli_log, CliLogData
from .s3_file_reader import S3FileReader

class FileReader:
    """
    Simplified utility class for reading files from S3 for unstructured data processing.
    All files are expected to be in S3 and will be processed via LLM.
    """
    
    @staticmethod
    def read_file(file_path: str) -> Tuple[str, str]:
        """
        Read file content from S3 path.
        
        Args:
            file_path: S3 path to the file (s3://bucket/key or minio://bucket/key)
            
        Returns:
            Tuple of (content: str, file_type: str)
            
        Raises:
            ValueError: If path is not an S3 path
            Exception: For S3 reading errors
        """
        
        # Ensure this is an S3 path
        if not S3FileReader.is_s3_path(file_path):
            raise ValueError(f"Only S3 paths are supported. Got: {file_path}. Expected format: s3://bucket/key")
        
        cli_log(CliLogData(
            action="FileReader",
            message=f"Reading S3 file: {file_path}",
            message_type="Info"
        ))
        
        try:
            s3_reader = S3FileReader()
            return s3_reader.read_file(file_path)
        except Exception as e:
            cli_log(CliLogData(
                action="FileReader",
                message=f"S3 file reading failed: {str(e)}",
                message_type="Error"
            ))
            raise
    
    @staticmethod
    def get_supported_extensions() -> list:
        """Return list of supported file extensions."""
        return [
            '.txt', '.md', '.csv', '.json', '.xml', '.html',  # Text files (LLM processing)
            '.png', '.jpg', '.jpeg', '.gif', '.bmp',  # Image files (LLM vision)
            '.pdf', '.doc', '.docx'  # Document files (LLM processing)
        ]
    
    @staticmethod
    def is_supported_file(file_path: str) -> bool:
        """Check if file type is supported based on extension."""
        from pathlib import Path
        file_extension = Path(file_path).suffix.lower()
        return file_extension in FileReader.get_supported_extensions()