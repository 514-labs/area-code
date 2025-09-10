## UFA-Lite

UFA-Lite is a thin fork of UFA that omits the Elasticsearch retrieval service. It reuses shared packages from `ufa/packages` and runs concurrently with UFA using isolated ports and database namespaces.

### Services
- Transactional API (Fastify) — PORT=8082
- Moose Sync (Supabase CDC) — http 4400, mgmt 5401
- Moose Analytical — http 4410, proxy 4411, mgmt 5411
- Frontend (Vite) — uses transactional/analytical APIs

Elasticsearch is intentionally not included.

### Environment
- Frontend: set `VITE_TRANSACTIONAL_API_BASE`, `VITE_ANALYTICAL_CONSUMPTION_API_BASE`.
- Do not set `VITE_RETRIEVAL_API_BASE`.

### Scripts
- Root: `pnpm ufa-lite:dev`, `pnpm ufa-lite:dev:clean`, `pnpm ufa-lite:dev:seed`
- Per package: use `ufa-lite:*` scripts.

### Notes
- ClickHouse DB: `local_ufa_lite`
- Redis key prefix: `MSLITE`
- Avoid running UFA and UFA-Lite workflows in the same Temporal queue if enabled.
