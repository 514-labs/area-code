#!/bin/bash

# External PostgreSQL Seeding Script
# This script seeds an external PostgreSQL database with foo and bar data
# Similar to run-sql-seed.sh but for external/production databases
#
# PREREQUISITES:
# - PostgreSQL client tools (psql) must be installed on your system
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

echo -e "${BLUE}🔧 External Database Seeding Script${NC}"
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

# Function to test database connection
test_connection() {
    local conn_string="$1"
    
    echo -e "${YELLOW}Testing database connection...${NC}"
    
    if psql "$conn_string" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ Database connection failed!${NC}"
        return 1
    fi
}

# Function to check if tables exist
check_tables() {
    local conn_string="$1"
    
    echo -e "${YELLOW}Checking database schema...${NC}"
    
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

# Prompt for database connection string
echo -e "${BLUE}📡 Database Connection${NC}"
echo "Please provide the PostgreSQL connection string for the external database."
echo "Format: postgresql://username:password@host:port/database"
echo ""

while true; do
    prompt_with_default "Connection string" "" "CONNECTION_STRING"
    
    if [ -z "$CONNECTION_STRING" ]; then
        echo -e "${RED}Connection string cannot be empty. Please try again.${NC}"
        continue
    fi
    
    # Test the connection
    if test_connection "$CONNECTION_STRING"; then
        if check_tables "$CONNECTION_STRING"; then
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

echo ""
echo -e "${BLUE}🗑️  Data Management${NC}"

# Prompt for data wiping
prompt_yes_no "Do you want to wipe existing data?" "n" "WIPE_DATA"

echo ""
echo -e "${BLUE}📊 Seeding Configuration${NC}"

# Prompt for number of foo records
prompt_with_default "Number of foo records to create" "50000" "FOO_COUNT"

# Validate foo count is a number
if ! [[ "$FOO_COUNT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}Error: Foo count must be a number${NC}"
    exit 1
fi

# Prompt for number of bar records
prompt_with_default "Number of bar records to create" "10000" "BAR_COUNT"

# Validate bar count is a number
if ! [[ "$BAR_COUNT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}Error: Bar count must be a number${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Configuration Summary${NC}"
echo "================================================"
echo "Database: ${CONNECTION_STRING}"
echo "Wipe existing data: $([ "$WIPE_DATA" = true ] && echo "YES" || echo "NO")"
echo "Foo records: ${FOO_COUNT}"
echo "Bar records: ${BAR_COUNT}"
echo ""

# Final confirmation
prompt_yes_no "Do you want to proceed with seeding?" "y" "PROCEED"

if [ "$PROCEED" != true ]; then
    echo -e "${YELLOW}Seeding cancelled by user.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}🚀 Starting database seeding...${NC}"
echo "================================================"

# Check if seed script exists
SEED_SCRIPT="database/scripts/seed-transactional-database.sql"
if [ ! -f "$SEED_SCRIPT" ]; then
    echo -e "${RED}❌ Seed script not found: $SEED_SCRIPT${NC}"
    exit 1
fi

echo -e "${YELLOW}📄 Applying SQL seed procedures...${NC}"

# Apply the seed SQL script
if ! psql "$CONNECTION_STRING" -f "$SEED_SCRIPT" >/dev/null 2>&1; then
    echo -e "${RED}❌ Failed to apply seed SQL procedures!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SQL procedures installed successfully!${NC}"

# Calculate batch sizes (like the original script does with 50k at a time)
BATCH_SIZE=50000

echo ""
echo -e "${YELLOW}🏭 Seeding foo data (${FOO_COUNT} records)...${NC}"

# Seed foo data in batches
remaining_foo=$FOO_COUNT
batch_num=1

while [ $remaining_foo -gt 0 ]; do
    current_batch=$(( remaining_foo > BATCH_SIZE ? BATCH_SIZE : remaining_foo ))
    
    echo -e "${BLUE}Processing foo batch $batch_num: $current_batch records${NC}"
    
    if ! psql "$CONNECTION_STRING" -c "CALL seed_foo_data($current_batch, $([ "$WIPE_DATA" = true ] && [ $batch_num -eq 1 ] && echo "true" || echo "false"));" >/dev/null 2>&1; then
        echo -e "${RED}❌ Failed to seed foo batch $batch_num!${NC}"
        exit 1
    fi
    
    remaining_foo=$((remaining_foo - current_batch))
    batch_num=$((batch_num + 1))
    
    # Only wipe data on first batch
    WIPE_DATA=false
done

echo -e "${GREEN}✅ Foo data seeded successfully!${NC}"

echo ""
echo -e "${YELLOW}📊 Seeding bar data (${BAR_COUNT} records)...${NC}"

# Seed bar data in batches
remaining_bar=$BAR_COUNT
batch_num=1

while [ $remaining_bar -gt 0 ]; do
    current_batch=$(( remaining_bar > BATCH_SIZE ? BATCH_SIZE : remaining_bar ))
    
    echo -e "${BLUE}Processing bar batch $batch_num: $current_batch records${NC}"
    
    if ! psql "$CONNECTION_STRING" -c "CALL seed_bar_data($current_batch, false);" >/dev/null 2>&1; then
        echo -e "${RED}❌ Failed to seed bar batch $batch_num!${NC}"
        exit 1
    fi
    
    remaining_bar=$((remaining_bar - current_batch))
    batch_num=$((batch_num + 1))
done

echo -e "${GREEN}✅ Bar data seeded successfully!${NC}"

echo ""
echo -e "${GREEN}🎉 Database seeding completed!${NC}"
echo "================================================"

# Get final record counts
echo -e "${YELLOW}📈 Final record counts:${NC}"

FOO_FINAL=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM foo;" 2>/dev/null | tr -d ' ')
BAR_FINAL=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM bar;" 2>/dev/null | tr -d ' ')

echo "Foo records: ${FOO_FINAL}"
echo "Bar records: ${BAR_FINAL}"

echo ""
echo -e "${GREEN}✅ All done!${NC}"