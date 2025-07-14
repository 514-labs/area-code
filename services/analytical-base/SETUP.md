# Analytical Base Service Setup

This service is built with [Moose.js](https://www.moosejs.com/), a data engineering framework for AI-enabled applications.

## Quick Start

The easiest way to get started is using the setup script:

```bash
# Full setup (install dependencies, start infrastructure, start service)
./setup.sh setup

# Or just run setup (default action)
./setup.sh
```

## Available Commands

### Service Management
- `./setup.sh setup` - Full setup (install, start infrastructure, start service)
- `./setup.sh start` - Start the analytical service only
- `./setup.sh stop` - Stop the analytical service
- `./setup.sh restart` - Restart the analytical service
- `./setup.sh status` - Show service status

### Infrastructure Management
- `./setup.sh infra:start` - Start Moose infrastructure only (Redpanda, ClickHouse, Redis, Temporal)
- `./setup.sh infra:stop` - Stop Moose infrastructure
- `./setup.sh infra:reset` - Reset infrastructure data (stop, remove volumes, restart)

### Reset Operations
- `./setup.sh reset` - Full reset (stop services, clear data, restart everything)

### Help
- `./setup.sh help` - Show help message

## Infrastructure Components

The analytical-base service requires the following infrastructure components:

### Redpanda (Streaming Platform)
- **Port**: 19092 (Kafka API), 9092 (Kafka API), 9644 (Admin API)
- **Purpose**: Event streaming and message queuing
- **Health Check**: `curl http://localhost:19092`

### ClickHouse (Analytical Database)
- **Port**: 18123 (HTTP), 9000 (Native)
- **Purpose**: Fast analytical queries and data warehousing
- **Health Check**: `curl http://localhost:18123/ping`

### Redis (Caching)
- **Port**: 6379
- **Purpose**: Caching and session storage
- **Health Check**: `redis-cli -p 6379 ping`

### Temporal (Workflow Orchestration)
- **Port**: 7233 (gRPC), 8080 (Web UI)
- **Purpose**: Workflow orchestration and task scheduling
- **Health Check**: `curl http://localhost:7233`

### PostgreSQL (Temporal Database)
- **Port**: 5433
- **Purpose**: Temporal metadata storage
- **Health Check**: `pg_isready -h localhost -p 5433`

## Service Endpoints

Once running, the service provides the following endpoints:

- **Main Service**: http://localhost:4100
- **Management Interface**: http://localhost:5101
- **Temporal Web UI**: http://localhost:8080

## Example Usage

### Ingest Events
```bash
# Ingest a FooThing event
curl -X POST http://localhost:4100/ingest/FooThingEvent \
  -H 'Content-Type: application/json' \
  -d '{
    "fooId": "foo-123",
    "action": "created",
    "currentData": {
      "id": "foo-123",
      "name": "Sample Foo",
      "status": "active"
    }
  }'

# Ingest a BarThing event
curl -X POST http://localhost:4100/ingest/BarThingEvent \
  -H 'Content-Type: application/json' \
  -d '{
    "barId": "bar-456",
    "fooId": "foo-123",
    "action": "created",
    "currentData": {
      "id": "bar-456",
      "value": 42,
      "label": "Sample Bar"
    }
  }'
```

## Development

### Prerequisites
- Node.js 20+
- pnpm
- Docker
- Docker Compose

### Manual Setup
If you prefer to set up manually:

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start infrastructure:
   ```bash
   docker-compose up -d
   ```

3. Start the service:
   ```bash
   pnpm dev
   ```

### Configuration
The service configuration is in `moose.config.toml`. Key settings:

- **HTTP Server**: localhost:4100 (main), localhost:5101 (management)
- **Redpanda**: localhost:19092
- **ClickHouse**: localhost:18123
- **Redis**: localhost:6379
- **Temporal**: localhost:7233

## Troubleshooting

### Service Won't Start
1. Check if infrastructure is running: `./setup.sh status`
2. Check logs: `docker logs <container-name>`
3. Reset if needed: `./setup.sh reset`

### Infrastructure Issues
1. Check Docker is running
2. Check ports are available
3. Reset infrastructure: `./setup.sh infra:reset`

### Common Issues
- **Port conflicts**: Ensure ports 4100, 5101, 19092, 18123, 6379, 7233, 8080, 5433 are available
- **Memory issues**: Ensure Docker has enough memory allocated
- **Permission issues**: Make sure setup.sh is executable: `chmod +x setup.sh`

## Data Models

The service uses models from the `@workspace/models` package:

- `FooThingEvent` - Events related to Foo entities
- `BarThingEvent` - Events related to Bar entities

See the `app/example-usage.ts` file for examples of how to use these models.

## Next Steps

1. Explore the Moose.js documentation: https://docs.moosejs.com/
2. Check out the example usage in `app/example-usage.ts`
3. Create your own ingestion pipelines in `app/pipelines/`
4. Build consumption APIs in `app/apis/`
5. Create data views in `app/views/` 