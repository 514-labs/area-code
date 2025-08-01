<img width="1074" height="120" alt="Area Code starter repo powered by Moose — Automated setup with Turborepo" src="https://github.com/user-attachments/assets/a860328a-cb75-41a2-ade4-b9a0624918e0" />

# User-Facing Analytics Starter Application

Area Code is a starter repo with all the necessary building blocks for a production ready repository that demonstrate how to create a CDC pipeline from an OLTP -> OLAP. This started pack sets up SQL Server as the source OLTP system, a Moose powered analytical backend — Redpanda & Clickhouse — as the destination OLAP system, and a Debezium Connector as the real time change data capture (CDC) gateway.


### Quick Start

Follow these commands in order to set up and run the application:

```bash
# 1. Install dependencies
pnpm i

# 2. Start development environment
pnpm ufa:dev

# 3. Seed databases with sample data (in a new terminal)
pnpm ufa:dev:seed

# 4. Open front-end
http://localhost:5173/
```

This will:
- Set up a SQL Server Database called `sqlCDC`, initia two tables `foo` and `bar` configure CDC on the database and tables
- Set up your Moose application, with the pipleine to transform streamed CDC events into your OLAP table and forward them to your retrieval service in stream
- Set up a Debezium connector to read SQL Server transaction logs and forward logs to your topic created in Redpanda by Moose
- Seed transactional database with SQL Server with 100,000 Foo records and 100,000 bar records


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

### Commands

```bash
# Clean
pnpm ufa:dev:clean
```

## 📊 Data Architecture

The application uses a multi-database architecture:

1. **SQLServer** (Transactional)
2. **ClickHouse** (Analytical)
3. **Elasticsearch** (Search)

# Demo Working


### Reset Environment

```bash
# Clean all services
pnpm ufa:dev:clean

# Restart development
pnpm ufa:dev
```

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

