# Transactional SQL Server Service

A Fastify-based REST API service for interacting with SQL Server using the Tedious driver. This service provides CRUD operations for `foo` and `bar` entities with Change Data Capture (CDC) enabled.

**Runs on port 8082** (same as transactional-base, as this service replaces it)

## Manual Start (for when you want to set up the infra step by step)

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
./scripts/setup-sqlserver.sh seed      # Sample data (default: 100 foo, 500 bar)
./scripts/setup-sqlserver.sh connector # Register Debezium connector
./scripts/setup-sqlserver.sh verify    # Check data counts + connector status
./scripts/setup-sqlserver.sh clean     # Remove connector + clear all data
```

**Dynamic seeding with custom record counts:**
```bash
# Seed with custom counts
./scripts/setup-sqlserver.sh seed --foo-count 1000 --bar-count 5000

# Complete CDC demonstration setup (RECOMMENDED for CDC testing)
./scripts/setup-sqlserver.sh all --foo-count 10000 --bar-count 50000

# Small test dataset
./scripts/setup-sqlserver.sh seed --foo-count 10 --bar-count 20

# View help for all options
./scripts/setup-sqlserver.sh --help
```

**CDC Demonstration Workflow:**
```bash
# Main development workflow - sets up CDC BEFORE seeding data
pnpm ufa:dev

# Quick CDC demo (assumes setup is already done)
pnpm ufa:dev:demo-cdc

# Step-by-step CDC demonstration
./scripts/setup-sqlserver.sh setup      # 1. Setup database + tables
./scripts/setup-sqlserver.sh connector  # 2. Register CDC connector  
./scripts/setup-sqlserver.sh seed --foo-count 1000 --bar-count 3000  # 3. Insert data (CDC captures!)
```

**Features of the dynamic seeding:**
- **Random data generation** similar to PostgreSQL version
- **Configurable record counts** via command line flags
- **Foreign key relationships** properly maintained between foo and bar
- **Batch processing** for performance with large datasets
- **Progress reporting** during seeding process
- **Performance metrics** showing records/second throughput
- **Sample data preview** in verification step


For in depth/production ready understanding of the debezium connector look at the docs https://debezium.io/documentation/reference/stable/connectors/sqlserver.html. To view the setup for the connector, view register-sqlserver.json inside the `services/


## TODO/WIP: 

- MCP server integration with SQL Server (frontend + backend) - https://devblogs.microsoft.com/azure-sql/introducing-mssql-mcp-server/
