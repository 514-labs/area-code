# Transactional SQL Server Service

A Fastify-based REST API service for interacting with SQL Server using the Tedious driver. This service provides CRUD operations for `foo` and `bar` entities with Change Data Capture (CDC) enabled.

**Runs on port 8082** (same as transactional-base, as this service replaces it)

## Quick Start

1. **Start SQL Server and setup database:**
   ```bash
   pnpm sqlserver:start
   python3 seed-sqlserver.py setup --clear-data
   python3 seed-sqlserver.py seed --foo-rows 1000 --bar-rows 500 --clear-data
   ```

2. **Start the API server:**
   ```bash
   pnpm dev:server
   ```

3. **API will be available at:** `http://localhost:8082`
   - Swagger docs: `http://localhost:8082/docs`
   - Health check: `http://localhost:8082/health`

## CDC Setup (Optional)

Add the Debezium connector for streaming changes:

```bash
pnpm connector:list
pnpm connector:register
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