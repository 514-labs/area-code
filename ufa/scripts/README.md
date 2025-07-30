# Data Seeding Scripts

This directory contains scripts for seeding sample data across all area-code services, including PostgreSQL, SQL Server, ClickHouse, and Elasticsearch.

## Scripts Overview

### `dev-seed.sh` - Main Orchestration Script
The primary script that coordinates data seeding across all services in the area-code architecture.

### `seed-sqlserver.py` - SQL Server Seeding Script  
Python script for seeding foo and bar data into SQL Server with CDC (Change Data Capture) enabled.

## Quick Start

### Basic Usage (PostgreSQL Flow)
```bash
./dev-seed.sh
```

### Include SQL Server in Flow
```bash
./dev-seed.sh --include-sqlserver --foo-rows=100,000 --bar-rows=10,000
```

### SQL Server Only
```bash
./dev-seed.sh --sqlserver-only --foo-rows=50,000 --bar-rows=5,000
```

## Architecture Overview

The seeding process supports multiple database systems:

1. **PostgreSQL** (transactional-base) - Primary OLTP database
2. **SQL Server** (transactional-sqlserver) - Alternative OLTP with Debezium CDC
3. **ClickHouse** (analytical-base) - OLAP data warehouse  
4. **Elasticsearch** (retrieval-base) - Search and retrieval

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--foo-rows=N` | Number of foo records | `--foo-rows=1,000,000` |
| `--bar-rows=N` | Number of bar records | `--bar-rows=100,000` |
| `--clear-data` | Clear existing data first | `--clear-data` |
| `--include-sqlserver` | Include SQL Server in flow | `--include-sqlserver` |
| `--sqlserver-only` | Only seed SQL Server | `--sqlserver-only` |
| `--verbose` | Show detailed output | `--verbose` |
| `--help` | Show help message | `--help` |

## Data Flow Modes

### 1. Standard PostgreSQL Flow (Default)
```
workflows → PostgreSQL → ClickHouse → Elasticsearch → workflows
```

### 2. PostgreSQL + SQL Server Flow  
```
workflows → PostgreSQL → SQL Server → ClickHouse → Elasticsearch → workflows
```

### 3. SQL Server Only Flow
```
workflows → SQL Server → workflows
```

## Prerequisites

### For PostgreSQL Seeding
- Docker (for PostgreSQL containers)
- pnpm (for workflow management)
- Bash shell

### For SQL Server Seeding  
- Python 3.6+
- Docker (for SQL Server container)
- No additional dependencies required (uses docker exec)

### Installing Python Dependencies
```bash
# No additional Python dependencies required for SQL Server seeding
# The script uses docker exec with sqlcmd (same as existing setup)
```

## SQL Server Setup

### 1. Start SQL Server Container
```bash
cd ../services/transactional-sqlserver
docker compose up -d
```

### 2. Initialize Database Schema
```bash
./dev-seed.sh --sqlserver-only --setup-schema --foo-rows=1000


### 3. Register Debezium Connector (Optional)
```bash
curl -i -X POST -H "Accept:application/json" -H "Content-Type:application/json" \
http://localhost:8084/connectors/ \
-d @../services/transactional-sqlserver/register-sqlserver.json
```

## Database Schema

Both PostgreSQL and SQL Server use the same logical schema:

### `foo` Table
- `id` - Primary key (UUID)
- `name` - Service name
- `description` - Service description  
- `status` - Service status (active, inactive, pending, archived)
- `priority` - Priority level (1-10)
- `is_active` - Boolean flag
- `metadata` - JSON metadata
- `tags` - JSON array of tags
- `score` - Numeric score (0-100)
- `large_text` - Large text field
- `created_at`, `updated_at` - Timestamps

### `bar` Table  
- `id` - Primary key (UUID)
- `foo_id` - Foreign key to foo table
- `value` - Numeric value (0-999)
- `label` - Label string
- `notes` - Notes text
- `is_enabled` - Boolean flag
- `created_at`, `updated_at` - Timestamps

## Examples

### Interactive Seeding
```bash
./dev-seed.sh
# Prompts for configuration options
```

### Automated High-Volume Seeding
```bash
./dev-seed.sh \
  --clear-data \
  --foo-rows=5,000,000 \
  --bar-rows=500,000 \
  --include-sqlserver \
  --verbose
```

### SQL Server Development Setup
```bash
# Start with small dataset for development
./dev-seed.sh \
  --sqlserver-only \
  --foo-rows=10,000 \
  --bar-rows=1,000 \
  --clear-data
```

### Production-like Dataset
```bash
./dev-seed.sh \
  --foo-rows=10,000,000 \
  --bar-rows=2,000,000 \
  --include-sqlserver
```

## Performance Notes

### PostgreSQL
- Uses batch processing (500-5000 records per batch)
- Implements WAL-safe commits to prevent crashes
- Can handle millions of records efficiently

### SQL Server
- Uses pyodbc executemany() for batch inserts
- Batch size: 1000 for foo, 5000 for bar
- Includes small delays to prevent overwhelming the database

### Background Processing
- ClickHouse migration is fast (< 5 minutes)
- Elasticsearch migration runs in background (15-30 minutes)
- Workflows are restarted automatically

## Logs and Monitoring

### Log Files
- Main log: `ufa/logs/seed-YYYYMMDD-HHMMSS.log`
- Elasticsearch migration: `elasticsearch_migration.log`

### Monitoring Commands
```bash
# Watch main seeding progress
tail -f ufa/logs/seed-*.log

# Monitor Elasticsearch migration
tail -f elasticsearch_migration.log

# Check SQL Server data
docker exec transactional-sqlserver-sqlserver-1 \
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Password!" \
-Q "SELECT COUNT(*) FROM sqlCDC.dbo.foo; SELECT COUNT(*) FROM sqlCDC.dbo.bar;" -N -C

# Verify CDC events in Redpanda
docker exec analytical-base-redpanda-1 rpk topic consume SqlServerDebeziumPayload
```

## Troubleshooting

### Common Issues

#### Docker Issues
```bash
# Ensure Docker is running
docker --version

# Check if SQL Server container is running
docker ps | grep sqlserver

# Start SQL Server if needed
cd ufa/services/transactional-sqlserver
docker compose up -d
```

#### SQL Server Connection Issues  
```bash
# Check container status
docker ps | grep sqlserver

# Test connection
docker exec transactional-sqlserver-sqlserver-1 \
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Password!" -Q "SELECT 1;" -N -C
```

#### PostgreSQL Issues
```bash
# Check Supabase containers
docker ps | grep supabase

# Verify database connection
docker exec supabase_db_* psql -U postgres -d postgres -c "SELECT COUNT(*) FROM foo;"
```

### Health Checks
The script includes automatic health checks for all services:
- PostgreSQL (port 5432)
- SQL Server (SQL connection test)
- ClickHouse (port 4100)
- Elasticsearch (port 8083)
- Frontend (port 5173)

## Contributing

When extending the seeding scripts:

1. **Follow the existing patterns** for error handling and logging
2. **Use batch processing** for large datasets
3. **Include health checks** for new services
4. **Add appropriate command line flags** for new options
5. **Update this README** with new functionality

## Files Structure

```
ufa/scripts/
├── dev-seed.sh           # Main orchestration script
├── seed-sqlserver.py     # SQL Server seeding script
├── requirements.txt      # Python dependencies
└── README.md            # This file
``` 