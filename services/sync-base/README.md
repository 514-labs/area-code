# This is a [MooseJs](https://www.moosejs.com/) project bootstrapped with the [`Moose CLI`](https://github.com/514-labs/moose/tree/main/apps/framework-cli).

<a href="https://www.getmoose.dev/"><img src="https://raw.githubusercontent.com/514-labs/moose/main/logo-m-light.png" alt="moose logo" height="100px"></a>

[![NPM Version](https://img.shields.io/npm/v/%40514labs%2Fmoose-cli?logo=npm)](https://www.npmjs.com/package/@514labs/moose-cli?activeTab=readme)
[![Moose Community](https://img.shields.io/badge/slack-moose_community-purple.svg?logo=slack)](https://join.slack.com/t/moose-community/shared_invite/zt-2fjh5n3wz-cnOmM9Xe9DYAgQrNu8xKxg)
[![Docs](https://img.shields.io/badge/quick_start-docs-blue.svg)](https://docs.moosejs.com/)
[![MIT license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

[Moose](https://www.getmoose.dev/) is an open-source data engineering framework designed to drastically accellerate AI-enabled software developers, as you prototype and scale data-intensive features and applications.

# Get started with Moose

Get up and running with your own Moose project in minutes by using our [Quick Start Tutorial](https://docs.getmoose.dev/quickstart). We also have our [Docs](https://docs.getmoose.dev/) where you can pick your path, learn more about Moose, and learn what types of applications can be built with Moose.

# Beta release

Moose is beta software and is in active development. Multiple public companies across the globe are using Moose in production. We'd love for you to [get your hands on it and try it out](https://docs.getmoose.dev/quickstart). If you're interested in using Moose in production, or if you just want to chat, you can reach us at [hello@moosejs.dev](mailto:hello@moosejs.dev) or in the Moose developer community below.

# Community

You can join the Moose community [on Slack](https://join.slack.com/t/moose-community/shared_invite/zt-2fjh5n3wz-cnOmM9Xe9DYAgQrNu8xKxg).

Here you can get together with other Moose developers, ask questions, give feedback, make feature requests, and interact directly with Moose maintainers.

# Contributing

We welcome contributions to Moose! Please check out the [contribution guidelines](https://github.com/514-labs/moose/blob/main/CONTRIBUTING.md).

# Made by 514

Our mission at [fiveonefour](https://www.fiveonefour.com/) is to bring incredible developer experiences to the data stack. If you're interested in enterprise solutions, commercial support, or design partnerships, then we'd love to chat with you: [hello@moosejs.dev](mailto:hello@moosejs.dev)

# Sync Base Service

This service provides a Moose workflow for real-time synchronization with the transactional-base database using Supabase realtime subscriptions.

## Overview

The sync-base service implements a long-running Moose workflow that listens to changes in the transactional-base database tables:

- `foo` table
- `bar` table
- `foo_bar` junction table

## Zero Configuration Setup

**NEW**: This service now **automatically connects** to Supabase CLI without any configuration needed!

### 🚀 **Development Mode (Default)**

- **Automatic**: Uses Supabase CLI by default
- **Zero config**: No `.env` file needed
- **Smart detection**: Auto-detects CLI vs production mode
- **Same pattern**: Works like transactional-base service

### 🏭 **Production Mode**

- **Explicit**: Only when `NODE_ENV=production`
- **Environment variables**: Loads from `../transactional-database/prod/.env`
- **Fallback**: Optional local `.env` for overrides

## Running the Workflow

### Prerequisites

1. **transactional-base service** must be running (provides the database)
2. **Supabase CLI** database running (via transactional-database service)

**No environment setup needed!** The service automatically connects to the same Supabase CLI instance that transactional-base uses.

### Start the Workflow

```bash
# Start the Moose development server
pnpm dev

# In another terminal, run the workflow (NO CONFIGURATION NEEDED)
moose workflow run supabase-listener
```

**Note**: The workflow automatically detects and connects to Supabase CLI. No input parameters or environment variables required for development.

### Testing the Workflow

Once running, the workflow will listen for changes on the database tables. You can test by:

1. **Creating records** in the transactional-base service:

   ```bash
   curl -X POST http://localhost:3000/api/foo \
     -H "Content-Type: application/json" \
     -d '{"name": "test foo", "score": 42}'
   ```

2. **Updating existing records** through the API
3. **Deleting records** through the API

The workflow will log all changes and execute business logic handlers.

## Environment Detection

The service uses the same auto-detection logic as transactional-base:

```typescript
// Automatically detects mode
const isSupabaseCLI =
  process.env.SUPABASE_CLI === "true" ||
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV !== "production";
```

### CLI Mode (Default)

- **URL**: `http://localhost:8000`
- **Auth**: Default CLI anon key (built-in)
- **Schema**: `public`
- **Connection**: Automatic

### Production Mode

- **URL**: From `SUPABASE_PUBLIC_URL`
- **Auth**: From `SERVICE_ROLE_KEY` or `ANON_KEY`
- **Schema**: From `DB_SCHEMA`
- **Connection**: Environment-configured

## Architecture

The workflow uses:

- **Auto-detection**: Environment-based configuration (no manual setup)
- **Connection module**: Centralized Supabase client management
- **Moose Workflows**: For task orchestration and lifecycle management
- **Supabase Realtime**: For real-time database change notifications
- **PostgreSQL Change Streams**: For capturing database events
- **WebSocket connections**: For real-time communication

## Workflow Features

- **Zero configuration**: Automatically connects to Supabase CLI
- **Long-running task**: Runs indefinitely until manually stopped
- **Real-time listening**: Responds to database changes immediately
- **Graceful shutdown**: Properly cleans up subscriptions
- **Business logic handlers**: Separate handlers for each table
- **Comprehensive logging**: Detailed event logging with timestamps
- **Smart environment detection**: CLI vs production mode

## Customization

Add your sync logic in the handler functions:

- `handleFooChange()` - Process foo table changes
- `handleBarChange()` - Process bar table changes
- `handleFooBarChange()` - Process foo_bar junction table changes

## Monitoring

The workflow provides detailed logging for:

- Environment detection (CLI vs Production)
- Connection status and configuration
- Subscription events
- Database changes
- Business logic execution
- Error conditions

## Troubleshooting

### Common Issues

1. **"Connection failed"**:
   - Ensure transactional-base service is running
   - Check that Supabase CLI is started (via transactional-database)

2. **"No events received"**:
   - Verify transactional-base API is working
   - Check that realtime is enabled on database tables
   - Ensure database changes are happening through the API

3. **"Authentication errors"**:
   - Service auto-uses CLI default keys in development
   - For production, ensure environment variables are set

### Service Dependencies

```
sync-base → transactional-base → transactional-database (Supabase CLI)
```

All services in the chain must be running for sync-base to receive events.

## Production Configuration (Optional)

For production deployment, create a `.env` file:

```bash
# Production Environment Configuration
NODE_ENV=production
SUPABASE_PUBLIC_URL=your-production-url
SERVICE_ROLE_KEY=your-service-role-key
DB_SCHEMA=public
```

**Development requires no configuration** - everything works automatically!

## Migration from Previous Version

If you have an existing `.env` file from the previous setup, you can:

- **Keep it**: The service will still use it if present
- **Remove it**: The service works without it in CLI mode
- **No changes needed**: Existing workflows continue to work

The new version is fully backward compatible while providing zero-config development experience.
