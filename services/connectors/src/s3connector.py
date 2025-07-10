from typing import List, TypeVar, Generic, Optional
from .random import random_foo

T = TypeVar('T')

class S3ConnectorConfig:
    def __init__(self, batch_size: Optional[int] = None):
        self.batch_size = batch_size

class S3Connector(Generic[T]):
    def __init__(self, config: S3ConnectorConfig):
        self._batch_size = config.batch_size or 1000

    def extract(self) -> List[T]:
        print("Extracting data from S3")
        data: List[T] = []
        for i in range(self._batch_size):
            data.append(random_foo())
        return data