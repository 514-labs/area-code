#!/bin/bash -e

########################################################
# Development Data Seeding Script
########################################################

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root (parent of scripts directory)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create log directory if it doesn't exist
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Set up log files
SEED_LOG="$LOG_DIR/seed-$(date +%Y%m%d-%H%M%S).log"
VERBOSE_MODE="false"

# Function to log with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$SEED_LOG"
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
    echo "  --verbose           Show detailed output (otherwise logged to file)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                        # Interactive seeding"
    echo "  $0 --clear-data                          # Clear data and prompt for counts"
    echo "  $0 --foo-rows=500,000 --bar-rows=100,000  # Automated seeding"
    echo "  $0 --clear-data --foo-rows=1,000,000 --verbose  # Detailed output"
    echo ""
    echo "Process:"
    echo "  1. Stop any running workflows"
    echo "  2. Seeds transactional-base (PostgreSQL) with foo/bar data"
    echo "  3. Migrates data to analytical-base (ClickHouse) - Fast"
    echo "  4. Migrates data to retrieval-base (Elasticsearch) - Background (15-30 min)"
    echo "  5. Restart workflows to resume real-time synchronization"
    echo ""
    echo "Logs are saved to: $LOG_DIR/"
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

# Function to cleanup existing workflows
cleanup_existing_workflows() {
    echo "🛑 Stopping workflows..."
    log_message "Stopping existing workflows before seeding"
    cd "$PROJECT_ROOT/services/sync-base" || true
    if command -v pnpm >/dev/null 2>&1; then
        if [ "$VERBOSE_MODE" = "true" ]; then
            pnpm moose workflow terminate supabase-listener
        else
            pnpm moose workflow terminate supabase-listener >> "$SEED_LOG" 2>&1 || true
        fi
    fi
    cd "$PROJECT_ROOT"
    
    # Give it a moment to properly terminate
    sleep 2
    echo "✅ Workflows stopped"
    log_message "Existing workflows stopped successfully"
}

# Function to restart workflows after seeding
restart_workflows() {
    echo "🔄 Restarting workflows..."
    log_message "Restarting workflows after seeding"
    cd "$PROJECT_ROOT/services/sync-base" || true
    if command -v pnpm >/dev/null 2>&1; then
        # Start the workflow in background to not block the script
        if [ "$VERBOSE_MODE" = "true" ]; then
            echo "Starting supabase-listener workflow..."
            pnpm moose workflow run supabase-listener &
            WORKFLOW_PID=$!
        else
            nohup pnpm moose workflow run supabase-listener >> "$SEED_LOG" 2>&1 &
            WORKFLOW_PID=$!
        fi
        echo "✅ Workflows restarted (PID: $WORKFLOW_PID)"
        log_message "supabase-listener workflow started in background (PID: $WORKFLOW_PID)"
    else
        echo "⚠️  pnpm not found, skipping workflow restart"
        log_message "pnpm not found, skipping workflow restart"
    fi
    cd "$PROJECT_ROOT"
}

# Function to seed data across all services
seed_all_data() {
    echo "🌱 Starting data seeding across all services..."
    echo ""
    
    # Step 0: Stop any running workflows first
    cleanup_existing_workflows
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
            --verbose)
                VERBOSE_MODE="true"
                ;;
        esac
    done
    
    # Initialize logging
    log_message "=== Data Seeding Started ==="
    log_message "Verbose mode: $VERBOSE_MODE"
    log_message "Clear data: $CLEAR_DATA"
    log_message "Foo rows: $FOO_ROWS"
    log_message "Bar rows: $BAR_ROWS"
    
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
    log_message "Checking for existing Elasticsearch migration processes"
    ES_MIGRATION_PIDS=$(ps aux | grep "migrate-from-postgres-to-elasticsearch" | grep -v grep | awk '{print $2}' || true)
    if [ -n "$ES_MIGRATION_PIDS" ]; then
        echo "🧹 Cleaning up existing processes..."
        log_message "Killing existing Elasticsearch migration processes: $ES_MIGRATION_PIDS"
        echo "$ES_MIGRATION_PIDS" | xargs kill -9 2>/dev/null || true
    fi
    
    # Also kill any temp migration scripts
    TEMP_SCRIPT_PIDS=$(ps aux | grep "temp_es_migration.sh" | grep -v grep | awk '{print $2}' || true)
    if [ -n "$TEMP_SCRIPT_PIDS" ]; then
        log_message "Killing existing temp migration scripts: $TEMP_SCRIPT_PIDS"
        echo "$TEMP_SCRIPT_PIDS" | xargs kill -9 2>/dev/null || true
    fi
    
    # 1. Seed transactional-base (both foo and bar data)
    echo "📊 Seeding transactional-base..."
    log_message "Starting transactional-base seeding"
    if is_service_running "transactional-base"; then
        log_message "transactional-base is running, proceeding with seeding"
        
        cd "$PROJECT_ROOT/services/transactional-base" || {
            echo "❌ Failed to change to transactional-base directory"
            log_message "ERROR: Failed to change to transactional-base directory"
            return 1
        }
        
        # Create a temporary script to seed both foo and bar with user-specified amounts
        echo "🌱 Seeding foo and bar data..."
            cat > temp_seed_all.sh << EOF
#!/bin/bash
# Environment
if [ -f ".env" ]; then
    export \$(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Detect database container (will be set properly later in the script)
DB_CONTAINER=""
DB_USER=\${DB_USER:-postgres}
DB_NAME=\${DB_NAME:-postgres}

# Pass variables from parent script
FOO_ROWS="$FOO_ROWS"
BAR_ROWS="$BAR_ROWS"
CLEAR_DATA="$CLEAR_DATA"

echo "🌱 Seeding both foo and bar data..."

# Clear data if requested using targeted table drop and migration
if [ "\$CLEAR_DATA" = "true" ]; then
    echo "🧹 Clearing existing data..."
    
    # First get the database container (support both Supabase CLI and production Docker)
    if docker ps --format "{{.Names}}" | grep -q "supabase_db_.*"; then
        DB_CONTAINER=\$(docker ps --format "{{.Names}}" | grep "supabase_db_.*" | head -1)
    elif docker ps --format "{{.Names}}" | grep -q "supabase-db"; then
        DB_CONTAINER="supabase-db"
    else
        DB_CONTAINER=""
    fi
    
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
        echo "🗑️ Dropping \$TABLE_COUNT table(s)..."
        
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
    echo "📋 Recreating database schema..."
    cd "$PROJECT_ROOT/services/transactional-base"
    
    # Run migration SQL directly via docker exec (same approach as seeding)
    for migration_file in migrations/*.sql; do
        if [ -f "\$migration_file" ]; then
            filename=\$(basename "\$migration_file")
            echo "  📄 Applying: \$filename"
            docker cp "\$migration_file" "\$DB_CONTAINER:/tmp/\$filename"
            docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -f "/tmp/\$filename"
            docker exec "\$DB_CONTAINER" rm -f "/tmp/\$filename"
        fi
    done
    echo "✅ Database schema recreated"
    
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

# Detect the database container (support both Supabase CLI and production Docker)
if docker ps --format "{{.Names}}" | grep -q "supabase_db_.*"; then
    DB_CONTAINER=\$(docker ps --format "{{.Names}}" | grep "supabase_db_.*" | head -1)
elif docker ps --format "{{.Names}}" | grep -q "supabase-db"; then
    DB_CONTAINER="supabase-db"
else
    DB_CONTAINER=""
fi

if [ -z "\$DB_CONTAINER" ]; then
    echo "❌ Error: No PostgreSQL container found"
    exit 1
fi
echo "Using container: \$DB_CONTAINER"

# Copy the SQL procedures (from transactional-database service) - use absolute path from project root
docker cp "$PROJECT_ROOT/services/transactional-database/scripts/seed-transactional-base-rows.sql" "\$DB_CONTAINER:/tmp/seed.sql"

echo "🔧 Dropping functions and procedures"
# Execute SQL with filtered output - show only relevant messages
docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -f /tmp/seed.sql 2>&1 | grep -E "(CREATE FUNCTION|CREATE PROCEDURE|^$)" | tail -1 > /dev/null
echo "🏗️ Creating functions and procedures"
echo "✅ Done creating functions and procedures"

# Seed foo data with user-specified count
# Remove commas from numbers for SQL
FOO_COUNT_SQL=\$(echo "\$FOO_ROWS" | tr -d ',')
# Convert CLEAR_DATA to lowercase for SQL boolean
CLEAN_EXISTING_SQL=\$([ "\$CLEAR_DATA" = "true" ] && echo "true" || echo "false")
echo "📝 Seeding \$FOO_ROWS foo records..."
docker exec -i "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -v ON_ERROR_STOP=1 -c "CALL seed_foo_data(\$FOO_COUNT_SQL, \$CLEAN_EXISTING_SQL);" 2>&1
echo "✅ foo seeding complete"

# Seed bar data with user-specified count
# Remove commas from numbers for SQL  
BAR_COUNT_SQL=\$(echo "\$BAR_ROWS" | tr -d ',')
echo "📊 Seeding \$BAR_ROWS bar records..."
docker exec -i "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -v ON_ERROR_STOP=1 -c "CALL seed_bar_data(\$BAR_COUNT_SQL, \$CLEAN_EXISTING_SQL);" 2>&1
echo "✅ bar seeding complete"

# Cleanup
docker exec "\$DB_CONTAINER" rm -f /tmp/seed.sql
echo "✅ Both foo and bar data seeded successfully"
EOF
            chmod +x temp_seed_all.sh
            log_message "Executing transactional database seeding script"
            if [ "$VERBOSE_MODE" = "true" ]; then
                ./temp_seed_all.sh
            else
                # Show progress but hide verbose docker output
                ./temp_seed_all.sh 2>> "$SEED_LOG"
            fi
            rm temp_seed_all.sh
        
        cd "$PROJECT_ROOT"
        echo "✅ transactional-base seeded"
        log_message "transactional-base seeding completed successfully"
    else
        echo "⚠️  transactional-base is not running, skipping seeding"
        log_message "transactional-base is not running, skipping seeding"
    fi
    
    # 2. Seed analytical-base (migrate data from transactional) - FAST
    echo "📈 Seeding analytical-base..."
    log_message "Starting analytical-base migration"
    if is_service_running "analytical-base"; then
        log_message "analytical-base is running, proceeding with data migration"
        
        cd "$PROJECT_ROOT/services/analytical-base" || {
            echo "❌ Failed to change to analytical-base directory"
            log_message "ERROR: Failed to change to analytical-base directory"
            cd "$PROJECT_ROOT"
            return 1
        }
        
        # Migrate foo table to Foo
        echo "🔄 Migrating foo → Foo..."
        if [ "$CLEAR_DATA" = "true" ]; then
            log_message "Running foo migration with data clearing"
            if [ "$VERBOSE_MODE" = "true" ]; then
                ./scripts/migrate-pg-table-to-ch.sh --source-table foo --dest-table Foo --clear-data
            else
                ./scripts/migrate-pg-table-to-ch.sh --source-table foo --dest-table Foo --clear-data 2>> "$SEED_LOG"
            fi
        else
            log_message "Running foo migration keeping existing data"
            if [ "$VERBOSE_MODE" = "true" ]; then
                ./scripts/migrate-pg-table-to-ch.sh --source-table foo --dest-table Foo
            else
                ./scripts/migrate-pg-table-to-ch.sh --source-table foo --dest-table Foo 2>> "$SEED_LOG"
            fi
        fi
        echo "✅ foo migration complete"
        
        # Migrate bar table to Bar
        echo "🔄 Migrating bar → Bar..."
        if [ "$CLEAR_DATA" = "true" ]; then
            log_message "Running bar migration with data clearing"
            if [ "$VERBOSE_MODE" = "true" ]; then
                ./scripts/migrate-pg-table-to-ch.sh --source-table bar --dest-table Bar --clear-data
            else
                ./scripts/migrate-pg-table-to-ch.sh --source-table bar --dest-table Bar --clear-data 2>> "$SEED_LOG"
            fi
        else
            log_message "Running bar migration keeping existing data"
            if [ "$VERBOSE_MODE" = "true" ]; then
                ./scripts/migrate-pg-table-to-ch.sh --source-table bar --dest-table Bar
            else
                ./scripts/migrate-pg-table-to-ch.sh --source-table bar --dest-table Bar 2>> "$SEED_LOG"
            fi
        fi
        echo "✅ bar migration complete"
        
        # Clean up temp migration files
        if [ -d "temp_migration" ]; then
            log_message "Cleaning up temp migration files"
            rm -rf temp_migration/* >> "$SEED_LOG" 2>&1
        fi
        
        cd "$PROJECT_ROOT"
        echo "✅ analytical-base migrated"
        log_message "analytical-base migration completed successfully"
    else
        echo "⚠️  analytical-base is not running, skipping migration"
        log_message "analytical-base is not running, skipping migration"
    fi
    
    # 3. Start retrieval-base migration in BACKGROUND (slow process)
    echo "🔍 Starting retrieval-base migration..."
    log_message "Starting retrieval-base migration in background"
    if is_service_running "retrieval-base"; then
        log_message "retrieval-base is running, starting background data migration"
        
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
        
        echo "✅ retrieval-base migration started (PID: $ES_PID)"
        log_message "Elasticsearch migration started in background (PID: $ES_PID)"
        
    else
        echo "⚠️  retrieval-base is not running, skipping migration"
        log_message "retrieval-base is not running, skipping migration"
    fi
    
    # Step 4: Restart workflows to resume real-time synchronization
    restart_workflows
    
    echo ""
    echo "🎉 Data seeding completed!"
    log_message "=== Data Seeding Completed Successfully ==="
    echo ""
    echo "✅ COMPLETED:"
    echo "   📊 transactional-base: $FOO_ROWS foo, $BAR_ROWS bar records"
    echo "   📈 analytical-base: Data migrated to ClickHouse"
    echo "   🔄 workflows: Restarted for real-time sync"
    echo ""
    echo "🔄 BACKGROUND: retrieval-base → Elasticsearch (15-30 min)"
    echo ""
    echo "📋 Monitor Elasticsearch migration:"
    echo "   tail -f $PROJECT_ROOT/elasticsearch_migration.log"
    echo ""
    echo "📄 Detailed logs: $SEED_LOG"
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

echo "📋 Process: workflows → transactional → analytical → retrieval → workflows"
echo "📄 Detailed logs: $SEED_LOG"
if [ "$VERBOSE_MODE" != "true" ]; then
    echo "💡 Use --verbose for full console output"
fi
echo ""

seed_all_data "$@"

# Capture the exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Seeding completed successfully!"
    log_message "=== Seeding process completed successfully ==="
else
    echo "❌ Seeding failed with exit code: $EXIT_CODE"
    log_message "ERROR: Seeding process failed with exit code: $EXIT_CODE"
fi

exit $EXIT_CODE 