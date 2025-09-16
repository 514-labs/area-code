# UFA‑Lite

**Reference architecture** for adding **MooseStack + ClickHouse** analytics to your existing web backend. React frontend + transactional API + analytical service.

## Two Ways to Use This

### 1. **Reference Playground** (Use as-is)

- **Pre-configured** with read-only credentials
- **Real production data** from our remote Postgres + ClickHouse
- **Zero setup** - just run locally and experiment
- **Perfect for** learning MooseStack + ClickHouse patterns

### 2. **Apply to Your Production** (Customize)

- Replace credentials with your own ClickHouse
- Set up ClickPipes CDC against your production Postgres
- Use this as a template for your actual use case

## Reference Architecture

- **Remote Postgres** (this repo uses Supabase)
- **Remote ClickHouse** (data mirrored via ClickPipes CDC)
- **Analytical models** pulled from remote ClickHouse

### Playground Credentials

**Use these read-only credentials to run the reference as-is with real data:**

**ClickHouse:**

```env
REMOTE_CLICKHOUSE_CONNECTION_STRING='https://read_only_user:Ufa-Lite-123!@swtrnxdyro.us-central1.gcp.clickhouse.cloud:8443/test_supabase_cdc'
```

**Note:** These are read-only credentials. You can view data but cannot create/modify records. This is so you can run `pnpm seed-foo` and `pnpm seed-bar` to seed the local ClickHouse instance with the data from the remote ClickHouse instance.

## For Your Own Production Data

**To apply this pattern to your actual use case:**

1. **Set up ClickPipes CDC** against your production Postgres
2. **Replace credentials** with your own Postgres + ClickHouse
3. **Update analytical models** to match your data schema
4. **Use this as a template** for your MooseStack + ClickHouse integration

## Quick Start (Reference Playground)

**Prerequisites:** Node.js 20.x, pnpm, Docker

```bash
# Install
pnpm install

# Start everything with real data
pnpm ufa-lite:dev
```

**Or start individually:**

```bash
# Analytical service (MooseStack + ClickHouse)
cd services/analytical-moose-foobar && pnpm dev

# Transactional API (remote Supabase)
cd services/transactional-supabase-remote && vercel dev

# React frontend
cd apps/web-frontend-foobar && pnpm dev
```

**Result:** You'll have a working app with real production data, perfect for experimenting with MooseStack + ClickHouse patterns.

## Configuration (Reference Playground)

**Transactional API** (`services/transactional-supabase-remote/.env.local`):

```env
TRANSACTIONAL_DB_CONNECTION_STRING=your_postgres_connection_string_here
ENFORCE_AUTH=true
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend** (`apps/web-frontend-foobar/.env.local`):

```env
VITE_TRANSACTIONAL_API_BASE=http://localhost:3000
VITE_ANALYTICAL_API_BASE=http://localhost:4410
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**For your own production:** Replace these with your actual database credentials and ClickPipes CDC setup.

## Data Flow

```
Postgres → ClickPipes CDC → ClickHouse
```

**Setup:**

- Transactional API → remote Supabase (read-only)
- Analytical API → remote ClickHouse (read-only)
- Frontend → both local services
- No local databases required

## API Endpoints

**Transactional** (`http://localhost:3000`):

- `GET /api/foo` - List Foo entities
- `POST /api/foo` - Create Foo
- `PATCH /api/foo/:id` - Update Foo
- `DELETE /api/foo/:id` - Delete Foo

**Analytical** (`http://localhost:4410`):

- `GET /api/foo` - Analytical Foo data
- `GET /api/foo-average-score` - Average calculations
- `GET /api/foo-score-over-time` - Time series analytics
- `GET /api/foo-cube-aggregations` - Multi-dimensional analytics

## Development

**Add analytics APIs:**

```typescript
// services/analytical-moose-foobar/app/apis/
export const getFooAnalytics = async (params: GetFooAnalyticsParams) => {
  return await client.query(/* ClickHouse SQL */);
};
```

**Frontend integration (using React Query):**

```typescript
// Transactional API
const { data } = useQuery({
  queryKey: ["foos-transactional"],
  queryFn: () => FooApi.list(),
});

// Analytical API
const { data } = useQuery({
  queryKey: ["foos-analytical"],
  queryFn: () => getApiFoo({ baseURL: analyticalApiBase }),
});
```
