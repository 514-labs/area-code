#!/bin/bash

# Production Elasticsearch Migration Script
# This script migrates data from a production Supabase database to Elasticsearch Cloud
# Similar to migrate-from-postgres-to-elasticsearch.sh but for production environments
#
# PREREQUISITES:
# - PostgreSQL client tools (psql) must be installed on your system
# - curl command must be available
# 
# Installation instructions:
# - macOS: brew install postgresql
# - Ubuntu/Debian: sudo apt-get install postgresql-client
# - Windows: Download from https://www.postgresql.org/download/windows/
# - Or use package manager: choco install postgresql (with Chocolatey)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: PostgreSQL client (psql) is not installed!${NC}"
    echo ""
    echo "Please install PostgreSQL client tools:"
    echo -e "${YELLOW}macOS:${NC} brew install postgresql"
    echo -e "${YELLOW}Ubuntu/Debian:${NC} sudo apt-get install postgresql-client"
    echo -e "${YELLOW}Windows:${NC} Download from https://www.postgresql.org/download/windows/"
    echo -e "${YELLOW}Windows (Chocolatey):${NC} choco install postgresql"
    echo ""
    exit 1
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ Error: curl is not installed!${NC}"
    echo ""
    echo "Please install curl:"
    echo -e "${YELLOW}macOS:${NC} curl is pre-installed"
    echo -e "${YELLOW}Ubuntu/Debian:${NC} sudo apt-get install curl"
    echo -e "${YELLOW}Windows:${NC} curl is available in Windows 10+"
    echo ""
    exit 1
fi

echo -e "${BLUE}🔍 Production Elasticsearch Migration Script${NC}"
echo "================================================"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Supabase IPv4 Compatibility${NC}"
echo "For Supabase databases, you MUST use the SESSION POOLER connection string, not the direct connection string."
echo ""
echo -e "${BLUE}How to get the correct connection string:${NC}"
echo "1. Go to your Supabase Dashboard"
echo "2. Navigate to Settings → Database"
echo "3. In the 'Connection Pooling' section, copy the 'Connection string'"
echo "4. The pooler string uses: pooler.supabase.com:6543 (not db.xxxxx.supabase.co:5432)"
echo ""
echo -e "${GREEN}Example pooler format:${NC}"
echo "postgresql://postgres:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres"
echo ""
echo -e "${BLUE}Elasticsearch Cloud Setup:${NC}"
echo "1. Go to your Elasticsearch Cloud Console"
echo "2. Get your deployment URL (e.g., https://my-deployment.es.us-central1.gcp.cloud.es.io:9243)"
echo "3. Create an API key with 'write' privileges"
echo ""
echo "================================================"

# Function to prompt user input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local varname="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        eval "$varname=\"\${input:-$default}\""
    else
        read -p "$prompt: " input
        eval "$varname=\"$input\""
    fi
}

# Function to prompt yes/no with default
prompt_yes_no() {
    local prompt="$1"
    local default="$2"
    local varname="$3"
    
    while true; do
        if [ "$default" = "y" ]; then
            read -p "$prompt [Y/n]: " yn
            yn=${yn:-y}
        else
            read -p "$prompt [y/N]: " yn
            yn=${yn:-n}
        fi
        
        case $yn in
            [Yy]* ) eval "$varname=true"; break;;
            [Nn]* ) eval "$varname=false"; break;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Function to test PostgreSQL connection
test_postgres_connection() {
    local conn_string="$1"
    
    echo -e "${YELLOW}Testing PostgreSQL connection...${NC}"
    
    if psql "$conn_string" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL connection successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ PostgreSQL connection failed!${NC}"
        return 1
    fi
}

# Function to test Elasticsearch connection
test_elasticsearch_connection() {
    local es_url="$1"
    local api_key="$2"
    
    echo -e "${YELLOW}Testing Elasticsearch connection...${NC}"
    local response
    local http_code
    
    # Test with verbose output for debugging
    response=$(curl -s -w "%{http_code}" -H "Authorization: ApiKey $api_key" -H "Content-Type: application/json" "$es_url/_cluster/health" 2>/dev/null)
    http_code="${response: -3}"
    response="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$status" = "green" ] || [ "$status" = "yellow" ]; then
            echo -e "${GREEN}✅ Elasticsearch connection successful (status: $status)!${NC}"
            return 0
        else
            echo -e "${RED}❌ Elasticsearch cluster is not healthy (status: $status)${NC}"
            echo -e "${RED}Full response: $response${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Elasticsearch connection failed!${NC}"
        echo -e "${RED}HTTP Code: $http_code${NC}"
        echo -e "${RED}Response: $response${NC}"
        
        # Common issues with Elasticsearch Cloud
        if [ "$http_code" = "401" ]; then
            echo -e "${YELLOW}💡 HTTP 401: Check your API key format. Should be base64 encoded.${NC}"
        elif [ "$http_code" = "404" ]; then
            echo -e "${YELLOW}💡 HTTP 404: Check your Elasticsearch URL. Should include the port (usually :9243).${NC}"
        fi
        return 1
    fi
}

# Function to check if required tables exist
check_postgres_tables() {
    local conn_string="$1"
    
    echo -e "${YELLOW}Checking PostgreSQL schema...${NC}"
    
    local tables_exist=$(psql "$conn_string" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_name IN ('foo', 'bar') 
        AND table_schema = 'public';
    " 2>/dev/null || echo "0")
    
    tables_exist=$(echo "$tables_exist" | tr -d ' ')
    
    if [ "$tables_exist" != "2" ]; then
        echo -e "${RED}❌ Required tables (foo, bar) not found in the database!${NC}"
        echo "Please ensure the database schema is properly set up."
        return 1
    else
        echo -e "${GREEN}✅ Required tables found!${NC}"
        return 0
    fi
}

# Function to create Elasticsearch indices
create_elasticsearch_indices() {
    local es_url="$1"
    local api_key="$2"
    
    echo -e "${YELLOW}Creating Elasticsearch indices...${NC}"
    
    # Foo index mapping
    local foo_mapping='{
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
          "tags": { "type": "keyword" },
          "score": { "type": "float" },
          "largeText": { "type": "text" },
          "createdAt": { "type": "date" },
          "updatedAt": { "type": "date" }
        }
      }
    }'
    
    # Bar index mapping
    local bar_mapping='{
      "mappings": {
        "properties": {
          "id": { "type": "keyword" },
          "fooId": { "type": "keyword" },
          "value": { "type": "integer" },
          "label": { "type": "keyword" },
          "notes": { "type": "text" },
          "isEnabled": { "type": "boolean" },
          "createdAt": { "type": "date" },
          "updatedAt": { "type": "date" }
        }
      }
    }'
    
    # Create foo index
    if curl -s -H "Authorization: ApiKey $api_key" -H "Content-Type: application/json" "$es_url/foos" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Index 'foos' already exists${NC}"
    else
        if curl -s -H "Authorization: ApiKey $api_key" -H "Content-Type: application/json" -X PUT "$es_url/foos" -d "$foo_mapping" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Created index 'foos'${NC}"
        else
            echo -e "${RED}❌ Failed to create index 'foos'${NC}"
            return 1
        fi
    fi
    
    # Create bar index
    if curl -s -H "Authorization: ApiKey $api_key" -H "Content-Type: application/json" "$es_url/bars" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Index 'bars' already exists${NC}"
    else
        if curl -s -H "Authorization: ApiKey $api_key" -H "Content-Type: application/json" -X PUT "$es_url/bars" -d "$bar_mapping" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Created index 'bars'${NC}"
        else
            echo -e "${RED}❌ Failed to create index 'bars'${NC}"
            return 1
        fi
    fi
    
    return 0
}

# Function to clear Elasticsearch indices
clear_elasticsearch_indices() {
    local es_url="$1"
    local api_key="$2"
    
    echo -e "${YELLOW}Clearing Elasticsearch indices...${NC}"
    
    # Delete foos index
    if curl -s -H "Authorization: ApiKey $api_key" "$es_url/foos" >/dev/null 2>&1; then
        if curl -s -H "Authorization: ApiKey $api_key" -X DELETE "$es_url/foos" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Deleted index 'foos'${NC}"
        else
            echo -e "${RED}❌ Failed to delete index 'foos'${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Index 'foos' does not exist${NC}"
    fi
    
    # Delete bars index
    if curl -s -H "Authorization: ApiKey $api_key" "$es_url/bars" >/dev/null 2>&1; then
        if curl -s -H "Authorization: ApiKey $api_key" -X DELETE "$es_url/bars" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Deleted index 'bars'${NC}"
        else
            echo -e "${RED}❌ Failed to delete index 'bars'${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Index 'bars' does not exist${NC}"
    fi
    
    return 0
}

# Function to bulk index documents to Elasticsearch (optimized)
bulk_index_to_elasticsearch() {
    local file="$1"
    local index_name="$2"
    local es_url="$3"
    local api_key="$4"
    local response
    local http_code
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Bulk file does not exist: $file${NC}" >&2
        return 1
    fi
    
    # Use optimized bulk API with --data-binary and capture HTTP code
    response=$(curl -s -w "%{http_code}" -H "Authorization: ApiKey $api_key" -H "Content-Type: application/x-ndjson" -X POST "$es_url/$index_name/_bulk" --data-binary "@$file" 2>&1)
    http_code="${response: -3}"
    response="${response%???}"
    
    if [ "$http_code" != "200" ]; then
        echo -e "${RED}❌ Bulk index failed - HTTP $http_code${NC}" >&2
        echo "   Error: $(echo "$response" | head -1)" >&2
        echo "   Sample bulk line: $(head -1 "$file")" >&2
        return 1
    fi
    
    # Check for errors in bulk response (critical optimization!)
    local errors=$(echo "$response" | grep -o '"errors":true' || true)
    if [ -n "$errors" ]; then
        echo -e "${RED}❌ Bulk indexing had errors for index: ${index_name}${NC}" >&2
        echo "   Response: $response" >&2
        return 1
    fi
    
    # Show brief success info
    local took=$(echo "$response" | grep -o '"took":[0-9]*' | cut -d':' -f2 || echo "?")
    echo -e "${GREEN}✅ Batch indexed in ${took}ms${NC}"
    
    return 0
}

# Function to refresh Elasticsearch index (makes data immediately searchable)
refresh_elasticsearch_index() {
    local index_name="$1"
    local es_url="$2"
    local api_key="$3"
    local response
    
    if ! response=$(curl -s -f -H "Authorization: ApiKey $api_key" -X POST "$es_url/$index_name/_refresh" 2>&1); then
        echo -e "${RED}❌ Failed to refresh Elasticsearch index: ${index_name}${NC}" >&2
        echo "   Error: $response" >&2
        return 1
    fi
    
    return 0
}

# Function to migrate data in batches (optimized like original)
migrate_data() {
    local table_name="$1"
    local index_name="$2"
    local pg_conn="$3"
    local es_url="$4"
    local api_key="$5"
    local batch_size="$6"
    
    echo -e "${BLUE}Migrating $table_name data to $index_name...${NC}"
    
    # Get total count
    local total_count=$(psql "$pg_conn" -t -c "SELECT COUNT(*) FROM $table_name;" | tr -d ' ')
    echo "Total $table_name records: $total_count"
    
    if [ "$total_count" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No $table_name records to migrate${NC}"
        return 0
    fi
    
    # Create shared temp directory (more efficient)
    local temp_dir="/tmp/es_migration_$$"
    mkdir -p "$temp_dir"
    
    local offset=0
    local batch_num=1
    local processed=0
    
    # Pre-build queries (optimization)
    local foo_query="
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
            to_char(created_at, 'YYYY-MM-DD') || 'T' || to_char(created_at, 'HH24:MI:SS') || '.000Z' as created_at,
            to_char(updated_at, 'YYYY-MM-DD') || 'T' || to_char(updated_at, 'HH24:MI:SS') || '.000Z' as updated_at
        FROM foo 
        ORDER BY created_at"
        
    local bar_query="
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
        ORDER BY created_at"
    
    while [ $processed -lt $total_count ]; do
        local current_batch_size=$(( (total_count - processed) < batch_size ? (total_count - processed) : batch_size ))
        
        echo -e "${BLUE}Processing $table_name batch $batch_num: $current_batch_size records (offset: $offset)${NC}"
        
        # Build query with LIMIT and OFFSET
        local query
        if [ "$table_name" = "foo" ]; then
            query="${foo_query} LIMIT $current_batch_size OFFSET $offset"
        else
            query="${bar_query} LIMIT $current_batch_size OFFSET $offset"
        fi
        
        # Export data to TSV
        local batch_file="$temp_dir/${table_name}_batch_${offset}.tsv"
        if ! psql "$pg_conn" -t -A -F$'\t' -c "$query" > "$batch_file"; then
            echo -e "${RED}❌ Failed to export batch data for $table_name${NC}"
            rm -rf "$temp_dir"
            return 1
        fi
        
        # Check if we got data
        if [ ! -s "$batch_file" ]; then
            echo -e "${YELLOW}⚠️  No more $table_name data to process${NC}"
            break
        fi
        
        # Convert to Elasticsearch bulk format (optimized AWK)
        local bulk_file="$temp_dir/${table_name}_batch_${offset}_bulk.ndjson"
        if [ "$table_name" = "foo" ]; then
            if ! awk -F'\t' -v index_name="$index_name" 'NR > 0 && NF >= 12 {
                # Handle escaping for all fields except metadata (field 7)
                for (i = 1; i <= NF; i++) {
                    if (i != 7) {  # Skip metadata field
                        gsub(/\\/, "\\\\", $i); 
                        gsub(/"/, "\\\"", $i);
                    }
                }
                
                # Convert PostgreSQL boolean to JSON boolean
                is_active_val = ($6 == "t") ? "true" : "false";
                metadata_val = ($7 == "" || $7 == "NULL") ? "{}" : $7;
                
                # Create Elasticsearch document
                doc = "{\"id\":\"" $1 "\",\"name\":\"" $2 "\",\"description\":\"" $3 "\",\"status\":\"" $4 "\",\"priority\":" $5 ",\"isActive\":" is_active_val ",\"metadata\":" metadata_val ",\"tags\":\"" $8 "\",\"score\":" $9 ",\"largeText\":\"" $10 "\",\"createdAt\":\"" $11 "\",\"updatedAt\":\"" $12 "\"}";
                
                # Output bulk format: action + document
                print "{\"index\":{\"_index\":\"" index_name "\",\"_id\":\"" $1 "\"}}";
                print doc;
            }' "$batch_file" > "$bulk_file"; then
                echo -e "${RED}❌ Failed to convert batch foo data to bulk format${NC}"
                rm -rf "$temp_dir"
                return 1
            fi
        else
            if ! awk -F'\t' -v index_name="$index_name" 'NR > 0 && NF >= 8 {
                gsub(/\\/, "\\\\"); gsub(/"/, "\\\"");
                
                # Convert PostgreSQL boolean to JSON boolean
                is_enabled_val = ($6 == "t") ? "true" : "false";
                
                # Create Elasticsearch document
                doc = "{\"id\":\"" $1 "\",\"fooId\":\"" $2 "\",\"value\":" $3 ",\"label\":\"" $4 "\",\"notes\":\"" $5 "\",\"isEnabled\":" is_enabled_val ",\"createdAt\":\"" $7 "\",\"updatedAt\":\"" $8 "\"}";
                
                # Output bulk format: action + document
                print "{\"index\":{\"_index\":\"" index_name "\",\"_id\":\"" $1 "\"}}";
                print doc;
            }' "$batch_file" > "$bulk_file"; then
                echo -e "${RED}❌ Failed to convert batch bar data to bulk format${NC}"
                rm -rf "$temp_dir"
                return 1
            fi
        fi
        
        # Index batch to Elasticsearch using optimized function
        if ! bulk_index_to_elasticsearch "$bulk_file" "$index_name" "$es_url" "$api_key"; then
            echo -e "${RED}❌ Failed to import batch data to Elasticsearch${NC}"
            rm -rf "$temp_dir"
            return 1
        fi
        
        echo -e "${GREEN}✅ Batch $batch_num indexed successfully${NC}"
        
        # Clean up batch files (keep temp dir)
        rm -f "$batch_file" "$bulk_file"
        
        processed=$((processed + current_batch_size))
        offset=$((offset + current_batch_size))
        batch_num=$((batch_num + 1))
    done
    
    # Clean up temp directory
    rm -rf "$temp_dir"
    
    echo -e "${GREEN}✅ $table_name migration completed!${NC}"
    return 0
}

# Check for environment file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/prod-migration.env"

if [ -f "$ENV_FILE" ]; then
    echo -e "${BLUE}📄 Loading configuration from prod-migration.env${NC}"
    source "$ENV_FILE"
    echo -e "${BLUE}Debug: BATCH_SIZE after source: '$BATCH_SIZE'${NC}"
else
    echo -e "${YELLOW}💡 Tip: Create prod-migration.env from prod-migration.env.example to skip prompts${NC}"
fi

# Main script execution
echo ""
echo -e "${BLUE}📡 Database Connections${NC}"

# Use env var or prompt for PostgreSQL connection string
if [ -n "$PG_CONNECTION_STRING" ]; then
    echo -e "${GREEN}Using PostgreSQL connection from environment${NC}"
    
    # Still test the connection
    if test_postgres_connection "$PG_CONNECTION_STRING"; then
        if ! check_postgres_tables "$PG_CONNECTION_STRING"; then
            echo "Database schema check failed. Please fix and try again."
            exit 1
        fi
    else
        echo "Environment PostgreSQL connection failed. Please check prod-migration.env."
        exit 1
    fi
else
    # Prompt for PostgreSQL connection string
    while true; do
        prompt_with_default "PostgreSQL connection string (Supabase Pooler)" "" "PG_CONNECTION_STRING"
        
        if [ -z "$PG_CONNECTION_STRING" ]; then
            echo -e "${RED}Connection string cannot be empty. Please try again.${NC}"
            continue
        fi
        
        # Test the connection
        if test_postgres_connection "$PG_CONNECTION_STRING"; then
            if check_postgres_tables "$PG_CONNECTION_STRING"; then
                break
            else
                echo "Please fix the schema or try a different database."
                continue
            fi
        else
            echo "Please check your connection string and try again."
            continue
        fi
    done
fi

echo ""

# Use env var or prompt for Elasticsearch URL
if [ -z "$ES_URL" ]; then
    prompt_with_default "Elasticsearch Cloud URL" "https://my-deployment.es.region.gcp.cloud.es.io:9243" "ES_URL"
else
    echo -e "${GREEN}Using Elasticsearch URL from environment${NC}"
fi

# Use env var or prompt for Elasticsearch API key
if [ -z "$ES_API_KEY" ]; then
    prompt_with_default "Elasticsearch API Key" "" "ES_API_KEY"
else
    echo -e "${GREEN}Using Elasticsearch API Key from environment${NC}"
fi

# Test Elasticsearch connection
echo ""
if ! test_elasticsearch_connection "$ES_URL" "$ES_API_KEY"; then
    echo "Please check your Elasticsearch credentials and try again."
    exit 1
fi

echo ""
echo -e "${BLUE}🗑️  Data Management${NC}"

# Use env var or prompt for data clearing
if [ -z "$CLEAR_DATA" ]; then
    prompt_yes_no "Do you want to clear existing Elasticsearch data?" "n" "CLEAR_DATA"
else
    echo -e "${GREEN}Clear data setting from environment: $CLEAR_DATA${NC}"
fi

echo ""
echo -e "${BLUE}⚙️  Migration Configuration${NC}"

# Use env var or prompt for batch size
if [ -z "$BATCH_SIZE" ]; then
    prompt_with_default "Batch size for migration" "5000" "BATCH_SIZE"
else
    echo -e "${GREEN}Batch size from environment: $BATCH_SIZE${NC}"
fi

echo ""
echo -e "${BLUE}📋 Configuration Summary${NC}"
echo "================================================"
echo "PostgreSQL: ${PG_CONNECTION_STRING}"
echo "Elasticsearch: ${ES_URL}"
echo "Clear existing data: $([ "$CLEAR_DATA" = true ] && echo "YES" || echo "NO")"
echo "Batch size: ${BATCH_SIZE}"
echo ""

# Final confirmation
prompt_yes_no "Do you want to proceed with migration?" "y" "PROCEED"

if [ "$PROCEED" != true ]; then
    echo -e "${YELLOW}Migration cancelled by user.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}🚀 Starting data migration...${NC}"
echo "================================================"

# Clear data if requested
if [ "$CLEAR_DATA" = true ]; then
    if ! clear_elasticsearch_indices "$ES_URL" "$ES_API_KEY"; then
        echo -e "${RED}❌ Failed to clear Elasticsearch indices!${NC}"
        exit 1
    fi
fi

# Create indices
if ! create_elasticsearch_indices "$ES_URL" "$ES_API_KEY"; then
    echo -e "${RED}❌ Failed to create Elasticsearch indices!${NC}"
    exit 1
fi

echo ""

# Migrate foo data
if ! migrate_data "foo" "foos" "$PG_CONNECTION_STRING" "$ES_URL" "$ES_API_KEY" "$BATCH_SIZE"; then
    echo -e "${RED}❌ Failed to migrate foo data!${NC}"
    exit 1
fi

echo ""

# Migrate bar data
if ! migrate_data "bar" "bars" "$PG_CONNECTION_STRING" "$ES_URL" "$ES_API_KEY" "$BATCH_SIZE"; then
    echo -e "${RED}❌ Failed to migrate bar data!${NC}"
    exit 1
fi

echo ""

# Refresh indices to make data immediately searchable (like original script)
echo -e "${YELLOW}Refreshing Elasticsearch indices...${NC}"
refresh_elasticsearch_index "foos" "$ES_URL" "$ES_API_KEY"
refresh_elasticsearch_index "bars" "$ES_URL" "$ES_API_KEY"

# Small delay to ensure data is fully indexed
sleep 3

echo ""
echo -e "${GREEN}🎉 Data migration completed!${NC}"
echo "================================================"

# Get final counts
echo -e "${YELLOW}📈 Final record counts in Elasticsearch:${NC}"

FOO_COUNT=$(curl -s -H "Authorization: ApiKey $ES_API_KEY" "$ES_URL/foos/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
BAR_COUNT=$(curl -s -H "Authorization: ApiKey $ES_API_KEY" "$ES_URL/bars/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")

echo "Foo records: ${FOO_COUNT}"
echo "Bar records: ${BAR_COUNT}"

echo ""
echo -e "${GREEN}✅ All done!${NC}"