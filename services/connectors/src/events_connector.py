from typing import List, TypeVar, Generic, Optional
from .random import random_foo, DataSourceType

T = TypeVar('T')

class EventsConnectorConfig:
    def __init__(self, batch_size: Optional[int] = None):
        self.batch_size = batch_size

class EventsConnector(Generic[T]):
    def __init__(self, config: EventsConnectorConfig):
        self._batch_size = config.batch_size or 1000

    def extract(self) -> List[T]:
        print("Extracting data from Events")
        data: List[T] = []
        for i in range(self._batch_size):
            data.append(random_foo(DataSourceType.Events))
        return data 