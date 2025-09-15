# UFA‑Lite

UFA‑Lite is a streamlined subset of the full UFA project. It focuses on the essentials needed to demo and develop the front‑end application and a minimal transactional backend without the full analytical/retrieval stack or local database infrastructure.

## What’s included
- Apps
  - `apps/web-frontend-foobar`: Vite + React front‑end that uses Supabase Auth and calls backend APIs
- Services
  - `services/transactional-supabase-remote`: a minimal transactional API, designed as a reference for working with a remote PostgreSQL/Supabase database (no local DB containers, no seeding, no Anthropic)

## Transactional reference: remote Supabase/Postgres
The `transactional-supabase-remote` service demonstrates a clean pattern for transactional CRUD with a remote database:
- Uses Drizzle ORM with `postgres` client
- Supports Supabase RLS by propagating the bearer token into Postgres via `set_config`
- Provides separate admin and RLS clients to avoid session config conflicts
- Exposes minimal CRUD endpoints for `foo` and `bar`

Key endpoints (served as Vercel functions):
- `GET /api/health`
- `GET /api/foo?limit=50&offset=0`
- `POST /api/foo`
- `GET /api/foo/:id`
- `PATCH /api/foo/:id`
- `DELETE /api/foo/:id`
- `GET /api/bar?fooId=...&limit=50&offset=0`
- `POST /api/bar`
- `GET /api/bar/:id`
- `PATCH /api/bar/:id`
- `DELETE /api/bar/:id`

### Service configuration
Set these environment variables in `services/transactional-supabase-remote` (for local dev create `.env.local`):
- `TRANSACTIONAL_DB_CONNECTION_STRING` (required): connection string to your remote Postgres/Supabase
- `ENFORCE_AUTH` (default: `true`): when `true`, require `Authorization: Bearer <token>` and enable RLS context; when `false`, run as admin
- `ALLOWED_ORIGINS` (comma‑separated): production origins for CORS (e.g. `https://app.example.com,https://www.example.com`)

Run locally with Vercel dev (recommended):
```bash
cd services/transactional-supabase-remote
vercel dev
# API at http://localhost:3000
curl -i http://localhost:3000/api/health
```

Or run the Fastify server directly (non‑Vercel):
```bash
cd services/transactional-supabase-remote
pnpm dev
# Health at http://localhost:8082/health
```

### Front‑end configuration
In `apps/web-frontend-foobar` set the transactional API base and Supabase creds (e.g. `.env.local`):
- `VITE_TRANSACTIONAL_API_BASE` (e.g. `http://localhost:3000` when using `vercel dev`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The front‑end forwards the Supabase session access token in the `Authorization` header to the transactional API when authenticated.

## What’s explicitly out of scope in UFA‑Lite
- Local Postgres/Supabase containers and DB seeding
- Anthropic/chat integrations
- Retrieval/Elastic and CDC workflows

## Notes
- Use Node 20 and pnpm
- Follow the full UFA repo for advanced analytics, ingestion, and retrieval patterns
