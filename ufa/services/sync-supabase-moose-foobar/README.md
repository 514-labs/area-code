# Sync Service

A MooseJS workflow service that listens to Supabase database changes and syncs data to analytical and retrieval backends.

## Environment Variables

### Development

Development mode uses Supabase CLI defaults and automatically configures the database connection.

### Production

For production deployments, set the following environment variable:

- `SUPABASE_CONNECTION_STRING` - PostgreSQL connection string for your Supabase database
  - Format: `postgresql://postgres:[password]@[host]:[port]/postgres`
  - Example: `postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres`
  - This is used for executing complex SQL scripts (like realtime replication setup)

The service will automatically detect production mode (`NODE_ENV=production`) and use the connection string.

## Available Scripts

```bash
# MooseJS CLI access
pnpm moose

# Build Docker image
pnpm build

# Start development server
pnpm dev
pnpm ufa:dev

# Clean development environment
pnpm ufa:dev:clean

# Workflow management
pnpm dev:workflow        # Run Supabase listener workflow
pnpm dev:workflow:stop   # Stop Supabase listener workflow
```
