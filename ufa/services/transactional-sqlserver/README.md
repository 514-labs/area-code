# SQL Server Transactional Backend

This service demonstrates real-time data synchronization from SQL Server to analytical and search databases using Change Data Capture (CDC) and Debezium.

## Overview

This demo sets up:
- A sample app with user mock foo/bar data — SQL Server
- Real-time data sync (captures every change automatically) — [Debezium](https://debezium.io/) & Redpanda
- Analytics database (for fast queries and dashboards) - ClickHouse
- Search database (for finding anything instantly) - Elasticsearch
- Sample dashboard (see it all working together)

## Architecture

You'll see a dashboard that updates in real-time with CRUD endpoints so you see how changes are propagated from your transactional database (OLTP) to your analytical database (OLAP) system.

1. **SQL Server Database** (`sqlCDC`)
   - Creates and configures two tables (`foo` and `bar`) with Change Data Capture (CDC) enabled
   - Seeds 100,000 sample records in each table

2. **Moose Analytics Pipeline**
   - Configures real-time data transformation from CDC events to OLAP tables
   - Streams transformed data to the retrieval service
   - Leverages Redpanda for high-performance event streaming

3. **Debezium CDC Connector**
   - Monitors SQL Server transaction logs in real-time
   - Forwards captured changes to Redpanda topics
   - Ensures zero data loss during replication

4. **Elasticsearch Search Engine**
   - Provides fast full-text search capabilities
   - Automatically indexes all data from the pipeline
   - Enables complex search queries across all entities

This creates an end-to-end data pipeline that automatically captures, transforms, and makes searchable every change in your transactional database.

All running inside docker!

## Moose App Structure

```
├── app
│   ├── apis # APIs on ClickHouse Tables
│   │   ├── bar 
│   │   └── foo
│   ├── functions
│   │   └── sqlServerDebeziumTransform.ts # Stream processing logic from CDC event to table 
│   ├── models
│   │   └── debeziumPayload.ts # Data model of JSON CDC payloads written to the Redpanda topic
│   ├── scripts
│   ├── index.ts # Where all objects are instantiated as analytical infrastructure 
```

## Data Architecture

The application uses a multi-database architecture:

1. **SQL Server** (Transactional)
2. **ClickHouse** (Analytical)
3. **Elasticsearch** (Search)

## Built with Moose

This service demonstrates Moose's capabilities for building production-ready applications with:

- **Real-time analytics** with ClickHouse
- **Event streaming** with Redpanda
- **CDC** with Debezium Connect
- **Multi-database architectures** (SQL Server + ClickHouse + Elasticsearch)

**[🚀 Get Started with Moose](https://github.com/514-labs/moose)** | **[📚 Moose Documentation](https://docs.fiveonefour.com/moose)**