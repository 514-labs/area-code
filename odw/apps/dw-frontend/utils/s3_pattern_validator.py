import re
from typing import Tuple, List, Optional

class S3PatternValidator:
    """
    Client-side S3 pattern validator for validating S3 wildcard patterns
    before submitting to the backend for processing.
    """
    
    # Valid S3 path patterns
    S3_PATTERN_REGEX = re.compile(r'^s3://[a-z0-9][a-z0-9\-]*[a-z0-9]/.*$')
    MINIO_PATTERN_REGEX = re.compile(r'^minio://[a-z0-9][a-z0-9\-]*[a-z0-9]/.*$')
    
    # Valid wildcard characters
    VALID_WILDCARDS = ['*', '**', '?']
    
    @staticmethod
    def validate_pattern(s3_pattern: str) -> Tuple[bool, Optional[str], Optional[dict]]:
        """
        Validate an S3 pattern for basic format and wildcard usage.
        
        Args:
            s3_pattern: S3 pattern to validate (e.g., "s3://bucket/*/subfolder/**/*.txt")
            
        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str], info: Optional[dict])
        """
        
        if not s3_pattern or not isinstance(s3_pattern, str):
            return False, "S3 pattern cannot be empty", None
        
        s3_pattern = s3_pattern.strip()
        
        # Check basic S3 path format
        if not (S3PatternValidator.S3_PATTERN_REGEX.match(s3_pattern) or 
                S3PatternValidator.MINIO_PATTERN_REGEX.match(s3_pattern)):
            return False, "Invalid S3 path format. Expected: s3://bucket/path or minio://bucket/path", None
        
        # Parse bucket and path
        try:
            if s3_pattern.startswith('s3://'):
                path_parts = s3_pattern[5:].split('/', 1)
            elif s3_pattern.startswith('minio://'):
                path_parts = s3_pattern[8:].split('/', 1)
            else:
                return False, "Pattern must start with s3:// or minio://", None
            
            if len(path_parts) < 2:
                return False, "S3 pattern must include bucket name and path", None
            
            bucket_name, object_path = path_parts
            
            # Validate bucket name
            if not S3PatternValidator._validate_bucket_name(bucket_name):
                return False, f"Invalid bucket name: {bucket_name}", None
            
            # Validate object path
            path_validation = S3PatternValidator._validate_object_path(object_path)
            if not path_validation[0]:
                return False, path_validation[1], None
            
            # Extract pattern information
            info = {
                'bucket_name': bucket_name,
                'object_path': object_path,
                'has_wildcards': S3PatternValidator._has_wildcards(object_path),
                'wildcard_count': S3PatternValidator._count_wildcards(object_path),
                'estimated_complexity': S3PatternValidator._estimate_complexity(object_path)
            }
            
            return True, None, info
            
        except Exception as e:
            return False, f"Error parsing S3 pattern: {str(e)}", None
    
    @staticmethod
    def _validate_bucket_name(bucket_name: str) -> bool:
        """Validate S3 bucket name according to AWS rules."""
        if not bucket_name:
            return False
        
        # Basic S3 bucket name rules
        if len(bucket_name) < 3 or len(bucket_name) > 63:
            return False
        
        if not re.match(r'^[a-z0-9][a-z0-9\-]*[a-z0-9]$', bucket_name):
            return False
        
        # Can't have consecutive hyphens or periods
        if '--' in bucket_name or '..' in bucket_name:
            return False
        
        return True
    
    @staticmethod
    def _validate_object_path(object_path: str) -> Tuple[bool, Optional[str]]:
        """Validate the object path portion of the S3 pattern."""
        if not object_path:
            return False, "Object path cannot be empty"
        
        # Check for invalid characters (basic validation)
        invalid_chars = ['\\', '<', '>', '|', '"', '\n', '\r', '\t']
        for char in invalid_chars:
            if char in object_path:
                return False, f"Invalid character '{char}' in object path"
        
        # Validate wildcard usage
        wildcard_validation = S3PatternValidator._validate_wildcards(object_path)
        if not wildcard_validation[0]:
            return False, wildcard_validation[1]
        
        return True, None
    
    @staticmethod
    def _validate_wildcards(path: str) -> Tuple[bool, Optional[str]]:
        """Validate wildcard usage in the path."""
        # Check for invalid wildcard combinations
        if '***' in path:
            return False, "Invalid wildcard pattern: *** (use * or ** instead)"
        
        # Validate ** usage (should be standalone in path segments)
        path_segments = path.split('/')
        for segment in path_segments:
            if '**' in segment and segment != '**':
                return False, f"Invalid wildcard pattern: '{segment}' (** must be used alone in path segment)"
        
        return True, None
    
    @staticmethod
    def _has_wildcards(path: str) -> bool:
        """Check if the path contains any wildcards."""
        for wildcard in S3PatternValidator.VALID_WILDCARDS:
            if wildcard in path:
                return True
        return False
    
    @staticmethod
    def _count_wildcards(path: str) -> int:
        """Count the number of wildcard characters in the path."""
        count = 0
        count += path.count('*')
        count += path.count('?')
        return count
    
    @staticmethod
    def _estimate_complexity(path: str) -> str:
        """Estimate the complexity of the pattern for user guidance."""
        wildcard_count = S3PatternValidator._count_wildcards(path)
        has_recursive = '**' in path
        segment_count = len([s for s in path.split('/') if s])
        
        if wildcard_count == 0:
            return "simple"  # No wildcards - single file
        elif wildcard_count <= 2 and not has_recursive and segment_count <= 3:
            return "low"     # Simple patterns like *.txt or folder/*.txt
        elif wildcard_count <= 5 and segment_count <= 5:
            return "medium"  # Moderate patterns with some complexity
        else:
            return "high"    # Complex patterns that might match many files
    
    @staticmethod
    def get_examples() -> List[dict]:
        """Get example patterns with descriptions for user guidance."""
        return [
            {
                "pattern": "s3://my-bucket/data.txt",
                "description": "Single file",
                "complexity": "simple"
            },
            {
                "pattern": "s3://my-bucket/*.txt",
                "description": "All .txt files in bucket root",
                "complexity": "low"
            },
            {
                "pattern": "s3://my-bucket/reports/*.csv",
                "description": "All .csv files in reports folder",
                "complexity": "low"
            },
            {
                "pattern": "s3://my-bucket/*/data/*.json",
                "description": "All .json files in any subfolder's data directory",
                "complexity": "medium"
            },
            {
                "pattern": "s3://my-bucket/**/logs/*.txt",
                "description": "All .txt files in logs folders at any depth",
                "complexity": "medium"
            },
            {
                "pattern": "s3://my-bucket/year-*/month-*/day-*/events.json",
                "description": "Events files in date-structured folders",
                "complexity": "high"
            }
        ]
    
    @staticmethod
    def suggest_improvements(s3_pattern: str) -> List[str]:
        """Suggest improvements for the given pattern."""
        suggestions = []
        
        if not S3PatternValidator._has_wildcards(s3_pattern):
            suggestions.append("This appears to be a single file path. Use wildcards (*) to match multiple files.")
        
        complexity = S3PatternValidator._estimate_complexity(s3_pattern.split('/', 3)[-1] if '/' in s3_pattern else "")
        
        if complexity == "high":
            suggestions.append("This is a complex pattern that might match many files. Consider being more specific to improve performance.")
        
        if s3_pattern.count('**') > 1:
            suggestions.append("Multiple recursive wildcards (**) may significantly impact performance. Consider using more specific paths.")
        
        if s3_pattern.endswith('/*'):
            suggestions.append("Pattern ends with /*. Add a file extension like *.txt to be more specific.")
        
        return suggestions 