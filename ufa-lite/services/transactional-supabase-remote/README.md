# transactional-supabase-remote-lite

Remote-only transactional API for ufa-lite. No local DB, no seeding, no Anthropic.

## Env vars
- TRANSACTIONAL_DB_CONNECTION_STRING (required)
- ENFORCE_AUTH (default `true`)
- ALLOWED_ORIGINS (comma-separated list; e.g. https://app.example.com,https://www.example.com)

## Endpoints
- GET /api/health
- CRUD:
  - GET /api/foo?limit=50&offset=0
  - POST /api/foo
  - GET /api/foo/:id
  - PATCH /api/foo/:id
  - DELETE /api/foo/:id
  - GET /api/bar?fooId=...&limit=50&offset=0
  - POST /api/bar
  - GET /api/bar/:id
  - PATCH /api/bar/:id
  - DELETE /api/bar/:id

## Notes
- Supply Authorization: Bearer <token> for Supabase RLS contexts when ENFORCE_AUTH=true.
- Configure production origins in ALLOWED_ORIGINS.
