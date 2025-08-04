#!/bin/bash

# Parallel Elasticsearch Migration Script
# Splits work across multiple processes for much faster migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/prod-migration.env"
source "$ENV_FILE"

# Configuration
WORKERS=${WORKERS:-8}  # Number of parallel workers
BATCH_SIZE=${BATCH_SIZE:-10000}  # Records per batch
TABLE_NAME="foo"
INDEX_NAME="foos"

echo -e "${BLUE}🚀 Parallel Elasticsearch Migration${NC}"
echo "Workers: $WORKERS"
echo "Batch size: $BATCH_SIZE"
echo ""

# Get total count
TOTAL_COUNT=$(psql "$PG_CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM $TABLE_NAME;" | tr -d ' ')
echo "Total records: $TOTAL_COUNT"

# Calculate work distribution
RECORDS_PER_WORKER=$((TOTAL_COUNT / WORKERS))
echo "Records per worker: ~$RECORDS_PER_WORKER"

# Worker function
worker() {
    local worker_id=$1
    local start_offset=$2
    local end_offset=$3
    local worker_records=$((end_offset - start_offset))
    
    echo -e "${BLUE}Worker $worker_id: Processing $worker_records records (offset $start_offset-$end_offset)${NC}"
    
    local temp_file="/tmp/worker_${worker_id}_$$.ndjson"
    
    # Single query to get all worker data and convert directly to NDJSON
    psql "$PG_CONNECTION_STRING" -t -A -F$'\t' -c "
        SELECT 
            '{\"index\":{\"_index\":\"$INDEX_NAME\",\"_id\":\"' || id::text || '\"}}' || chr(10) ||
            '{\"id\":\"' || id::text || 
            '\",\"name\":\"' || REPLACE(REPLACE(name, '\\', '\\\\'), '\"', '\\\"') ||
            '\",\"description\":\"' || REPLACE(REPLACE(COALESCE(description, ''), '\\', '\\\\'), '\"', '\\\"') ||
            '\",\"status\":\"' || COALESCE(status, 'active') ||
            '\",\"priority\":' || COALESCE(priority, 0) ||
            ',\"isActive\":' || CASE WHEN COALESCE(is_active, false) THEN 'true' ELSE 'false' END ||
            ',\"metadata\":' || COALESCE(metadata::text, '{}') ||
            ',\"tags\":\"' || REPLACE(REPLACE(COALESCE(array_to_string(tags, ','), ''), '\\', '\\\\'), '\"', '\\\"') ||
            '\",\"score\":' || COALESCE(score, 0) ||
            ',\"largeText\":\"' || REPLACE(REPLACE(COALESCE(large_text, ''), '\\', '\\\\'), '\"', '\\\"') ||
            '\",\"createdAt\":\"' || to_char(created_at, 'YYYY-MM-DD') || 'T' || to_char(created_at, 'HH24:MI:SS') || '.000Z' ||
            '\",\"updatedAt\":\"' || to_char(updated_at, 'YYYY-MM-DD') || 'T' || to_char(updated_at, 'HH24:MI:SS') || '.000Z' || '\"}'
        FROM $TABLE_NAME 
        ORDER BY created_at
        LIMIT $worker_records OFFSET $start_offset
    " > "$temp_file"
    
    # Send to Elasticsearch in one bulk request
    local response
    response=$(curl -s -w "%{http_code}" -H "Authorization: ApiKey $ES_API_KEY" -H "Content-Type: application/x-ndjson" -X POST "$ES_URL/$INDEX_NAME/_bulk" --data-binary "@$temp_file" 2>&1)
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Worker $worker_id completed successfully${NC}"
    else
        echo -e "${RED}❌ Worker $worker_id failed (HTTP $http_code)${NC}"
    fi
    
    rm -f "$temp_file"
}

# Clear existing data if requested
if [ "$CLEAR_DATA" = "true" ]; then
    echo -e "${YELLOW}Clearing existing data...${NC}"
    curl -s -H "Authorization: ApiKey $ES_API_KEY" -X DELETE "$ES_URL/$INDEX_NAME" >/dev/null 2>&1 || true
fi

# Create index
echo -e "${YELLOW}Creating index...${NC}"
curl -s -H "Authorization: ApiKey $ES_API_KEY" -H "Content-Type: application/json" -X PUT "$ES_URL/$INDEX_NAME" -d '{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "description": { "type": "text" },
      "status": { "type": "keyword" },
      "priority": { "type": "integer" },
      "isActive": { "type": "boolean" },
      "metadata": { "type": "object" },
      "tags": { "type": "keyword" },
      "score": { "type": "float" },
      "largeText": { "type": "text" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}' >/dev/null 2>&1

echo -e "${YELLOW}Starting $WORKERS parallel workers...${NC}"

# Start workers in parallel
for ((i=0; i<WORKERS; i++)); do
    start_offset=$((i * RECORDS_PER_WORKER))
    if [ $i -eq $((WORKERS - 1)) ]; then
        # Last worker gets remaining records
        end_offset=$TOTAL_COUNT
    else
        end_offset=$(((i + 1) * RECORDS_PER_WORKER))
    fi
    
    worker $i $start_offset $end_offset &
done

# Wait for all workers to complete
wait

echo -e "${GREEN}🎉 Parallel migration completed!${NC}"

# Refresh index
curl -s -H "Authorization: ApiKey $ES_API_KEY" -X POST "$ES_URL/$INDEX_NAME/_refresh" >/dev/null 2>&1

# Get final count
FINAL_COUNT=$(curl -s -H "Authorization: ApiKey $ES_API_KEY" "$ES_URL/$INDEX_NAME/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
echo "Final Elasticsearch count: $FINAL_COUNT"