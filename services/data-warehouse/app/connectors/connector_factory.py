from enum import Enum
from typing import TypeVar, Union, Optional, Generic
from app.connectors.s3connector import S3Connector, S3ConnectorConfig

T = TypeVar('T')

class ConnectorType(Enum):
    S3 = "S3"

# Add unions for future connector types
Connector = Union[S3Connector[T]]

class ConnectorFactory(Generic[T]):
    @staticmethod
    def create(
        connector_type: ConnectorType,
        config: Optional[Union[S3ConnectorConfig]] = None
    ) -> Connector[T]:
        if connector_type == ConnectorType.S3:
            return S3Connector[T](config or S3ConnectorConfig())
        else:
            raise ValueError(f"Unknown connector type: {connector_type}")