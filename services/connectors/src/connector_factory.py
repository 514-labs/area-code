from enum import Enum
from typing import TypeVar, Union, Optional, Generic
from .s3connector import S3Connector, S3ConnectorConfig
from .datadog_connector import DatadogConnector, DatadogConnectorConfig

T = TypeVar('T')

class ConnectorType(Enum):
    S3 = "S3"
    Datadog = "Datadog"

# Add unions for future connector types
Connector = Union[S3Connector[T], DatadogConnector[T]]

class ConnectorFactory(Generic[T]):
    @staticmethod
    def create(
        connector_type: ConnectorType,
        config: Optional[Union[S3ConnectorConfig, DatadogConnectorConfig]] = None
    ) -> Connector[T]:
        if connector_type == ConnectorType.S3:
            return S3Connector[T](config or S3ConnectorConfig())
        elif connector_type == ConnectorType.Datadog:
            return DatadogConnector[T](config or DatadogConnectorConfig())
        else:
            raise ValueError(f"Unknown connector type: {connector_type}")