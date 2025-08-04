#!/bin/bash

# Streaming Elasticsearch Migration Script
# Database-friendly approach that processes in manageable chunks

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

# Configuration - smaller chunks to avoid DB temp space issues
CHUNK_SIZE=${CHUNK_SIZE:-50000}  # Process 50k records at a time
TABLE_NAME="foo"
INDEX_NAME="foos"

echo -e "${BLUE}🚀 Streaming Elasticsearch Migration${NC}"
echo "Chunk size: $CHUNK_SIZE"
echo ""

# Get total count
TOTAL_COUNT=$(psql "$PG_CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM $TABLE_NAME;" | tr -d ' ')
echo "Total records: $TOTAL_COUNT"

# Calculate chunks
TOTAL_CHUNKS=$(( (TOTAL_COUNT + CHUNK_SIZE - 1) / CHUNK_SIZE ))
echo "Total chunks: $TOTAL_CHUNKS"

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

echo -e "${YELLOW}Starting streaming migration...${NC}"

# Process chunks sequentially but with larger batches
for ((chunk=0; chunk<TOTAL_CHUNKS; chunk++)); do
    offset=$((chunk * CHUNK_SIZE))
    remaining=$((TOTAL_COUNT - offset))
    current_chunk_size=$((remaining < CHUNK_SIZE ? remaining : CHUNK_SIZE))
    
    if [ $current_chunk_size -le 0 ]; then
        break
    fi
    
    progress=$((chunk * 100 / TOTAL_CHUNKS))
    echo -e "${BLUE}Processing chunk $((chunk + 1))/$TOTAL_CHUNKS (${progress}%) - $current_chunk_size records (offset: $offset)${NC}"
    
    # Create temporary file for this chunk
    temp_file="/tmp/streaming_chunk_$$.ndjson"
    
    # Single query to get chunk data and convert directly to NDJSON
    if psql "$PG_CONNECTION_STRING" -t -A -F$'\t' -c "
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
        LIMIT $current_chunk_size OFFSET $offset
    " > "$temp_file"; then
        
        # Send to Elasticsearch
        response=$(curl -s -w "%{http_code}" -H "Authorization: ApiKey $ES_API_KEY" -H "Content-Type: application/x-ndjson" -X POST "$ES_URL/$INDEX_NAME/_bulk" --data-binary "@$temp_file" 2>&1)
        http_code="${response: -3}"
        
        if [ "$http_code" = "200" ]; then
            echo -e "${GREEN}✅ Chunk $((chunk + 1)) completed successfully${NC}"
        else
            echo -e "${RED}❌ Chunk $((chunk + 1)) failed (HTTP $http_code)${NC}"
            echo "Response: ${response%???}"
        fi
    else
        echo -e "${RED}❌ Failed to fetch chunk $((chunk + 1)) from database${NC}"
    fi
    
    # Clean up temp file
    rm -f "$temp_file"
    
    # Small delay to be nice to the database
    sleep 0.1
done

echo -e "${GREEN}🎉 Streaming migration completed!${NC}"

# Refresh index
curl -s -H "Authorization: ApiKey $ES_API_KEY" -X POST "$ES_URL/$INDEX_NAME/_refresh" >/dev/null 2>&1

# Get final count
FINAL_COUNT=$(curl -s -H "Authorization: ApiKey $ES_API_KEY" "$ES_URL/$INDEX_NAME/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
echo "Final Elasticsearch count: $FINAL_COUNT"