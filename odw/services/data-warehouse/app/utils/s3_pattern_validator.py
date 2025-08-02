import re
from typing import Tuple, List, Optional

class S3PatternValidator:
    """
    Server-side S3 pattern validator for validating S3 wildcard patterns
    in the data warehouse workflows.
    """
    
    # Valid S3 path patterns
    S3_PATTERN_REGEX = re.compile(r'^s3://[a-z0-9][a-z0-9\-]*[a-z0-9]/.*$')
    MINIO_PATTERN_REGEX = re.compile(r'^minio://[a-z0-9][a-z0-9\-]*[a-z0-9]/.*$')
    
    # Valid wildcard characters
    VALID_WILDCARDS = ['*', '**', '?']
    
    @staticmethod
    def _has_wildcards(path: str) -> bool:
        """Check if the path contains any wildcards."""
        if not path:
            return False
        for wildcard in S3PatternValidator.VALID_WILDCARDS:
            if wildcard in path:
                return True
        return False
    
    @staticmethod
    def _count_wildcards(path: str) -> int:
        """Count the number of wildcard characters in the path."""
        if not path:
            return 0
        count = 0
        count += path.count('*')
        count += path.count('?')
        return count
    
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
    def _estimate_complexity(path: str) -> str:
        """Estimate the complexity of the pattern for user guidance."""
        if not path:
            return "simple"
        
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