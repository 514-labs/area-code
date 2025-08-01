# Transactional Backend

A Fastify API service providing CRUD operations for Foo and Bar entities using Drizzle ORM and PostgreSQL.

## Setup

### Environment Variables

This service requires an Anthropic API key to enable AI chat functionality with Aurora MCP (Model Context Protocol) tools:

1. **Get an Anthropic API key**: Visit [console.anthropic.com](https://console.anthropic.com) to create an account and generate an API key
2. **Create a `.env.local` file** in this service directory (`ufa/services/transactional-supabase-foobar/`):
   ```bash
   ANTHROPIC_API_KEY=your-api-key-here
   ```

The Aurora MCP provides AI-powered tools for interacting with your Moose analytical backend, enabling intelligent data querying and analysis through the chat interface.

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
