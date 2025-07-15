#!/bin/bash

# Enable strict error handling
set -euo pipefail

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
COUNT_LIMIT=""

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
        --count)
            COUNT_LIMIT="$2"
            if ! [[ "$COUNT_LIMIT" =~ ^[0-9]+$ ]] || [ "$COUNT_LIMIT" -eq 0 ]; then
                echo "Error: --count must be a positive integer"
                exit 1
            fi
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Migrate data from PostgreSQL to ClickHouse"
            echo ""
            echo "Options:"
            echo "  --clear-data     Clear existing data in ClickHouse before migration"
            echo "  --keep-temp      Keep temporary files after migration"
            echo "  --count <num>    Limit the number of records to migrate (for testing)"
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
    
    if ! docker exec -i supabase-db psql -U "$PG_USER" -d "$PG_DB" -t -A -F$'\t' -c "$query" > "$output_file"; then
        echo "❌ PostgreSQL query failed: $query"
        return 1
    fi
    return 0
}

# Function to run PostgreSQL query and return result directly
run_postgres_query_direct() {
    local query="$1"
    local result
    
    if ! result=$(docker exec -i supabase-db psql -U "$PG_USER" -d "$PG_DB" -t -A -c "$query" 2>&1); then
        echo "❌ PostgreSQL query failed: $query" >&2
        echo "   Error: $result" >&2
        return 1
    fi
    
    echo "$result"
    return 0
}

# Function to run ClickHouse query via Docker
run_clickhouse_query() {
    local query="$1"
    local result
    
    if [ -n "$CH_PASSWORD" ]; then
        if ! result=$(docker exec -i sync-base-clickhousedb-1 clickhouse-client --user "$CH_USER" --password "$CH_PASSWORD" --database "$CH_DB" --query "$query" 2>&1); then
            echo "❌ ClickHouse query failed: $query" >&2
            echo "   Error: $result" >&2
            return 1
        fi
    else
        if ! result=$(docker exec -i sync-base-clickhousedb-1 clickhouse-client --user "$CH_USER" --database "$CH_DB" --query "$query" 2>&1); then
            echo "❌ ClickHouse query failed: $query" >&2
            echo "   Error: $result" >&2
            return 1
        fi
    fi
    
    echo "$result"
    return 0
}

# Function to import JSONEachRow file to ClickHouse
import_to_clickhouse() {
    local file="$1"
    local table="$2"
    local result
    
    if [ ! -f "$file" ]; then
        echo "❌ Import file does not exist: $file" >&2
        return 1
    fi
    
    if [ -n "$CH_PASSWORD" ]; then
        if ! result=$(docker exec -i sync-base-clickhousedb-1 clickhouse-client --user "$CH_USER" --password "$CH_PASSWORD" --database "$CH_DB" --query "INSERT INTO $table FORMAT JSONEachRow" < "$file" 2>&1); then
            echo "❌ Failed to import data to ClickHouse table: $table" >&2
            echo "   File: $file" >&2
            echo "   Error: $result" >&2
            return 1
        fi
    else
        if ! result=$(docker exec -i sync-base-clickhousedb-1 clickhouse-client --user "$CH_USER" --database "$CH_DB" --query "INSERT INTO $table FORMAT JSONEachRow" < "$file" 2>&1); then
            echo "❌ Failed to import data to ClickHouse table: $table" >&2
            echo "   File: $file" >&2
            echo "   Error: $result" >&2
            return 1
        fi
    fi
    
    return 0
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
NETWORK_CHECK=$(docker network ls | grep "supabase_default" || true)
if [ -z "$NETWORK_CHECK" ]; then
    echo "❌ supabase_default network not found"
    exit 1
fi

# Check if ClickHouse container is connected to PostgreSQL network
CONTAINER_NETWORK_CHECK=$(docker inspect sync-base-clickhousedb-1 | grep "supabase_default" || true)
if [ -z "$CONTAINER_NETWORK_CHECK" ]; then
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
    COALESCE(description, '') as description,
    COALESCE(status, 'active') as status,
    COALESCE(priority, 0) as priority,
    COALESCE(is_active, false) as is_active,
    COALESCE(metadata::text, '{}') as metadata,
    COALESCE(config::text, '{}') as config,
    COALESCE(array_to_string(tags, ','), '') as tags,
    COALESCE(score, 0) as score,
    COALESCE(large_text, '') as large_text,
    date_trunc('second', created_at)::text as created_at,
    date_trunc('second', updated_at)::text as updated_at
FROM foo 
LIMIT 1
"

TEST_BAR_QUERY="
SELECT 
    id::text as id,
    COALESCE(foo_id::text, '') as foo_id,
    COALESCE(value, 0) as value,
    COALESCE(label, '') as label,
    COALESCE(notes, '') as notes,
    COALESCE(is_enabled, false) as is_enabled,
    date_trunc('second', created_at)::text as created_at,
    date_trunc('second', updated_at)::text as updated_at
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
if ! awk -F'\t' 'NR > 0 {
    # Store metadata and config before escaping (they are already valid JSON)
    metadata_json = $7;
    config_json = $8;
    
    # Escape everything else
    gsub(/\\/, "\\\\");
    gsub(/"/, "\\\"");
    
    # Convert PostgreSQL boolean to JSON boolean
    is_active_val = ($6 == "t") ? "true" : "false";
    
    # Convert PostgreSQL array format for tags
    tags_field = $9;
    if (tags_field == "") {
        tags_json = "[]";
    } else {
        # Convert comma-separated string to JSON array
        split(tags_field, tag_array, ",");
        tags_json = "[";
        for (i = 1; i <= length(tag_array); i++) {
            if (i > 1) tags_json = tags_json ",";
            tags_json = tags_json "\"" tag_array[i] "\"";
        }
        tags_json = tags_json "]";
    }
    
    printf "{\"type\":\"foo.thing\",\"params\":[{\"fooId\":\"%s\",\"action\":\"created\",\"previousData\":[{\"id\":\"\",\"name\":\"\",\"description\":\"\",\"status\":\"active\",\"priority\":0,\"isActive\":false,\"metadata\":{},\"tags\":[],\"score\":0,\"largeText\":\"\",\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}],\"currentData\":[{\"id\":\"%s\",\"name\":\"%s\",\"description\":\"%s\",\"status\":\"%s\",\"priority\":%s,\"isActive\":%s,\"metadata\":%s,\"tags\":%s,\"score\":%s,\"largeText\":\"%s\",\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}],\"changes\":[\"migrate\"]}],\"id\":\"%s\",\"timestamp\":\"%s\",\"source\":\"postgresql-migration\",\"correlationId\":null,\"metadata\":[{\"user\":null,\"session\":null}]}\n", 
            $1, $12, $13, $1, $2, $3, $4, $5, is_active_val, metadata_json, tags_json, $10, $11, $12, $13, $1, $12;
}' "$TEMP_DIR/test_foo_data.json" > "$TEMP_DIR/test_foo_events.json"; then
    echo "❌ Failed to convert test foo data to JSONEachRow format"
    exit 1
fi

# Process bar test data
if ! awk -F'\t' 'NR > 0 {
    gsub(/\\/, "\\\\");
    gsub(/"/, "\\\"");
    
    # Convert PostgreSQL boolean to JSON boolean
    is_enabled_val = ($6 == "t") ? "true" : "false";
    
    printf "{\"type\":\"bar.thing\",\"params\":[{\"barId\":\"%s\",\"fooId\":\"%s\",\"action\":\"created\",\"previousData\":[{\"id\":\"\",\"fooId\":\"\",\"value\":0,\"label\":\"\",\"notes\":\"\",\"isEnabled\":false,\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}],\"currentData\":[{\"id\":\"%s\",\"fooId\":\"%s\",\"value\":%s,\"label\":\"%s\",\"notes\":\"%s\",\"isEnabled\":%s,\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}],\"changes\":[\"migrate\"],\"value\":%s}],\"id\":\"%s\",\"timestamp\":\"%s\",\"source\":\"postgresql-migration\",\"correlationId\":null,\"metadata\":[{\"user\":null,\"session\":null}]}\n", 
            $1, $2, $7, $8, $1, $2, $3, $4, $5, is_enabled_val, $7, $8, $3, $1, $7;
}' "$TEMP_DIR/test_bar_data.json" > "$TEMP_DIR/test_bar_events.json"; then
    echo "❌ Failed to convert test bar data to JSONEachRow format"
    exit 1
fi

# Verify converted files are not empty and contain valid JSON
if [ ! -s "$TEMP_DIR/test_foo_events.json" ]; then
    echo "❌ Test foo events file is empty after conversion"
    exit 1
fi

if [ ! -s "$TEMP_DIR/test_bar_events.json" ]; then
    echo "❌ Test bar events file is empty after conversion"
    exit 1
fi

# Basic JSON validation - check if files contain valid JSON structure
if ! grep -q '{.*}' "$TEMP_DIR/test_foo_events.json"; then
    echo "❌ Test foo events file does not contain valid JSON structure"
    exit 1
fi

if ! grep -q '{.*}' "$TEMP_DIR/test_bar_events.json"; then
    echo "❌ Test bar events file does not contain valid JSON structure"
    exit 1
fi

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

# Get the test data counts with error checking
TEST_FOO_COUNT=$(run_clickhouse_query "SELECT count() FROM FooThingEvent WHERE id IN (SELECT id FROM FooThingEvent ORDER BY timestamp DESC LIMIT 1)")
if [ $? -ne 0 ]; then
    echo "❌ Failed to query test foo data count from ClickHouse"
    exit 1
fi

TEST_BAR_COUNT=$(run_clickhouse_query "SELECT count() FROM BarThingEvent WHERE id IN (SELECT id FROM BarThingEvent ORDER BY timestamp DESC LIMIT 1)")
if [ $? -ne 0 ]; then
    echo "❌ Failed to query test bar data count from ClickHouse"
    exit 1
fi

# Verify counts are numeric
if ! [[ "$TEST_FOO_COUNT" =~ ^[0-9]+$ ]]; then
    echo "❌ Test foo count is not a valid number: '$TEST_FOO_COUNT'"
    exit 1
fi

if ! [[ "$TEST_BAR_COUNT" =~ ^[0-9]+$ ]]; then
    echo "❌ Test bar count is not a valid number: '$TEST_BAR_COUNT'"
    exit 1
fi

# Verify we have at least 1 record for each table
if [ "$TEST_FOO_COUNT" -lt 1 ] || [ "$TEST_BAR_COUNT" -lt 1 ]; then
    echo "❌ Test data verification failed"
    echo "   - Foo count: $TEST_FOO_COUNT"
    echo "   - Bar count: $TEST_BAR_COUNT"
    exit 1
fi

# Additional verification - check if we can retrieve actual data
echo "Performing additional test data verification..."
TEST_FOO_DATA=$(run_clickhouse_query "SELECT id, params.currentData.name[1] FROM FooThingEvent ORDER BY timestamp DESC LIMIT 1")
if [ $? -ne 0 ] || [ -z "$TEST_FOO_DATA" ]; then
    echo "❌ Failed to retrieve test foo data from ClickHouse"
    exit 1
fi

TEST_BAR_DATA=$(run_clickhouse_query "SELECT id, params.currentData.label[1] FROM BarThingEvent ORDER BY timestamp DESC LIMIT 1")
if [ $? -ne 0 ] || [ -z "$TEST_BAR_DATA" ]; then
    echo "❌ Failed to retrieve test bar data from ClickHouse"
    exit 1
fi

echo "✅ Test data verified in ClickHouse"

# Clean up test data before full migration (only if not doing a full clear)
if [ "$CLEAR_DATA" = false ]; then
    echo "Cleaning up test data before full migration..."
    # Get the IDs of the test records we just inserted
    TEST_FOO_ID=$(run_clickhouse_query "SELECT id FROM FooThingEvent ORDER BY timestamp DESC LIMIT 1")
    TEST_BAR_ID=$(run_clickhouse_query "SELECT id FROM BarThingEvent ORDER BY timestamp DESC LIMIT 1")
    
    # Delete only the test records
    if [ -n "$TEST_FOO_ID" ]; then
        run_clickhouse_query "DELETE FROM FooThingEvent WHERE id = '$TEST_FOO_ID'"
    fi
    if [ -n "$TEST_BAR_ID" ]; then
        run_clickhouse_query "DELETE FROM BarThingEvent WHERE id = '$TEST_BAR_ID'"
    fi
    echo "✅ Test data cleaned up"
fi

echo ""
echo "🎉 ALL TEST CHECKS PASSED! Proceeding with full migration..."
echo ""

# Step 2: Proceed with full migration
echo "===================================================="
echo "           STEP 2: FULL DATA MIGRATION"
echo "===================================================="

# Get record counts
echo "Getting record counts..."
FOO_COUNT=$(run_postgres_query_direct "SELECT COUNT(*) FROM foo")
if [ $? -ne 0 ]; then
    echo "❌ Failed to get foo record count"
    exit 1
fi

BAR_COUNT=$(run_postgres_query_direct "SELECT COUNT(*) FROM bar")
if [ $? -ne 0 ]; then
    echo "❌ Failed to get bar record count"
    exit 1
fi

# Verify counts are numeric
if ! [[ "$FOO_COUNT" =~ ^[0-9]+$ ]]; then
    echo "❌ Source foo count is not a valid number: '$FOO_COUNT'"
    exit 1
fi

if ! [[ "$BAR_COUNT" =~ ^[0-9]+$ ]]; then
    echo "❌ Source bar count is not a valid number: '$BAR_COUNT'"
    exit 1
fi

if [ -n "$COUNT_LIMIT" ]; then
    # Calculate actual migration counts when limit is applied
    MIGRATE_FOO_COUNT=$((FOO_COUNT < COUNT_LIMIT ? FOO_COUNT : COUNT_LIMIT))
    MIGRATE_BAR_COUNT=$((BAR_COUNT < COUNT_LIMIT ? BAR_COUNT : COUNT_LIMIT))
    
    echo "📊 Records to migrate (limited by --count $COUNT_LIMIT):"
    echo "   - Foo records: $MIGRATE_FOO_COUNT (of $FOO_COUNT total)"
    echo "   - Bar records: $MIGRATE_BAR_COUNT (of $BAR_COUNT total)"
else
    MIGRATE_FOO_COUNT=$FOO_COUNT
    MIGRATE_BAR_COUNT=$BAR_COUNT
    
    echo "📊 Records to migrate:"
    echo "   - Foo records: $FOO_COUNT"
    echo "   - Bar records: $BAR_COUNT"
fi
echo ""

# Clear existing data if requested
if [ "$CLEAR_DATA" = true ]; then
    echo "Clearing existing data from ClickHouse..."
    run_clickhouse_query "TRUNCATE TABLE FooThingEvent"
    run_clickhouse_query "TRUNCATE TABLE BarThingEvent"
    echo "✅ Existing data cleared"
fi

# Full migration queries
if [ -n "$COUNT_LIMIT" ]; then
    FOO_QUERY="
    SELECT 
        id::text as id,
        name,
        COALESCE(description, '') as description,
        COALESCE(status, 'active') as status,
        COALESCE(priority, 0) as priority,
        COALESCE(is_active, false) as is_active,
        COALESCE(metadata::text, '{}') as metadata,
        COALESCE(config::text, '{}') as config,
        COALESCE(array_to_string(tags, ','), '') as tags,
        COALESCE(score, 0) as score,
        COALESCE(large_text, '') as large_text,
        date_trunc('second', created_at)::text as created_at,
        date_trunc('second', updated_at)::text as updated_at
    FROM foo 
    ORDER BY created_at
    LIMIT $COUNT_LIMIT
    "

    BAR_QUERY="
    SELECT 
        id::text as id,
        COALESCE(foo_id::text, '') as foo_id,
        COALESCE(value, 0) as value,
        COALESCE(label, '') as label,
        COALESCE(notes, '') as notes,
        COALESCE(is_enabled, false) as is_enabled,
        date_trunc('second', created_at)::text as created_at,
        date_trunc('second', updated_at)::text as updated_at
    FROM bar 
    ORDER BY created_at
    LIMIT $COUNT_LIMIT
    "
else
    FOO_QUERY="
    SELECT 
        id::text as id,
        name,
        COALESCE(description, '') as description,
        COALESCE(status, 'active') as status,
        COALESCE(priority, 0) as priority,
        COALESCE(is_active, false) as is_active,
        COALESCE(metadata::text, '{}') as metadata,
        COALESCE(config::text, '{}') as config,
        COALESCE(array_to_string(tags, ','), '') as tags,
        COALESCE(score, 0) as score,
        COALESCE(large_text, '') as large_text,
        date_trunc('second', created_at)::text as created_at,
        date_trunc('second', updated_at)::text as updated_at
    FROM foo 
    ORDER BY created_at
    "

    BAR_QUERY="
    SELECT 
        id::text as id,
        COALESCE(foo_id::text, '') as foo_id,
        COALESCE(value, 0) as value,
        COALESCE(label, '') as label,
        COALESCE(notes, '') as notes,
        COALESCE(is_enabled, false) as is_enabled,
        date_trunc('second', created_at)::text as created_at,
        date_trunc('second', updated_at)::text as updated_at
    FROM bar 
    ORDER BY created_at
    "
fi

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
if ! awk -F'\t' 'NR > 0 {
    # Store metadata and config before escaping (they are already valid JSON)
    metadata_json = $7;
    config_json = $8;
    
    # Escape everything else
    gsub(/\\/, "\\\\");
    gsub(/"/, "\\\"");
    
    # Convert PostgreSQL boolean to JSON boolean
    is_active_val = ($6 == "t") ? "true" : "false";
    
    # Convert PostgreSQL array format for tags
    tags_field = $9;
    if (tags_field == "") {
        tags_json = "[]";
    } else {
        # Convert comma-separated string to JSON array
        split(tags_field, tag_array, ",");
        tags_json = "[";
        for (i = 1; i <= length(tag_array); i++) {
            if (i > 1) tags_json = tags_json ",";
            tags_json = tags_json "\"" tag_array[i] "\"";
        }
        tags_json = tags_json "]";
    }
    
    printf "{\"type\":\"foo.thing\",\"params\":[{\"fooId\":\"%s\",\"action\":\"created\",\"previousData\":[{\"id\":\"\",\"name\":\"\",\"description\":\"\",\"status\":\"active\",\"priority\":0,\"isActive\":false,\"metadata\":{},\"tags\":[],\"score\":0,\"largeText\":\"\",\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}],\"currentData\":[{\"id\":\"%s\",\"name\":\"%s\",\"description\":\"%s\",\"status\":\"%s\",\"priority\":%s,\"isActive\":%s,\"metadata\":%s,\"tags\":%s,\"score\":%s,\"largeText\":\"%s\",\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}],\"changes\":[\"migrate\"]}],\"id\":\"%s\",\"timestamp\":\"%s\",\"source\":\"postgresql-migration\",\"correlationId\":null,\"metadata\":[{\"user\":null,\"session\":null}]}\n", 
            $1, $12, $13, $1, $2, $3, $4, $5, is_active_val, metadata_json, tags_json, $10, $11, $12, $13, $1, $12;
}' "$TEMP_DIR/full_foo_data.json" > "$TEMP_DIR/full_foo_events.json"; then
    echo "❌ Failed to convert full foo data to JSONEachRow format"
    exit 1
fi

# Process bar data
if ! awk -F'\t' 'NR > 0 {
    gsub(/\\/, "\\\\");
    gsub(/"/, "\\\"");
    
    # Convert PostgreSQL boolean to JSON boolean
    is_enabled_val = ($6 == "t") ? "true" : "false";
    
    printf "{\"type\":\"bar.thing\",\"params\":[{\"barId\":\"%s\",\"fooId\":\"%s\",\"action\":\"created\",\"previousData\":[{\"id\":\"\",\"fooId\":\"\",\"value\":0,\"label\":\"\",\"notes\":\"\",\"isEnabled\":false,\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}],\"currentData\":[{\"id\":\"%s\",\"fooId\":\"%s\",\"value\":%s,\"label\":\"%s\",\"notes\":\"%s\",\"isEnabled\":%s,\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}],\"changes\":[\"migrate\"],\"value\":%s}],\"id\":\"%s\",\"timestamp\":\"%s\",\"source\":\"postgresql-migration\",\"correlationId\":null,\"metadata\":[{\"user\":null,\"session\":null}]}\n", 
            $1, $2, $7, $8, $1, $2, $3, $4, $5, is_enabled_val, $7, $8, $3, $1, $7;
}' "$TEMP_DIR/full_bar_data.json" > "$TEMP_DIR/full_bar_events.json"; then
    echo "❌ Failed to convert full bar data to JSONEachRow format"
    exit 1
fi

# Verify converted files are not empty
if [ ! -s "$TEMP_DIR/full_foo_events.json" ]; then
    echo "❌ Full foo events file is empty after conversion"
    exit 1
fi

if [ ! -s "$TEMP_DIR/full_bar_events.json" ]; then
    echo "❌ Full bar events file is empty after conversion"
    exit 1
fi

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

# Get final counts with error checking
CH_FOO_COUNT=$(run_clickhouse_query "SELECT count() FROM FooThingEvent")
if [ $? -ne 0 ]; then
    echo "❌ Failed to query final foo data count from ClickHouse"
    exit 1
fi

CH_BAR_COUNT=$(run_clickhouse_query "SELECT count() FROM BarThingEvent")
if [ $? -ne 0 ]; then
    echo "❌ Failed to query final bar data count from ClickHouse"
    exit 1
fi

# Verify counts are numeric
if ! [[ "$CH_FOO_COUNT" =~ ^[0-9]+$ ]]; then
    echo "❌ Final foo count is not a valid number: '$CH_FOO_COUNT'"
    exit 1
fi

if ! [[ "$CH_BAR_COUNT" =~ ^[0-9]+$ ]]; then
    echo "❌ Final bar count is not a valid number: '$CH_BAR_COUNT'"
    exit 1
fi

echo "📊 Migration results:"
echo "   - Foo records: $MIGRATE_FOO_COUNT → $CH_FOO_COUNT"
echo "   - Bar records: $MIGRATE_BAR_COUNT → $CH_BAR_COUNT"

if [ "$CH_FOO_COUNT" -ne "$MIGRATE_FOO_COUNT" ] || [ "$CH_BAR_COUNT" -ne "$MIGRATE_BAR_COUNT" ]; then
    echo "❌ Record counts don't match! Migration failed."
    echo "   - Expected foo: $MIGRATE_FOO_COUNT, Got: $CH_FOO_COUNT"
    echo "   - Expected bar: $MIGRATE_BAR_COUNT, Got: $CH_BAR_COUNT"
    exit 1
fi

echo "✅ Migration completed successfully!"

echo ""
echo "===================================================="
echo "🎉 PostgreSQL to ClickHouse migration completed!"
echo "====================================================" 

# Only cleanup on successful completion
if [ "$KEEP_TEMP" = false ]; then
    echo "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    echo "✅ Temporary files cleaned up"
else
    echo "📁 Temporary files kept in: $TEMP_DIR"
    echo "   - Test files: test_*_events.json"
    echo "   - Full files: full_*_events.json"
fi 