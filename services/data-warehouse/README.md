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

## Installing Aurora AI support

```bash
bash -i <(curl -fsSL https://fiveonefour.com/install.sh) aurora,moose
cd services/data-warehouse/
aurora setup --mcp cursor-project
```

Next configure Aurora to use all tools. Use the space bar to ensure all tools are selected - then press enter when done.

```bash
aurora config tools
? Select tools to enable (no selection defaults to moose-read-tools):  
  [x] moose-read-tools - Enable moose read tools for data inspection
  [x] moose-write-tools - Enable moose write tools for full functionality (requires API key, auto-enables read tools)
> [x] remote-clickhouse-tools - Enable Remote Clickhouse integration
[↑↓ to move, space to select one, → to all, ← to none, type to filter]
```

Start a cursor instance from within the services/data-warehouse project:

```bash
cd services/data-warehouse/
open -a cursor .
```

If prompted by Cursor to accept a newly detected MCP tool, accept the invitation.

Use `Shift -> Command P` to load the Cursor Settings. Under teh `Tools & Integrations` sectin you should see an aurora MCP Tool activated.

In the Cursor chat try the following prompt:

`Tell me about this moose project`

You should see a prompt to run the `read_moose_project` MCP tool.  Allow the tool to run.
After some thought you should see a description of the moose workflow project.

Consider trying this additional prompt:

- Read the contents of my clickhouse database

## Presenter - walkthrough docs

[Presenter - walkthrough docs](./docs/README.md)
