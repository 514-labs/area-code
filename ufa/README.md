<img width="1074" height="120" alt="Area Code starter repo powered by Moose — Automated setup with Turborepo" src="https://github.com/user-attachments/assets/a860328a-cb75-41a2-ade4-b9a0624918e0" />

# Area Code - User-Facing Analytics Starter Application

---

> ⚠️ **ALPHA RELEASE** - This is an early alpha version under active development. We are actively testing on different machines and adding production deployment capabilities. Use at your own risk and expect breaking changes.

Area Code is a production-ready starter repository with all the necessary building blocks for building multi-modal applications with real-time analytics, transactional data, and search capabilities.

## 🚀 Quick Start

Get up and running in minutes with our automated setup:

```bash
# 1. Install dependencies
pnpm install

# 2. Start development environment
pnpm ufa:dev

# 3. Seed databases with sample data (in a new terminal)
pnpm ufa:dev:seed

# 4. Open front-end
http://localhost:5173/
```

This will:

- Seed transactional database with 1M foo records and 100K bar records
- Migrate data to analytical database (ClickHouse)
- Start Elasticsearch migration for search capabilities
- Restart workflows for real-time synchronization

## 🛠️ Available Scripts

```bash
# Development
pnpm ufa:dev              # Start all services
pnpm ufa:dev:clean        # Clean all services
pnpm ufa:dev:seed         # Seed databases with sample data

# Individual services
pnpm --filter vite-web-base dev          # Frontend only
pnpm --filter transactional-base dev      # Transactional API only
pnpm --filter analytical-base dev         # Analytical API only
pnpm --filter retrieval-base dev          # Search API only
```

## 🏗️ Tech Stack

| Category             | Technologies                                        |
| -------------------- | --------------------------------------------------- |
| **Frontend**         | Vite, React 19, TypeScript 5.5, TanStack Router     |
| **Styling**          | Tailwind CSS v4, shadcn/ui, Lucide Icons            |
| **State Management** | TanStack Query, TanStack Form                       |
| **Database**         | PostgreSQL (transactional), ClickHouse (analytical) |
| **ORM**              | Drizzle ORM                                         |
| **API Framework**    | Fastify (transactional), Moose (analytical)         |
| **Search**           | Elasticsearch                                       |
| **Real-time**        | Supabase Realtime                                   |
| **Build Tool**       | Turborepo, pnpm                                     |

## 📁 Project Structure

```
area-code/
├── ufa/                    # User-Facing Analytics
│   ├── apps/              # Frontend applications
│   │   └── vite-web-base/ # React + Vite frontend
│   ├── services/          # Backend services
│   │   ├── transactional-base/  # PostgreSQL + Fastify API
│   │   ├── analytical-base/     # ClickHouse + Moose API
│   │   ├── retrieval-base/      # Elasticsearch search API
│   │   ├── sync-base/           # Data synchronization
│   │   └── transactional-database/ # PostgreSQL setup
│   ├── packages/          # Shared packages
│   │   ├── models/        # Shared data models
│   │   ├── ui/            # Shared UI components
│   │   ├── eslint-config/ # ESLint configuration
│   │   ├── typescript-config/ # TypeScript configuration
│   │   └── tailwind-config/   # Tailwind configuration
│   └── scripts/           # Development scripts
```

## 🔧 Services Overview

### Frontend (vite-web-base)

- Modern React application with TanStack Router
- Real-time data visualization with Recharts
- Form handling with TanStack Form
- Data tables with TanStack Table

### Transactional Base

- Fastify-based REST API
- PostgreSQL database with Drizzle ORM
- Real-time subscriptions via Supabase
- OpenAPI/Swagger documentation
- Transactional business logic

### Analytical Base

- [Moose analytical APIs + ClickHouse](https://docs.fiveonefour.com/moose/building/consumption-apis) with automatic OpenAPI/Swagger docs
- [Moose streaming Ingest Pipelines + Redpanda](https://docs.fiveonefour.com/moose/building/ingestion) for routing change data events from PostgreSQL to ClickHouse

### Retrieval Base

- Elasticsearch search API
- Full-text search capabilities
- Real-time indexing

### Sync Base

- [Moose workflows + Temporal](https://docs.fiveonefour.com/moose/building/workflows) for durable long-running data synchronization
- Real-time replication with Supabase Realtime

## 📊 Data Architecture

The application uses a multi-database architecture:

1. **Supabase** (Transactional)
2. **ClickHouse** (Analytical)
3. **Elasticsearch** (Search)

## 🚀 Production Deployment (Coming Soon)

> 🚧 **UNDER DEVELOPMENT** - Production deployment capabilities are actively being developed and tested. The current focus is on stability and compatibility across different machine configurations.

We're working on a production deployment strategy that will be available soon.

## 🐛 Troubleshooting

> 🔬 **TESTING STATUS** - We are actively testing on various machine configurations. Currently tested on Mac M3 Pro (18GB RAM), M4 Pro, and M4 Max. We're expanding testing to more configurations.

### Common Issues

1. **Node Version**: Ensure you're using Node 20+ (required for Moose)
2. **Memory Issues**: Elasticsearch requires significant memory (4GB+ recommended)

**Tested Configurations:**

- ✅ Mac M3 Pro (18GB RAM)
- ✅ Mac M4 Pro
- ✅ Mac M4 Max
- 🔄 More configurations being tested

### Reset Environment

```bash
# Clean all services
pnpm ufa:dev:clean

# Restart development
pnpm ufa:dev
```

## 📚 Resources

### 🦌 **Moose Resources**

- **[🚀 Moose Repository](https://github.com/514-labs/moose)** - The framework that powers this demo
- **[📚 Moose Documentation](https://docs.fiveonefour.com/moose)** - Complete guide to building with Moose
- **[💬 Moose Community Slack](https://join.slack.com/t/moose-community/shared_invite/zt-210000000000000000000000000000000000000000)** - Join the discussion

### 🛠️ **Other Technologies**

- [Fastify](https://www.fastify.io/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Turborepo Documentation](https://turborepo.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [TanStack Router](https://tanstack.com/router)
- [shadcn/ui](https://ui.shadcn.com/)

## 🆘 Support

> 📋 **ALPHA FEEDBACK** - We welcome feedback and bug reports during this alpha phase. Please include your machine configuration when reporting issues.

### 🦌 **Moose Support**

- **[💬 Moose Discussions](https://github.com/514-labs/moose/discussions)** - Get help with Moose
- **[🐛 Moose Issues](https://github.com/514-labs/moose/issues)** - Report Moose-related bugs
- **[📚 Moose Documentation](https://docs.fiveonefour.com/moose)** - Comprehensive guides

### 🏗️ **Area Code Demo Support**

For issues and questions about this demo:

1. Check the troubleshooting section above
2. Open an issue on GitHub with your machine configuration
3. Join our development discussions for alpha testing feedback

---

## 🦌 **Built with Moose**

This repository demonstrates Moose's capabilities for building production-ready applications with:

- **Real-time analytics** with ClickHouse
- **Event streaming** with Redpanda
- **Reliable workflows** with Temporal
- **Multi-database architectures** (PostgreSQL + ClickHouse + Elasticsearch)

**[🚀 Get Started with Moose](https://github.com/514-labs/moose)** | **[📚 Moose Documentation](https://docs.fiveonefour.com/moose)**
