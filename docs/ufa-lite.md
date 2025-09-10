## UFA-Lite Quickstart

Overview: UFA-Lite is a thin fork of UFA that omits Elasticsearch, reuses shared packages, and can run alongside UFA without conflicts.

### Ports (Lite)
- Transactional API: http://localhost:8082
- Sync Moose: http://localhost:4400 (management 5401)
- Analytical Moose: http://localhost:4410 (proxy 4411, management 5411)

### Frontend env (.env.development.local)
Add this file in `ufa-lite/apps/web-frontend-foobar`:

```
VITE_ENABLE_SEARCH=false
VITE_TRANSACTIONAL_API_BASE=http://localhost:8082
VITE_ANALYTICAL_CONSUMPTION_API_BASE=http://localhost:4410
# VITE_RETRIEVAL_API_BASE not used in ufa-lite

# Supabase (adjust for your setup)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=dev-anon-key
```

### Start
1) Install deps (Node 20):
```
pnpm -w install
```

2) Seed (optional; uses local containers, no psql required):
```
pnpm -w run ufa-lite:dev:seed
# Or target a service:
pnpm -w run ufa-lite:dev:seed:transactional-supabase-foobar
pnpm -w run ufa-lite:dev:seed:analytical-moose-foobar
```

3) Dev (Turbo UI):
```
pnpm -w run ufa-lite:dev
```

### Notes
- No Elasticsearch/retrieval or CDC sync service in ufa-lite.
- Uses the same local containers as UFA (Supabase Postgres, ClickHouse, Redpanda, Temporal). No local Postgres install needed.
- ClickHouse DB name: `local`; Redis prefix: `MSLITE`.
- Temporal/Redpanda are shared; avoid cross-stack workflow/topic collisions.


