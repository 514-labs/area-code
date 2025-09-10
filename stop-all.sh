pnpm --filter transactional-supabase-foobar db:stop || true
pnpm --filter transactional-supabase-foobar-lite db:stop || true

# Stop Moose services (UFA)
pnpm --filter sync-supabase-moose-foobar ufa:dev:clean || true
pnpm --filter analytical-moose-foobar ufa:dev:clean || true

# Stop Moose services (UFA-LITE)
pnpm --filter sync-supabase-moose-foobar-lite ufa-lite:dev:clean || true
pnpm --filter analytical-moose-foobar-lite ufa-lite:dev:clean || true

# If retrieval (Elasticsearch) was running (UFA only)
pnpm --filter retrieval-elasticsearch-foobar ufa:dev:clean || true

sleep 5
lsof -nP -iTCP -sTCP:LISTEN | egrep ':(4000|4100|4101|5001|5101|4400|4410|4411|5401|5411|8082|8083)' || true

