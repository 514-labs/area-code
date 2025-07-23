# Data Warehouse Service

**Learn to build operational data warehouses with Moose** - from real-time ingestion to analytics APIs. This hands-on demonstration showcases how to create a complete data pipeline using Moose primitives, with mocked data sources for easy experimentation and clear examples using simple data models.

<a href="dw-logo.png"><img src="dw-logo.png" alt="Data Warehouse Logo" width="512"></a>

## Overview

<a href="./docs/ODW-architecture.jpg"><img src="./docs/ODW-architecture.jpg" alt="Data Warehouse Architecture" width="800"></a>

This project is your **practical guide** to understanding how Moose can power modern operational data warehouses. Rather than implementing every feature in the reference architecture above, we've created a focused, working example that you can run immediately and extend based on your specific needs.

The codebase is **commented** to help you understand each component and pattern. Feel free to explore the code with your favorite LLM - it can provide detailed explanations of how the various Moose primitives work together and help you understand the data flow from ingestion to consumption.

### Purpose and Scope

This project is **intentionally focused** on demonstrating key concepts rather than implementing the full reference architecture shown above. It provides enough practical insights and working examples to help developers understand how to:

- Build data ingestion pipelines with Moose
- Implement stream processing workflows 
- Create analytical APIs and consumption endpoints
- Integrate multiple data sources into a unified warehouse

### Current Implementation

The current state represents a **simplified but functional** implementation that:

- **Uses mocked data sources**: Logs, Blob (storage), and Events integrations are mocked to make this demo self-contained. Developers can easily adapt these patterns for real data sources by configuring appropriate API keys and endpoints for services they want to integrate.

- **Demonstrates Moose primitives**: The project showcases core Moose concepts including data models, ingestion pipelines, stream functions, materialized views, and consumption APIs.

- **Keeps data models simple**: Uses only `foo` and `bar` data models to make the data flow easy to follow and understand. Moose makes it straightforward to create much richer and more complex data models as your use case requires.

- **Provides a complete workflow**: From data ingestion through processing to consumption, giving developers a full picture of an operational data warehouse built with Moose.

### Key Technical Capabilities

- **Real-time Data Ingestion**: Stream data processing with RedPanda
- **Multi-Source Data Extraction**: Configurable connectors for various data sources
- **REST API**: Query interface for accessing processed data
- **Scalable Storage**: ClickHouse backend optimized for analytical workloads
- **Stream Processing**: Real-time data transformation and enrichment

### Demo presentation walkthrough
See: [Presenter - walkthrough docs](./docs/README.md)

## Project Structure

```
services/data-warehouse/
├── app/
│   ├── apis/                   # REST API endpoints
│   ├── logs/                   # Log extraction workflow
│   ├── blobs/                  # Blob extracttion workflow
│   ├── events/                 # Events extracttion workflow
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

2. **Startup** (post setup):
   ```bash
   ./setup.sh start
   ```
   This will:
   - Start the data warehouse service (moose app)
   - Start the data warehouse frontend (streamlit in apps/dw-frontend)

3. **Other Commands**:
   ```bash
   ./setup.sh help
   ```

## Installing Aurora AI Support

Aurora AI is an optional enhancement that extends Cursor's AI capabilities with specialized tools for Moose workflows, ClickHouse queries, and Redpanda integration. This provides intelligent assistance for the creation and maintance of data warehouse operations.

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
- **Redpanda Integration**: Monitor and manage streaming data
- **Context-Aware Suggestions**: AI that understands your data warehouse architecture
- **Automated Documentation**: Generate insights about your data processing workflows

## Presenter - walkthrough docs

[Presenter - walkthrough docs](./docs/README.md)
