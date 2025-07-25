# Retrieval Backend Service

A search service that uses Elasticsearch to enable full-text search for Foo and Bar entities.

## Available Scripts

```bash
# Development
pnpm dev                 # Start Elasticsearch and API server (full setup)
pnpm ufa:dev            # Alias for dev script used in monorepo context
pnpm dev:server-only    # Start only API server (skip Elasticsearch)
pnpm ufa:dev:clean      # Stop Elasticsearch containers

# Build and code quality
pnpm build              # Compile TypeScript to JavaScript
pnpm lint               # Run ESLint on source files

# Elasticsearch management
pnpm es:start           # Start Elasticsearch + initialize indices
pnpm es:stop            # Stop Elasticsearch containers
pnpm es:reset           # Reset Elasticsearch data (full reset)
pnpm es:status          # Check Elasticsearch status
pnpm es:init-indices    # Initialize Elasticsearch indices
```

---
