# Transactional Database

Self-hosted Supabase database infrastructure for transactional workloads with real-time capabilities.

## Available Scripts

```bash
# Development lifecycle
pnpm dev:start          # Start Supabase local development
pnpm dev:stop           # Stop Supabase services
pnpm dev:restart        # Restart Supabase services
pnpm dev:reset          # Reset database to initial state
pnpm ufa:dev:clean      # Alias for dev:stop

# Monitoring
pnpm dev:status         # Check service status
pnpm dev:logs           # View service logs
pnpm dev:studio         # Open Supabase Studio

# Replication setup
pnpm setup:replication         # Setup database replication
pnpm setup:replication:status  # Check replication status
pnpm replication:stop          # Stop replication
```
