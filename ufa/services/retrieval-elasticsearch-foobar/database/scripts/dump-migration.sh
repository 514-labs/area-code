#!/bin/bash

# Dump-based Elasticsearch Migration Script
# Uses pg_dump to get data locally, then processes to Elasticsearch

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
DUMP_DIR="/tmp/es_migration"
CHUNK_SIZE=${CHUNK_SIZE:-100000}  # Larger chunks since we're processing locally
TABLE_NAME="foo"
INDEX_NAME="foos"

echo -e "${BLUE}🚀 Dump-based Elasticsearch Migration${NC}"
echo "Dump directory: $DUMP_DIR"
echo "Chunk size: $CHUNK_SIZE"
echo ""

# Create dump directory
mkdir -p "$DUMP_DIR"

# Step 1: Dump the data
echo -e "${YELLOW}📦 Step 1: Dumping data from Supabase...${NC}"
DUMP_FILE="$DUMP_DIR/foo_data.sql"

# Use pg_dump which handles large datasets and timeouts better
# Extract just the foo table data in INSERT format
echo "Using pg_dump to export data (handles timeouts better)..."
pg_dump "$PG_CONNECTION_STRING" \
    --table=foo \
    --data-only \
    --column-inserts \
    --no-owner \
    --no-privileges \
    --no-sync \
    --file="$DUMP_FILE" \
    2>/dev/null || {
        echo -e "${YELLOW}⚠️  pg_dump version mismatch detected, trying alternative approach...${NC}"
        
        # Fallback: Use chunked COPY approach to avoid timeouts
        echo "Using chunked COPY approach instead..."
        
        # First, get total count and create chunks on the database side
        TOTAL_COUNT=$(psql "$PG_CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM foo;" | tr -d ' ')
        echo "Total records: $TOTAL_COUNT"
        
        # Use smaller chunks to avoid timeouts (10k records per chunk)
        DB_CHUNK_SIZE=10000
        TOTAL_DB_CHUNKS=$(( (TOTAL_COUNT + DB_CHUNK_SIZE - 1) / DB_CHUNK_SIZE ))
        
        echo "Downloading in $TOTAL_DB_CHUNKS database chunks of $DB_CHUNK_SIZE records each..."
        
        # Clear the dump file
        > "$DUMP_FILE"
        
        for ((db_chunk=0; db_chunk<TOTAL_DB_CHUNKS; db_chunk++)); do
            offset=$((db_chunk * DB_CHUNK_SIZE))
            echo "Downloading chunk $((db_chunk + 1))/$TOTAL_DB_CHUNKS (offset: $offset)..."
            
            # Use COPY with LIMIT and OFFSET to get smaller chunks
            psql "$PG_CONNECTION_STRING" -c "
            COPY (
                SELECT 
                    'INSERT INTO foo VALUES (' ||
                    '''' || id || ''',' ||
                    '''' || REPLACE(name, '''', '''''') || ''',' ||
                    COALESCE('''' || REPLACE(description, '''', '''''') || '''', 'NULL') || ',' ||
                    COALESCE('''' || status || '''', '''active''') || ',' ||
                    COALESCE(priority::text, '0') || ',' ||
                    CASE WHEN COALESCE(is_active, false) THEN '''t''' ELSE '''f''' END || ',' ||
                    COALESCE('''' || REPLACE(metadata::text, '''', '''''') || '''', '''{}''') || ',' ||
                    COALESCE('''' || REPLACE(array_to_string(tags, ','), '''', '''''') || '''', '''''') || ',' ||
                    COALESCE(score::text, '0') || ',' ||
                    COALESCE('''' || REPLACE(large_text, '''', '''''') || '''', '''''') || ',' ||
                    '''' || to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') || ''',' ||
                    '''' || to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') || '''' ||
                    ');'
                FROM foo 
                ORDER BY created_at
                LIMIT $DB_CHUNK_SIZE OFFSET $offset
            ) TO STDOUT
            " >> "$DUMP_FILE" || {
                echo -e "${RED}❌ Failed to download chunk $((db_chunk + 1))${NC}"
                exit 1
            }
        done
        
        echo -e "${GREEN}✅ Downloaded all chunks successfully${NC}"
    }

if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}❌ Dump failed - file not created${NC}"
    exit 1
fi

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
INSERT_COUNT=$(grep -c "^INSERT INTO" "$DUMP_FILE")
echo -e "${GREEN}✅ Dump completed: $INSERT_COUNT records, $DUMP_SIZE${NC}"

# Step 2: Clear existing data if requested
if [ "$CLEAR_DATA" = "true" ]; then
    echo -e "${YELLOW}🗑️  Step 2: Clearing existing Elasticsearch data...${NC}"
    curl -s -H "Authorization: ApiKey $ES_API_KEY" -X DELETE "$ES_URL/$INDEX_NAME" >/dev/null 2>&1 || true
fi

# Step 3: Create index
echo -e "${YELLOW}🔧 Step 3: Creating Elasticsearch index...${NC}"
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

# Step 4: Process dump in chunks and send to Elasticsearch
echo -e "${YELLOW}⚡ Step 4: Processing SQL dump and uploading to Elasticsearch...${NC}"

# Use the INSERT_COUNT already calculated above
TOTAL_CHUNKS=$(( (INSERT_COUNT + CHUNK_SIZE - 1) / CHUNK_SIZE ))
echo "Processing $INSERT_COUNT INSERT statements in $TOTAL_CHUNKS chunks of $CHUNK_SIZE"

# Extract all INSERT statements to a temporary file for easier processing
INSERT_FILE="$DUMP_DIR/inserts_only.sql"
grep "^INSERT INTO" "$DUMP_FILE" > "$INSERT_FILE"

for ((chunk=0; chunk<TOTAL_CHUNKS; chunk++)); do
    start_line=$((chunk * CHUNK_SIZE + 1))
    end_line=$(((chunk + 1) * CHUNK_SIZE))
    
    if [ $end_line -gt $INSERT_COUNT ]; then
        end_line=$INSERT_COUNT
    fi
    
    current_chunk_size=$((end_line - start_line + 1))
    progress=$((chunk * 100 / TOTAL_CHUNKS))
    
    echo -e "${BLUE}Processing chunk $((chunk + 1))/$TOTAL_CHUNKS (${progress}%) - statements $start_line-$end_line ($current_chunk_size records)${NC}"
    
    # Extract chunk from INSERT statements and convert to Elasticsearch bulk format
    BULK_FILE="$DUMP_DIR/bulk_chunk_$chunk.ndjson"
    
    # Use sed to extract statements and convert to JSON
    sed -n "${start_line},${end_line}p" "$INSERT_FILE" | \
    python3 -c "
import sys
import re
import json

index_name = '$INDEX_NAME'

for line in sys.stdin:
    line = line.strip()
    if not line.startswith('INSERT INTO'):
        continue
    
    # Extract VALUES part
    values_match = re.search(r'VALUES \((.*)\);', line)
    if not values_match:
        continue
    
    values_str = values_match.group(1)
    
    # Simple CSV-like parsing (this is a basic approach)
    # Note: This assumes PostgreSQL's format with single quotes
    values = []
    current_val = ''
    in_quotes = False
    i = 0
    
    while i < len(values_str):
        char = values_str[i]
        if char == \"'\" and (i == 0 or values_str[i-1] != '\\\\'):
            in_quotes = not in_quotes
        elif char == ',' and not in_quotes:
            values.append(current_val.strip())
            current_val = ''
            i += 1
            continue
        
        current_val += char
        i += 1
    
    if current_val:
        values.append(current_val.strip())
    
    if len(values) >= 12:
        # Clean up values
        for i in range(len(values)):
            val = values[i].strip()
            if val.startswith(\"'\") and val.endswith(\"'\"):
                val = val[1:-1]  # Remove quotes
            values[i] = val.replace(\"''\", \"'\")  # Unescape quotes
        
        # Create Elasticsearch document
        doc_id = values[0]
        doc = {
            'id': values[0],
            'name': values[1],
            'description': values[2] if values[2] != 'NULL' else '',
            'status': values[3] if values[3] != 'NULL' else 'active',
            'priority': int(values[4]) if values[4] != 'NULL' else 0,
            'isActive': values[5].lower() == 't' or values[5].lower() == 'true',
            'metadata': json.loads(values[6]) if values[6] != 'NULL' and values[6] != '{}' else {},
            'tags': values[7] if values[7] != 'NULL' else '',
            'score': float(values[8]) if values[8] != 'NULL' else 0,
            'largeText': values[9] if values[9] != 'NULL' else '',
            'createdAt': values[10] if values[10] != 'NULL' else '',
            'updatedAt': values[11] if values[11] != 'NULL' else ''
        }
        
        # Output bulk format
        print(json.dumps({'index': {'_index': index_name, '_id': doc_id}}))
        print(json.dumps(doc))
" > "$BULK_FILE"
    
    # Send to Elasticsearch
    response=$(curl -s -w "%{http_code}" -H "Authorization: ApiKey $ES_API_KEY" -H "Content-Type: application/x-ndjson" -X POST "$ES_URL/$INDEX_NAME/_bulk" --data-binary "@$BULK_FILE" 2>&1)
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Chunk $((chunk + 1)) uploaded successfully${NC}"
    else
        echo -e "${RED}❌ Chunk $((chunk + 1)) failed (HTTP $http_code)${NC}"
        echo "Response: ${response%???}"
    fi
    
    # Clean up chunk file
    rm -f "$BULK_FILE"
done

# Clean up INSERT file
rm -f "$INSERT_FILE"

# Step 5: Refresh and verify
echo -e "${YELLOW}🔄 Step 5: Refreshing index and verifying...${NC}"
curl -s -H "Authorization: ApiKey $ES_API_KEY" -X POST "$ES_URL/$INDEX_NAME/_refresh" >/dev/null 2>&1

# Get final count
FINAL_COUNT=$(curl -s -H "Authorization: ApiKey $ES_API_KEY" "$ES_URL/$INDEX_NAME/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")

echo ""
echo -e "${GREEN}🎉 Dump-based migration completed!${NC}"
echo "Source records: $INSERT_COUNT"
echo "Elasticsearch records: $FINAL_COUNT"

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up dump files...${NC}"
rm -f "$DUMP_FILE"
rm -rf "$DUMP_DIR"

if [ "$FINAL_COUNT" = "$INSERT_COUNT" ]; then
    echo -e "${GREEN}✅ Migration successful - all records transferred!${NC}"
else
    echo -e "${YELLOW}⚠️  Record count mismatch - please verify${NC}"
fi