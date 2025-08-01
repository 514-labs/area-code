from enum import Enum
from typing import TypeVar, Union, Optional, Generic
from .blob_connector import BlobConnector, BlobConnectorConfig
from .logs_connector import LogsConnector, LogsConnectorConfig
from .events_connector import EventsConnector, EventsConnectorConfig
from .s3_connector import S3Connector, S3ConnectorConfig

T = TypeVar('T')

class ConnectorType(Enum):
    Blob = "Blob"
    Logs = "Logs" 
    Events = "Events"
    S3 = "S3"

# Add unions for future connector types
Connector = Union[BlobConnector[T], LogsConnector[T], EventsConnector[T], S3Connector[T]]

class ConnectorFactory(Generic[T]):
    @staticmethod
    def create(
        connector_type: ConnectorType,
        config: Optional[Union[BlobConnectorConfig, LogsConnectorConfig, EventsConnectorConfig, S3ConnectorConfig]] = None
    ):
        if connector_type == ConnectorType.Blob:
            return BlobConnector[T](config or BlobConnectorConfig())
        elif connector_type == ConnectorType.Logs:
            return LogsConnector[T](config or LogsConnectorConfig())
        elif connector_type == ConnectorType.Events:
            return EventsConnector[T](config or EventsConnectorConfig())
        elif connector_type == ConnectorType.S3:
            return S3Connector[T](config or S3ConnectorConfig("s3://bucket/*"))
        else:
            raise ValueError(f"Unknown connector type: {connector_type}")