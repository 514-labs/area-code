import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, NoCredentialsError
from typing import Tuple
from pathlib import Path
import mimetypes
import toml
import os
from moose_lib import cli_log, CliLogData

class S3FileReader:
    """
    Utility class for reading various file types from S3/MinIO buckets for unstructured data processing.
    Supports text files, PDFs, images, and other document formats stored in S3-compatible storage.
    """
    
    def __init__(self, config_path: str = "moose.config.toml"):
        """
        Initialize S3FileReader with configuration from moose.config.toml
        
        Args:
            config_path: Path to the moose configuration file
        """
        self.config = self._load_s3_config(config_path)
        self.s3_client = self._create_s3_client()
    
    def _load_s3_config(self, config_path: str) -> dict:
        """Load S3 configuration from moose.config.toml"""
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = toml.load(f)
                    s3_config = config.get('s3_config', {})
                    
                    # Validate required configuration
                    required_keys = ['access_key_id', 'secret_access_key', 'region_name']
                    missing_keys = [key for key in required_keys if not s3_config.get(key)]
                    
                    if missing_keys:
                        raise ValueError(f"Missing required S3 configuration keys: {missing_keys}")
                    
                    return s3_config
            else:
                raise FileNotFoundError(f"Configuration file not found: {config_path}")
        except Exception as e:
            cli_log(CliLogData(
                action="S3FileReader",
                message=f"Error loading S3 configuration: {str(e)}",
                message_type="Error"
            ))
            raise
    
    def _create_s3_client(self):
        """Create and configure S3 client"""
        try:
            s3_config = {
                'aws_access_key_id': self.config['access_key_id'],
                'aws_secret_access_key': self.config['secret_access_key'],
                'region_name': self.config['region_name']
            }
            
            # Add endpoint URL for MinIO
            if self.config.get('endpoint_url'):
                s3_config['endpoint_url'] = self.config['endpoint_url']
            
            # Add configuration for signature version
            if self.config.get('signature_version'):
                s3_config['config'] = Config(signature_version=self.config['signature_version'])
            
            client = boto3.client('s3', **s3_config)
            
            cli_log(CliLogData(
                action="S3FileReader",
                message=f"S3 client initialized for endpoint: {self.config.get('endpoint_url', 'AWS S3')}",
                message_type="Info"
            ))
            
            return client
            
        except Exception as e:
            cli_log(CliLogData(
                action="S3FileReader",
                message=f"Failed to create S3 client: {str(e)}",
                message_type="Error"
            ))
            raise
    
    @staticmethod
    def parse_s3_path(s3_path: str) -> Tuple[str, str]:
        """
        Parse S3 path to extract bucket and key
        
        Args:
            s3_path: S3 path in format s3://bucket/key or minio://bucket/key
            
        Returns:
            Tuple of (bucket_name, object_key)
        """
        if s3_path.startswith('s3://'):
            path_parts = s3_path[5:].split('/', 1)
        elif s3_path.startswith('minio://'):
            path_parts = s3_path[8:].split('/', 1)
        else:
            raise ValueError(f"Invalid S3 path format: {s3_path}. Expected s3://bucket/key or minio://bucket/key")
        
        if len(path_parts) != 2:
            raise ValueError(f"Invalid S3 path format: {s3_path}. Missing object key")
        
        bucket_name, object_key = path_parts
        return bucket_name, object_key
    
    @staticmethod
    def is_s3_path(file_path: str) -> bool:
        """Check if the given path is an S3 path"""
        return file_path.startswith(('s3://', 'minio://'))
    
    def read_file(self, s3_path: str) -> Tuple[str, str]:
        """
        Read file content from S3 path.
        
        Args:
            s3_path: S3 path to the file (e.g., s3://bucket/key or minio://bucket/key)
            
        Returns:
            Tuple of (content: str, file_type: str)
            
        Raises:
            ClientError: If S3 operation fails
            ValueError: If path format is invalid
        """
        try:
            bucket_name, object_key = self.parse_s3_path(s3_path)
            
            cli_log(CliLogData(
                action="S3FileReader",
                message=f"Reading S3 file: {s3_path}",
                message_type="Info"
            ))
            
            # Check if object exists
            try:
                self.s3_client.head_object(Bucket=bucket_name, Key=object_key)
            except ClientError as e:
                if e.response['Error']['Code'] == '404':
                    raise FileNotFoundError(f"S3 object not found: {s3_path}")
                else:
                    raise
            
            # Determine file type from object key
            file_type = self._get_file_type(object_key)
            
            # Read the object content
            try:
                response = self.s3_client.get_object(Bucket=bucket_name, Key=object_key)
                content = response['Body'].read()
                
                # Process content based on file type
                if file_type == "text":
                    content_str = self._decode_text_content(content, object_key)
                elif file_type == "pdf":
                    content_str = self._process_pdf_content(content, object_key)
                elif file_type.startswith("image_"):
                    content_str = self._process_image_content(content, object_key)
                elif file_type in ["doc", "docx"]:
                    content_str = self._process_word_content(content, object_key)
                else:
                    # Fallback: try to decode as text
                    cli_log(CliLogData(
                        action="S3FileReader",
                        message=f"Unknown file type {file_type}, attempting to decode as text",
                        message_type="Info"
                    ))
                    content_str = self._decode_text_content(content, object_key)
                    file_type = "text"
                
                cli_log(CliLogData(
                    action="S3FileReader",
                    message=f"Successfully read S3 file: {s3_path} (type: {file_type}, size: {len(content)} bytes)",
                    message_type="Info"
                ))
                
                return content_str, file_type
                
            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code == 'NoSuchBucket':
                    raise FileNotFoundError(f"S3 bucket not found: {bucket_name}")
                elif error_code == 'AccessDenied':
                    raise PermissionError(f"Access denied to S3 object: {s3_path}")
                else:
                    raise Exception(f"S3 error reading {s3_path}: {str(e)}")
                    
        except Exception as e:
            cli_log(CliLogData(
                action="S3FileReader",
                message=f"Error reading S3 file {s3_path}: {str(e)}",
                message_type="Error"
            ))
            raise
    
    def _get_file_type(self, object_key: str) -> str:
        """Determine file type based on object key extension and MIME type."""
        file_extension = Path(object_key).suffix.lower()
        mime_type, _ = mimetypes.guess_type(object_key)
        
        # Map extensions to our internal file types
        if file_extension in ['.txt', '.md', '.csv', '.json', '.xml', '.html']:
            return "text"
        elif file_extension == '.pdf':
            return "pdf"
        elif file_extension in ['.png']:
            return "image_png"
        elif file_extension in ['.jpg', '.jpeg']:
            return "image_jpg"
        elif file_extension in ['.gif']:
            return "image_gif"
        elif file_extension in ['.bmp']:
            return "image_bmp"
        elif file_extension in ['.doc']:
            return "doc"
        elif file_extension in ['.docx']:
            return "docx"
        elif mime_type:
            if mime_type.startswith('text/'):
                return "text"
            elif mime_type.startswith('image/'):
                return f"image_{mime_type.split('/')[-1]}"
        
        return "unknown"
    
    def _decode_text_content(self, content: bytes, object_key: str) -> str:
        """Decode binary content as text using various encodings."""
        try:
            return content.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback to different encodings
            encodings = ['latin-1', 'cp1252', 'ascii']
            for encoding in encodings:
                try:
                    decoded_content = content.decode(encoding)
                    cli_log(CliLogData(
                        action="S3FileReader",
                        message=f"Successfully decoded S3 file with {encoding} encoding: {object_key}",
                        message_type="Info"
                    ))
                    return decoded_content
                except UnicodeDecodeError:
                    continue
            raise Exception(f"Could not decode S3 file {object_key} with any supported encoding")
    
    def _process_pdf_content(self, content: bytes, object_key: str) -> str:
        """
        Process PDF content from S3.
        Note: This is a placeholder implementation. In production, you would use
        a library like PyPDF2, pdfplumber, or pymupdf to extract text from PDFs.
        """
        # TODO: Implement PDF reading with appropriate library
        # For now, return a placeholder that indicates PDF processing is needed
        return f"[PDF_CONTENT] S3 Object: {object_key} - PDF text extraction not yet implemented. Please integrate with PyPDF2, pdfplumber, or similar library."
    
    def _process_image_content(self, content: bytes, object_key: str) -> str:
        """
        Process image content from S3 for OCR.
        Note: This is a placeholder implementation. In production, you would use
        OCR libraries like Tesseract, or cloud OCR services.
        """
        # TODO: Implement OCR processing with appropriate library
        # For now, return a placeholder that indicates image processing is needed
        return f"[IMAGE_CONTENT] S3 Object: {object_key} - OCR text extraction not yet implemented. Please integrate with Tesseract, AWS Textract, or similar OCR service."
    
    def _process_word_content(self, content: bytes, object_key: str) -> str:
        """
        Process Word document content from S3.
        Note: This is a placeholder implementation. In production, you would use
        libraries like python-docx for .docx files.
        """
        # TODO: Implement Word document reading with appropriate library
        # For now, return a placeholder that indicates Word processing is needed
        return f"[WORD_CONTENT] S3 Object: {object_key} - Word document text extraction not yet implemented. Please integrate with python-docx or similar library."
    
    def list_objects(self, bucket_name: str = None, prefix: str = "", pattern: str = None) -> list:
        """
        List objects in S3 bucket, optionally filtering by prefix and pattern.
        
        Args:
            bucket_name: S3 bucket name (uses default from config if not provided)
            prefix: Object key prefix filter
            pattern: Filename pattern filter (e.g., "*.txt")
            
        Returns:
            List of object keys matching the criteria
        """
        if bucket_name is None:
            bucket_name = self.config.get('bucket_name')
            if not bucket_name:
                raise ValueError("No bucket name provided and no default bucket in configuration")
        
        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(Bucket=bucket_name, Prefix=prefix)
            
            objects = []
            for page in page_iterator:
                for obj in page.get('Contents', []):
                    object_key = obj['Key']
                    if pattern:
                        import fnmatch
                        if fnmatch.fnmatch(object_key, pattern):
                            objects.append(object_key)
                    else:
                        objects.append(object_key)
            
            cli_log(CliLogData(
                action="S3FileReader",
                message=f"Listed {len(objects)} objects from bucket {bucket_name} with prefix '{prefix}'",
                message_type="Info"
            ))
            
            return objects
            
        except Exception as e:
            cli_log(CliLogData(
                action="S3FileReader",
                message=f"Error listing objects from bucket {bucket_name}: {str(e)}",
                message_type="Error"
            ))
            raise 