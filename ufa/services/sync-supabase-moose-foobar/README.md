# Sync Service

A MooseJS workflow service that listens to Supabase database changes and syncs data to analytical and retrieval backends.

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
