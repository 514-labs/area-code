migrate#!/bin/bash

# Enable strict error handling
set -euo pipefail

# Set defaults - don't load .env file to avoid parsing issues
PG_HOST=${PG_HOST:-localhost}
PG_PORT=${PG_PORT:-54322}
PG_USER=${PG_USER:-postgres}
PG_PASSWORD=${PG_PASSWORD:-postgres}
PG_DB=${PG_DB:-postgres}

# Elasticsearch configuration
ES_HOST=${ES_HOST:-localhost}
ES_PORT=${ES_PORT:-9200}
ES_PROTOCOL=${ES_PROTOCOL:-http}
ES_URL="${ES_PROTOCOL}://${ES_HOST}:${ES_PORT}"

# Index names (matching the ones defined in indices.ts)
FOO_INDEX="foos"
BAR_INDEX="bars"

# Parse command line arguments
CLEAR_DATA=false
KEEP_TEMP=false
COUNT_LIMIT=""
BATCH_SIZE=5000

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
        --batch-size)
            BATCH_SIZE="$2"
            if ! [[ "$BATCH_SIZE" =~ ^[0-9]+$ ]] || [ "$BATCH_SIZE" -eq 0 ]; then
                echo "Error: --batch-size must be a positive integer"
                exit 1
            fi
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Migrate data from PostgreSQL to Elasticsearch"
            echo ""
            echo "Options:"
            echo "  --clear-data     Clear existing data in Elasticsearch before migration"
            echo "  --keep-temp      Keep temporary files after migration"
            echo "  --count <num>    Limit the number of records to migrate (for testing)"
            echo "  --batch-size <num> Number of records to process in each batch (default: 1000)"
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
echo "        PostgreSQL to Elasticsearch Migration"
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

# Function to test Elasticsearch connection
test_elasticsearch_connection() {
    local response
    if ! response=$(curl -s -f "${ES_URL}/_cluster/health" 2>/dev/null); then
        echo "❌ Elasticsearch connection failed"
        return 1
    fi
    
    # Check if cluster is healthy
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$status" != "green" ] && [ "$status" != "yellow" ]; then
        echo "❌ Elasticsearch cluster is not healthy (status: $status)"
        return 1
    fi
    
    echo "✅ Elasticsearch connection successful (status: $status)"
    return 0
}

# Function to create Elasticsearch index with mapping
create_elasticsearch_index() {
    local index_name="$1"
    local mapping="$2"
    local response
    
    # Check if index already exists
    if curl -s -f "${ES_URL}/${index_name}" >/dev/null 2>&1; then
        echo "⚠️  Index ${index_name} already exists"
        return 0
    fi
    
    # Create index with mapping
    if ! response=$(curl -s -f -X PUT "${ES_URL}/${index_name}" \
        -H "Content-Type: application/json" \
        -d "$mapping" 2>&1); then
        echo "❌ Failed to create index ${index_name}: $response"
        return 1
    fi
    
    echo "✅ Created index ${index_name}"
    return 0
}

# Function to bulk index documents to Elasticsearch
bulk_index_to_elasticsearch() {
    local file="$1"
    local index_name="$2"
    local response
    
    if [ ! -f "$file" ]; then
        echo "❌ Bulk file does not exist: $file" >&2
        return 1
    fi
    
    # Use bulk API to index documents
    if ! response=$(curl -s -f -X POST "${ES_URL}/${index_name}/_bulk" \
        -H "Content-Type: application/x-ndjson" \
        --data-binary "@$file" 2>&1); then
        echo "❌ Failed to bulk index to Elasticsearch index: ${index_name}" >&2
        echo "   File: $file" >&2
        echo "   Error: $response" >&2
        return 1
    fi
    
    # Check for errors in bulk response
    local errors=$(echo "$response" | grep -o '"errors":true' || true)
    if [ -n "$errors" ]; then
        echo "❌ Bulk indexing had errors for index: ${index_name}" >&2
        echo "   Response: $response" >&2
        return 1
    fi
    
    return 0
}

# Function to refresh Elasticsearch index (makes data immediately searchable)
refresh_elasticsearch_index() {
    local index_name="$1"
    local response
    
    if ! response=$(curl -s -f -X POST "${ES_URL}/${index_name}/_refresh" 2>&1); then
        echo "❌ Failed to refresh Elasticsearch index: ${index_name}" >&2
        echo "   Error: $response" >&2
        return 1
    fi
    
    return 0
}

# Function to count documents in Elasticsearch index
count_elasticsearch_documents() {
    local index_name="$1"
    local response
    
    if ! response=$(curl -s -f "${ES_URL}/${index_name}/_count" 2>&1); then
        echo "❌ Failed to count documents in index: ${index_name}" >&2
        return 1
    fi
    
    local count=$(echo "$response" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo "$count"
    return 0
}

# Function to clear Elasticsearch index
clear_elasticsearch_index() {
    local index_name="$1"
    local response
    
    # Delete index if it exists
    if curl -s -f "${ES_URL}/${index_name}" >/dev/null 2>&1; then
        if ! response=$(curl -s -f -X DELETE "${ES_URL}/${index_name}" 2>&1); then
            echo "❌ Failed to delete index: ${index_name}" >&2
            echo "   Error: $response" >&2
            return 1
        fi
        echo "✅ Deleted index: ${index_name}"
    else
        echo "⚠️  Index ${index_name} does not exist, nothing to delete"
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

# Test Elasticsearch connection
echo "Testing Elasticsearch connection..."
if ! test_elasticsearch_connection; then
    echo "❌ Elasticsearch connection failed"
    exit 1
fi

echo ""

# Create Elasticsearch indices with proper mappings
echo "Creating Elasticsearch indices..."

# Foo index mapping
FOO_MAPPING='{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "standard"
      },
      "status": { "type": "keyword" },
      "priority": { "type": "integer" },
      "isActive": { "type": "boolean" },
      "metadata": { "type": "object" },
      "config": { "type": "object" },
      "tags": { "type": "keyword" },
      "score": { "type": "float" },
      "largeText": { "type": "text" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}'

# Bar index mapping
BAR_MAPPING='{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "fooId": { "type": "keyword" },
      "value": { "type": "float" },
      "label": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "notes": {
        "type": "text",
        "analyzer": "standard"
      },
      "isEnabled": { "type": "boolean" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}'

if ! create_elasticsearch_index "$FOO_INDEX" "$FOO_MAPPING"; then
    echo "❌ Failed to create foo index"
    exit 1
fi

if ! create_elasticsearch_index "$BAR_INDEX" "$BAR_MAPPING"; then
    echo "❌ Failed to create bar index"
    exit 1
fi

echo ""

# Clear existing data if requested
if [ "$CLEAR_DATA" = true ]; then
    echo "Clearing existing data from Elasticsearch..."
    if ! clear_elasticsearch_index "$FOO_INDEX"; then
        echo "❌ Failed to clear foo index"
        exit 1
    fi
    if ! clear_elasticsearch_index "$BAR_INDEX"; then
        echo "❌ Failed to clear bar index"
        exit 1
    fi
    
    # Recreate indices after clearing
    if ! create_elasticsearch_index "$FOO_INDEX" "$FOO_MAPPING"; then
        echo "❌ Failed to recreate foo index"
        exit 1
    fi
    if ! create_elasticsearch_index "$BAR_INDEX" "$BAR_MAPPING"; then
        echo "❌ Failed to recreate bar index"
        exit 1
    fi
    echo "✅ Existing data cleared"
fi

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
    to_char(created_at, 'YYYY-MM-DD') || 'T' || to_char(created_at, 'HH24:MI:SS') || '.000Z' as created_at,
    to_char(updated_at, 'YYYY-MM-DD') || 'T' || to_char(updated_at, 'HH24:MI:SS') || '.000Z' as updated_at
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
    to_char(created_at, 'YYYY-MM-DD') || 'T' || to_char(created_at, 'HH24:MI:SS') || '.000Z' as created_at,
    to_char(updated_at, 'YYYY-MM-DD') || 'T' || to_char(updated_at, 'HH24:MI:SS') || '.000Z' as updated_at
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

# Convert test data to Elasticsearch bulk format
echo "Converting test data to Elasticsearch bulk format..."

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
    
    # Create Elasticsearch document
    doc = "{\"id\":\"" $1 "\",\"name\":\"" $2 "\",\"description\":\"" $3 "\",\"status\":\"" $4 "\",\"priority\":" $5 ",\"isActive\":" is_active_val ",\"metadata\":" metadata_json ",\"config\":" config_json ",\"tags\":" tags_json ",\"score\":" $10 ",\"largeText\":\"" $11 "\",\"createdAt\":\"" $12 "\",\"updatedAt\":\"" $13 "\"}";
    
    # Output bulk format: action + document
    print "{\"index\":{\"_index\":\"foos\",\"_id\":\"" $1 "\"}}";
    print doc;
}' "$TEMP_DIR/test_foo_data.json" > "$TEMP_DIR/test_foo_bulk.json"; then
    echo "❌ Failed to convert test foo data to bulk format"
    exit 1
fi

# Process bar test data
if ! awk -F'\t' 'NR > 0 {
    gsub(/\\/, "\\\\");
    gsub(/"/, "\\\"");
    
    # Convert PostgreSQL boolean to JSON boolean
    is_enabled_val = ($6 == "t") ? "true" : "false";
    
    # Create Elasticsearch document
    doc = "{\"id\":\"" $1 "\",\"fooId\":\"" $2 "\",\"value\":" $3 ",\"label\":\"" $4 "\",\"notes\":\"" $5 "\",\"isEnabled\":" is_enabled_val ",\"createdAt\":\"" $7 "\",\"updatedAt\":\"" $8 "\"}";
    
    # Output bulk format: action + document
    print "{\"index\":{\"_index\":\"bars\",\"_id\":\"" $1 "\"}}";
    print doc;
}' "$TEMP_DIR/test_bar_data.json" > "$TEMP_DIR/test_bar_bulk.json"; then
    echo "❌ Failed to convert test bar data to bulk format"
    exit 1
fi

# Verify converted files are not empty
if [ ! -s "$TEMP_DIR/test_foo_bulk.json" ]; then
    echo "❌ Test foo bulk file is empty after conversion"
    exit 1
fi

if [ ! -s "$TEMP_DIR/test_bar_bulk.json" ]; then
    echo "❌ Test bar bulk file is empty after conversion"
    exit 1
fi

echo "✅ Test data converted to Elasticsearch bulk format"

# Test import to Elasticsearch
echo "Testing import to Elasticsearch..."

if ! bulk_index_to_elasticsearch "$TEMP_DIR/test_foo_bulk.json" "$FOO_INDEX"; then
    echo "❌ Failed to import test foo data to Elasticsearch"
    exit 1
fi

if ! bulk_index_to_elasticsearch "$TEMP_DIR/test_bar_bulk.json" "$BAR_INDEX"; then
    echo "❌ Failed to import test bar data to Elasticsearch"
    exit 1
fi

echo "✅ Test import successful!"

# Refresh indices to make data immediately searchable
echo "Refreshing Elasticsearch indices..."
refresh_elasticsearch_index "$FOO_INDEX"
refresh_elasticsearch_index "$BAR_INDEX"

# Small delay to ensure data is fully indexed
sleep 2

# Verify test data in Elasticsearch
echo "Verifying test data in Elasticsearch..."

# Get the test data counts
TEST_FOO_COUNT=$(count_elasticsearch_documents "$FOO_INDEX")
if [ $? -ne 0 ]; then
    echo "❌ Failed to query test foo data count from Elasticsearch"
    exit 1
fi

TEST_BAR_COUNT=$(count_elasticsearch_documents "$BAR_INDEX")
if [ $? -ne 0 ]; then
    echo "❌ Failed to query test bar data count from Elasticsearch"
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

echo "✅ Test data verified in Elasticsearch"

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

# Function to process data in batches
process_batch() {
    local table_name="$1"
    local index_name="$2"
    local query="$3"
    local total_count="$4"
    local batch_size="$5"
    local offset=0
    local processed=0
    
    echo "Processing $table_name in batches of $batch_size..."
    
    while [ $processed -lt $total_count ]; do
        local current_batch_size=$((total_count - processed < batch_size ? total_count - processed : batch_size))
        local batch_file="$TEMP_DIR/${table_name}_batch_${offset}.json"
        
        # Add LIMIT and OFFSET to query
        local batch_query="${query} LIMIT $current_batch_size OFFSET $offset"
        
        echo "  Processing batch $((offset / batch_size + 1)): $current_batch_size records (offset: $offset)"
        
        # Export batch data
        if ! run_postgres_query "$batch_query" "$batch_file"; then
            echo "❌ Failed to export batch data for $table_name"
            return 1
        fi
        
        # Convert to bulk format
        local bulk_file="$TEMP_DIR/${table_name}_batch_${offset}_bulk.json"
        if [ "$table_name" = "foo" ]; then
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
                
                # Create Elasticsearch document
                doc = "{\"id\":\"" $1 "\",\"name\":\"" $2 "\",\"description\":\"" $3 "\",\"status\":\"" $4 "\",\"priority\":" $5 ",\"isActive\":" is_active_val ",\"metadata\":" metadata_json ",\"config\":" config_json ",\"tags\":" tags_json ",\"score\":" $10 ",\"largeText\":\"" $11 "\",\"createdAt\":\"" $12 "\",\"updatedAt\":\"" $13 "\"}";
                
                # Output bulk format: action + document
                print "{\"index\":{\"_index\":\"foos\",\"_id\":\"" $1 "\"}}";
                print doc;
            }' "$batch_file" > "$bulk_file"; then
                echo "❌ Failed to convert batch foo data to bulk format"
                return 1
            fi
        else
            if ! awk -F'\t' 'NR > 0 {
                gsub(/\\/, "\\\\");
                gsub(/"/, "\\\"");
                
                # Convert PostgreSQL boolean to JSON boolean
                is_enabled_val = ($6 == "t") ? "true" : "false";
                
                # Create Elasticsearch document
                doc = "{\"id\":\"" $1 "\",\"fooId\":\"" $2 "\",\"value\":" $3 ",\"label\":\"" $4 "\",\"notes\":\"" $5 "\",\"isEnabled\":" is_enabled_val ",\"createdAt\":\"" $7 "\",\"updatedAt\":\"" $8 "\"}";
                
                # Output bulk format: action + document
                print "{\"index\":{\"_index\":\"bars\",\"_id\":\"" $1 "\"}}";
                print doc;
            }' "$batch_file" > "$bulk_file"; then
                echo "❌ Failed to convert batch bar data to bulk format"
                return 1
            fi
        fi
        
        # Import batch to Elasticsearch
        if ! bulk_index_to_elasticsearch "$bulk_file" "$index_name"; then
            echo "❌ Failed to import batch data to Elasticsearch"
            return 1
        fi
        
        # Clean up batch files
        rm -f "$batch_file" "$bulk_file"
        
        processed=$((processed + current_batch_size))
        offset=$((offset + current_batch_size))
    done
    
    echo "✅ Completed processing $table_name"
    return 0
}

# Full migration queries
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
    to_char(created_at, 'YYYY-MM-DD') || 'T' || to_char(created_at, 'HH24:MI:SS') || '.000Z' as created_at,
    to_char(updated_at, 'YYYY-MM-DD') || 'T' || to_char(updated_at, 'HH24:MI:SS') || '.000Z' as updated_at
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
    to_char(created_at, 'YYYY-MM-DD') || 'T' || to_char(created_at, 'HH24:MI:SS') || '.000Z' as created_at,
    to_char(updated_at, 'YYYY-MM-DD') || 'T' || to_char(updated_at, 'HH24:MI:SS') || '.000Z' as updated_at
FROM bar 
ORDER BY created_at
"

# Process foo data in batches
if [ -n "$COUNT_LIMIT" ]; then
    FOO_QUERY="${FOO_QUERY} LIMIT $COUNT_LIMIT"
fi

if ! process_batch "foo" "$FOO_INDEX" "$FOO_QUERY" "$MIGRATE_FOO_COUNT" "$BATCH_SIZE"; then
    echo "❌ Failed to process foo data"
    exit 1
fi

# Process bar data in batches
if [ -n "$COUNT_LIMIT" ]; then
    BAR_QUERY="${BAR_QUERY} LIMIT $COUNT_LIMIT"
fi

if ! process_batch "bar" "$BAR_INDEX" "$BAR_QUERY" "$MIGRATE_BAR_COUNT" "$BATCH_SIZE"; then
    echo "❌ Failed to process bar data"
    exit 1
fi

echo "✅ Full data imported successfully!"

# Refresh indices to make data immediately searchable
echo "Refreshing Elasticsearch indices..."
refresh_elasticsearch_index "$FOO_INDEX"
refresh_elasticsearch_index "$BAR_INDEX"

# Small delay to ensure data is fully indexed
sleep 3

# Verify full data
echo "Verifying full data in Elasticsearch..."

# Get final counts
CH_FOO_COUNT=$(count_elasticsearch_documents "$FOO_INDEX")
if [ $? -ne 0 ]; then
    echo "❌ Failed to query final foo data count from Elasticsearch"
    exit 1
fi

CH_BAR_COUNT=$(count_elasticsearch_documents "$BAR_INDEX")
if [ $? -ne 0 ]; then
    echo "❌ Failed to query final bar data count from Elasticsearch"
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
echo "🎉 PostgreSQL to Elasticsearch migration completed!"
echo "====================================================" 

# Only cleanup on successful completion
if [ "$KEEP_TEMP" = false ]; then
    echo "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    echo "✅ Temporary files cleaned up"
else
    echo "📁 Temporary files kept in: $TEMP_DIR"
    echo "   - Test files: test_*_bulk.json"
fi 