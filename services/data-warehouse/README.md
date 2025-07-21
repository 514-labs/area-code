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

## Installing Aurora AI Support

Aurora AI is an optional enhancement that extends Cursor's AI capabilities with specialized tools for Moose workflows, ClickHouse queries, and RedPanda integration. This provides intelligent assistance for the creation and maintance of data warehouse operations.

### Prerequisites

- An Anthropic API key (required for full functionality)
- Cursor IDE installed
- Access to the Area-Code repository

### Installation Steps

#### 1. Install Aurora

Run the installation command from your terminal:

```bash
bash -i <(curl -fsSL https://fiveonefour.com/install.sh) aurora,moose
```

#### 2. Configure Aurora for Cursor

Navigate to the Area-Code repository root and set up Aurora for Cursor:

```bash
aurora setup --mcp cursor-project
```

#### 3. Enable Required Tools

Configure Aurora to use all available tools. Use the space bar to select all tools, then press Enter:

```bash
aurora config tools
```

You should see options like:
- `moose-read-tools` - Enable Moose read tools for data inspection
- `moose-write-tools` - Enable Moose write tools for full functionality (requires API key)
- `remote-clickhouse-tools` - Enable Remote ClickHouse integration

**Note**: Use space bar to select all tools, then press Enter to confirm.

#### 4. Add Your API Key

Configure your Anthropic API key (replace with your actual key):

```bash
aurora config keys sk-ant-api03-your-actual-api-key-here
```

#### 5. Launch Cursor

Start Cursor from the Area-Code repository:

```bash
open -a cursor .
```

### Verification and Usage

#### 1. Accept MCP Tool

When prompted by Cursor to accept a newly detected MCP tool, click "Accept" or "Allow".

#### 2. Verify Installation

1. Open Cursor Settings (`Shift + Command + P`)
2. Navigate to `Tools & Integrations`
3. Confirm that "aurora MCP Tool" is activated

#### 3. Test Aurora Integration

1. Add the `data-warehouse` folder to a Cursor chat
2. Try the following prompt: `Tell me about this moose project`
3. Allow the `read_moose_project` MCP tool to run when prompted
4. You should receive a description of the Moose workflow project

#### 4. Explore Additional Features

Try these example prompts to explore Aurora's capabilities:

- `Read the contents of my ClickHouse database`
- `Show me the current data pipeline status`
- `Analyze the recent data ingestion patterns`

### Benefits

With Aurora AI enabled, you gain:

- **Intelligent Moose Workflow Analysis**: Understand complex data pipelines
- **ClickHouse Query Assistance**: Get help with database queries and optimization
- **RedPanda Integration**: Monitor and manage streaming data
- **Context-Aware Suggestions**: AI that understands your data warehouse architecture
- **Automated Documentation**: Generate insights about your data processing workflows

## Presenter - walkthrough docs

[Presenter - walkthrough docs](./docs/README.md)
