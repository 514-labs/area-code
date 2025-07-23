from enum import Enum
from typing import TypeVar, Union, Optional, Generic
from .blob_connector import BlobConnector, BlobConnectorConfig
from .logs_connector import LogsConnector, LogsConnectorConfig

T = TypeVar('T')

class ConnectorType(Enum):
    Blob = "Blob"
    Logs = "Logs"

# Add unions for future connector types
Connector = Union[BlobConnector[T], LogsConnector[T]]

class ConnectorFactory(Generic[T]):
    @staticmethod
    def create(
        connector_type: ConnectorType,
        config: Optional[Union[BlobConnectorConfig, LogsConnectorConfig]] = None
    ) -> Connector[T]:
        if connector_type == ConnectorType.Blob:
            return BlobConnector[T](config or BlobConnectorConfig())
        elif connector_type == ConnectorType.Logs:
            return LogsConnector[T](config or LogsConnectorConfig())
        else:
            raise ValueError(f"Unknown connector type: {connector_type}")