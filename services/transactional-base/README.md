# Transactional Base - Business Logic API

A Fastify-based API service that provides transactional business logic with Drizzle ORM. This service connects to the `transactional-database` service and **automatically detects** whether to use CLI (development) or production database setups.

## 🏗️ Automatic Database Detection

This service **automatically chooses** the right database connection:

### 🚀 **Development Mode (Default)**

- **Automatic**: Uses Supabase CLI by default
- **Connection**: Direct to CLI at `127.0.0.1:54322`
- **Lightweight**: ~200MB RAM, 10-15 second startup
- **Hot reload**: Instant database resets and migrations

### 🏭 **Production Mode**

- **Explicit**: Only when `NODE_ENV=production`
- **Advanced pooling**: Supavisor tenant-based connections
- **Environment**: Loads from `../transactional-database/prod/.env`

## Architecture

This service provides:

- **RESTful API** built with Fastify
- **Database operations** using Drizzle ORM
- **Type-safe migrations** with Drizzle Kit
- **OpenAPI documentation** with Swagger
- **Business logic** for foo and bar entities

## Prerequisites

- **transactional-database** service running in desired mode
- **Node.js 20.x** (due to Moose requirements)
- **pnpm** for package management

## Quick Start

### Development (Recommended)

```bash
# 1. Start CLI database
cd ../transactional-database
pnpm dev:start

# 2. Run migrations and start API
cd ../transactional-base
pnpm dev:migrate
pnpm dev
```

### Production

```bash
# 1. Start production database
cd ../transactional-database
pnpm prod:start

# 2. Set production mode and start API
cd ../transactional-base
NODE_ENV=production pnpm dev:migrate
NODE_ENV=production pnpm dev
```

## Available Scripts

### Development

- `pnpm dev` - Start server (automatically uses CLI database)
- `pnpm dev:migrate` - Run migrations (automatically uses CLI database)
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Start production server
- `pnpm typecheck` - Run TypeScript type checking

### Database Operations

- `pnpm db:migrate` - Run migrations (auto-detects environment)
- `pnpm db:generate` - Generate new migration files
- `pnpm db:studio` - Open Drizzle Studio (database GUI)

### Service Management

- `pnpm setup` - Setup and start all dependencies
- `pnpm shutdown` - Shutdown service and dependencies

## API Documentation

Once running, access the interactive API documentation at:

- **Swagger UI**: `http://localhost:3000/docs`
- **OpenAPI Spec**: `http://localhost:3000/docs/json`

## Database Connection Details

The service automatically chooses the right connection:

### Development Mode (Auto-detected)

```
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Production Mode (NODE_ENV=production)

- **Migrations**: `postgresql://postgres.{tenant}:{password}@localhost:5432/postgres`
- **Runtime**: `postgresql://postgres.{tenant}:{password}@localhost:6543/postgres`

## Environment Configuration

### Development (Default)

No configuration needed! The service automatically connects to Supabase CLI.

Optional `.env` for app-specific settings:

```env
PORT=3000
# NODE_ENV defaults to development
```

### Production Mode

Set `NODE_ENV=production` and ensure database config exists at `../transactional-database/prod/.env`:

```env
NODE_ENV=production
POSTGRES_PASSWORD=your-password
POOLER_TENANT_ID=your-tenant
```

## Project Structure

```
src/
├── database/           # Database connection and schema
│   ├── connection.ts   # Smart connection (auto-detects CLI/prod)
│   └── schema.ts       # Drizzle ORM schema definitions
├── routes/             # API route handlers
│   ├── foo.ts          # Foo entity operations
│   └── bar.ts          # Bar entity operations
├── scripts/            # Utility scripts
│   ├── migrate.ts      # Database migration runner
│   └── wait-for-services.ts  # Service readiness checker
└── server.ts           # Main Fastify server setup
```

## Development Workflow

### Standard Development (CLI)

1. **Start CLI database**: `cd ../transactional-database && pnpm dev:start`
2. **Run migrations**: `pnpm dev:migrate`
3. **Start API**: `pnpm dev`
4. **Make changes**: Auto-reloads with hot reload
5. **Reset database**: `cd ../transactional-database && pnpm dev:reset`

### Production Testing

1. **Start production database**: `cd ../transactional-database && pnpm prod:start`
2. **Run migrations**: `NODE_ENV=production pnpm dev:migrate`
3. **Start API**: `NODE_ENV=production pnpm dev`
4. **Generate migrations**: `pnpm db:generate` (after schema changes)

## Testing

Integration tests are located in the `transactional-database` service as they test the database infrastructure.

For API testing, use the Swagger UI or make direct HTTP requests:

```bash
# Get all foos
curl http://localhost:3000/foos

# Create a new foo
curl -X POST http://localhost:3000/foos \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "score": 42}'
```

## Dependencies

This service depends on:

- `@workspace/transactional-database` - Database infrastructure
- `@workspace/models` - Shared data models
- Fastify ecosystem for HTTP handling
- Drizzle ORM for database operations
