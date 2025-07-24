# Data Warehouse Service

**Learn to build operational data warehouses with Moose** - from real-time ingestion to analytics APIs. This hands-on demonstration showcases how to create a complete data pipeline using Moose primitives, with mocked data sources for easy experimentation and clear examples using simple data models.

<a href="dw-logo.png"><img src="dw-logo.png" alt="Data Warehouse Logo" width="512"></a>

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker 2.23.1+

## Quick Start

(If you haven't already, navigate here `cd services/data-warehouse`, and make sure Docker Desktop is running)

**Full Setup** (recommended for first-time users):
   ```bash
   ./setup.sh setup
   ```
   This will:
   - Install all dependencies
   - Start the data warehouse service (moose app)
   - Start the data warehouse frontend (streamlit in apps/dw-frontend) and open it in your browser


## Presenter - walkthrough docs

[Presenter - walkthrough docs](./docs/README.md)

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


## Other Commands:

   ```bash
   ./setup.sh help
   ```

   ```bash
   ./setup.sh stop      # Stop service 
   ```

   ```bash
   ./setup.sh start     # Start service (not required after initial setup)
   ```

     ```bash
   ./setup.sh reset     # Full reset 
   ```

   ```bash
   ./setup.sh status    # Check status
   ```

   ```bash
   ./setup.sh env:check
   ```

## Installing Aurora AI Support

Aurora AI is an optional enhancement that extends your copilot's AI capabilities an MCP with specialized tools for Moose workflows, ClickHouse queries, and RedPanda integration. This provides intelligent assistance for the creation and maintenance of data warehouse operations.

For setup instructions, see [Aurora docs](https://docs.fiveonefour.com/aurora).
