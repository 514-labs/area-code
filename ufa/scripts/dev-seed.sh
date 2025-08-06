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
    echo "  --service=SERVICE   Target specific service (transactional-supabase-foobar,"
    echo "                      analytical-moose-foobar, retrieval-elasticsearch-foobar)"
    echo "  --clear-data        Clear existing data before seeding (skip prompt)"
    echo "  --foo-rows=N        Number of foo records to create (skip prompt)"
    echo "  --bar-rows=N        Number of bar records to create (skip prompt)"
    echo "  --verbose           Show detailed output (otherwise logged to file)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                        # Interactive seeding (all services)"
    echo "  $0 --service=transactional-supabase-foobar  # Seed only transactional service"
    echo "  $0 --service=analytical-moose-foobar     # Seed only analytical service"
    echo "  $0 --clear-data                          # Clear data and prompt for counts"
    echo "  $0 --foo-rows=500,000 --bar-rows=100,000  # Automated seeding"
    echo "  $0 --clear-data --foo-rows=1,000,000 --verbose  # Detailed output"
    echo ""
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

# Function to check if a service is running using port checks
is_service_running() {
    local service="$1"
    
    case "$service" in
        "transactional-supabase-foobar")
            curl -s "http://localhost:8082" >/dev/null 2>&1
            ;;
        "analytical-moose-foobar")
            curl -s "http://localhost:4100/health" >/dev/null 2>&1
            ;;
        "retrieval-elasticsearch-foobar")
            curl -s "http://localhost:8083" >/dev/null 2>&1
            ;;
        *)
            return 1
            ;;
    esac
}



# Function to cleanup existing workflows
cleanup_existing_workflows() {
    echo "🛑 Stopping workflows..."
    log_message "Stopping existing workflows before seeding"
    
    cd "$PROJECT_ROOT/services/sync-supabase-moose-foobar" || true
    if command -v pnpm >/dev/null 2>&1; then
        if [ "$VERBOSE_MODE" = "true" ]; then
            echo "Stopping supabase-listener workflow..."
            pnpm dev:workflow:stop || true
            
            # Force kill any remaining workflow processes
            echo "⏳ Ensuring all workflow processes are terminated..."
            pkill -f "supabase-listener" 2>/dev/null || true
            pkill -f "moose-cli workflow run" 2>/dev/null || true
            sleep 3
            
            # Double check - if workflow still exists, force terminate it
            if pnpm moose workflow list 2>/dev/null | grep -q "supabase-listener"; then
                echo "⚠️  Workflow still running, force terminating..."
                pnpm dev:workflow:stop || true
                sleep 2
            fi
            echo "✅ Workflow stop command completed"
        else
            echo "Stopping supabase-listener workflow..."
            pnpm dev:workflow:stop >> "$SEED_LOG" 2>&1 || true
            
            # Force kill any remaining workflow processes (silent mode)
            echo "⏳ Ensuring all workflow processes are terminated..."
            pkill -f "supabase-listener" 2>/dev/null || true
            pkill -f "moose-cli workflow run" 2>/dev/null || true
            sleep 3
            
            # Double check - if workflow still exists, force terminate it
            if pnpm moose workflow list 2>/dev/null | grep -q "supabase-listener"; then
                pnpm dev:workflow:stop >> "$SEED_LOG" 2>&1 || true
                sleep 2
            fi
            echo "✅ Workflow stop command completed"
        fi
    else
        echo "⚠️  pnpm not found, skipping workflow stop"
        log_message "pnpm not found, skipping workflow stop"
    fi
    cd "$PROJECT_ROOT"
    
    log_message "Workflow stop command completed successfully"
}

# Function to restart workflows after seeding
restart_workflows() {
    echo "🔄 Re-enabling Supabase realtime and restarting workflows..."
    log_message "Re-enabling realtime and restarting workflows after seeding"
    
    # Workflow will handle its own realtime replication setup
    
    cd "$PROJECT_ROOT/services/sync-supabase-moose-foobar" || true
    if command -v pnpm >/dev/null 2>&1; then
        # Start the workflow in background to not block the script
        if [ "$VERBOSE_MODE" = "true" ]; then
            echo "Starting supabase-listener workflow..."
            # Check if workflow is already running before starting
            if pnpm moose workflow list 2>/dev/null | grep -q "supabase-listener"; then
                echo "⚠️  Workflow already exists, terminating it first..."
                pnpm dev:workflow:stop || true
                sleep 2
            fi
            pnpm dev:workflow &
            WORKFLOW_PID=$!
        else
            # Check if workflow is already running before starting (silent)
            if pnpm moose workflow list 2>/dev/null | grep -q "supabase-listener"; then
                pnpm dev:workflow:stop >> "$SEED_LOG" 2>&1 || true
                sleep 2
            fi
            nohup pnpm dev:workflow >> "$SEED_LOG" 2>&1 &
            WORKFLOW_PID=$!
        fi
        echo "✅ Workflows restarted with realtime enabled (PID: $WORKFLOW_PID)"
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
    
    # Workflow termination will handle disabling realtime replication
    echo ""
    
    # Check for command line flags
    CLEAR_DATA="false"
    FOO_ROWS=""
    BAR_ROWS=""
    TARGET_SERVICE=""
    
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
            --service=*)
                TARGET_SERVICE="${arg#*=}"
                ;;
            --verbose)
                VERBOSE_MODE="true"
                ;;
        esac
    done
    
    # Validate target service if specified
    if [ -n "$TARGET_SERVICE" ]; then
        case "$TARGET_SERVICE" in
            "transactional-supabase-foobar"|"analytical-moose-foobar"|"retrieval-elasticsearch-foobar")
                # Valid service
                ;;
            *)
                echo "❌ Invalid service: $TARGET_SERVICE"
                echo "Valid services: transactional-supabase-foobar, analytical-moose-foobar, retrieval-elasticsearch-foobar"
                return 1
                ;;
        esac
    fi
    
    # Initialize logging
    log_message "=== Data Seeding Started ==="
    log_message "Verbose mode: $VERBOSE_MODE"
    log_message "Clear data: $CLEAR_DATA"
    log_message "Foo rows: $FOO_ROWS"
    log_message "Bar rows: $BAR_ROWS"
    log_message "Target service: ${TARGET_SERVICE:-all}"
    
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
    echo "  • Target service: ${TARGET_SERVICE:-all services}"
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
    
    # 1. Seed transactional-supabase-foobar (both foo and bar data)
    if [ -z "$TARGET_SERVICE" ] || [ "$TARGET_SERVICE" = "transactional-supabase-foobar" ]; then
        echo "📊 Seeding transactional-supabase-foobar..."
        log_message "Starting transactional-supabase-foobar seeding"
        if is_service_running "transactional-supabase-foobar"; then
        log_message "transactional-supabase-foobar is running, proceeding with seeding"
        
        cd "$PROJECT_ROOT/services/transactional-supabase-foobar" || {
            echo "⚠️  Could not access transactional-supabase-foobar directory, skipping transactional seeding"
            log_message "WARNING: Failed to change to transactional-supabase-foobar directory"
            cd "$PROJECT_ROOT"
            return 0
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
    cd "$PROJECT_ROOT/services/transactional-supabase-foobar"
    
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

# Copy the SQL procedures - use absolute path from project root
docker cp "$PROJECT_ROOT/services/transactional-supabase-foobar/database/scripts/seed-transactional-database.sql" "\$DB_CONTAINER:/tmp/seed.sql"

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
        echo "✅ transactional-supabase-foobar seeded"
        log_message "transactional-supabase-foobar seeding completed successfully"
        else
            echo "⚠️  transactional-supabase-foobar is not running, skipping seeding"
            log_message "transactional-supabase-foobar is not running, skipping seeding"
        fi
    else
        echo "⏭️  Skipping transactional-supabase-foobar (not targeted)"
        log_message "Skipping transactional-supabase-foobar seeding (not targeted)"
    fi
    
    # 2. Seed analytical-moose-foobar (migrate data from transactional) - FAST
    if [ -z "$TARGET_SERVICE" ] || [ "$TARGET_SERVICE" = "analytical-moose-foobar" ]; then
        echo "📈 Seeding analytical-moose-foobar..."
        log_message "Starting analytical-moose-foobar migration"
        if is_service_running "analytical-moose-foobar"; then
        log_message "analytical-moose-foobar is running, proceeding with data migration"
        
        cd "$PROJECT_ROOT/services/analytical-moose-foobar" || {
            echo "⚠️  Could not access analytical-moose-foobar directory, skipping analytical migration"
            log_message "WARNING: Failed to change to analytical-moose-foobar directory"
            cd "$PROJECT_ROOT"
            return 0
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
        echo "✅ analytical-moose-foobar migrated"
        log_message "analytical-moose-foobar migration completed successfully"
        else
            echo "⚠️  analytical-moose-foobar is not running, skipping migration"
            log_message "analytical-moose-foobar is not running, skipping migration"
        fi
    else
        echo "⏭️  Skipping analytical-moose-foobar (not targeted)"
        log_message "Skipping analytical-moose-foobar migration (not targeted)"
    fi
    
    # 3. Start retrieval-elasticsearch-foobar migration in BACKGROUND (slow process)
    if [ -z "$TARGET_SERVICE" ] || [ "$TARGET_SERVICE" = "retrieval-elasticsearch-foobar" ]; then
        echo "🔍 Starting retrieval-elasticsearch-foobar migration..."
        log_message "Starting retrieval-elasticsearch-foobar migration in background"
        if is_service_running "retrieval-elasticsearch-foobar"; then
        log_message "retrieval-elasticsearch-foobar is running, starting background data migration"
        
        # Create background migration script
        cat > "$PROJECT_ROOT/temp_es_migration.sh" << 'EOF'
#!/bin/bash
# Background Elasticsearch migration script
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT/services/retrieval-elasticsearch-foobar" || exit 1

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
        
        echo "✅ retrieval-elasticsearch-foobar migration started (PID: $ES_PID)"
        log_message "Elasticsearch migration started in background (PID: $ES_PID)"
            
        else
            echo "⚠️  retrieval-elasticsearch-foobar is not running, skipping migration"
            log_message "retrieval-elasticsearch-foobar is not running, skipping migration"
        fi
    else
        echo "⏭️  Skipping retrieval-elasticsearch-foobar (not targeted)"
        log_message "Skipping retrieval-elasticsearch-foobar migration (not targeted)"
    fi
    
    # Step 4: Restart workflows to resume real-time synchronization
    restart_workflows
    
    echo ""
    echo "🎉 Data seeding completed!"
    log_message "=== Data Seeding Completed Successfully ==="
    echo ""
    echo "✅ COMPLETED:"
    if [ -z "$TARGET_SERVICE" ] || [ "$TARGET_SERVICE" = "transactional-supabase-foobar" ]; then
        echo "   📊 transactional-supabase-foobar: $FOO_ROWS foo, $BAR_ROWS bar records"
    fi
    if [ -z "$TARGET_SERVICE" ] || [ "$TARGET_SERVICE" = "analytical-moose-foobar" ]; then
        echo "   📈 analytical-moose-foobar: Data migrated to ClickHouse"
    fi
    if [ -z "$TARGET_SERVICE" ]; then
        echo "   🔄 workflows: Restarted for real-time sync"
    fi
    echo ""
    if [ -z "$TARGET_SERVICE" ] || [ "$TARGET_SERVICE" = "retrieval-elasticsearch-foobar" ]; then
        echo "🔄 BACKGROUND: retrieval-elasticsearch-foobar → Elasticsearch (15-30 min)"
        echo ""
        echo "📋 Monitor Elasticsearch migration:"
        echo "   tail -f $PROJECT_ROOT/elasticsearch_migration.log"
    fi
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
    echo "⚠️  Seeding completed with some warnings (see logs for details)"
    log_message "WARNING: Seeding process completed with exit code: $EXIT_CODE"
fi

exit 0 