<img width="1074" height="120" alt="Area Code starter repo powered by Moose — Automated setup with Turborepo" src="https://github.com/user-attachments/assets/a860328a-cb75-41a2-ade4-b9a0624918e0" />

# User-Facing Analytics Starter Application

Area Code is a starter repo with all the necessary building blocks for a production ready repository that demonstrate how to create a mirror data in real time from your transcational database(s) to an analytical database.


This demo sets up:
- A sample app with user mock foo/bar data — SQL Server
- Real-time data sync (captures every change automatically) — [Debezium](https://debezium.io/) & Redpanda
- Analytics database (for fast queries and dashboards)  - Clickhouse
- Search database (for finding anything instantly)
- Sample dashboard (see it all working together)


### Try it yourself (5 minutes)

```bash
# Install everything
pnpm i

# Start all services (takes ~30 seconds)
pnpm ufa:dev

# Add sample data (run this in a new terminal)
pnpm ufa:dev:seed

# See it working
open http://localhost:5173/
```

You'll see a dashboard that updates in real-time with CRUD endpoints so you see how changes are propegated from your transactional database (OLTP) to your analytical database (OLAP) system. 

1. SQL Server Database (`sqlCDC`)
   - Creates and configures two tables (`foo` and `bar`) with Change Data Capture (CDC) enabled
   - Seeds 100,000 sample records in each table

2. Moose Analytics Pipeline
   - Configures real-time data transformation from CDC events to OLAP tables
   - Streams transformed data to the retrieval service
   - Leverages Redpanda for high-performance event streaming

3. Debezium CDC Connector
   - Monitors SQL Server transaction logs in real-time
   - Forwards captured changes to Redpanda topics
   - Ensures zero data loss during replication

4. Elasticsearch Search Engine
   - Provides fast full-text search capabilities
   - Automatically indexes all data from the pipeline
   - Enables complex search queries across all entities

This creates an end-to-end data pipeline that automatically captures, transforms, and makes searchable every change in your transactional database.

All running inside docker! 

## 📁 Project Structure

```
area-code/
├── ufa/                    # User-Facing Analytics
│   ├── apps/              # Frontend applications
│   │   └── vite-web-base/ # React + Vite frontend
│   ├── services/          # Backend services
│   │   ├── analytical-base-moose/     # Moose (Redpanda + ClickHouse + Webserver API)
│   │   ├── retrieval-base-elastic/      # Elasticsearch search API
│   │   └── transactional-sqlserver/ # SQL Server + Fastify API, Debezium Connector
│   ├── packages/          # Shared packages
│   │   ├── models/        # Shared data models
│   │   ├── ui/            # Shared UI components
│   │   ├── eslint-config/ # ESLint configuration
│   │   ├── typescript-config/ # TypeScript configuration
│   │   └── tailwind-config/   # Tailwind configuration
│   └── scripts/           # Development scripts
```

## Moose App Structure

```
├── app
│   ├── apis # APIs on Clickhouse Tables
│   │   ├── bar 
│   │   └── foo
│   ├── functions
│   │   └── sqlServerDebeziumTransform.ts # Stream processing logic from CDC event to table 
│   ├── models
│   │   └── debeziumPayload.ts # Data model of JSON CDC payloads written to the Redpanda topic
│   ├── scripts
│   ├── index.ts # Where all objects are instantiated as analytical infrastructure 

```

```bash
# Clean
pnpm ufa:dev:clean
```


## 📊 Data Architecture

The application uses a multi-database architecture:

1. **SQLServer** (Transactional)
2. **ClickHouse** (Analytical)
3. **Elasticsearch** (Search)


### 🏗️ **Area Code Demo Support**

For issues and questions about this demo:

1. Check the troubleshooting section above
2. Open an issue on GitHub with your machine configuration
3. Join our development Slack for alpha testing feedback

---

## 🦌 **Built with Moose**

This repository demonstrates Moose's capabilities for building production-ready applications with:

- **Real-time analytics** with ClickHouse
- **Event streaming** with Redpanda
- **CDC** with Debezium Connect
- **Multi-database architectures** (SQLServer + ClickHouse + Elasticsearch)

**[🚀 Get Started with Moose](https://github.com/514-labs/moose)** | **[📚 Moose Documentation](https://docs.fiveonefour.com/moose)**

