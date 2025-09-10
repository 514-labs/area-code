#!/usr/bin/env bash
set -euo pipefail

########################################################
# UFA-Lite Development Data Seeding Script (No-Elastic)
########################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"
SEED_LOG="$LOG_DIR/seed-$(date +%Y%m%d-%H%M%S).log"

SERVICE=""
CLEAR_DATA="false"
FOO_ROWS="1000000"
BAR_ROWS="100000"
VERBOSE_MODE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service=*) SERVICE="${1#*=}"; shift ;;
    --clear-data) CLEAR_DATA="true"; shift ;;
    --foo-rows=*) FOO_ROWS="${1#*=}"; shift ;;
    --bar-rows=*) BAR_ROWS="${1#*=}"; shift ;;
    --verbose) VERBOSE_MODE="true"; shift ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

is_service_running() {
  local service="$1"
  case "$service" in
    "transactional-supabase-foobar-lite") curl -sf "http://localhost:8082/health" >/dev/null 2>&1 ;;
    "analytical-moose-foobar-lite") curl -sf "http://localhost:4410/health" >/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}

cleanup_existing_workflows() {
  echo "🛑 CDC disabled in ufa-lite; skipping workflow stop"
}

restart_workflows() {
  echo "🔄 CDC disabled in ufa-lite; skipping workflow start"
}

detect_db_container() {
  local name=""
  if docker ps --format "{{.Names}}" | grep -q "supabase_db_"; then
    name=$(docker ps --format "{{.Names}}" | grep "supabase_db_" | head -1)
  elif docker ps --format "{{.Names}}" | grep -q "supabase-db"; then
    name="supabase-db"
  else
    name=""
  fi
  echo "$name"
}

seed_transactional() {
  echo "📊 Seeding transactional-supabase-foobar-lite..."
  if ! is_service_running "transactional-supabase-foobar-lite"; then
    echo "⚠️  transactional-supabase-foobar-lite is not running (http://localhost:8082). Start dev first."; return 0
  fi

  local DB_CONTAINER
  DB_CONTAINER=$(detect_db_container)
  if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Error: No PostgreSQL container found (expected Supabase CLI-managed container)."; return 1
  fi

  local SVC_DIR="$PROJECT_ROOT/services/transactional-supabase-foobar"
  local DB_USER="${DB_USER:-postgres}"
  local DB_NAME="${DB_NAME:-postgres}"

  # Optionally clear schema and reapply migrations
  if [ "$CLEAR_DATA" = "true" ]; then
    echo "🧹 Clearing public schema in container $DB_CONTAINER..."
    cat > /tmp/drop_tables.sql << 'EOSQL'
DO $cleanup$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    FOR r IN (
        SELECT typname 
        FROM pg_type t 
        JOIN pg_namespace n ON t.typnamespace = n.oid 
        WHERE n.nspname = 'public' AND t.typtype = 'e'
    ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END$cleanup$;
EOSQL
    docker cp /tmp/drop_tables.sql "$DB_CONTAINER:/tmp/drop_tables.sql"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/drop_tables.sql >/dev/null 2>&1 || true
    rm -f /tmp/drop_tables.sql

    # Reapply migrations if present
    if [ -d "$SVC_DIR/database/migrations" ]; then
      echo "📋 Recreating schema via migrations..."
      for migration_file in "$SVC_DIR"/database/migrations/*.sql; do
        [ -f "$migration_file" ] || continue
        filename=$(basename "$migration_file")
        docker cp "$migration_file" "$DB_CONTAINER:/tmp/$filename"
        docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f "/tmp/$filename" >/dev/null 2>&1 || true
        docker exec "$DB_CONTAINER" rm -f "/tmp/$filename"
      done
    fi
  fi

  # Load seed procedures and execute
  echo "🌱 Executing SQL seed procedures..."
  docker cp "$SVC_DIR/database/scripts/seed-transactional-database.sql" "$DB_CONTAINER:/tmp/seed.sql"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed.sql >/dev/null 2>&1 || true
  docker exec "$DB_CONTAINER" rm -f /tmp/seed.sql

  local FOO_COUNT_SQL=$(echo "$FOO_ROWS" | tr -d ',')
  local BAR_COUNT_SQL=$(echo "$BAR_ROWS" | tr -d ',')
  local CLEAN_SQL=$([ "$CLEAR_DATA" = "true" ] && echo "true" || echo "false")

  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "CALL seed_foo_data($FOO_COUNT_SQL, $CLEAN_SQL);" >/dev/null 2>&1 || true
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "CALL seed_bar_data($BAR_COUNT_SQL, $CLEAN_SQL);" >/dev/null 2>&1 || true

  echo "✅ transactional-supabase-foobar-lite seeded"
}

seed_analytical() {
  echo "📈 Migrating data into analytical-moose-foobar-lite (ClickHouse @ 4410/4411/5411)..."
  if ! is_service_running "analytical-moose-foobar-lite"; then
    echo "⚠️  analytical-moose-foobar-lite is not running (http://localhost:4410). Start dev first."; return 0
  fi

  local SVC_DIR="$PROJECT_ROOT/services/analytical-moose-foobar"
  pushd "$SVC_DIR" >/dev/null
  if [ "$CLEAR_DATA" = "true" ]; then
    ./scripts/migrate-pg-table-to-ch.sh --source-table foo --dest-table Foo --clear-data || true
    ./scripts/migrate-pg-table-to-ch.sh --source-table bar --dest-table Bar --clear-data || true
  else
    ./scripts/migrate-pg-table-to-ch.sh --source-table foo --dest-table Foo || true
    ./scripts/migrate-pg-table-to-ch.sh --source-table bar --dest-table Bar || true
  fi
  popd >/dev/null
  echo "✅ analytical-moose-foobar-lite migration complete"
}

echo "=========================================="
echo "  UFA-Lite Data Seeding"
echo "=========================================="
echo "(No-Elastic mode)"

# Stop workflows → seed transactional → migrate analytical → restart workflows
cleanup_existing_workflows

case "$SERVICE" in
  "transactional-supabase-foobar-lite")
    echo "Transactional service disabled in ufa-lite; skipping" ;;
  "analytical-moose-foobar-lite"|"")
    seed_analytical ;;
  *)
    echo "Unknown service: $SERVICE"; exit 1 ;;
esac

restart_workflows

echo "✅ dev-seed completed"


