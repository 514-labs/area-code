# Data Warehouse Service

A high-performance data warehouse service built with **Moose** for real-time data ingestion, processing, and analytics. This service provides APIs for data extraction from multiple sources (S3, Datadog) and supports streaming data pipelines with ClickHouse as the storage backend.

![dw-logo.png](dw-logo.png)

## Overview

The Data Warehouse Service is designed to handle large-scale data ingestion and processing with the following key capabilities:

- **Real-time Data Ingestion**: Stream data processing with RedPanda
- **Multi-Source Data Extraction**: Support for S3, Datadog, and custom connectors
- **REST API**: Query interface for accessing stored data
- **Scalable Storage**: ClickHouse backend for high-performance analytics
- **Workflow Engine**: Temporal-based data processing workflows

## Project Structure

```
services/data-warehouse/
├── app/
│   ├── apis/                   # REST API endpoints
│   ├── datadog/                # Datadog extraction workflow
│   ├── s3/                     # S3 extracttion workflow
│   ├── ingest/                 # Data models and transformations
│   └── main.py                 # Main application entry point
├── setup.sh                    # Setup and management script
├── moose.config.toml           # Moose configuration
├── requirements.txt            # Python dependencies
└── setup.py                    # Package configuration
```

## Run

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker 2.23.1+

### Quick Start

1. **Full Setup** (recommended for first-time users):
   ```bash
   ./setup.sh setup
   ```
   This will:
   - Install all dependencies
   - Start the data warehouse service (moose app)
   - Start the data warehouse frontend (streamlit in apps/dw-frontend)

2. **Other Commands**:
   ```bash
   ./setup.sh help
   ```
