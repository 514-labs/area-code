# Parseable Observability Service

**Parseable** is a cloud-native log analytics platform that provides real-time log monitoring and analytics capabilities for the Data Warehouse project.

## Overview

This service provides:
- **Real-time log analytics** with SQL-based querying
- **S3-backed storage** using MinIO for scalable log retention
- **Web-based UI** for log exploration and visualization
- **REST API** for programmatic log ingestion and querying

## Prerequisites

- Docker installed and running
- MinIO service running (dependency)

## Quick Start

**Start Parseable:**
```bash
pnpm dev
# or
./scripts/dev.sh
```

**Clean up:**
```bash
pnpm clean
# or
./scripts/clean.sh
```

## Configuration

The service is configured to integrate with the Data Warehouse infrastructure:

- **Port**: 9600 (web UI accessible at http://localhost:9600)
- **S3 Backend**: MinIO running on port 9500 (external), 9000 (internal)
- **S3 Bucket**: `parseable` (automatically created)
- **Storage Mode**: S3 mode for scalable log storage
- **Default Credentials**: admin/admin

## Dependencies

Parseable requires MinIO to be running for S3 storage backend. The dev script will check for this dependency and prompt you to start MinIO if it's not running.

**Start MinIO first:**
```bash
cd ../minio && pnpm dev
```

## Architecture Integration

Parseable integrates with the Data Warehouse ecosystem by:

1. **Using MinIO as S3 backend** for log storage and retention
2. **Providing observability** for all services in the stack
3. **Enabling log correlation** across different data sources
4. **Supporting real-time monitoring** of data pipeline health

## Usage

### Web Interface
- Navigate to http://localhost:9600
- Login with username: `admin`, password: `admin`
- Create log streams for different data sources
- Query logs using SQL syntax
- Set up dashboards and alerts

### Log Ingestion
Parseable supports various log ingestion methods:
- HTTP POST API for direct log submission
- Fluentd/Fluent Bit integration
- Vector integration
- Custom applications via REST API

## Container Details

- **Image**: parseable/parseable:v2.3.5
- **Container Name**: data-warehouse-parseable
- **Exposed Port**: 9600:8000 (corrected port mapping)
- **Storage**: S3 mode with MinIO backend

## Useful Commands

```bash
# View container logs
docker logs data-warehouse-parseable

# Stop the service
docker stop data-warehouse-parseable

# Remove container and image
pnpm clean --remove-image

# Check service health
curl http://localhost:9600/health
```

## Environment Variables

The service is configured with the following environment variables:

- `P_S3_URL=http://host.docker.internal:9500`
- `P_S3_ACCESS_KEY=minioadmin`
- `P_S3_SECRET_KEY=minioadmin`
- `P_S3_REGION=us-east-1`
- `P_S3_BUCKET=parseable`
- `P_USERNAME=admin`
- `P_PASSWORD=admin`

## Troubleshooting

**Service won't start:**
- Ensure Docker is running
- Check that MinIO is running first
- Verify port 9600 is available

**Can't access web UI:**
- Wait for the service to fully initialize (up to 60 seconds)
- Check container logs for errors
- Ensure no firewall is blocking port 9600

**S3 backend issues:**
- Verify MinIO is accessible at http://localhost:9500 (external port)
- Check MinIO credentials match the configuration (minioadmin/minioadmin)
- The `parseable` bucket is automatically created during startup
- Check MinIO console at http://localhost:9501 for bucket verification