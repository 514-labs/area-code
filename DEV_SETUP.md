# 🚀 Development Setup Guide

This guide explains how to start all services with their containers automatically configured.

## ✨ Quick Start (Recommended)

```bash
# Start all services with automatic container setup
pnpm dev

# Or specifically start just services (no web app)
pnpm run dev:services
```

**What happens automatically:**

- ✅ **transactional-base**: Starts PostgreSQL + PostgREST + Auth, runs migrations, sets up database roles
- ✅ **retrieval-base**: Starts Elasticsearch + Kibana, initializes search indices
- ✅ **sync-base**: Generates proper JWT tokens, creates .env file, starts real-time sync
- ✅ **vite-web-base**: Starts the web application

## 🔧 Manual Service Control

### Individual Services

```bash
# Transactional service (PostgreSQL + API)
cd services/transactional-base
pnpm dev  # Auto-starts containers + migrations + auth setup

# Retrieval service (Elasticsearch + Search API)
cd services/retrieval-base
pnpm es:start       # Start Elasticsearch containers
pnpm es:init-indices # Initialize indices
pnpm dev            # Start search API

# Sync service (Real-time data sync)
cd services/sync-base
pnpm dev  # Auto-generates .env + starts sync workflow
```

### Container Management

```bash
# Transactional-base containers
cd services/transactional-base
pnpm run db:setup    # Start PostgreSQL containers
pnpm run db:stop     # Stop containers
pnpm run db:reset    # Reset with fresh data

# Retrieval-base containers
cd services/retrieval-base
pnpm es:start        # Start Elasticsearch containers
pnpm es:stop         # Stop containers
pnpm es:reset        # Reset with fresh indices
```

## 📊 Service URLs & Access

Once running, you can access:

### **Transactional Base (PostgreSQL + API)**

- **API**: http://localhost:8081
- **Docs**: http://localhost:8081/docs
- **Health**: http://localhost:8081/health
- **PostgREST**: http://localhost:3001 (used by sync service)

### **Retrieval Base (Elasticsearch + Search)**

- **Search API**: http://localhost:8082
- **Docs**: http://localhost:8082/docs
- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601

### **Sync Base (Real-time Sync)**

- **Moose Dashboard**: http://localhost:4000
- **Monitors**: foo/bar table changes → Elasticsearch sync

### **Web App**

- **Frontend**: http://localhost:5173

## 🔄 How Real-time Sync Works

```
┌─────────────────┐    PostgreSQL     ┌──────────────┐    Elasticsearch    ┌─────────────────┐
│ transactional-  │    changes via    │  sync-base   │    indexing         │ retrieval-base  │
│ base            │    Supabase       │              │                     │                 │
│ (PostgreSQL)    │ ─────────────────▶│ (Real-time   │ ──────────────────▶ │ (Elasticsearch) │
│                 │    real-time      │  listener)   │                     │                 │
└─────────────────┘                   └──────────────┘                     └─────────────────┘
```

**What gets synced:**

- `foo` table → `foos` Elasticsearch index
- `bar` table → `bars` Elasticsearch index
- INSERT/UPDATE/DELETE operations are handled automatically

## 🧪 Testing the Setup

### 1. Verify All Services Are Running

```bash
# Check service health
curl http://localhost:8081/health  # Transactional
curl http://localhost:8083/health  # Retrieval
curl http://localhost:9200/_cluster/health  # Elasticsearch

# Check sync service logs
# Look for: "Real-time sync active! Monitoring for changes..."
```

### 2. Test Real-time Sync

```bash
# Create data in transactional service
curl -X POST http://localhost:8081/api/foo \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Sync", "description": "Testing real-time sync"}'

# Verify it appears in search service
curl http://localhost:9200/foos/_search | jq .

# Should see the new record in Elasticsearch!
```

### 3. Test Search Functionality

```bash
# Search for the synced data
curl "http://localhost:8083/api/search/foos?query=Test%20Sync" | jq .
```

## 🛠 Development Workflow

### Making Changes

1. **Schema Changes** (transactional-base):

   ```bash
   cd services/transactional-base
   # Edit src/database/schema.ts
   pnpm run db:generate  # Generate migration
   pnpm run db:migrate   # Apply migration
   ```

2. **Search Schema Changes** (retrieval-base):

   ```bash
   cd services/retrieval-base
   # Edit src/elasticsearch/indices.ts
   pnpm run es:reset     # Reset indices with new mapping
   ```

3. **Sync Logic Changes** (sync-base):
   ```bash
   cd services/sync-base
   # Edit app/index.ts
   # Service auto-reloads with Moose hot reload
   ```

### Debugging

**Container Issues:**

```bash
# Check container status
docker ps

# View container logs
docker logs transactional-base-db
docker logs retrieval-base-elasticsearch
```

**Sync Issues:**

- Check sync-base console for error messages
- Verify JWT tokens: `cd services/sync-base && node setup-env.js`
- Test connections: Create simple test script

**Database Issues:**

```bash
cd services/transactional-base
pnpm run db:studio  # Open Drizzle Studio for DB inspection
```

## 🔒 Security Notes

**Local Development Only:**

- JWT secrets are hardcoded for local development
- Database has permissive access for `anon` role
- Elasticsearch has security disabled

**For Production:**

- Generate secure JWT secrets
- Configure proper database roles and RLS policies
- Enable Elasticsearch security
- Use environment-specific configuration

## 🚨 Troubleshooting

### Port Conflicts

If you get port conflicts, check:

- `3001` - PostgREST (transactional-base)
- `5173` - Vite dev server (web app)
- `8081` - Transactional API
- `8082` - Retrieval API
- `9200` - Elasticsearch
- `5601` - Kibana

### Node Version Issues

```bash
# Use Node 20 (sync-base requirement)
nvm use 20
```

### Container Issues

```bash
# Full reset
pnpm run dev:services  # This will restart everything clean
```

## 📚 Service Documentation

- **[Transactional Base](services/transactional-base/README.md)** - PostgreSQL + API details
- **[Retrieval Base](services/retrieval-base/README.md)** - Elasticsearch + Search details
- **[Sync Base](services/sync-base/README.md)** - Real-time sync details
- **[Models Package](packages/models/README.md)** - Shared data types

---

## 🎉 Summary

With this setup, **everything starts automatically**:

1. Run `pnpm dev` from the root
2. All containers start and configure themselves
3. Database migrations and auth setup happen automatically
4. Search indices are initialized
5. Real-time sync begins working immediately
6. All services are ready for development!

The sync service will automatically keep your PostgreSQL data synchronized with Elasticsearch for fast search and retrieval. Any changes you make in the transactional service will immediately be available in the search service.
