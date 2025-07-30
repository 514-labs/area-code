# Analytical Base Service

This service handles analytics and data processing for the UFA platform.

## Features

- **CDC Processing**: Processes Change Data Capture (CDC) events from SQL Server via Debezium
- **Data Transformation**: Transforms raw CDC data into structured formats for analytics
- **Elasticsearch Integration**: Automatically indexes processed data for search capabilities
- **Real-time Analytics**: Provides real-time data processing and analytics APIs

## Architecture

### Data Flow

1. **SQL Server CDC** → **Debezium** → **Analytical Base**
2. **Analytical Base** processes and transforms data
3. Data flows to:
   - **ClickHouse** (for analytics storage)
   - **Elasticsearch** (for search indexing)

### Elasticsearch Integration

The service automatically sends processed CDC data to Elasticsearch via the retrieval-base service. This enables:

- **Real-time Search**: Data is indexed in Elasticsearch as it flows through the analytics pipeline
- **Unified Data**: Both Foo and Bar data are searchable
- **Automatic Sync**: INSERT, UPDATE, and DELETE operations are properly reflected in Elasticsearch

#### Configuration

Set these environment variables to configure Elasticsearch integration:

```bash
# Retrieval service URL (default: http://localhost:8083)
RETRIEVAL_BASE_URL=http://localhost:8083

# Enable/disable Elasticsearch integration (default: enabled)
ELASTICSEARCH_ENABLED=true
```

#### How It Works

1. **CDC Events** arrive from SQL Server via Debezium
2. **Transform Functions** convert CDC data to structured formats (`FooWithCDC`, `BarWithCDC`)
3. **Elasticsearch Side Effect** sends the transformed data to Elasticsearch asynchronously
4. **Data Storage** continues to ClickHouse for analytics

The integration is non-blocking - if Elasticsearch is unavailable, the main data pipeline continues to work.

## Development

```bash
# Install dependencies
pnpm install

# Start the service
moose dev

# The service will run on port 4100
```

## API Endpoints

- **Analytics APIs**: Available at `http://localhost:4100/api/`
- **Data Ingestion**: CDC data is ingested automatically via the streaming pipeline

## Related Services

- **retrieval-base**: Provides search capabilities via Elasticsearch
- **sync-base**: Handles real-time synchronization with Supabase
- **transactional-base**: Manages transactional data operations
