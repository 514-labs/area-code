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
CHUNK_SIZE=${CHUNK_SIZE:-200000}  # Large chunks for efficient AWK processing
TABLE_NAME=${TABLE_NAME:-"foo"}
INDEX_NAME=${INDEX_NAME:-"foos"}

echo -e "${BLUE}🚀 Dump-based Elasticsearch Migration${NC}"
echo "Dump directory: $DUMP_DIR"
echo "Chunk size: $CHUNK_SIZE"
echo ""

# Create dump directory
mkdir -p "$DUMP_DIR"

# Step 1: Dump the data
echo -e "${YELLOW}📦 Step 1: Dumping data from Supabase...${NC}"
SQL_DUMP_FILE="$DUMP_DIR/${TABLE_NAME}_data.sql"
TSV_DUMP_FILE="$DUMP_DIR/${TABLE_NAME}_data.tsv"

# Check if we have existing dumps to reuse
DUMP_FILE=""
SKIP_DUMP=false

if [ -f "$TSV_DUMP_FILE" ]; then
    # Check if TSV dump is recent (less than 1 hour old)
    TSV_AGE=$(find "$TSV_DUMP_FILE" -mmin +60 2>/dev/null)
    if [ -z "$TSV_AGE" ]; then
        echo -e "${GREEN}♻️  Found recent TSV dump, using it directly${NC}"
        DUMP_FILE="$TSV_DUMP_FILE"
        SKIP_DUMP=true
    fi
elif [ -f "$SQL_DUMP_FILE" ]; then
    # Check if SQL dump exists (our 2.1GB file)
    SQL_AGE=$(find "$SQL_DUMP_FILE" -mmin +60 2>/dev/null)
    if [ -z "$SQL_AGE" ]; then
        echo -e "${GREEN}♻️  Found existing SQL dump (2.1GB), converting to TSV format...${NC}"
        
        # Convert SQL INSERT statements to TSV format locally (much faster than re-dumping)
        echo "Converting SQL dump to TSV for efficient processing..."
        
        # Convert SQL INSERT statements to TSV format using proper parsing
        grep "^INSERT INTO public.${TABLE_NAME}" "$SQL_DUMP_FILE" | \
        sed "s/INSERT INTO public\.${TABLE_NAME} ([^)]*) VALUES (//" | \
        sed 's/);$//' | \
        awk '
        {
            # Parse CSV-like values with proper quote handling
            result = "";
            field = "";
            in_quotes = 0;
            field_count = 0;
            
            for (i = 1; i <= length($0); i++) {
                char = substr($0, i, 1);
                next_char = substr($0, i+1, 1);
                
                if (char == "'"'"'" && !in_quotes) {
                    # Start of quoted field
                    in_quotes = 1;
                } else if (char == "'"'"'" && in_quotes && next_char != "'"'"'") {
                    # End of quoted field (not escaped quote)
                    in_quotes = 0;
                } else if (char == "'"'"'" && in_quotes && next_char == "'"'"'") {
                    # Escaped quote within field
                    field = field char;
                    i++; # Skip the next quote
                } else if (char == "," && !in_quotes && next_char == " ") {
                    # Field separator (, followed by space)
                    field_count++;
                    if (field == "NULL") field = "";
                    if (field == "true") field = "t";
                    if (field == "false") field = "f";
                    result = result field "\t";
                    field = "";
                    i++; # Skip the space after comma
                } else if (!(char == "," && !in_quotes)) {
                    # Regular character (not a field separator)
                    field = field char;
                }
            }
            
            # Handle the last field
            if (field == "NULL") field = "";
            if (field == "true") field = "t";
            if (field == "false") field = "f";
            result = result field;
            
            print result;
        }' > "$TSV_DUMP_FILE"
        
        if [ -f "$TSV_DUMP_FILE" ] && [ -s "$TSV_DUMP_FILE" ]; then
            echo -e "${GREEN}✅ SQL dump converted to TSV format${NC}"
            DUMP_FILE="$TSV_DUMP_FILE"
            SKIP_DUMP=true
        else
            echo -e "${RED}❌ Failed to convert SQL dump to TSV${NC}"
            exit 1
        fi
    fi
fi

if [ "$SKIP_DUMP" = true ]; then
    DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
    INSERT_COUNT=$(wc -l < "$DUMP_FILE")
    echo -e "${GREEN}📊 Using existing dump: $INSERT_COUNT records, $DUMP_SIZE${NC}"
    
    # Skip to processing - set up index
    if [ "$CLEAR_DATA" = "true" ]; then
        echo -e "${YELLOW}🗑️  Step 2: Clearing existing Elasticsearch data...${NC}"
        curl -s -H "Authorization: ApiKey $ES_API_KEY" -X DELETE "$ES_URL/$INDEX_NAME" >/dev/null 2>&1 || true
    fi
    
    echo -e "${YELLOW}🔧 Step 3: Creating Elasticsearch index...${NC}"
    if [ "$TABLE_NAME" = "foo" ]; then
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
    elif [ "$TABLE_NAME" = "bar" ]; then
        curl -s -H "Authorization: ApiKey $ES_API_KEY" -H "Content-Type: application/json" -X PUT "$ES_URL/$INDEX_NAME" -d '{
          "mappings": {
            "properties": {
              "id": { "type": "keyword" },
              "fooId": { "type": "keyword" },
              "value": { "type": "float" },
              "label": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
              "notes": { "type": "text" },
              "isEnabled": { "type": "boolean" },
              "createdAt": { "type": "date" },
              "updatedAt": { "type": "date" }
            }
          }
        }' >/dev/null 2>&1
    fi
fi

if [ "$SKIP_DUMP" != "true" ]; then
    echo -e "${YELLOW}⚠️  No existing dumps found, creating new TSV dump...${NC}"
    
    # Use COPY TO STDOUT for TSV format (much faster to parse than SQL INSERTs)
    echo "Using COPY TO STDOUT for efficient TSV export..."
    DUMP_FILE="$TSV_DUMP_FILE"
    
    if [ "$TABLE_NAME" = "foo" ]; then
        psql "$PG_CONNECTION_STRING" -c "
        COPY (
            SELECT 
                id::text as id,
                name,
                COALESCE(description, '') as description,
                COALESCE(status, 'active') as status,
                COALESCE(priority, 0) as priority,
                COALESCE(is_active, false) as is_active,
                COALESCE(metadata::text, '{}') as metadata,
                COALESCE(array_to_string(tags, ','), '') as tags,
                COALESCE(score, 0) as score,
                COALESCE(large_text, '') as large_text,
                to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.000\"Z\"') as created_at,
                to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.000\"Z\"') as updated_at
            FROM ${TABLE_NAME} 
            ORDER BY created_at
        ) TO STDOUT WITH (FORMAT CSV, DELIMITER E'\t', HEADER false, QUOTE E'\b')
        " > "$DUMP_FILE" 2>/dev/null
    elif [ "$TABLE_NAME" = "bar" ]; then
        psql "$PG_CONNECTION_STRING" -c "
        COPY (
            SELECT 
                id::text as id,
                foo_id::text as foo_id,
                COALESCE(value, 0) as value,
                COALESCE(label, '') as label,
                COALESCE(notes, '') as notes,
                COALESCE(is_enabled, false) as is_enabled,
                to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.000\"Z\"') as created_at,
                to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.000\"Z\"') as updated_at
            FROM ${TABLE_NAME} 
            ORDER BY created_at
        ) TO STDOUT WITH (FORMAT CSV, DELIMITER E'\t', HEADER false, QUOTE E'\b')
        " > "$DUMP_FILE" 2>/dev/null
    else
        echo -e "${RED}❌ Unsupported table: $TABLE_NAME${NC}"
        exit 1
    fi || {
        echo -e "${YELLOW}⚠️  pg_dump version mismatch detected, trying alternative approach...${NC}"
        
        # Fallback: Use chunked COPY approach to avoid timeouts
        echo "Using chunked COPY approach instead..."
        
        # First, get total count and create chunks on the database side
        TOTAL_COUNT=$(psql "$PG_CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM ${TABLE_NAME};" | tr -d ' ')
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
            if [ "$TABLE_NAME" = "foo" ]; then
                psql "$PG_CONNECTION_STRING" -c "
                COPY (
                    SELECT 
                        'INSERT INTO ${TABLE_NAME} VALUES (' ||
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
                    FROM ${TABLE_NAME} 
                    ORDER BY created_at
                    LIMIT $DB_CHUNK_SIZE OFFSET $offset
                ) TO STDOUT
                " >> "$DUMP_FILE"
            elif [ "$TABLE_NAME" = "bar" ]; then
                psql "$PG_CONNECTION_STRING" -c "
                COPY (
                    SELECT 
                        'INSERT INTO ${TABLE_NAME} VALUES (' ||
                        '''' || id || ''',' ||
                        '''' || foo_id || ''',' ||
                        COALESCE(value::text, '0') || ',' ||
                        COALESCE('''' || REPLACE(label, '''', '''''') || '''', 'NULL') || ',' ||
                        COALESCE('''' || REPLACE(notes, '''', '''''') || '''', 'NULL') || ',' ||
                        CASE WHEN COALESCE(is_enabled, false) THEN '''t''' ELSE '''f''' END || ',' ||
                        '''' || to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') || ''',' ||
                        '''' || to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') || '''' ||
                        ');'
                    FROM ${TABLE_NAME} 
                    ORDER BY created_at
                    LIMIT $DB_CHUNK_SIZE OFFSET $offset
                ) TO STDOUT
                " >> "$DUMP_FILE"
            fi || {
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
    INSERT_COUNT=$(wc -l < "$DUMP_FILE")
    echo -e "${GREEN}✅ Dump completed: $INSERT_COUNT records, $DUMP_SIZE${NC}"
fi

# Step 2-3: Clear data and create index (only if not already done in reuse logic)
if [ "$SKIP_DUMP" != "true" ]; then
    if [ "$CLEAR_DATA" = "true" ]; then
        echo -e "${YELLOW}🗑️  Step 2: Clearing existing Elasticsearch data...${NC}"
        curl -s -H "Authorization: ApiKey $ES_API_KEY" -X DELETE "$ES_URL/$INDEX_NAME" >/dev/null 2>&1 || true
    fi

    echo -e "${YELLOW}🔧 Step 3: Creating Elasticsearch index...${NC}"
    if [ "$TABLE_NAME" = "foo" ]; then
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
    elif [ "$TABLE_NAME" = "bar" ]; then
        curl -s -H "Authorization: ApiKey $ES_API_KEY" -H "Content-Type: application/json" -X PUT "$ES_URL/$INDEX_NAME" -d '{
          "mappings": {
            "properties": {
              "id": { "type": "keyword" },
              "fooId": { "type": "keyword" },
              "value": { "type": "float" },
              "label": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
              "notes": { "type": "text" },
              "isEnabled": { "type": "boolean" },
              "createdAt": { "type": "date" },
              "updatedAt": { "type": "date" }
            }
          }
        }' >/dev/null 2>&1
    fi
fi

# Step 4: Process TSV dump in chunks and send to Elasticsearch
echo -e "${YELLOW}⚡ Step 4: Processing TSV dump and uploading to Elasticsearch...${NC}"

# Use the INSERT_COUNT already calculated above
TOTAL_CHUNKS=$(( (INSERT_COUNT + CHUNK_SIZE - 1) / CHUNK_SIZE ))
echo "Processing $INSERT_COUNT records in $TOTAL_CHUNKS chunks of $CHUNK_SIZE"

for ((chunk=0; chunk<TOTAL_CHUNKS; chunk++)); do
    start_line=$((chunk * CHUNK_SIZE + 1))
    end_line=$(((chunk + 1) * CHUNK_SIZE))
    
    if [ $end_line -gt $INSERT_COUNT ]; then
        end_line=$INSERT_COUNT
    fi
    
    current_chunk_size=$((end_line - start_line + 1))
    progress=$((chunk * 100 / TOTAL_CHUNKS))
    
    echo -e "${BLUE}Processing chunk $((chunk + 1))/$TOTAL_CHUNKS (${progress}%) - lines $start_line-$end_line ($current_chunk_size records)${NC}"
    
    # Extract chunk from TSV file and convert to Elasticsearch bulk format
    BULK_FILE="$DUMP_DIR/bulk_chunk_$chunk.ndjson"
    
    # Process TSV format based on table type
    if [ "$TABLE_NAME" = "foo" ]; then
        sed -n "${start_line},${end_line}p" "$DUMP_FILE" | awk -F'\t' -v index_name="$INDEX_NAME" '

        NR > 0 && NF >= 12 {
            # Store metadata before escaping (field 7 is already valid JSON)
            metadata_json = $7;
            
            # Escape quotes and backslashes in text fields (except metadata)
            for (i = 1; i <= NF; i++) {
                if (i != 7) {  # Skip metadata field
                    gsub(/\\/, "\\\\", $i);
                    gsub(/"/, "\\\"", $i);
                }
            }
            
            # Convert PostgreSQL boolean to JSON boolean
            is_active_val = ($6 == "t") ? "true" : "false";
            
            # Create Elasticsearch document
            doc = "{\"id\":\"" $1 "\",\"name\":\"" $2 "\",\"description\":\"" $3 "\",\"status\":\"" $4 "\",\"priority\":" $5 ",\"isActive\":" is_active_val ",\"metadata\":" metadata_json ",\"tags\":\"" $8 "\",\"score\":" $9 ",\"largeText\":\"" $10 "\",\"createdAt\":\"" $11 "\",\"updatedAt\":\"" $12 "\"}";
            
            # Output bulk format: action + document
            print "{\"index\":{\"_index\":\"" index_name "\",\"_id\":\"" $1 "\"}}";
            print doc;
        }' > "$BULK_FILE"
    elif [ "$TABLE_NAME" = "bar" ]; then
        sed -n "${start_line},${end_line}p" "$DUMP_FILE" | awk -F'\t' -v index_name="$INDEX_NAME" '

        NR > 0 && NF >= 8 {
            # Escape quotes and backslashes in text fields
            for (i = 1; i <= NF; i++) {
                gsub(/\\/, "\\\\", $i);
                gsub(/"/, "\\\"", $i);
            }
            
            # Convert PostgreSQL boolean to JSON boolean
            is_enabled_val = ($6 == "t") ? "true" : "false";
            
            # Create Elasticsearch document for bar table
            doc = "{\"id\":\"" $1 "\",\"fooId\":\"" $2 "\",\"value\":" $3 ",\"label\":\"" $4 "\",\"notes\":\"" $5 "\",\"isEnabled\":" is_enabled_val ",\"createdAt\":\"" $7 "\",\"updatedAt\":\"" $8 "\"}";
            
            # Output bulk format: action + document
            print "{\"index\":{\"_index\":\"" index_name "\",\"_id\":\"" $1 "\"}}";
            print doc;
        }' > "$BULK_FILE"
    fi
    
    # Debug: check if bulk file was created and has content
    if [ ! -s "$BULK_FILE" ]; then
        echo -e "${RED}⚠️  Bulk file is empty for chunk $((chunk + 1))${NC}"
        echo "First few lines of source data for this chunk:"
        sed -n "${start_line},$((start_line + 2))p" "$DUMP_FILE"
        exit 1
    fi
    
    # Send to Elasticsearch
    response=$(curl -s -w "%{http_code}" -H "Authorization: ApiKey $ES_API_KEY" -H "Content-Type: application/x-ndjson" -X POST "$ES_URL/$INDEX_NAME/_bulk" --data-binary "@$BULK_FILE" 2>&1)
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Chunk $((chunk + 1)) uploaded successfully${NC}"
    else
        echo -e "${RED}❌ Chunk $((chunk + 1)) failed (HTTP $http_code)${NC}"
        echo "Response: ${response%???}"
        echo -e "${RED}💥 Migration failed - stopping here${NC}"
        exit 1
    fi
    
    # Clean up chunk file
    rm -f "$BULK_FILE"
done

# Step 5: Refresh and verify
echo -e "${YELLOW}🔄 Step 5: Refreshing index and verifying...${NC}"
curl -s -H "Authorization: ApiKey $ES_API_KEY" -X POST "$ES_URL/$INDEX_NAME/_refresh" >/dev/null 2>&1

# Get final count
FINAL_COUNT=$(curl -s -H "Authorization: ApiKey $ES_API_KEY" "$ES_URL/$INDEX_NAME/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")

echo ""
echo -e "${GREEN}🎉 Dump-based migration completed!${NC}"
echo "Source records: $INSERT_COUNT"
echo "Elasticsearch records: $FINAL_COUNT"

# Cleanup (but keep the dumps for potential reuse)
echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -f "$DUMP_DIR"/bulk_chunk_*.ndjson
echo -e "${GREEN}📁 Keeping dump files for potential reuse:${NC}"
echo "  - SQL dump: $SQL_DUMP_FILE"
echo "  - TSV dump: $TSV_DUMP_FILE"

if [ "$FINAL_COUNT" = "$INSERT_COUNT" ]; then
    echo -e "${GREEN}✅ Migration successful - all records transferred!${NC}"
else
    echo -e "${YELLOW}⚠️  Record count mismatch - please verify${NC}"
fi