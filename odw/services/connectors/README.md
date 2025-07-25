# Connectors

A Python package providing mock data connectors for an Operational Data Warehouse. These connectors simulate real-world data sources by generating structured data for blobs, logs, and events.

## Overview

The connectors package implements a factory pattern to create data extractors that generate realistic mock data for testing and demonstration purposes. Each connector produces domain-specific data models that flow through the Moose data pipeline.

## Usage

### Core Components

- **`ConnectorFactory`**: Factory class for creating connector instances
- **`ConnectorType`**: Enum defining available connector types
- **Connector Classes**: Individual implementations for each data source type
- **Configuration Classes**: Customizable settings for each connector

### Example from data-warehouse

```python
from app.ingest.models import BlobSource
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.blob_connector import BlobConnectorConfig

connector = ConnectorFactory[BlobSource].create(
    ConnectorType.Blob,
    BlobConnectorConfig(batch_size=10000)
)

data = connector.extract()
```
