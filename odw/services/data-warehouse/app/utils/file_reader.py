import os
from typing import Optional, Tuple
from pathlib import Path
import mimetypes
from moose_lib import cli_log, CliLogData

class FileReader:
    """
    Utility class for reading various file types for unstructured data processing.
    Supports text files, PDFs, images, and other document formats.
    """
    
    @staticmethod
    def read_file(file_path: str) -> Tuple[str, str]:
        """
        Read file content from the given path.
        
        Args:
            file_path: Path to the file to read
            
        Returns:
            Tuple of (content: str, file_type: str)
            
        Raises:
            FileNotFoundError: If file doesn't exist
            PermissionError: If file can't be read
            Exception: For other file reading errors
        """
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not os.access(file_path, os.R_OK):
            raise PermissionError(f"File not readable: {file_path}")
        
        # Determine file type
        file_type = FileReader._get_file_type(file_path)
        
        cli_log(CliLogData(
            action="FileReader",
            message=f"Reading file: {file_path} (type: {file_type})",
            message_type="Info"
        ))
        
        try:
            if file_type == "text":
                return FileReader._read_text_file(file_path), file_type
            elif file_type == "pdf":
                return FileReader._read_pdf_file(file_path), file_type
            elif file_type in ["image_png", "image_jpg", "image_jpeg", "image_gif", "image_bmp"]:
                return FileReader._read_image_file(file_path), file_type
            elif file_type in ["doc", "docx"]:
                return FileReader._read_word_file(file_path), file_type
            else:
                # Fallback: try to read as text
                cli_log(CliLogData(
                    action="FileReader",
                    message=f"Unknown file type {file_type}, attempting to read as text",
                    message_type="Info"
                ))
                return FileReader._read_text_file(file_path), "text"
                
        except Exception as e:
            cli_log(CliLogData(
                action="FileReader",
                message=f"Error reading file {file_path}: {str(e)}",
                message_type="Error"
            ))
            raise
    
    @staticmethod
    def _get_file_type(file_path: str) -> str:
        """Determine file type based on extension and MIME type."""
        file_extension = Path(file_path).suffix.lower()
        mime_type, _ = mimetypes.guess_type(file_path)
        
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
    
    @staticmethod
    def _read_text_file(file_path: str) -> str:
        """Read a text-based file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except UnicodeDecodeError:
            # Fallback to different encodings
            encodings = ['latin-1', 'cp1252', 'ascii']
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as file:
                        content = file.read()
                        cli_log(CliLogData(
                            action="FileReader",
                            message=f"Successfully read file with {encoding} encoding",
                            message_type="Info"
                        ))
                        return content
                except UnicodeDecodeError:
                    continue
            raise Exception(f"Could not decode file {file_path} with any supported encoding")
    
    @staticmethod
    def _read_pdf_file(file_path: str) -> str:
        """
        Read a PDF file. 
        Note: This is a placeholder implementation. In production, you would use
        a library like PyPDF2, pdfplumber, or pymupdf to extract text from PDFs.
        """
        # TODO: Implement PDF reading with appropriate library
        # For now, return a placeholder that indicates PDF processing is needed
        return f"[PDF_CONTENT] File: {file_path} - PDF text extraction not yet implemented. Please integrate with PyPDF2, pdfplumber, or similar library."
    
    @staticmethod
    def _read_image_file(file_path: str) -> str:
        """
        Read an image file for OCR processing.
        Note: This is a placeholder implementation. In production, you would use
        OCR libraries like Tesseract, or cloud OCR services.
        """
        # TODO: Implement OCR processing with appropriate library
        # For now, return a placeholder that indicates image processing is needed
        return f"[IMAGE_CONTENT] File: {file_path} - OCR text extraction not yet implemented. Please integrate with Tesseract, AWS Textract, or similar OCR service."
    
    @staticmethod
    def _read_word_file(file_path: str) -> str:
        """
        Read a Word document file.
        Note: This is a placeholder implementation. In production, you would use
        libraries like python-docx for .docx files.
        """
        # TODO: Implement Word document reading with appropriate library
        # For now, return a placeholder that indicates Word processing is needed
        return f"[WORD_CONTENT] File: {file_path} - Word document text extraction not yet implemented. Please integrate with python-docx or similar library."
    
    @staticmethod
    def get_supported_extensions() -> list:
        """Return list of supported file extensions."""
        return [
            '.txt', '.md', '.csv', '.json', '.xml', '.html',  # Text files
            '.pdf',  # PDF files (placeholder)
            '.png', '.jpg', '.jpeg', '.gif', '.bmp',  # Image files (placeholder)
            '.doc', '.docx'  # Word documents (placeholder)
        ]
    
    @staticmethod
    def is_supported_file(file_path: str) -> bool:
        """Check if file type is supported."""
        file_extension = Path(file_path).suffix.lower()
        return file_extension in FileReader.get_supported_extensions() 