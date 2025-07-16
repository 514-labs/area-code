import random
from typing import List, TypeVar
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

def simulate_failures(data: List[T], fail_percentage: int) -> int:
    """
    Simulate failures by adding "fail" tag to a percentage of items in the data array.

    Args:
        data: List of Pydantic models that have a 'tags' field
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
        # Add "fail" tag if not already present
        if hasattr(item, 'tags') and "fail" not in item.tags:
            item.tags.append("fail")

    return len(items_to_fail)
