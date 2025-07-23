import random
from typing import List, TypeVar
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

def simulate_failures(data: List[T], fail_percentage: int) -> int:
    """
    Simulate failures by adding "[DLQ]" prefix to trigger transform failures.

    Args:
        data: List of Pydantic models (BlobSource, LogSource)
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

    return len(items_to_fail)
