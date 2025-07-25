# Transactional Backend

A Fastify API service providing CRUD operations for Foo and Bar entities using Drizzle ORM and PostgreSQL.

## Available Scripts

```bash
# Development
pnpm dev                 # Start with database setup
pnpm ufa:dev            # Alias for dev script
pnpm dev:server-only    # Start server only (skip DB setup)
pnpm dev:migrate        # Run database migrations in dev mode

# Production
pnpm build              # Compile TypeScript
pnpm start              # Start production server

# Database
pnpm db:generate        # Generate Drizzle schema
pnpm db:migrate         # Run database migrations
pnpm db:studio          # Open Drizzle Studio

# Utilities
pnpm clean              # Remove build artifacts
pnpm typecheck          # Type checking without build
```
