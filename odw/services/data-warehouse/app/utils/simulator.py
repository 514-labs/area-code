import random
from typing import List, TypeVar
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

def simulate_failures(data: List[T], fail_percentage: int) -> int:
    """
    Simulate failures by adding "[DLQ]" prefix to trigger transform failures.

    Args:
        data: List of Pydantic models (BlobSource, LogSource, EventSource)
        fail_percentage: Percentage of items to mark as failed (0-100)

    Returns:
        Number of items that were marked as failed
    """
    fail_percentage = max(0, min(100, fail_percentage))
    if fail_percentage <= 0 or not data:
        return 0

    num_to_fail = int(len(data) * (fail_percentage / 100))
    if num_to_fail <= 0:
        return 0

    # Randomly select items to mark as failed
    items_to_fail = random.sample(data, min(num_to_fail, len(data)))

    for item in items_to_fail:
        # Handle BlobSource models
        if hasattr(item, 'file_name') and hasattr(item, 'bucket_name'):
            if not item.file_name.startswith("[DLQ]"):
                item.file_name = f"[DLQ]{item.file_name}"

        # Handle LogSource models
        elif hasattr(item, 'message') and hasattr(item, 'level'):
            if not item.message.startswith("[DLQ]"):
                item.message = f"[DLQ]{item.message}"

        # Handle EventSource models (using distinct_id as the failure marker)
        elif hasattr(item, 'distinct_id') and hasattr(item, 'event_name'):
            if not item.distinct_id.startswith("[DLQ]"):
                item.distinct_id = f"[DLQ]{item.distinct_id}"

        # Handle UnstructuredDataSource models (using source_file_path as the failure marker)
        elif hasattr(item, 'source_file_path') and hasattr(item, 'extracted_data'):
            if "[DLQ]" not in item.source_file_path:
                item.source_file_path = f"[DLQ]{item.source_file_path}"

    return len(items_to_fail)
