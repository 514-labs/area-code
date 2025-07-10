 pnpm install
 docker cp tests/setup-test-table.sql supabase-db:/tmp/setup-test-table.sql
 docker exec -it supabase-db psql -U postgres -d postgres -f /tmp/setup-test-table.sql
 pnpm test:realtime:dev