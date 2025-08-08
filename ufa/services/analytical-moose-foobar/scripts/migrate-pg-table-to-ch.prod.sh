#!/bin/bash

# Production Migration Script - Supports env file or prompts for connection strings
# Uses the main migration script with user-provided connection information

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=============================================="
echo "    Production PostgreSQL to ClickHouse Migration"
echo -e "===============================================${NC}"
echo

# Check for environment file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/prod-migration.env"
USE_ENV_FILE=false

if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}📁 Found prod-migration.env file, loading connection details...${NC}"
    source "$ENV_FILE"
    
    # Validate connection details from env file
    if [ -n "${PG_CONNECTION_STRING:-}" ] && [ -n "${CH_DB_URL:-}" ] && [ -n "${CH_USERNAME:-}" ] && [ -n "${CH_PASSWORD:-}" ]; then
        USE_ENV_FILE=true
        echo -e "${GREEN}✅ Connection details loaded from env file${NC}"
        
        # Check if table names are also provided
        if [ -n "${SOURCE_TABLE:-}" ] && [ -n "${DEST_TABLE:-}" ]; then
            USE_ENV_TABLES=true
            echo -e "${GREEN}✅ Table names also loaded from env file${NC}"
            echo -e "${BLUE}   Source: $SOURCE_TABLE → Destination: $DEST_TABLE${NC}"
        else
            USE_ENV_TABLES=false
            echo -e "${YELLOW}⚠️  Table names not in env file, will prompt for them${NC}"
        fi
    else
        USE_ENV_FILE=false
        USE_ENV_TABLES=false
        echo -e "${YELLOW}⚠️  Connection details not found in env file, will prompt for them${NC}"
    fi
else
    USE_ENV_FILE=false
    USE_ENV_TABLES=false
    echo -e "${YELLOW}📝 No prod-migration.env file found, will prompt for connection details${NC}"
    echo -e "${BLUE}💡 Tip: Create $ENV_FILE to skip connection prompts (see prod-migration.env.example)${NC}"
fi

echo

# Function to prompt for input with validation
prompt_for_input() {
    local prompt="$1"
    local var_name="$2"
    local is_sensitive="${3:-false}"
    local input=""
    
    while [ -z "$input" ]; do
        if [ "$is_sensitive" = true ]; then
            read -s -p "$prompt: " input
            echo  # Add newline after hidden input
        else
            read -p "$prompt: " input
        fi
        
        if [ -z "$input" ]; then
            echo "❌ This field is required. Please try again."
        fi
    done
    
    # Set the variable using indirect reference
    declare -g "$var_name=$input"
}

# Function to parse connection string and extract components
parse_postgres_connection() {
    local conn_string="$1"
    
    # Parse PostgreSQL connection string format: postgresql://user:password@host:port/database
    if [[ $conn_string =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)$ ]]; then
        PG_USER="${BASH_REMATCH[1]}"
        PG_PASSWORD="${BASH_REMATCH[2]}"
        PG_HOST="${BASH_REMATCH[3]}"
        PG_PORT="${BASH_REMATCH[4]}"
        PG_DB="${BASH_REMATCH[5]}"
        echo "✅ PostgreSQL connection parsed successfully"
        echo "   Host: $PG_HOST:$PG_PORT"
        echo "   Database: $PG_DB"
        echo "   User: $PG_USER"
    else
        echo "❌ Invalid PostgreSQL connection string format."
        echo "   Expected format: postgresql://user:password@host:port/database"
        echo "   Example: postgresql://postgres:mypassword@localhost:5432/mydatabase"
        exit 1
    fi
}

# Function to parse ClickHouse URL and set variables for the migration script
parse_clickhouse_details() {
    local db_url="$1"
    local username="$2"
    local password="$3"
    
    # Validate URL format
    if [[ ! $db_url =~ ^https?://[^/]+$ ]]; then
        echo "❌ Invalid ClickHouse URL format."
        echo "   Expected format: http://host:port or https://host:port"
        echo "   Example: http://localhost:8123 or https://ch-cluster.example.com:8443"
        exit 1
    fi
    
    CH_USER="$username"
    CH_PASSWORD="$password"
    # For production, we'll use the full URL as CH_HOST for HTTP calls
    CH_HOST="$db_url"
    # Set default database for production
    CH_DB="default"
    
    echo "✅ ClickHouse connection parsed successfully"
    echo "   URL: $CH_HOST"
    echo "   User: $CH_USER"
}

# Prompt for connection details only if not loaded from env file
if [ "$USE_ENV_FILE" = false ]; then
    echo "Please provide the database connection information:"
    echo

    prompt_for_input "PostgreSQL connection string (postgresql://user:password@host:port/database)" "PG_CONN_STRING"
    parse_postgres_connection "$PG_CONN_STRING"

    echo
    echo "ClickHouse connection details:"
    prompt_for_input "ClickHouse database URL (http://host:port or https://host:port)" "CH_DB_URL"
    prompt_for_input "ClickHouse username" "CH_USERNAME"
    prompt_for_input "ClickHouse password" "CH_PASSWORD" true
    parse_clickhouse_details "$CH_DB_URL" "$CH_USERNAME" "$CH_PASSWORD"

    echo
else
    # Parse connection details from env file
    parse_postgres_connection "$PG_CONNECTION_STRING"
    echo
    parse_clickhouse_details "$CH_DB_URL" "$CH_USERNAME" "$CH_PASSWORD"
    echo
fi

# Get the source and destination table names (only if not from env file)
if [ "$USE_ENV_TABLES" = false ]; then
    prompt_for_input "Source PostgreSQL table name" "SOURCE_TABLE"
    prompt_for_input "Destination ClickHouse table name" "DEST_TABLE"
    echo
fi

# Ask for additional options (or use env vars if provided)
echo "Migration Options:"
echo

# Use CLEAR_DATA from env file if set, otherwise prompt
if [ -n "${CLEAR_DATA:-}" ]; then
    if [ "$CLEAR_DATA" = "true" ]; then
        echo "✅ Will clear existing data before migration (from env file)"
    else
        echo "✅ Will preserve existing data (from env file)"
    fi
else
    read -p "Clear existing data in ClickHouse before migration? (y/N): " CLEAR_CHOICE
    CLEAR_DATA=false
    if [[ $CLEAR_CHOICE =~ ^[Yy]$ ]]; then
        CLEAR_DATA=true
        echo "✅ Will clear existing data before migration"
    else
        echo "✅ Will preserve existing data"
    fi
fi

read -p "Keep temporary files after migration? (y/N): " KEEP_CHOICE
KEEP_TEMP=false
if [[ $KEEP_CHOICE =~ ^[Yy]$ ]]; then
    KEEP_TEMP=true
    echo "✅ Will keep temporary files"
else
    echo "✅ Will clean up temporary files"
fi

read -p "Limit number of records to migrate (leave empty for all): " COUNT_LIMIT
if [ -n "$COUNT_LIMIT" ]; then
    if ! [[ "$COUNT_LIMIT" =~ ^[0-9]+$ ]] || [ "$COUNT_LIMIT" -eq 0 ]; then
        echo "❌ Count limit must be a positive integer"
        exit 1
    fi
    echo "✅ Will migrate maximum $COUNT_LIMIT records"
else
    echo "✅ Will migrate all records"
fi

echo
echo "=============================================="
echo "    Migration Configuration Summary"
echo "=============================================="
echo "Source: $SOURCE_TABLE (PostgreSQL at $PG_HOST:$PG_PORT/$PG_DB)"
echo "Destination: $DEST_TABLE (ClickHouse at $CH_HOST/$CH_DB)"
echo "Clear existing data: $CLEAR_DATA"
echo "Keep temp files: $KEEP_TEMP"
if [ -n "$COUNT_LIMIT" ]; then
    echo "Record limit: $COUNT_LIMIT"
else
    echo "Record limit: All records"
fi
echo

read -p "Proceed with migration? (y/N): " PROCEED_CHOICE
if [[ ! $PROCEED_CHOICE =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled by user"
    exit 0
fi

echo
echo "🚀 Starting migration..."

# Export environment variables for the migration script
export PG_HOST PG_PORT PG_USER PG_PASSWORD PG_DB
export CH_HOST CH_PORT CH_USER CH_PASSWORD CH_DB
export PG_CONNECTION_STRING

# Build the command arguments for the migration script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_SCRIPT="$SCRIPT_DIR/migrate-pg-table-to-ch.sh"

if [ ! -f "$MIGRATION_SCRIPT" ]; then
    echo "❌ Migration script not found: $MIGRATION_SCRIPT"
    exit 1
fi

# Build command arguments
ARGS=(
    "--source-table" "$SOURCE_TABLE"
    "--dest-table" "$DEST_TABLE"
    "--production"
)

if [ "$CLEAR_DATA" = true ]; then
    ARGS+=("--clear-data")
fi

if [ "$KEEP_TEMP" = true ]; then
    ARGS+=("--keep-temp")
fi

if [ -n "$COUNT_LIMIT" ]; then
    ARGS+=("--count" "$COUNT_LIMIT")
fi

echo "Executing migration script with provided configuration..."
echo "Command: $MIGRATION_SCRIPT ${ARGS[*]}"
echo

# Execute the migration script
if "$MIGRATION_SCRIPT" "${ARGS[@]}"; then
    echo
    echo "=============================================="
    echo "🎉 Production Migration Completed Successfully!"
    echo "=============================================="
    echo "✅ Data migrated from '$SOURCE_TABLE' to '$DEST_TABLE'"
    echo "✅ Source: PostgreSQL at $PG_HOST:$PG_PORT/$PG_DB"
    echo "✅ Destination: ClickHouse at $CH_HOST/$CH_DB"
else
    echo
    echo "=============================================="
    echo "❌ Production Migration Failed!"
    echo "=============================================="
    echo "❌ Check the error messages above for details"
    echo "❌ You may need to:"
    echo "   - Verify connection strings are correct"
    echo "   - Ensure both databases are accessible"
    echo "   - Check that tables exist and have proper permissions"
    echo "   - Review any Docker container requirements"
    exit 1
fi
