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

# Detect which PostgreSQL container to use (Supabase CLI vs Production Docker)
detect_postgres_container() {
    # Check for Supabase CLI container first (more specific)
    if docker ps --format "{{.Names}}" | grep -q "supabase_db_.*"; then
        docker ps --format "{{.Names}}" | grep "supabase_db_.*" | head -1
    # Check for production Docker container
    elif docker ps --format "{{.Names}}" | grep -q "supabase-db"; then
        echo "supabase-db"
    else
        echo ""
    fi
}

# Batch size for processing large datasets
BATCH_SIZE=500000

# Parse command line arguments
CLEAR_DATA=false
KEEP_TEMP=false
COUNT_LIMIT=""
SOURCE_TABLE=""
DEST_TABLE=""
IS_PRODUCTION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --source-table)
            SOURCE_TABLE="$2"
            shift 2
            ;;
        --dest-table)
            DEST_TABLE="$2"
            shift 2
            ;;
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
        --production)
            IS_PRODUCTION=true
            shift
            ;;
        --help)
            echo "Usage: $0 --source-table <pg_table> --dest-table <ch_table> [OPTIONS]"
            echo "Migrate data from any PostgreSQL table to ClickHouse table"
            echo ""
            echo "Required:"
            echo "  --source-table <name>   PostgreSQL source table name"
            echo "  --dest-table <name>     ClickHouse destination table name"
            echo ""
            echo "Options:"
            echo "  --clear-data           Clear existing data in ClickHouse before migration"
            echo "  --keep-temp            Keep temporary files after migration"
            echo "  --count <num>          Limit the number of records to migrate (for testing)"
            echo "  --production           Use HTTP connection for production ClickHouse (instead of Docker)"
            echo "  --help                 Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --source-table users --dest-table users"
            echo "  $0 --source-table orders --dest-table orders --count 1000 --clear-data"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$SOURCE_TABLE" ]; then
    echo "❌ Error: --source-table is required"
    echo "Use --help for usage information"
    exit 1
fi

if [ -z "$DEST_TABLE" ]; then
    echo "❌ Error: --dest-table is required"
    echo "Use --help for usage information"
    exit 1
fi

# Set the PostgreSQL container name (only for development mode)
if [ "$IS_PRODUCTION" = true ]; then
    echo "🌐 Using production PostgreSQL connection"
    PG_CONTAINER=""  # Not needed in production
else
    PG_CONTAINER=$(detect_postgres_container)
    if [ -z "$PG_CONTAINER" ]; then
        echo "❌ No PostgreSQL container found. Ensure either Supabase CLI or production Docker setup is running."
        exit 1
    fi
    echo "🐳 Using PostgreSQL container: $PG_CONTAINER"
fi

# Create temp directory
TEMP_DIR="temp_migration_${SOURCE_TABLE}"
mkdir -p "$TEMP_DIR"

echo "===================================================="
echo "    Generic PostgreSQL to ClickHouse Migration"
echo "===================================================="
echo "Source table: $SOURCE_TABLE"
echo "Destination table: $DEST_TABLE"
echo ""

# Function to run PostgreSQL query (Docker or direct based on mode)
run_postgres_query() {
    local query="$1"
    local output_file="$2"
    
    if [ "$IS_PRODUCTION" = true ] && [ -n "${PG_CONNECTION_STRING:-}" ]; then
        # Production mode: Use psql with connection string
        if ! psql "$PG_CONNECTION_STRING" -t -A -F$'\t' -c "$query" > "$output_file"; then
            echo "❌ PostgreSQL query failed: $query"
            return 1
        fi
    else
        # Development mode: Use Docker connection
        if ! docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -t -A -F$'\t' -c "$query" > "$output_file"; then
            echo "❌ PostgreSQL query failed: $query"
            return 1
        fi
    fi
    return 0
}

# Function to run PostgreSQL query and return result directly (Docker or direct based on mode)
run_postgres_query_direct() {
    local query="$1"
    local result
    
    if [ "$IS_PRODUCTION" = true ] && [ -n "${PG_CONNECTION_STRING:-}" ]; then
        # Production mode: Use psql with connection string
        if ! result=$(psql "$PG_CONNECTION_STRING" -t -A -c "$query" 2>&1); then
            echo "❌ PostgreSQL query failed: $query" >&2
            echo "   Error: $result" >&2
            return 1
        fi
    else
        # Development mode: Use Docker connection
        if ! result=$(docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -t -A -c "$query" 2>&1); then
            echo "❌ PostgreSQL query failed: $query" >&2
            echo "   Error: $result" >&2
            return 1
        fi
    fi
    
    echo "$result"
    return 0
}

# Function to run ClickHouse query (Docker or HTTP based on mode)
run_clickhouse_query() {
    local query="$1"
    local result
    
    if [ "$IS_PRODUCTION" = true ]; then
        # Production mode: Use HTTP connection
        # For ClickHouse Cloud, use the full URL as provided
        local ch_url="$CH_HOST"
        
        if [ -n "$CH_PASSWORD" ]; then
            if ! result=$(curl -s -u "$CH_USER:$CH_PASSWORD" -X POST "$ch_url" -d "$query" 2>&1); then
                echo "❌ ClickHouse query failed: $query" >&2
                echo "   Error: $result" >&2
                return 1
            fi
        else
            if ! result=$(curl -s -u "$CH_USER:" -X POST "$ch_url" -d "$query" 2>&1); then
                echo "❌ ClickHouse query failed: $query" >&2
                echo "   Error: $result" >&2
                return 1
            fi
        fi
    else
        # Development mode: Use Docker connection
        if [ -n "$CH_PASSWORD" ]; then
            if ! result=$(docker exec -i analytical-moose-foobar-clickhousedb-1 clickhouse-client --user "$CH_USER" --password "$CH_PASSWORD" --database "$CH_DB" --query "$query" 2>&1); then
                echo "❌ ClickHouse query failed: $query" >&2
                echo "   Error: $result" >&2
                return 1
            fi
        else
            if ! result=$(docker exec -i analytical-moose-foobar-clickhousedb-1 clickhouse-client --user "$CH_USER" --database "$CH_DB" --query "$query" 2>&1); then
                echo "❌ ClickHouse query failed: $query" >&2
                echo "   Error: $result" >&2
                return 1
            fi
        fi
    fi
    
    echo "$result"
    return 0
}

# Function to import JSONEachRow file to ClickHouse (Docker or HTTP based on mode)
import_to_clickhouse() {
    local file="$1"
    local table="$2"
    local result
    
    if [ ! -f "$file" ]; then
        echo "❌ Import file does not exist: $file" >&2
        return 1
    fi
    
    if [ "$IS_PRODUCTION" = true ]; then
        # Production mode: Use HTTP connection
        # For ClickHouse Cloud, use the full URL as provided
        local ch_url="$CH_HOST"
        
        # URL encode the query and add it to the URL
        local encoded_query=$(printf '%s' "INSERT INTO $table FORMAT JSONEachRow" | sed 's/ /%20/g')
        local insert_url="${ch_url}?query=${encoded_query}"
        
        if [ -n "$CH_PASSWORD" ]; then
            if ! result=$(curl -s -u "$CH_USER:$CH_PASSWORD" -X POST "$insert_url" -H "Content-Type: application/json" --data-binary "@$file" 2>&1); then
                echo "❌ Failed to import data to ClickHouse table: $table" >&2
                echo "   File: $file" >&2
                echo "   Error: $result" >&2
                return 1
            fi
        else
            if ! result=$(curl -s -u "$CH_USER:" -X POST "$insert_url" -H "Content-Type: application/json" --data-binary "@$file" 2>&1); then
                echo "❌ Failed to import data to ClickHouse table: $table" >&2
                echo "   File: $file" >&2
                echo "   Error: $result" >&2
                return 1
            fi
        fi
    else
        # Development mode: Use Docker connection
        if [ -n "$CH_PASSWORD" ]; then
            if ! result=$(docker exec -i analytical-moose-foobar-clickhousedb-1 clickhouse-client --user "$CH_USER" --password "$CH_PASSWORD" --database "$CH_DB" --query "INSERT INTO $table FORMAT JSONEachRow" < "$file" 2>&1); then
                echo "❌ Failed to import data to ClickHouse table: $table" >&2
                echo "   File: $file" >&2
                echo "   Error: $result" >&2
                return 1
            fi
        else
            if ! result=$(docker exec -i analytical-moose-foobar-clickhousedb-1 clickhouse-client --user "$CH_USER" --database "$CH_DB" --query "INSERT INTO $table FORMAT JSONEachRow" < "$file" 2>&1); then
                echo "❌ Failed to import data to ClickHouse table: $table" >&2
                echo "   File: $file" >&2
                echo "   Error: $result" >&2
                return 1
            fi
        fi
    fi
    
    return 0
}

# Test PostgreSQL connection
echo "Testing PostgreSQL connection..."
if [ "$IS_PRODUCTION" = true ] && [ -n "${PG_CONNECTION_STRING:-}" ]; then
    # Production mode: Test connection with psql
    if ! psql "$PG_CONNECTION_STRING" -c "SELECT 1" > /dev/null 2>&1; then
        echo "❌ PostgreSQL connection failed"
        echo "   Connection string: $PG_CONNECTION_STRING"
        echo "   Testing connection manually..."
        psql "$PG_CONNECTION_STRING" -c "SELECT 1" 2>&1 | head -5
        exit 1
    fi
else
    # Development mode: Use Docker connection test
    if ! docker exec "$PG_CONTAINER" pg_isready -h localhost -p 5432 -U "$PG_USER" > /dev/null 2>&1; then
        echo "❌ PostgreSQL connection failed"
        exit 1
    fi
fi
echo "✅ PostgreSQL connection successful"

# Test ClickHouse connection
echo "Testing ClickHouse connection..."
if ! run_clickhouse_query "SELECT 1" > /dev/null 2>&1; then
    echo "❌ ClickHouse connection failed"
    exit 1
fi
echo "✅ ClickHouse connection successful"

# Check if source table exists
echo "Checking if source table '$SOURCE_TABLE' exists..."
TABLE_EXISTS=$(run_postgres_query_direct "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$SOURCE_TABLE' AND table_schema = 'public'")
if [ "$TABLE_EXISTS" != "1" ]; then
    echo "❌ Source table '$SOURCE_TABLE' does not exist in PostgreSQL"
    exit 1
fi
echo "✅ Source table exists"

# Check if destination table exists
echo "Checking if destination table '$DEST_TABLE' exists..."
if ! run_clickhouse_query "EXISTS TABLE $DEST_TABLE" > /dev/null 2>&1; then
    echo "❌ Destination table '$DEST_TABLE' does not exist in ClickHouse"
    exit 1
fi
echo "✅ Destination table exists"

# Get table schema information
echo "Discovering table schema..."
SCHEMA_QUERY="
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = '$SOURCE_TABLE' 
    AND table_schema = 'public'
ORDER BY ordinal_position
"

if ! run_postgres_query "$SCHEMA_QUERY" "$TEMP_DIR/schema_info.txt"; then
    echo "❌ Failed to get table schema information"
    exit 1
fi

# Parse schema to build dynamic queries
echo "Building dynamic conversion logic..."

# Create arrays to store column information
declare -a COLUMN_NAMES=()
declare -a COLUMN_TYPES=()
declare -a COLUMN_POSITIONS=()

# Track which column contains created_at for CDC timestamp
CREATED_AT_FIELD_NUM=""

# Read schema information
while IFS=$'\t' read -r col_name data_type is_nullable col_default ordinal_pos; do
    # Skip empty lines
    [ -z "$col_name" ] && continue
    
    COLUMN_NAMES+=("$col_name")
    COLUMN_TYPES+=("$data_type")
    COLUMN_POSITIONS+=("$ordinal_pos")
    
    # Track created_at field number for AWK script (1-based index)
    if [ "$col_name" = "created_at" ]; then
        CREATED_AT_FIELD_NUM=$((${#COLUMN_NAMES[@]}))
    fi
    
    echo "  Column $ordinal_pos: $col_name ($data_type)"
done < "$TEMP_DIR/schema_info.txt"

if [ ${#COLUMN_NAMES[@]} -eq 0 ]; then
    echo "❌ No columns found in source table"
    exit 1
fi

echo "✅ Found ${#COLUMN_NAMES[@]} columns"

if [ -n "$CREATED_AT_FIELD_NUM" ]; then
    echo "✅ Found created_at column at field position $CREATED_AT_FIELD_NUM"
else
    echo "⚠️  No created_at column found - will use current timestamp for CDC"
fi

# Build dynamic SELECT query with type casting
BUILD_SELECT_QUERY() {
    local limit_clause="$1"
    local offset_clause="$2"
    
    echo "SELECT "
    
    for i in "${!COLUMN_NAMES[@]}"; do
        local col_name="${COLUMN_NAMES[$i]}"
        local data_type="${COLUMN_TYPES[$i]}"
        
        # Add appropriate COALESCE and type casting based on data type
        case "$data_type" in
            "integer"|"bigint"|"smallint"|"numeric"|"decimal"|"real"|"double precision")
                echo "    COALESCE($col_name, 0) as $col_name"
                ;;
            "boolean")
                echo "    COALESCE($col_name, false) as $col_name"
                ;;
            "timestamp"*|"date"|"time"*)
                echo "    COALESCE(DATE_TRUNC('second', $col_name)::text, '1970-01-01 00:00:00') as $col_name"
                ;;
            "json"|"jsonb")
                echo "    COALESCE($col_name::text, '{}') as $col_name"
                ;;
            "ARRAY"*|"_"*)
                echo "    COALESCE(array_to_string($col_name, ','), '') as $col_name"
                ;;
            *)
                echo "    COALESCE($col_name::text, '') as $col_name"
                ;;
        esac
        
        # Add comma except for last column
        if [ $i -lt $((${#COLUMN_NAMES[@]} - 1)) ]; then
            echo ","
        fi
    done
    
    echo "FROM $SOURCE_TABLE"
    echo "ORDER BY id" # Use stable ordering by primary key to ensure consistent pagination
    
    if [ -n "$limit_clause" ]; then
        echo "LIMIT $limit_clause"
    fi
    
    if [ -n "$offset_clause" ]; then
        echo "OFFSET $offset_clause"
    fi
}

# Function to preserve original column names (no conversion needed for generic migration)
convert_to_camel_case() {
    local column_name="$1"
    # Keep original column names as-is for generic migration
    echo "$column_name"
}

# Build dynamic AWK conversion script
BUILD_AWK_SCRIPT() {
    local awk_script=""
    
    awk_script+="BEGIN { FS=\"\\t\" } NR > 0 {"
    
    # Process each column
    for i in "${!COLUMN_NAMES[@]}"; do
        local col_name="${COLUMN_NAMES[$i]}"
        local data_type="${COLUMN_TYPES[$i]}"
        local field_num=$((i + 1))
        
        case "$data_type" in
            "integer"|"bigint"|"smallint"|"numeric"|"decimal"|"real"|"double precision")
                awk_script+="
    ${col_name}_val = (\$${field_num} == \"\" || \$${field_num} == \"\\\\N\" || \$${field_num} == \"NULL\") ? \"0\" : \$${field_num};
    if (!match(${col_name}_val, /^-?[0-9]*\.?[0-9]+\$/)) { ${col_name}_val = \"0\"; }"
                ;;
            "boolean")
                awk_script+="
    ${col_name}_val = (\$${field_num} == \"\" || \$${field_num} == \"\\\\N\" || \$${field_num} == \"NULL\") ? \"false\" : ((\$${field_num} == \"t\") ? \"true\" : \"false\");"
                ;;
            "json"|"jsonb")
                awk_script+="
    ${col_name}_val = (\$${field_num} == \"\" || \$${field_num} == \"\\\\N\" || \$${field_num} == \"NULL\") ? \"{}\" : \$${field_num};"
                ;;
            "timestamp"*|"date"|"time"*)
                awk_script+="
    ${col_name}_val = (\$${field_num} == \"\" || \$${field_num} == \"\\\\N\" || \$${field_num} == \"NULL\") ? \"1970-01-01 00:00:00\" : \$${field_num};"
                ;;
            "ARRAY"*|"_"*)
                awk_script+="
    ${col_name}_field = (\$${field_num} == \"\" || \$${field_num} == \"\\\\N\" || \$${field_num} == \"NULL\") ? \"\" : \$${field_num};
    if (${col_name}_field == \"\") {
        ${col_name}_val = \"[]\";
    } else {
        split(${col_name}_field, ${col_name}_array, \",\");
        ${col_name}_val = \"[\";
        for (j = 1; j <= length(${col_name}_array); j++) {
            if (j > 1) ${col_name}_val = ${col_name}_val \",\";
            item_val = ${col_name}_array[j];
            gsub(/\\\\/, \"\\\\\\\\\", item_val);
            gsub(/\"/, \"\\\\\\\"\", item_val);
            ${col_name}_val = ${col_name}_val \"\\\"\" item_val \"\\\"\";
        }
        ${col_name}_val = ${col_name}_val \"]\";
    }"
                ;;
            *)
                awk_script+="
    ${col_name}_val = (\$${field_num} == \"\" || \$${field_num} == \"\\\\N\" || \$${field_num} == \"NULL\") ? \"\" : \$${field_num};
    gsub(/\\\\/, \"\\\\\\\\\", ${col_name}_val);
    gsub(/\"/, \"\\\\\\\"\", ${col_name}_val);"
                ;;
        esac
    done
    
    # Build JSON output
    awk_script+="
    printf \"{\";
    first = 1;"
    
    for i in "${!COLUMN_NAMES[@]}"; do
        local col_name="${COLUMN_NAMES[$i]}"
        local data_type="${COLUMN_TYPES[$i]}"
        local camel_case_name=$(convert_to_camel_case "$col_name")
        
        awk_script+="
    if (!first) printf \",\";
    first = 0;"
        
        case "$data_type" in
            "integer"|"bigint"|"smallint"|"numeric"|"decimal"|"real"|"double precision")
                awk_script+="
    printf \"\\\"${camel_case_name}\\\":\" ${col_name}_val;"
                ;;
            "boolean")
                awk_script+="
    printf \"\\\"${camel_case_name}\\\":\" ${col_name}_val;"
                ;;
            "timestamp"*|"date"|"time"*)
                awk_script+="
    printf \"\\\"${camel_case_name}\\\":\\\"\" ${col_name}_val \"\\\"\";"
                ;;
            "json"|"jsonb"|"ARRAY"*|"_"*)
                awk_script+="
    printf \"\\\"${camel_case_name}\\\":\" ${col_name}_val;"
                ;;
            *)
                awk_script+="
    printf \"\\\"${camel_case_name}\\\":\\\"\" ${col_name}_val \"\\\"\";"
                ;;
        esac
    done
    
    # Add CDC fields required for ClickHouse tables
    if [ -n "$CREATED_AT_FIELD_NUM" ]; then
        # Use created_at value if available
        awk_script+="
    # Add CDC metadata fields (required for Moose CDC tables)
    # Use the record ID as the CDC ID for consistency
    printf \",\\\"cdc_id\\\":\\\"\" \$1 \"\\\"\";
    printf \",\\\"cdc_operation\\\":\\\"INSERT\\\"\";
    # Use created_at value (dynamically detected field) for cdc_timestamp
    printf \",\\\"cdc_timestamp\\\":\\\"\" \$$CREATED_AT_FIELD_NUM \"\\\"\";
    printf \"}\\n\";
}"
    else
        # Generate current timestamp if no created_at column
        local current_timestamp=$(date -u +"%Y-%m-%d %H:%M:%S")
        awk_script+="
    # Add CDC metadata fields (required for Moose CDC tables)
    # Use the record ID as the CDC ID for consistency
    printf \",\\\"cdc_id\\\":\\\"\" \$1 \"\\\"\";
    printf \",\\\"cdc_operation\\\":\\\"INSERT\\\"\";
    # Use current timestamp since no created_at column exists
    printf \",\\\"cdc_timestamp\\\":\\\"$current_timestamp\\\"\";
    printf \"}\\n\";
}"
    fi
    
    echo "$awk_script"
}

# Get record count
echo "Getting record count..."
TOTAL_COUNT=$(run_postgres_query_direct "SELECT COUNT(*) FROM $SOURCE_TABLE")
if [ $? -ne 0 ]; then
    echo "❌ Failed to get record count"
    exit 1
fi

if ! [[ "$TOTAL_COUNT" =~ ^[0-9]+$ ]]; then
    echo "❌ Invalid record count: '$TOTAL_COUNT'"
    exit 1
fi

if [ -n "$COUNT_LIMIT" ]; then
    MIGRATE_COUNT=$((TOTAL_COUNT < COUNT_LIMIT ? TOTAL_COUNT : COUNT_LIMIT))
    echo "📊 Records to migrate (limited by --count $COUNT_LIMIT): $MIGRATE_COUNT (of $TOTAL_COUNT total)"
else
    MIGRATE_COUNT=$TOTAL_COUNT
    echo "📊 Records to migrate: $TOTAL_COUNT"
fi

if [ "$MIGRATE_COUNT" -eq 0 ]; then
    echo "⚠️  No records to migrate"
    exit 0
fi

# Clear existing data if requested
if [ "$CLEAR_DATA" = true ]; then
    echo "Clearing existing data from ClickHouse..."
    
    BEFORE_COUNT=$(run_clickhouse_query "SELECT count() FROM $DEST_TABLE")
    echo "   Before clearing: $BEFORE_COUNT records"
    
    if ! run_clickhouse_query "TRUNCATE TABLE $DEST_TABLE"; then
        echo "❌ Failed to truncate $DEST_TABLE table"
        exit 1
    fi
    
    AFTER_COUNT=$(run_clickhouse_query "SELECT count() FROM $DEST_TABLE")
    if [ "$AFTER_COUNT" != "0" ]; then
        echo "❌ Failed to clear ClickHouse data completely!"
        echo "   After truncate: $AFTER_COUNT records"
        exit 1
    fi
    
    echo "✅ Existing data cleared (verified: 0 records)"
fi

# Step 1: Test with 1 record
echo ""
echo "===================================================="
echo "               STEP 1: TEST RUN (1 record)"
echo "===================================================="

# Get count before test to enable proper cleanup
BEFORE_TEST_COUNT=$(run_clickhouse_query "SELECT count() FROM $DEST_TABLE")
echo "Records before test: $BEFORE_TEST_COUNT"

TEST_QUERY=$(BUILD_SELECT_QUERY "1" "")
echo "Exporting test data..."
if ! run_postgres_query "$TEST_QUERY" "$TEMP_DIR/test_data.txt"; then
    echo "❌ Failed to export test data"
    exit 1
fi

if [ ! -s "$TEMP_DIR/test_data.txt" ]; then
    echo "❌ No test data exported"
    exit 1
fi

# Extract the ID of the test record (first column) for cleanup
TEST_RECORD_ID=$(head -1 "$TEMP_DIR/test_data.txt" | cut -f1)
if [ -z "$TEST_RECORD_ID" ]; then
    echo "❌ Failed to extract test record ID"
    exit 1
fi
echo "Test record ID: $TEST_RECORD_ID"

echo "Converting test data to JSON format..."
AWK_SCRIPT=$(BUILD_AWK_SCRIPT)
if ! awk "$AWK_SCRIPT" "$TEMP_DIR/test_data.txt" > "$TEMP_DIR/test_data.json"; then
    echo "❌ Failed to convert test data to JSON format"
    exit 1
fi

if [ ! -s "$TEMP_DIR/test_data.json" ]; then
    echo "❌ Test JSON file is empty after conversion"
    exit 1
fi

echo "Testing import to ClickHouse..."
if ! import_to_clickhouse "$TEMP_DIR/test_data.json" "$DEST_TABLE"; then
    echo "❌ Failed to import test data to ClickHouse"
    exit 1
fi

echo "✅ Test import successful!"

# Verify test data
AFTER_TEST_COUNT=$(run_clickhouse_query "SELECT count() FROM $DEST_TABLE")
if [ $? -ne 0 ] || [ -z "$AFTER_TEST_COUNT" ]; then
    echo "❌ Failed to verify test data in ClickHouse"
    exit 1
fi

EXPECTED_TEST_COUNT=$((BEFORE_TEST_COUNT + 1))
if [ "$AFTER_TEST_COUNT" -ne "$EXPECTED_TEST_COUNT" ]; then
    echo "❌ Test data verification failed"
    echo "   Before: $BEFORE_TEST_COUNT, After: $AFTER_TEST_COUNT, Expected: $EXPECTED_TEST_COUNT"
    exit 1
fi

echo "✅ Test data verified in ClickHouse (count: $AFTER_TEST_COUNT)"

# ALWAYS clean up test data using the specific test record ID
echo "Cleaning up test data using ID: $TEST_RECORD_ID..."

# Find the ID column name (first column name)
ID_COLUMN_NAME="${COLUMN_NAMES[0]}"
echo "Using ID column: $ID_COLUMN_NAME"

# Delete the specific test record by ID
DELETE_QUERY="DELETE FROM $DEST_TABLE WHERE $ID_COLUMN_NAME = '$TEST_RECORD_ID'"
if run_clickhouse_query "$DELETE_QUERY" > /dev/null 2>&1; then
    # Verify cleanup
    AFTER_CLEANUP_COUNT=$(run_clickhouse_query "SELECT count() FROM $DEST_TABLE")
    if [ "$AFTER_CLEANUP_COUNT" -eq "$BEFORE_TEST_COUNT" ]; then
        echo "✅ Test data cleaned up successfully (back to $BEFORE_TEST_COUNT records)"
    else
        echo "⚠️  Test data cleanup verification failed (before: $BEFORE_TEST_COUNT, after cleanup: $AFTER_CLEANUP_COUNT)"
        echo "    This may be expected if the ID column format differs between PostgreSQL and ClickHouse"
    fi
else
    echo "⚠️  Warning: Failed to delete test record with ID '$TEST_RECORD_ID'"
    echo "    This may be due to ID format differences between PostgreSQL and ClickHouse"
fi

echo ""
echo "🎉 TEST PASSED! Proceeding with full migration..."

# Step 2: Full migration
echo ""
echo "===================================================="
echo "           STEP 2: FULL DATA MIGRATION"
echo "===================================================="

# Calculate number of batches
TOTAL_BATCHES=$(( (MIGRATE_COUNT + BATCH_SIZE - 1) / BATCH_SIZE ))
echo "📊 Processing in batches of $BATCH_SIZE records: $TOTAL_BATCHES batches"

# Process data in batches
for ((batch=0; batch<TOTAL_BATCHES; batch++)); do
    offset=$((batch * BATCH_SIZE))
    current_batch=$((batch + 1))
    
    if [ -n "$COUNT_LIMIT" ]; then
        remaining=$((COUNT_LIMIT - offset))
        batch_limit=$((remaining < BATCH_SIZE ? remaining : BATCH_SIZE))
    else
        batch_limit=$BATCH_SIZE
    fi
    
    echo "Processing batch $current_batch/$TOTAL_BATCHES (offset: $offset, limit: $batch_limit)..."
    
    # Build and execute batch query
    BATCH_QUERY=$(BUILD_SELECT_QUERY "$batch_limit" "$offset")
    
    if ! run_postgres_query "$BATCH_QUERY" "$TEMP_DIR/batch_${batch}_data.txt"; then
        echo "❌ Failed to export batch $current_batch"
        exit 1
    fi
    
    # Convert batch data
    if ! awk "$AWK_SCRIPT" "$TEMP_DIR/batch_${batch}_data.txt" > "$TEMP_DIR/batch_${batch}_data.json"; then
        echo "❌ Failed to convert batch $current_batch to JSON format"
        exit 1
    fi
    
    # Import batch
    if ! import_to_clickhouse "$TEMP_DIR/batch_${batch}_data.json" "$DEST_TABLE"; then
        echo "❌ Failed to import batch $current_batch to ClickHouse"
        exit 1
    fi
    
    echo "✅ Batch $current_batch/$TOTAL_BATCHES completed"
done

echo "✅ All batches processed successfully!"

# Final verification
echo "Verifying final data in ClickHouse..."
CH_COUNT=$(run_clickhouse_query "SELECT count() FROM $DEST_TABLE")
if [ $? -ne 0 ]; then
    echo "❌ Failed to query final data count from ClickHouse"
    exit 1
fi

if ! [[ "$CH_COUNT" =~ ^[0-9]+$ ]]; then
    echo "❌ Final count is not a valid number: '$CH_COUNT'"
    exit 1
fi

echo "📊 Migration results:"
echo "   - Source records: $MIGRATE_COUNT"
echo "   - Destination records: $CH_COUNT"

# Note: The count check is relaxed here because we might have existing data
# if --clear-data was not used
if [ "$CLEAR_DATA" = true ] && [ "$CH_COUNT" -ne "$MIGRATE_COUNT" ]; then
    echo "❌ Record counts don't match! Migration may have failed."
    echo "   - Expected: $MIGRATE_COUNT, Got: $CH_COUNT"
    exit 1
elif [ "$CLEAR_DATA" = false ]; then
    echo "✅ Migration completed (existing data preserved)"
else
    echo "✅ Migration completed successfully!"
fi

echo ""
echo "===================================================="
echo "🎉 Generic table migration completed!"
echo "===================================================="
echo "✅ Migrated $MIGRATE_COUNT records from '$SOURCE_TABLE' to '$DEST_TABLE'"

# Cleanup
if [ "$KEEP_TEMP" = false ]; then
    echo "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    echo "✅ Temporary files cleaned up"
else
    echo "📁 Temporary files kept in: $TEMP_DIR"
fi 