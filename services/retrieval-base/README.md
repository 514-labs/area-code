# Retrieval Base Service

A search service that uses Elasticsearch to enable full-text search for Foo and Bar entities.

## Features

- Full-text search with fuzzy matching
- Filtering by entity properties
- Sorting capabilities
- Bulk indexing support
- Health check endpoint with Elasticsearch status
- OpenAPI/Swagger documentation

## Prerequisites

- Node.js 20+
- pnpm
- Docker and Docker Compose

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start the Service

**Automated setup (recommended):**

```bash
pnpm dev
```

This automatically:

- ✅ Starts Elasticsearch + Kibana containers (idempotent)
- ✅ Waits for Elasticsearch to be ready
- ✅ Initializes indices with proper mappings
- ✅ Starts the API server

**Manual setup (if you prefer control):**

```bash
# Start Elasticsearch manually (includes waiting + index init)
pnpm es:start

# Start server only
pnpm dev:server-only
```

**Server-only mode (without Elasticsearch dependency):**

```bash
pnpm dev:server-only
```

The service will be available at `http://localhost:8082`

> **Note:** Server-only mode is useful for testing API docs, working on non-search features, or when Elasticsearch is temporarily unavailable. Search endpoints will return errors, but the service will start successfully.

## API Endpoints

### Search Endpoints

- `GET /api/search` - Search across all entities
- `GET /api/search/foos` - Search only Foo entities
- `GET /api/search/bars` - Search only Bar entities

#### Query Parameters

- `q` - Search query (optional)
- `from` - Pagination offset (default: 0)
- `size` - Number of results (default: 10, max: 100)
- `sortBy` - Field to sort by
- `sortOrder` - Sort direction: "asc" or "desc" (default: "desc")

#### Filters for Foos

- `status` - Filter by status
- `priority` - Filter by priority number
- `isActive` - Filter by active state (true/false)

#### Filters for Bars

- `fooId` - Filter by associated Foo ID
- `isEnabled` - Filter by enabled state (true/false)

### Other Endpoints

- `GET /` - API information
- `GET /health` - Health check with Elasticsearch status
- `GET /docs` - Swagger UI documentation
- `GET /documentation/json` - OpenAPI JSON specification
- `GET /documentation/yaml` - OpenAPI YAML specification

## Examples

### Search for Foos containing "urgent"

```bash
curl "http://localhost:8082/api/search/foos?q=urgent"
```

### Search for active Foos with high priority

```bash
curl "http://localhost:8082/api/search/foos?status=active&priority=1"
```

### Search for Bars associated with a specific Foo

```bash
curl "http://localhost:8082/api/search/bars?fooId=foo-1"
```

### Search all entities with pagination

```bash
curl "http://localhost:8082/api/search?q=test&from=10&size=20"
```

## Development

### Container Management

```bash
# Check Elasticsearch status (just reports, never fails)
pnpm es:status

# Start Elasticsearch + wait for ready + init indices
pnpm es:start

# Stop Elasticsearch
pnpm es:stop

# Reset Elasticsearch data (stop, clear volumes, restart, init)
pnpm es:reset
```

### View Logs

```bash
docker logs retrieval-base-elasticsearch
```

### Access Kibana

Open `http://localhost:5601` in your browser to explore data using Kibana.

## Architecture

The service uses:

- **Fastify** for the REST API framework
- **Elasticsearch** for full-text search and filtering
- **Zod** for request validation
- **@workspace/models** for shared type definitions

The service is designed to be populated via CDC (Change Data Capture) pipelines in production, but includes seeding scripts for development and testing.
