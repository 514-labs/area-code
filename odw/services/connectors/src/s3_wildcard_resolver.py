import fnmatch
import re
from typing import List, Tuple, Optional, Dict, Any
from pathlib import PurePath
from moose_lib import cli_log, CliLogData
from .s3_file_reader import S3FileReader

class S3WildcardResolver:
    """
    Server-side S3 wildcard resolver for expanding S3 patterns with wildcards
    into lists of actual files for batch processing.
    """
    
    def __init__(self, config_path: str = "moose.config.toml"):
        """
        Initialize the S3 wildcard resolver.
        
        Args:
            config_path: Path to the moose configuration file
        """
        self.s3_reader = S3FileReader(config_path)
    
    def resolve_pattern(self, s3_pattern: str) -> Dict[str, Any]:
        """
        Resolve an S3 pattern with wildcards into a list of matching files.
        
        Args:
            s3_pattern: S3 pattern (e.g., "s3://bucket/*/reports/**/*.txt")
            
        Returns:
            Dictionary with resolution results:
            {
                'success': bool,
                'pattern': str,
                'bucket_name': str,
                'files_found': List[str],
                'total_files': int,
                'error_message': Optional[str],
                'processing_info': Dict
            }
        """
        
        cli_log(CliLogData(
            action="S3WildcardResolver",
            message=f"Resolving S3 pattern: {s3_pattern}",
            message_type="Info"
        ))
        
        try:
            # Parse S3 pattern
            bucket_name, object_pattern = self._parse_s3_pattern(s3_pattern)
            
            # Get strategy for pattern resolution
            resolution_strategy = self._analyze_pattern(object_pattern)
            
            cli_log(CliLogData(
                action="S3WildcardResolver",
                message=f"Using resolution strategy: {resolution_strategy['strategy']} for pattern: {object_pattern}",
                message_type="Info"
            ))
            
            # Resolve files based on strategy
            if resolution_strategy['strategy'] == 'simple_wildcard':
                files = self._resolve_simple_wildcard(bucket_name, object_pattern)
            elif resolution_strategy['strategy'] == 'prefix_wildcard':
                files = self._resolve_prefix_wildcard(bucket_name, object_pattern, resolution_strategy)
            elif resolution_strategy['strategy'] == 'recursive_wildcard':
                files = self._resolve_recursive_wildcard(bucket_name, object_pattern, resolution_strategy)
            elif resolution_strategy['strategy'] == 'complex_pattern':
                files = self._resolve_complex_pattern(bucket_name, object_pattern, resolution_strategy)
            else:
                # Single file - no wildcards
                files = self._resolve_single_file(bucket_name, object_pattern)
            
            # Convert to full S3 paths
            full_paths = [f"s3://{bucket_name}/{file_key}" for file_key in files]
            
            cli_log(CliLogData(
                action="S3WildcardResolver",
                message=f"Resolved {len(full_paths)} files for pattern: {s3_pattern}",
                message_type="Info"
            ))
            
            return {
                'success': True,
                'pattern': s3_pattern,
                'bucket_name': bucket_name,
                'files_found': full_paths,
                'total_files': len(full_paths),
                'error_message': None,
                'processing_info': {
                    'resolution_strategy': resolution_strategy['strategy'],
                    'complexity': resolution_strategy.get('complexity', 'unknown'),
                    'estimated_performance': self._estimate_performance(len(full_paths))
                }
            }
            
        except Exception as e:
            error_msg = f"Failed to resolve S3 pattern {s3_pattern}: {str(e)}"
            cli_log(CliLogData(
                action="S3WildcardResolver",
                message=error_msg,
                message_type="Error"
            ))
            
            return {
                'success': False,
                'pattern': s3_pattern,
                'bucket_name': None,
                'files_found': [],
                'total_files': 0,
                'error_message': error_msg,
                'processing_info': {}
            }
    
    def _parse_s3_pattern(self, s3_pattern: str) -> Tuple[str, str]:
        """Parse S3 pattern into bucket name and object pattern."""
        if s3_pattern.startswith('s3://'):
            path_parts = s3_pattern[5:].split('/', 1)
        elif s3_pattern.startswith('minio://'):
            path_parts = s3_pattern[8:].split('/', 1)
        else:
            raise ValueError(f"Invalid S3 pattern format: {s3_pattern}")
        
        if len(path_parts) != 2:
            raise ValueError(f"Invalid S3 pattern format: {s3_pattern}")
        
        bucket_name, object_pattern = path_parts
        return bucket_name, object_pattern
    
    def _analyze_pattern(self, object_pattern: str) -> Dict[str, Any]:
        """
        Analyze the pattern to determine the best resolution strategy.
        
        Returns:
            Dictionary with strategy information
        """
        has_wildcards = any(char in object_pattern for char in ['*', '?'])
        has_recursive = '**' in object_pattern
        wildcard_count = object_pattern.count('*') + object_pattern.count('?')
        path_segments = [s for s in object_pattern.split('/') if s]
        
        if not has_wildcards:
            return {
                'strategy': 'single_file',
                'complexity': 'simple'
            }
        elif wildcard_count == 1 and not has_recursive and len(path_segments) == 1:
            return {
                'strategy': 'simple_wildcard',
                'complexity': 'low'
            }
        elif has_recursive:
            return {
                'strategy': 'recursive_wildcard',
                'complexity': 'high' if wildcard_count > 3 else 'medium',
                'max_depth': self._estimate_max_depth(object_pattern)
            }
        elif any('*' in segment for segment in path_segments[:-1]):
            return {
                'strategy': 'complex_pattern',
                'complexity': 'high' if wildcard_count > 5 else 'medium',
                'prefix': self._find_longest_prefix(object_pattern)
            }
        else:
            return {
                'strategy': 'prefix_wildcard',
                'complexity': 'low' if wildcard_count <= 2 else 'medium',
                'prefix': '/'.join(path_segments[:-1]) if len(path_segments) > 1 else ''
            }
    
    def _resolve_single_file(self, bucket_name: str, object_key: str) -> List[str]:
        """Resolve a single file (no wildcards)."""
        try:
            # Check if file exists
            self.s3_reader.s3_client.head_object(Bucket=bucket_name, Key=object_key)
            return [object_key]
        except Exception:
            return []  # File doesn't exist
    
    def _resolve_simple_wildcard(self, bucket_name: str, pattern: str) -> List[str]:
        """Resolve simple wildcards in bucket root (e.g., *.txt)."""
        try:
            objects = self.s3_reader.list_objects(bucket_name, prefix="")
            return [obj for obj in objects if fnmatch.fnmatch(obj, pattern)]
        except Exception as e:
            cli_log(CliLogData(
                action="S3WildcardResolver",
                message=f"Error resolving simple wildcard: {str(e)}",
                message_type="Error"
            ))
            return []
    
    def _resolve_prefix_wildcard(self, bucket_name: str, pattern: str, strategy_info: Dict) -> List[str]:
        """Resolve wildcards with a known prefix (e.g., reports/*.txt)."""
        try:
            prefix = strategy_info.get('prefix', '')
            objects = self.s3_reader.list_objects(bucket_name, prefix=prefix)
            return [obj for obj in objects if fnmatch.fnmatch(obj, pattern)]
        except Exception as e:
            cli_log(CliLogData(
                action="S3WildcardResolver",
                message=f"Error resolving prefix wildcard: {str(e)}",
                message_type="Error"
            ))
            return []
    
    def _resolve_recursive_wildcard(self, bucket_name: str, pattern: str, strategy_info: Dict) -> List[str]:
        """Resolve recursive wildcards (e.g., **/logs/*.txt)."""
        try:
            # For recursive patterns, we need to list all objects and match
            objects = self.s3_reader.list_objects(bucket_name, prefix="")
            
            # Convert ** patterns to regex for matching
            regex_pattern = self._wildcard_to_regex(pattern)
            compiled_pattern = re.compile(regex_pattern)
            
            return [obj for obj in objects if compiled_pattern.match(obj)]
        except Exception as e:
            cli_log(CliLogData(
                action="S3WildcardResolver",
                message=f"Error resolving recursive wildcard: {str(e)}",
                message_type="Error"
            ))
            return []
    
    def _resolve_complex_pattern(self, bucket_name: str, pattern: str, strategy_info: Dict) -> List[str]:
        """Resolve complex patterns with multiple wildcards."""
        try:
            # Start with any available prefix to reduce the search space
            prefix = strategy_info.get('prefix', '')
            objects = self.s3_reader.list_objects(bucket_name, prefix=prefix)
            
            # Use regex matching for complex patterns
            regex_pattern = self._wildcard_to_regex(pattern)
            compiled_pattern = re.compile(regex_pattern)
            
            return [obj for obj in objects if compiled_pattern.match(obj)]
        except Exception as e:
            cli_log(CliLogData(
                action="S3WildcardResolver",
                message=f"Error resolving complex pattern: {str(e)}",
                message_type="Error"
            ))
            return []
    
    def _wildcard_to_regex(self, pattern: str) -> str:
        """Convert wildcard pattern to regex."""
        # Escape special regex characters except our wildcards
        escaped = re.escape(pattern)
        
        # Replace escaped wildcards with regex equivalents
        regex_pattern = escaped.replace(r'\*\*', '.*')  # ** matches anything including /
        regex_pattern = regex_pattern.replace(r'\*', '[^/]*')  # * matches anything except /
        regex_pattern = regex_pattern.replace(r'\?', '.')  # ? matches single character
        
        return f'^{regex_pattern}$'
    
    def _find_longest_prefix(self, pattern: str) -> str:
        """Find the longest prefix without wildcards."""
        parts = pattern.split('/')
        prefix_parts = []
        
        for part in parts:
            if any(char in part for char in ['*', '?']):
                break
            prefix_parts.append(part)
        
        return '/'.join(prefix_parts)
    
    def _estimate_max_depth(self, pattern: str) -> int:
        """Estimate maximum depth for recursive patterns."""
        # Simple heuristic based on pattern structure
        if '**' in pattern:
            return 10  # Assume reasonable max depth
        return len([s for s in pattern.split('/') if s])
    
    def _estimate_performance(self, file_count: int) -> str:
        """Estimate performance impact based on file count."""
        if file_count == 0:
            return "no_files"
        elif file_count <= 10:
            return "fast"
        elif file_count <= 100:
            return "moderate"
        elif file_count <= 1000:
            return "slow"
        else:
            return "very_slow"
    
    def validate_bucket_access(self, bucket_name: str) -> Dict[str, Any]:
        """
        Validate that we have access to the specified S3 bucket.
        
        Args:
            bucket_name: Name of the S3 bucket
            
        Returns:
            Dictionary with validation results
        """
        try:
            # Try to list objects in the bucket (with limit to avoid large responses)
            paginator = self.s3_reader.s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(Bucket=bucket_name, MaxKeys=1)
            
            # Just get the first page to test access
            for page in page_iterator:
                break
            
            cli_log(CliLogData(
                action="S3WildcardResolver",
                message=f"Successfully validated access to bucket: {bucket_name}",
                message_type="Info"
            ))
            
            return {
                'success': True,
                'bucket_name': bucket_name,
                'error_message': None
            }
            
        except Exception as e:
            error_msg = f"Cannot access bucket {bucket_name}: {str(e)}"
            cli_log(CliLogData(
                action="S3WildcardResolver",
                message=error_msg,
                message_type="Error"
            ))
            
            return {
                'success': False,
                'bucket_name': bucket_name,
                'error_message': error_msg
            }