# Transactional Base - Business Logic API

A Fastify-based API service that provides transactional business logic with Drizzle ORM.

### 🚀 **Development Mode (Default)**

- **Automatic**: Uses Supabase CLI by default
- **Connection**: Direct to CLI at `127.0.0.1:54322`
- **Lightweight**: ~200MB RAM, 10-15 second startup
- **Hot reload**: Instant database resets and migrations

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
