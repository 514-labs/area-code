from typing import List, TypeVar, Generic, Optional
from .random import random_foo, DataSourceType

T = TypeVar('T')

class DatadogConnectorConfig:
    def __init__(self, batch_size: Optional[int] = None):
        self.batch_size = batch_size

class DatadogConnector(Generic[T]):
    def __init__(self, config: DatadogConnectorConfig):
        self._batch_size = config.batch_size or 1000

    def extract(self) -> List[T]:
        print("Extracting data from Datadog")
        data: List[T] = []
        for i in range(self._batch_size):
            data.append(random_foo(DataSourceType.Datadog))
        return data