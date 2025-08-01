# Transactional SQL Server Service

A Fastify-based REST API service for interacting with SQL Server using the Tedious driver. This service provides CRUD operations for `foo` and `bar` entities with Change Data Capture (CDC) enabled.

**Runs on port 8082** (same as transactional-base, as this service replaces it)

## Quick Start

1. **Start SQL Server and setup database:**
   ```bash
   docker compose up -d
   ./scripts/setup-sqlserver.sh  # Complete setup
   ```

2. **Start the API server:**
   ```bash
   pnpm dev:server
   ```

3. **API will be available at:** `http://localhost:8082`
   - Swagger docs: `http://localhost:8082/docs`
   - Health check: `http://localhost:8082/health`

## CDC & Connector Management

The setup script automatically handles Debezium connector registration. For manual management:

```bash
# Automatic (recommended)
./scripts/setup-sqlserver.sh connector

# Manual using pnpm scripts
pnpm connector:list
pnpm connector:register
pnpm connector:status
pnpm connector:delete
```

## Key Features

- **Fastify** web framework with TypeScript
- **Tedious** SQL Server driver with connection pooling
- **Swagger/OpenAPI** documentation
- **CRUD operations** for foo and bar entities
- **CDC-enabled** tables for streaming changes
- **Same API patterns** as transactional-base

## Environment Configuration

See `.env.example` for configuration options. Default port is **8082**.


## Database Setup Commands

**Simple script approach (recommended):**
```bash
# Complete setup (database + tables + CDC + sample data + connector)
./scripts/setup-sqlserver.sh

# Individual steps
./scripts/setup-sqlserver.sh setup     # Database + CDC + tables
./scripts/setup-sqlserver.sh seed      # Sample data  
./scripts/setup-sqlserver.sh connector # Register Debezium connector
./scripts/setup-sqlserver.sh verify    # Check data counts + connector status
./scripts/setup-sqlserver.sh clean     # Remove connector + clear all data
```

**Legacy Python script (deprecated):**
```bash
python3 seed-sqlserver.py setup --clear-data
python3 seed-sqlserver.py seed --foo-rows 5 --bar-rows 100
python3 seed-sqlserver.py verify
```