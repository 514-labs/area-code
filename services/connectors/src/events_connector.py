from typing import List, Optional
from .random import random_event_source

class EventsConnectorConfig:
    def __init__(self, batch_size: Optional[int] = None):
        self.batch_size = batch_size

class EventsConnector:
    def __init__(self, config: EventsConnectorConfig):
        self._batch_size = config.batch_size or 1000

    def extract(self):
        print("Extracting data from Events")
        data = []
        for i in range(self._batch_size):
            data.append(random_event_source())
        return data 