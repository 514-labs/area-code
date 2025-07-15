#!/bin/bash -e

########################################################
# Development Data Seeding Script
########################################################

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root (parent of scripts directory)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to ensure all scripts are executable
ensure_scripts_executable() {
    # Make fix-permissions script executable first
    chmod +x "$SCRIPT_DIR/fix-permissions.sh" 2>/dev/null || true
    
    # Call the dedicated fix-permissions script
    "$SCRIPT_DIR/fix-permissions.sh"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script seeds sample data across all area-code services."
    echo "It handles data migration between transactional, analytical, and retrieval services."
    echo ""
    echo "Options:"
    echo "  --clear-data        Clear existing data before seeding (skip prompt)"
    echo "  --foo-rows=N        Number of foo records to create (skip prompt)"
    echo "  --bar-rows=N        Number of bar records to create (skip prompt)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                        # Interactive seeding"
    echo "  $0 --clear-data                          # Clear data and prompt for counts"
    echo "  $0 --foo-rows=500,000 --bar-rows=100,000  # Automated seeding"
    echo "  $0 --clear-data --foo-rows=1,000,000     # Clear data with specific counts"
    echo ""
    echo "Process:"
    echo "  1. Seeds transactional-base (PostgreSQL) with foo/bar data"
    echo "  2. Migrates data to analytical-base (ClickHouse) - Fast"
    echo "  3. Migrates data to retrieval-base (Elasticsearch) - Background (15-30 min)"
    echo ""
}

# Function to prompt user for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local response
    
    read -p "$prompt [$default]: " response
    echo "${response:-$default}"
}

# Function to prompt yes/no with default
prompt_yes_no() {
    local prompt="$1"
    local default="$2"
    local response
    
    while true; do
        if [ "$default" = "y" ]; then
            read -p "$prompt [Y/n]: " response
            response=${response:-y}
        else
            read -p "$prompt [y/N]: " response
            response=${response:-n}
        fi
        
        case "$response" in
            [Yy]|[Yy][Ee][Ss])
                return 0
                ;;
            [Nn]|[Nn][Oo])
                return 1
                ;;
            *)
                echo "Please answer yes or no."
                ;;
        esac
    done
}

# Function to check if a service is running using health checks
is_service_running() {
    local service="$1"
    
    # Use our health check script to verify service is actually responding
    if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
        # Run health check for specific service (suppress output, just check exit code)
        if "$SCRIPT_DIR/health-check.sh" "$service" >/dev/null 2>&1; then
            return 0  # Service is healthy
        else
            return 1  # Service is not responding
        fi
    else
        # Fallback to basic port checks if health script is missing
        case "$service" in
            "transactional-base")
                curl -s "http://localhost:8082" >/dev/null 2>&1
                ;;
            "sync-base")
                curl -s "http://localhost:4000/health" >/dev/null 2>&1
                ;;
            "analytical-base")
                curl -s "http://localhost:4100/health" >/dev/null 2>&1
                ;;
            "retrieval-base")
                curl -s "http://localhost:8083" >/dev/null 2>&1
                ;;
            "frontend")
                curl -s "http://localhost:5173" >/dev/null 2>&1
                ;;
            *)
                return 1
                ;;
        esac
    fi
}

# Function to seed data across all services
seed_all_data() {
    echo "🌱 Starting data seeding across all services..."
    echo ""
    
    # Check for command line flags
    CLEAR_DATA="false"
    FOO_ROWS=""
    BAR_ROWS=""
    
    # Parse arguments for flags
    for arg in "$@"; do
        case $arg in
            --clear-data)
                CLEAR_DATA="true"
                ;;
            --foo-rows=*)
                FOO_ROWS="${arg#*=}"
                ;;
            --bar-rows=*)
                BAR_ROWS="${arg#*=}"
                ;;
        esac
    done
    
    # Get parameters from user if not provided via flags
    if [ "$CLEAR_DATA" != "true" ]; then
        if prompt_yes_no "Clear existing data before seeding?" "n"; then
            CLEAR_DATA="true"
        fi
        echo ""
    fi
    
    if [ -z "$FOO_ROWS" ]; then
        FOO_ROWS=$(prompt_with_default "How many foo records to create?" "1,000,000")
    fi
    
    if [ -z "$BAR_ROWS" ]; then
        BAR_ROWS=$(prompt_with_default "How many bar records to create?" "100,000")
    fi
    
    echo ""
    echo "Configuration:"
    echo "  • Clear data: $CLEAR_DATA (drops tables in public schema, then migrates)"
    echo "  • Foo rows: $FOO_ROWS"
    echo "  • Bar rows: $BAR_ROWS"
    echo ""
    
    if ! prompt_yes_no "Proceed with seeding?" "y"; then
        echo "Seeding cancelled."
        return 1
    fi
    
    echo ""
    
    # Kill any existing ES migration processes BEFORE reset (they hold Docker networks)
    echo "🔍 Checking for existing Elasticsearch migration processes..."
    ES_MIGRATION_PIDS=$(ps aux | grep "migrate-from-postgres-to-elasticsearch" | grep -v grep | awk '{print $2}' || true)
    if [ -n "$ES_MIGRATION_PIDS" ]; then
        echo "🛑 Killing existing Elasticsearch migration processes..."
        echo "$ES_MIGRATION_PIDS" | xargs kill -9 2>/dev/null || true
        echo "✅ Existing migration processes killed"
    else
        echo "✅ No existing migration processes found"
    fi
    
    # Also kill any temp migration scripts
    TEMP_SCRIPT_PIDS=$(ps aux | grep "temp_es_migration.sh" | grep -v grep | awk '{print $2}' || true)
    if [ -n "$TEMP_SCRIPT_PIDS" ]; then
        echo "🛑 Killing existing temp migration scripts..."
        echo "$TEMP_SCRIPT_PIDS" | xargs kill -9 2>/dev/null || true
        echo "✅ Existing temp scripts killed"
    fi
    echo ""
    
    # 1. Seed transactional-base (both foo and bar data)
    echo "📊 Seeding transactional-base..."
    if is_service_running "transactional-base"; then
        echo "✅ transactional-base is running, proceeding with seeding..."
        
        cd "$PROJECT_ROOT/services/transactional-base" || {
            echo "❌ Failed to change to transactional-base directory"
            return 1
        }
        
        echo "🌱 Seeding both foo and bar data..."
        # Run the enhanced SQL script that seeds both foo and bar
        if [ -f "src/scripts/run-sql-seed.sh" ]; then
            chmod +x ./src/scripts/run-sql-seed.sh
            
            # Create a temporary script to seed both foo and bar with user-specified amounts
            cat > temp_seed_all.sh << EOF
#!/bin/bash
# Environment
if [ -f ".env" ]; then
    export \$(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

DB_CONTAINER=\$(docker ps --format "{{.Names}}" | grep "supabase-db")
DB_USER=\${DB_USER:-postgres}
DB_NAME=\${DB_NAME:-postgres}

# Pass variables from parent script
FOO_ROWS="$FOO_ROWS"
BAR_ROWS="$BAR_ROWS"
CLEAR_DATA="$CLEAR_DATA"

echo "🌱 Seeding both foo and bar data..."

# Clear data if requested using targeted table drop and migration
if [ "\$CLEAR_DATA" = "true" ]; then
    echo "🧹 Clearing existing data using targeted table drop approach..."
    
    # First get the database container
    DB_CONTAINER=\$(docker ps --format "{{.Names}}" | grep "supabase-db")
    if [ -z "\$DB_CONTAINER" ]; then
        echo "❌ Error: No PostgreSQL container found"
        exit 1
    fi
    echo "Using container: \$DB_CONTAINER"
    
    # Drop all tables in the public schema (but keep the schema itself)
    echo "🗑️ Dropping all tables in public schema..."
    
    # First check if there are any tables to drop
    TABLE_COUNT=\$(docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | tr -d ' ')
    
    if [ "\$TABLE_COUNT" -gt 0 ]; then
        echo "📋 Found \$TABLE_COUNT table(s) to drop..."
        
        # Create a temporary SQL file to avoid bash variable substitution issues
        cat > /tmp/drop_tables.sql << 'EOSQL'
DO $cleanup$
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    -- Drop all custom types in public schema  
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        RAISE NOTICE 'Dropped type: %', r.typname;
    END LOOP;
END$cleanup$;
EOSQL
        
        # Copy the SQL file to the container and execute it
        docker cp /tmp/drop_tables.sql "\$DB_CONTAINER:/tmp/drop_tables.sql"
        docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -f /tmp/drop_tables.sql
        
        # Clean up temp files
        rm -f /tmp/drop_tables.sql
        docker exec "\$DB_CONTAINER" rm -f /tmp/drop_tables.sql
    else
        echo "✅ No tables found in public schema, nothing to drop"
    fi
    
    if [ \$? -eq 0 ]; then
        echo "✅ All tables dropped successfully"
    else
        echo "❌ Failed to drop tables"
        exit 1
    fi
    
    # Run drizzle migrations to recreate schema
    echo "📋 Running drizzle migrations to recreate schema..."
    cd "$PROJECT_ROOT/services/transactional-base"
    if [ -f "src/scripts/migrate.ts" ]; then
        echo "🔄 Running drizzle migration..."
        npx tsx src/scripts/migrate.ts
        if [ \$? -eq 0 ]; then
            echo "✅ Database migrations completed successfully"
        else
            echo "❌ Database migration failed"
            exit 1
        fi
    else
        echo "❌ Migration script not found at src/scripts/migrate.ts"
        exit 1
    fi
    
    # Verify schema exists
    echo "🔍 Verifying database schema was recreated..."
    
    # Check if database connection is working
    if ! docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        echo "❌ Database connection failed"
        exit 1
    fi
    
    # Check for tables (more flexible - just check if we can query tables)
    TABLE_CHECK=\$(docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "\$TABLE_CHECK" -ge 0 ] 2>/dev/null; then
        echo "✅ Database schema is ready (found \$TABLE_CHECK table(s))"
    else
        echo "❌ Database schema verification failed"
        exit 1
    fi
fi

# Copy the SQL procedures
docker cp src/scripts/seed-transactional-base-rows.sql "\$DB_CONTAINER:/tmp/seed.sql"
docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -f /tmp/seed.sql

# Seed foo data with user-specified count
# Remove commas from numbers for SQL
FOO_COUNT_SQL=\$(echo "\$FOO_ROWS" | tr -d ',')
# Convert CLEAR_DATA to lowercase for SQL boolean
CLEAN_EXISTING_SQL=\$([ "\$CLEAR_DATA" = "true" ] && echo "true" || echo "false")
echo "📝 Seeding \$FOO_ROWS foo records (clean_existing=\$CLEAN_EXISTING_SQL)..."
docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -c "CALL seed_foo_data(\$FOO_COUNT_SQL, \$CLEAN_EXISTING_SQL);"

# Seed bar data with user-specified count
# Remove commas from numbers for SQL  
BAR_COUNT_SQL=\$(echo "\$BAR_ROWS" | tr -d ',')
echo "📊 Seeding \$BAR_ROWS bar records (clean_existing=\$CLEAN_EXISTING_SQL)..."
docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -c "CALL seed_bar_data(\$BAR_COUNT_SQL, \$CLEAN_EXISTING_SQL);"

# Cleanup
docker exec "\$DB_CONTAINER" rm -f /tmp/seed.sql
echo "✅ Both foo and bar data seeded successfully"
EOF
            chmod +x temp_seed_all.sh
            ./temp_seed_all.sh
            rm temp_seed_all.sh
        fi
        
        cd "$PROJECT_ROOT"
        echo "✅ transactional-base seeding completed"
    else
        echo "⚠️  transactional-base is not running, skipping seeding"
    fi
    echo ""
    
    # 2. Seed analytical-base (migrate data from transactional) - FAST
    echo "📈 Seeding analytical-base..."
    if is_service_running "analytical-base"; then
        echo "✅ analytical-base is running, proceeding with data migration..."
        
        cd "$PROJECT_ROOT/services/analytical-base" || {
            echo "❌ Failed to change to analytical-base directory"
            cd "$PROJECT_ROOT"
            return 1
        }
        
        if [ "$CLEAR_DATA" = "true" ]; then
            echo "🧹 Running migration with data clearing..."
            ./migrate-from-postgres.sh --clear-data
        else
            echo "📊 Running migration keeping existing data..."
            ./migrate-from-postgres.sh
        fi
        
        # Clean up temp migration files
        if [ -d "temp_migration" ]; then
            echo "🧹 Cleaning up temp migration files..."
            rm -rf temp_migration/*
            echo "✅ Temp files cleaned up"
        fi
        
        cd "$PROJECT_ROOT"
        echo "✅ analytical-base migration completed"
    else
        echo "⚠️  analytical-base is not running, skipping migration"
    fi
    echo ""
    
    # 3. Start retrieval-base migration in BACKGROUND (slow process)
    echo "🔍 Starting retrieval-base migration in background..."
    if is_service_running "retrieval-base"; then
        echo "✅ retrieval-base is running, starting background data migration..."
        
        # Create background migration script
        cat > "$PROJECT_ROOT/temp_es_migration.sh" << 'EOF'
#!/bin/bash
# Background Elasticsearch migration script
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT/services/retrieval-base" || exit 1

# Log file for background process
LOG_FILE="$PROJECT_ROOT/elasticsearch_migration.log"
echo "🔍 Elasticsearch migration started at $(date)" > "$LOG_FILE"
echo "Parameters: $*" >> "$LOG_FILE"
echo "===========================================" >> "$LOG_FILE"

# Run migration with passed parameters
if [ "$1" = "true" ]; then
    echo "🧹 Running migration with data clearing..." >> "$LOG_FILE"
    ./migrate-from-postgres-to-elasticsearch.sh --clear-data >> "$LOG_FILE" 2>&1
else
    echo "📊 Running migration keeping existing data..." >> "$LOG_FILE"
    ./migrate-from-postgres-to-elasticsearch.sh >> "$LOG_FILE" 2>&1
fi

# Clean up temp migration files
if [ -d "temp_migration" ]; then
    echo "🧹 Cleaning up temp migration files..." >> "$LOG_FILE"
    rm -rf temp_migration/* >> "$LOG_FILE" 2>&1
    echo "✅ Temp files cleaned up" >> "$LOG_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✅ Elasticsearch migration completed successfully at $(date)" >> "$LOG_FILE"
else
    echo "❌ Elasticsearch migration failed at $(date)" >> "$LOG_FILE"
fi

# Cleanup this temp script
rm -f "$PROJECT_ROOT/temp_es_migration.sh"
EOF
        
        chmod +x "$PROJECT_ROOT/temp_es_migration.sh"
        
        # Start migration in background
        nohup "$PROJECT_ROOT/temp_es_migration.sh" "$CLEAR_DATA" > /dev/null 2>&1 &
        ES_PID=$!
        
        echo "✅ Elasticsearch migration started in background (PID: $ES_PID)"
        echo ""
        echo "⚠️  IMPORTANT: Elasticsearch migration will take 15-30 minutes to complete!"
        echo "📋 Monitor progress in real-time:"
        echo "   tail -f $PROJECT_ROOT/elasticsearch_migration.log"
        echo ""
        echo "💡 The migration runs independently - you can:"
        echo "   • Close this terminal (migration continues)"
        echo "   • Use other services immediately (transactional-base, analytical-base)"
        echo "   • Check progress anytime with the tail command above"
        
    else
        echo "⚠️  retrieval-base is not running, skipping migration"
    fi
    echo ""
    
    echo "🎉 Data seeding completed! Core migrations finished, Elasticsearch running in background."
    echo ""
    echo "=========================================="
    echo "                SUMMARY"
    echo "=========================================="
    echo "✅ COMPLETED (ready to use):"
    echo "   • transactional-base: Seeded with $FOO_ROWS foo and $BAR_ROWS bar records"
    if [ "$CLEAR_DATA" = "true" ]; then
        echo "   • Data cleared before seeding (tables dropped, schema recreated)"
    fi
    echo "   • analytical-base: Migrated data to ClickHouse"
    echo ""
    echo "🔄 IN PROGRESS (background process):"
    echo "   • retrieval-base: Elasticsearch migration (15-30 minutes remaining)"
    echo ""
    echo "=========================================="
    echo "           BACKGROUND MIGRATION"
    echo "=========================================="
    echo "⏱️  Elasticsearch migration is running in the background and will take 15-30 minutes."
    echo "🔍 Monitor progress in real-time:"
    echo "   tail -f $PROJECT_ROOT/elasticsearch_migration.log"
    echo ""
    echo "✅ Check if still running:"
    echo "   ps aux | grep migrate-from-postgres-to-elasticsearch"
    echo ""
    echo "💡 You can safely:"
    echo "   • Close this terminal (background process continues)"
    echo "   • Start using transactional-base and analytical-base immediately"
    echo "   • Come back later to check Elasticsearch progress"
    echo ""
}

# Parse command line arguments
# Handle help flag
if [[ " $@ " =~ " --help " ]] || [[ " $@ " =~ " -h " ]] || [[ " $@ " =~ " help " ]]; then
    show_help
    exit 0
fi

# Execute the seeding
echo "=========================================="
echo "  Area Code Data Seeding"
echo "=========================================="
echo ""

# Ensure all scripts are executable first
ensure_scripts_executable
echo ""

echo "This will seed sample data across all services."
echo "The process involves multiple databases and may take time."
echo ""

seed_all_data "$@"

# Capture the exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Data seeding process completed successfully!"
else
    echo "❌ Data seeding failed with exit code: $EXIT_CODE"
fi

exit $EXIT_CODE 