#!/bin/bash

# Set defaults - don't load .env file to avoid parsing issues
PG_HOST=${PG_HOST:-localhost}
PG_PORT=${PG_PORT:-54322}
PG_USER=${PG_USER:-postgres}
PG_PASSWORD=${PG_PASSWORD:-postgres}
PG_DB=${PG_DB:-postgres}

CH_HOST=${CH_HOST:-localhost}
CH_PORT=${CH_PORT:-18123}
CH_USER=${CH_USER:-panda}
CH_PASSWORD=${CH_PASSWORD:-pandapass}
CH_DB=${CH_DB:-local}

# Parse command line arguments
CLEAR_DATA=false
KEEP_TEMP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clear-data)
            CLEAR_DATA=true
            shift
            ;;
        --keep-temp)
            KEEP_TEMP=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Migrate data from PostgreSQL to ClickHouse"
            echo ""
            echo "Options:"
            echo "  --clear-data     Clear existing data in ClickHouse before migration"
            echo "  --keep-temp      Keep temporary files after migration"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Create temp directory
TEMP_DIR="temp_migration"
mkdir -p "$TEMP_DIR"

echo "===================================================="
echo "          PostgreSQL to ClickHouse Migration"
echo "===================================================="
echo ""

# Function to run PostgreSQL query via Docker
run_postgres_query() {
    local query="$1"
    local output_file="$2"
    
    docker exec -i supabase-db psql -U "$PG_USER" -d "$PG_DB" -t -A -F$'\t' -c "$query" > "$output_file"
    return $?
}

# Function to run ClickHouse query via Docker
run_clickhouse_query() {
    local query="$1"
    
    if [ -n "$CH_PASSWORD" ]; then
        docker exec -i sync-base-clickhousedb-1 clickhouse-client --user "$CH_USER" --password "$CH_PASSWORD" --database "$CH_DB" --query "$query"
    else
        docker exec -i sync-base-clickhousedb-1 clickhouse-client --user "$CH_USER" --database "$CH_DB" --query "$query"
    fi
    return $?
}

# Function to import JSONEachRow file to ClickHouse
import_to_clickhouse() {
    local file="$1"
    local table="$2"
    
    if [ -n "$CH_PASSWORD" ]; then
        docker exec -i sync-base-clickhousedb-1 clickhouse-client --user "$CH_USER" --password "$CH_PASSWORD" --database "$CH_DB" --query "INSERT INTO $table FORMAT JSONEachRow" < "$file"
    else
        docker exec -i sync-base-clickhousedb-1 clickhouse-client --user "$CH_USER" --database "$CH_DB" --query "INSERT INTO $table FORMAT JSONEachRow" < "$file"
    fi
    return $?
}

# Test PostgreSQL connection
echo "Testing PostgreSQL connection..."
if ! docker exec supabase-db pg_isready -h localhost -p 5432 -U "$PG_USER" > /dev/null 2>&1; then
    echo "❌ PostgreSQL connection failed"
    exit 1
fi
echo "✅ PostgreSQL connection successful"

# Test ClickHouse connection
echo "Testing ClickHouse connection..."
if ! run_clickhouse_query "SELECT 1" > /dev/null 2>&1; then
    echo "❌ ClickHouse connection failed"
    exit 1
fi
echo "✅ ClickHouse connection successful"

# Check if network bridge exists
echo "Checking network connectivity..."
if ! docker network ls | grep -q "supabase_default"; then
    echo "❌ supabase_default network not found"
    exit 1
fi

# Check if ClickHouse container is connected to PostgreSQL network
if ! docker inspect sync-base-clickhousedb-1 | grep -q "supabase_default"; then
    echo "Connecting ClickHouse to PostgreSQL network..."
    if ! docker network connect supabase_default sync-base-clickhousedb-1 2>/dev/null; then
        echo "⚠️  Network connection may already exist or failed"
    fi
fi

echo "✅ Network connectivity verified"
echo ""

# Step 1: Always run test with 1 row per table
echo "===================================================="
echo "               STEP 1: TEST RUN (1 row each)"
echo "===================================================="

# Test queries
TEST_FOO_QUERY="
SELECT 
    id::text as id,
    name,
    score,
    created_at,
    updated_at
FROM foo 
LIMIT 1
"

TEST_BAR_QUERY="
SELECT 
    id::text as id,
    label,
    value,
    created_at,
    updated_at
FROM bar 
LIMIT 1
"

# Export test data
echo "Exporting test foo data..."
if ! run_postgres_query "$TEST_FOO_QUERY" "$TEMP_DIR/test_foo_data.json"; then
    echo "❌ Failed to export test foo data"
    exit 1
fi

echo "Exporting test bar data..."
if ! run_postgres_query "$TEST_BAR_QUERY" "$TEMP_DIR/test_bar_data.json"; then
    echo "❌ Failed to export test bar data"
    exit 1
fi

# Check if test files have data
if [ ! -s "$TEMP_DIR/test_foo_data.json" ]; then
    echo "❌ No test foo data exported"
    exit 1
fi

if [ ! -s "$TEMP_DIR/test_bar_data.json" ]; then
    echo "❌ No test bar data exported"
    exit 1
fi

echo "✅ Test data exported successfully"

# Convert test data to JSONEachRow format
echo "Converting test data to JSONEachRow format..."

# Process foo test data
awk -F'\t' 'NR > 0 {
    gsub(/\\/, "\\\\");
    gsub(/"/, "\\\"");
    printf "{\"id\":\"%s\",\"name\":\"%s\",\"score\":%s,\"created_at\":\"%s\",\"updated_at\":\"%s\"}\n", 
           $1, $2, $3, $4, $5;
}' "$TEMP_DIR/test_foo_data.json" > "$TEMP_DIR/test_foo_events.json"

# Process bar test data
awk -F'\t' 'NR > 0 {
    gsub(/\\/, "\\\\");
    gsub(/"/, "\\\"");
    printf "{\"id\":\"%s\",\"label\":\"%s\",\"value\":%s,\"created_at\":\"%s\",\"updated_at\":\"%s\"}\n", 
           $1, $2, $3, $4, $5;
}' "$TEMP_DIR/test_bar_data.json" > "$TEMP_DIR/test_bar_events.json"

echo "✅ Test data converted to JSONEachRow format"

# Test import to ClickHouse
echo "Testing import to ClickHouse..."

if ! import_to_clickhouse "$TEMP_DIR/test_foo_events.json" "FooThingEvent"; then
    echo "❌ Failed to import test foo data to ClickHouse"
    exit 1
fi

if ! import_to_clickhouse "$TEMP_DIR/test_bar_events.json" "BarThingEvent"; then
    echo "❌ Failed to import test bar data to ClickHouse"
    exit 1
fi

echo "✅ Test import successful!"

# Verify test data in ClickHouse
echo "Verifying test data in ClickHouse..."
TEST_FOO_COUNT=$(run_clickhouse_query "SELECT count() FROM FooThingEvent WHERE id IN (SELECT id FROM FooThingEvent ORDER BY created_at DESC LIMIT 1)")
TEST_BAR_COUNT=$(run_clickhouse_query "SELECT count() FROM BarThingEvent WHERE id IN (SELECT id FROM BarThingEvent ORDER BY created_at DESC LIMIT 1)")

if [ "$TEST_FOO_COUNT" -lt 1 ] || [ "$TEST_BAR_COUNT" -lt 1 ]; then
    echo "❌ Test data verification failed"
    exit 1
fi

echo "✅ Test data verified in ClickHouse"
echo ""

# Step 2: Proceed with full migration
echo "===================================================="
echo "           STEP 2: FULL DATA MIGRATION"
echo "===================================================="

# Get record counts
echo "Getting record counts..."
FOO_COUNT=$(run_postgres_query "SELECT COUNT(*) FROM foo")
BAR_COUNT=$(run_postgres_query "SELECT COUNT(*) FROM bar")

echo "📊 Records to migrate:"
echo "   - Foo records: $FOO_COUNT"
echo "   - Bar records: $BAR_COUNT"
echo ""

# Clear existing data if requested
if [ "$CLEAR_DATA" = true ]; then
    echo "Clearing existing data from ClickHouse..."
    run_clickhouse_query "TRUNCATE TABLE FooThingEvent"
    run_clickhouse_query "TRUNCATE TABLE BarThingEvent"
    echo "✅ Existing data cleared"
fi

# Full migration queries
FOO_QUERY="
SELECT 
    id::text as id,
    name,
    score,
    created_at,
    updated_at
FROM foo 
ORDER BY created_at
"

BAR_QUERY="
SELECT 
    id::text as id,
    label,
    value,
    created_at,
    updated_at
FROM bar 
ORDER BY created_at
"

# Export full data
echo "Exporting full foo data..."
if ! run_postgres_query "$FOO_QUERY" "$TEMP_DIR/full_foo_data.json"; then
    echo "❌ Failed to export full foo data"
    exit 1
fi

echo "Exporting full bar data..."
if ! run_postgres_query "$BAR_QUERY" "$TEMP_DIR/full_bar_data.json"; then
    echo "❌ Failed to export full bar data"
    exit 1
fi

echo "✅ Full data exported"

# Convert full data to JSONEachRow format
echo "Converting full data to JSONEachRow format..."

# Process foo data
awk -F'\t' 'NR > 0 {
    gsub(/\\/, "\\\\");
    gsub(/"/, "\\\"");
    printf "{\"id\":\"%s\",\"name\":\"%s\",\"score\":%s,\"created_at\":\"%s\",\"updated_at\":\"%s\"}\n", 
           $1, $2, $3, $4, $5;
}' "$TEMP_DIR/full_foo_data.json" > "$TEMP_DIR/full_foo_events.json"

# Process bar data
awk -F'\t' 'NR > 0 {
    gsub(/\\/, "\\\\");
    gsub(/"/, "\\\"");
    printf "{\"id\":\"%s\",\"label\":\"%s\",\"value\":%s,\"created_at\":\"%s\",\"updated_at\":\"%s\"}\n", 
           $1, $2, $3, $4, $5;
}' "$TEMP_DIR/full_bar_data.json" > "$TEMP_DIR/full_bar_events.json"

echo "✅ Full data converted to JSONEachRow format"

# Import full data to ClickHouse
echo "Importing full data to ClickHouse..."

if ! import_to_clickhouse "$TEMP_DIR/full_foo_events.json" "FooThingEvent"; then
    echo "❌ Failed to import full foo data to ClickHouse"
    exit 1
fi

if ! import_to_clickhouse "$TEMP_DIR/full_bar_events.json" "BarThingEvent"; then
    echo "❌ Failed to import full bar data to ClickHouse"
    exit 1
fi

echo "✅ Full data imported successfully!"

# Verify full data
echo "Verifying full data in ClickHouse..."
CH_FOO_COUNT=$(run_clickhouse_query "SELECT count() FROM FooThingEvent")
CH_BAR_COUNT=$(run_clickhouse_query "SELECT count() FROM BarThingEvent")

echo "📊 Migration results:"
echo "   - Foo records: $FOO_COUNT → $CH_FOO_COUNT"
echo "   - Bar records: $BAR_COUNT → $CH_BAR_COUNT"

if [ "$CH_FOO_COUNT" -ne "$FOO_COUNT" ] || [ "$CH_BAR_COUNT" -ne "$BAR_COUNT" ]; then
    echo "⚠️  Record counts don't match!"
    exit 1
fi

echo "✅ Migration completed successfully!"

# Cleanup
if [ "$KEEP_TEMP" = false ]; then
    echo "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    echo "✅ Temporary files cleaned up"
else
    echo "📁 Temporary files kept in: $TEMP_DIR"
    echo "   - Test files: test_*_events.json"
    echo "   - Full files: full_*_events.json"
fi

echo ""
echo "===================================================="
echo "🎉 PostgreSQL to ClickHouse migration completed!"
echo "====================================================" 