# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Area Code is a starter repository with multi-modal backend capabilities combining transactional (PostgreSQL), analytical (ClickHouse), and search (Elasticsearch) systems. Built with Turborepo, it includes two main applications: User Facing Analytics (UFA) and Operational Data Warehouse (ODW), plus a lightweight UFA-Lite variant.

## Package Manager & Node Version

- **Always use pnpm** (never npm)
- **Required Node version: 20+** (required for Moose framework)
- Package manager: `pnpm@10.14.0`

## Development Commands

### UFA (User Facing Analytics)
```bash
# Start all UFA services
pnpm ufa:dev

# Clean all UFA services and dependencies
pnpm ufa:dev:clean

# Seed databases with sample data (1M foo records, 100K bar records)
pnpm ufa:dev:seed

# Seed specific services
pnpm ufa:dev:seed:transactional-supabase-foobar
pnpm ufa:dev:seed:analytical-moose-foobar
pnpm ufa:dev:seed:retrieval-elasticsearch-foobar
```

### UFA-Lite (without Elasticsearch)
```bash
# Start UFA-Lite services
pnpm ufa-lite:dev

# Clean UFA-Lite services
pnpm ufa-lite:dev:clean

# Seed UFA-Lite databases
pnpm ufa-lite:dev:seed
```

### ODW (Operational Data Warehouse)
```bash
# Start ODW services
pnpm odw:dev

# Clean ODW services
pnpm odw:dev:clean

# Seed ODW databases
pnpm odw:dev:seed
```

### Individual Service Development
```bash
# Frontend only
pnpm --filter web-frontend-foobar dev

# Transactional API only
pnpm --filter transactional-supabase-foobar dev

# Analytical API only
pnpm --filter analytical-moose-foobar dev

# Search API only (UFA only)
pnpm --filter retrieval-elasticsearch-foobar dev
```

### Testing and Quality
```bash
# Build all packages
turbo build

# Lint all packages
turbo lint

# Type checking (service-specific)
pnpm --filter <service-name> typecheck
```

## Project Structure

This is a **Turborepo monorepo** with workspaces organized as:

```
area-code/
├── ufa/                    # Full-featured UFA
│   ├── apps/               # User-facing applications
│   │   └── web-frontend-foobar/
│   ├── services/           # Backend services
│   │   ├── transactional-supabase-foobar/  # PostgreSQL + Fastify
│   │   ├── analytical-moose-foobar/         # ClickHouse + Moose
│   │   ├── retrieval-elasticsearch-foobar/ # Elasticsearch
│   │   └── sync-supabase-moose-foobar/     # Data sync workflows
│   └── packages/           # Shared packages
│       ├── models/         # Data models
│       ├── ui/             # UI components
│       ├── eslint-config/  # ESLint config
│       ├── typescript-config/
│       └── tailwind-config/
├── ufa-lite/              # Lightweight UFA (no Elasticsearch)
│   ├── apps/
│   └── services/
└── odw/                   # Operational Data Warehouse
    ├── apps/
    ├── services/
    └── packages/
```

## Architecture Components

### UFA Stack
- **Frontend**: Vite + React 19 + TypeScript + TanStack (Router, Query, Form, Table) + Tailwind CSS
- **Transactional**: PostgreSQL + Fastify + Drizzle ORM + Supabase Realtime
- **Analytical**: ClickHouse + Moose framework (API & Ingest)
- **Search**: Elasticsearch (UFA only, not in UFA-Lite)
- **Sync & Streaming**: Moose Workflows (Temporal) + Moose Stream (Redpanda)

### Service Ports
**UFA Ports:**
- Frontend: http://localhost:5173
- Transactional API: http://localhost:8080
- Analytical Moose: http://localhost:4000 (proxy 4001, management 5001)
- Retrieval API: http://localhost:8081
- Sync Moose: http://localhost:4100 (management 5101)

**UFA-Lite Ports:**
- Transactional API: http://localhost:8082
- Analytical Moose: http://localhost:4410 (proxy 4411, management 5411)
- Sync Moose: http://localhost:4400 (management 5401)

### Key Technologies
- **Moose**: Framework for analytical APIs, streaming pipelines, and workflows
- **Drizzle ORM**: TypeScript-first ORM for PostgreSQL
- **Supabase**: PostgreSQL with realtime subscriptions
- **ClickHouse**: Analytical database
- **Elasticsearch**: Search engine (UFA only)
- **Temporal**: Workflow orchestration
- **Redpanda**: Event streaming

## Development Workflow

1. **Installation**: `pnpm install` (workspace root)
2. **Start Services**: Use appropriate `pnpm <stack>:dev` command
3. **Seed Data**: Use `pnpm <stack>:dev:seed` for sample data
4. **Individual Development**: Use `--filter` for specific services

### Moose Service Development
- Moose services support **hot reload** - no manual restart needed
- Test workflows: `moose workflow run <workflow-name>`
- Moose CLI commands: `moose-cli dev`, `moose-cli build`, `moose-cli clean`

### Package Naming Convention
- Prefix shared packages with `@workspace/`
- Examples: `@workspace/models`, `@workspace/ui`, `@repo/eslint-config`

## Environment Setup

### Required for AI Chat Feature (Optional)
Create `.env.local` in `services/transactional-supabase-foobar/`:
```bash
ANTHROPIC_API_KEY=your-api-key-here
```

### UFA-Lite Frontend Environment
Create `.env.development.local` in `ufa-lite/apps/web-frontend-foobar/`:
```bash
VITE_ENABLE_SEARCH=false
VITE_TRANSACTIONAL_API_BASE=http://localhost:8082
VITE_ANALYTICAL_CONSUMPTION_API_BASE=http://localhost:4410
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=dev-anon-key
```

## Database Management

### Transactional Services (PostgreSQL/Supabase)
```bash
# Start database
pnpm --filter transactional-supabase-foobar db:start

# Stop database
pnpm --filter transactional-supabase-foobar db:stop

# Run migrations
pnpm --filter transactional-supabase-foobar db:migrate

# Generate migrations
pnpm --filter transactional-supabase-foobar db:generate
```

## Troubleshooting

### Memory Requirements
- Elasticsearch requires 4GB+ RAM
- Tested on Mac M3/M4 Pro with 18GB+ RAM

### Reset Environment
```bash
# Clean all services and dependencies
pnpm <stack>:dev:clean

# Restart development
pnpm <stack>:dev
```

### Common Issues
1. **Node Version**: Ensure Node 20+ for Moose compatibility
2. **Memory**: Insufficient RAM for Elasticsearch
3. **Port Conflicts**: Check that required ports are available
4. **Service Dependencies**: Ensure all services start in correct order

## Important Notes

- **Never use npm** - always use pnpm
- **Don't override .env files** - use .env.local for local overrides
- Moose services require Node 20+
- UFA-Lite omits Elasticsearch for lighter resource usage
- All stacks share containers (Postgres, ClickHouse, Redpanda, Temporal)
- Use `tmux-agent-cmd.sh` wrapper for command execution if available