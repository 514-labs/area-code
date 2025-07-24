from enum import Enum
from typing import TypeVar, Union, Optional, Generic
from .blob_connector import BlobConnector, BlobConnectorConfig
from .logs_connector import LogsConnector, LogsConnectorConfig
from .events_connector import EventsConnector, EventsConnectorConfig

T = TypeVar('T')

class ConnectorType(Enum):
    Blob = "Blob"
    Logs = "Logs"
    Events = "Events"

# Add unions for future connector types
Connector = Union[BlobConnector[T], LogsConnector[T], EventsConnector]

class ConnectorFactory(Generic[T]):
    @staticmethod
    def create(
        connector_type: ConnectorType,
        config: Optional[Union[BlobConnectorConfig, LogsConnectorConfig, EventsConnectorConfig]] = None
    ):
        if connector_type == ConnectorType.Blob:
            return BlobConnector[T](config or BlobConnectorConfig())
        elif connector_type == ConnectorType.Logs:
            return LogsConnector[T](config or LogsConnectorConfig())
        elif connector_type == ConnectorType.Events:
            return EventsConnector(config or EventsConnectorConfig())
        else:
            raise ValueError(f"Unknown connector type: {connector_type}")