# Operational Data Warehouse Starter Application

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker 2.23.1+

## Quick Start

(If you haven't already, navigate here `cd odw/services/data-warehouse`, and make sure Docker Desktop is running)

**Full Setup** (recommended for first-time users):
   ```bash
   ./setup.sh setup
   ```
   This will:
   - Install all dependencies
   - Start the data warehouse service (moose app)
   - Start the data warehouse frontend (streamlit in apps/dw-frontend) and open it in your browser

## Other Commands

| Command | Description |
|---------|-------------|
| `./setup.sh help` | Display available commands and usage |
| `./setup.sh stop` | Stop the data warehouse service |
| `./setup.sh start` | Start the service (not required after initial setup) |
| `./setup.sh reset` | Perform a full reset of the system |
| `./setup.sh status` | Check the current status of services |
| `./setup.sh env:check` | Verify environment configuration |

## Installing Aurora AI Support

Aurora AI is an optional enhancement that extends your copilot's AI capabilities an MCP with specialized tools for Moose workflows, ClickHouse queries, and RedPanda integration. This provides intelligent assistance for the creation and maintenance of data warehouse operations.

For setup instructions, see [Aurora docs](https://docs.fiveonefour.com/aurora).

## Project Structure

```
odw/
├── services/
│   ├── data-warehouse/         # Main Moose data warehouse service
│   │   ├── app/
│   │   │   ├── apis/           # REST API endpoints for data consumption
│   │   │   ├── blobs/          # Blob data extraction workflows
│   │   │   ├── events/         # Events data extraction workflows
│   │   │   ├── ingest/         # Data models and stream transformations
│   │   │   ├── logs/           # Log data extraction workflows
│   │   │   ├── views/          # Materialized views for analytics
│   │   │   └── main.py         # Main Moose application entry point
│   │   ├── docs/               # Documentation and walkthrough guides
│   │   ├── setup.sh            # Setup and management script
│   │   ├── moose.config.toml   # Moose framework configuration
│   │   └── requirements.txt    # Python dependencies
│   └── connectors/             # External data source connectors
│       └── src/
│           ├── blob_connector.py    # Blob storage data connector
│           ├── events_connector.py  # Events data connector
│           ├── logs_connector.py    # Logs data connector
│           └── connector_factory.py # Connector factory pattern
└── apps/
    └── dw-frontend/            # Streamlit web application
        ├── pages/              # Frontend page components
        ├── utils/              # Frontend utility functions
        └── main.py             # Streamlit application entry point
```
