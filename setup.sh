#!/bin/bash -e

########################################################
# Root Project Setup Script
########################################################

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define available services
SERVICES=(
    "transactional-base" # Has to be first
    "retrieval-base"
    "sync-base"
    "analytical-base"
    # "data-warehouse"
)

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "This script manages all services in the area-code project."
    echo ""
    echo "Commands:"
    echo "  start               Start all services"
    echo "  stop                Stop all services"
    echo "  restart             Restart all services"
    echo "  status              Show status of all services"
    echo "  setup               Setup all services (install dependencies, initialize data)"
    echo "  seed                Seed database with sample data across all services (interactive)"
    echo "  reset               Reset all services (stop, clear data, restart)"
    echo "  --help              Show this help message"
    echo ""
    echo "Options:"
    echo "  --service=SERVICE   Target specific service (transactional-base, retrieval-base, sync-base)"
    echo "  --all               Target all services (default)"
    echo ""
    echo "Seed Options:"
    echo "  --clear-data        Clear existing data before seeding (skip prompt)"
    echo "  --foo-rows=N        Number of foo records to create (skip prompt)"
    echo "  --bar-rows=N        Number of bar records to create (skip prompt)"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start all services"
    echo "  $0 stop                     # Stop all services"
    echo "  $0 restart                  # Restart all services"
    echo "  $0 status                   # Check status of all services"
    echo "  $0 setup                    # Setup all services"
    echo "  $0 seed                     # Seed database with sample data (interactive)
  $0 seed --clear-data        # Clear data and prompt for row counts
  $0 seed --foo-rows=500,000 --bar-rows=100,000  # Automated seeding with specific counts"
    echo "  $0 reset                    # Reset all services"
    echo "  $0 start --service=transactional-base    # Start only transactional service"
    echo "  $0 stop --service=retrieval-base         # Stop only retrieval service"
    echo "  $0 start --service=sync-base             # Start only sync service"
    echo ""
    echo "Available Services:"
    for service in "${SERVICES[@]}"; do
        echo "  • $service"
    done
    echo ""
}

# Function to check and make script executable
check_and_make_executable() {
    local script_path="$1"
    local service_name="$2"
    
    if [ ! -f "$script_path" ]; then
        echo "❌ Error: $service_name setup script not found at:"
        echo "   $script_path"
        echo ""
        echo "Please ensure the $service_name service is properly set up."
        return 1
    fi
    
    # Make sure the script is executable
    if [ ! -x "$script_path" ]; then
        echo "🔧 Making $service_name setup script executable..."
        chmod +x "$script_path"
    fi
    
    return 0
}

# Function to get service script path
get_service_script() {
    local service="$1"
    echo "$SCRIPT_DIR/services/$service/setup.sh"
}

# Function to start a service
start_service() {
    local service="$1"
    local script_path=$(get_service_script "$service")
    local service_dir="$SCRIPT_DIR/services/$service"
    
    echo "🚀 Starting $service..."
    
    if ! check_and_make_executable "$script_path" "$service"; then
        return 1
    fi
    
    # Change to service directory
    cd "$service_dir" || {
        echo "❌ Failed to change to service directory: $service_dir"
        return 1
    }
    
    case "$service" in
        "transactional-base")
            # For transactional service, we need to start the containers
            "$script_path" --restart
            ;;
        "retrieval-base")
            # For retrieval service, use the start command
            "$script_path" start
            ;;
        "analytical-base")
            # For analytical service, use the start command
            "$script_path" start
            ;;
        "sync-base")
            # For sync service, use the start command
            "$script_path" start
            ;;
        "data-warehouse")
            # For data-warehouse service, use the start command
            "$script_path" start
            ;;
            
        *)
            echo "❌ Unknown service: $service"
            return 1
            ;;
    esac
    
    # Return to original directory
    cd "$SCRIPT_DIR"
}

# Function to stop a service
stop_service() {
    local service="$1"
    local script_path=$(get_service_script "$service")
    local service_dir="$SCRIPT_DIR/services/$service"
    
    echo "🛑 Stopping $service..."
    
    if ! check_and_make_executable "$script_path" "$service"; then
        return 1
    fi
    
    # Change to service directory
    cd "$service_dir" || {
        echo "❌ Failed to change to service directory: $service_dir"
        return 1
    }
    
    case "$service" in
        "transactional-base")
            # For transactional service, use the stop command
            "$script_path" --stop
            ;;
        "retrieval-base")
            # For retrieval service, use the stop command
            "$script_path" stop
            ;;
        "analytical-base")
            # For analytical service, use the stop command
            "$script_path" stop
            ;;
        "sync-base")
            # For sync service, use the stop command
            "$script_path" stop
            ;;
        "data-warehouse")
            # For data-warehouse service, use the stop command
            "$script_path" stop
            ;;
        *)
            echo "❌ Unknown service: $service"
            return 1
            ;;
    esac
    
    # Return to original directory
    cd "$SCRIPT_DIR"
}

# Function to restart a service
restart_service() {
    local service="$1"
    echo "🔄 Restarting $service..."
    stop_service "$service"
    sleep 2
    start_service "$service"
}

# Function to show status of a service
show_service_status() {
    local service="$1"
    local script_path=$(get_service_script "$service")
    local service_dir="$SCRIPT_DIR/services/$service"
    
    echo "📊 Checking status of $service..."
    
    if ! check_and_make_executable "$script_path" "$service"; then
        return 1
    fi
    
    # Change to service directory
    cd "$service_dir" || {
        echo "❌ Failed to change to service directory: $service_dir"
        return 1
    }
    
    case "$service" in
        "transactional-base")
            # For transactional service, use the status command
            "$script_path" --status
            ;;
        "retrieval-base")
            # For retrieval service, use the status command
            "$script_path" status
            ;;
        "analytical-base")
            # For analytical service, use the status command
            "$script_path" status
            ;;
        "sync-base")
            # For sync service, use the status command
            "$script_path" status
            ;;
        "data-warehouse")
            # For data-warehouse service, use the status command
            "$script_path" status
            ;;
        *)
            echo "❌ Unknown service: $service"
            return 1
            ;;
    esac
    
    # Return to original directory
    cd "$SCRIPT_DIR"
}

# Function to setup a service
setup_service() {
    local service="$1"
    local script_path=$(get_service_script "$service")
    local service_dir="$SCRIPT_DIR/services/$service"
    
    echo "🔧 Setting up $service..."
    
    if ! check_and_make_executable "$script_path" "$service"; then
        return 1
    fi
    
    # Change to service directory
    cd "$service_dir" || {
        echo "❌ Failed to change to service directory: $service_dir"
        return 1
    }
    
    case "$service" in
        "transactional-base")
            # For transactional service, run the setup (default behavior)
            "$script_path"
            ;;
        "retrieval-base")
            # For retrieval service, use the setup command
            "$script_path" setup
            ;;
        "analytical-base")
            # For analytical service, use the setup command
            "$script_path" setup
            ;;
        "sync-base")
            # For sync service, use the setup command
            "$script_path" setup
            ;;
        "data-warehouse")
            # For data-warehouse service, use the setup command
            "$script_path" setup
            ;;
        *)
            echo "❌ Unknown service: $service"
            return 1
            ;;
    esac
    
    # Return to original directory
    cd "$SCRIPT_DIR"
}

# Function to reset a service
reset_service() {
    local service="$1"
    local script_path=$(get_service_script "$service")
    local service_dir="$SCRIPT_DIR/services/$service"
    
    echo "🔄 Resetting $service..."
    
    if ! check_and_make_executable "$script_path" "$service"; then
        return 1
    fi
    
    # Change to service directory
    cd "$service_dir" || {
        echo "❌ Failed to change to service directory: $service_dir"
        return 1
    }
    
    case "$service" in
        "transactional-base")
            # For transactional service, use the reset command
            "$script_path" --reset
            ;;
        "retrieval-base")
            # For retrieval service, use the reset command
            "$script_path" reset
            ;;
        "analytical-base")
            # For analytical service, use the reset command
            "$script_path" reset
            ;;
        "sync-base")
            # For sync service, use the reset command
            "$script_path" reset
            ;;
        "data-warehouse")
            # For data-warehouse service, use the reset command
            "$script_path" reset
            ;;
        *)
            echo "❌ Unknown service: $service"
            return 1
            ;;
    esac
    
    # Return to original directory
    cd "$SCRIPT_DIR"
}

# Function to check if a service is running using health checks
is_service_running() {
    local service="$1"
    
    # Use our health check script to verify service is actually responding
    if [ -f "$SCRIPT_DIR/scripts/health-check.sh" ]; then
        # Run health check for specific service (suppress output, just check exit code)
        if "$SCRIPT_DIR/scripts/health-check.sh" "$service" >/dev/null 2>&1; then
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

# Function to seed data across all services
seed_all_data() {
    echo "🌱 Starting data seeding across all services..."
    echo ""
    
    # Check for --clear-data flag
    CLEAR_DATA="false"
    FOO_ROWS=""
    BAR_ROWS=""
    
    # Parse arguments for flags
    for arg in "$@"; do
        case $arg in
            --clear-data)
                CLEAR_DATA="true"
                shift
                ;;
            --foo-rows=*)
                FOO_ROWS="${arg#*=}"
                shift
                ;;
            --bar-rows=*)
                BAR_ROWS="${arg#*=}"
                shift
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
    echo "  • Clear data: $CLEAR_DATA"
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
        
        cd "$SCRIPT_DIR/services/transactional-base" || {
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

# Clear data if requested using fast reset
if [ "\$CLEAR_DATA" = "true" ]; then
    echo "🧹 Clearing existing data using fast reset..."
    cd "$SCRIPT_DIR/services/transactional-base"
    ./setup.sh --reset
    echo "✅ Data cleared and services restarted"
    
    # Re-detect container after reset and wait for full initialization
    echo "⏳ Waiting for services to fully initialize after reset..."
    sleep 10  # Give containers time to start
    
    DB_CONTAINER=\$(docker ps --format "{{.Names}}" | grep "supabase-db")
    if [ -z "\$DB_CONTAINER" ]; then
        echo "Error: No PostgreSQL container found after reset"
        exit 1
    fi
    echo "Using container: \$DB_CONTAINER"
    
    # Run migrations to recreate schema after reset
    echo "📋 Running database migrations to recreate schema..."
    if [ -f "src/scripts/migrate.ts" ]; then
        npx tsx src/scripts/migrate.ts
        if [ \$? -eq 0 ]; then
            echo "✅ Database migrations completed successfully"
        else
            echo "❌ Database migration failed"
            exit 1
        fi
    else
        echo "⚠️ Migration script not found, checking if schema exists..."
    fi
    
    # Verify schema exists
    echo "🔍 Verifying database schema..."
    if docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -c "\\dt" 2>/dev/null | grep -q "foo\\|bar"; then
        echo "✅ Database schema is ready"
    else
        echo "❌ Database schema not found after migration"
        exit 1
    fi
fi

# Copy the SQL procedures
docker cp src/scripts/seed-transactional-base-rows.sql "\$DB_CONTAINER:/tmp/seed.sql"
docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -f /tmp/seed.sql

# Seed foo data with user-specified count
# Remove commas from numbers for SQL
FOO_COUNT_SQL=\$(echo "\$FOO_ROWS" | tr -d ',')
echo "📝 Seeding \$FOO_ROWS foo records (data already cleaned if requested)..."
docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -c "CALL seed_foo_data(\$FOO_COUNT_SQL, false);"

# Seed bar data with user-specified count
# Remove commas from numbers for SQL  
BAR_COUNT_SQL=\$(echo "\$BAR_ROWS" | tr -d ',')
echo "📊 Seeding \$BAR_ROWS bar records (data already cleaned if requested)..."
docker exec "\$DB_CONTAINER" psql -U "\$DB_USER" -d "\$DB_NAME" -c "CALL seed_bar_data(\$BAR_COUNT_SQL, false);"

# Cleanup
docker exec "\$DB_CONTAINER" rm -f /tmp/seed.sql
echo "✅ Both foo and bar data seeded successfully"
EOF
            chmod +x temp_seed_all.sh
            ./temp_seed_all.sh
            rm temp_seed_all.sh
        fi
        
        cd "$SCRIPT_DIR"
        echo "✅ transactional-base seeding completed"
    else
        echo "⚠️  transactional-base is not running, skipping seeding"
    fi
    echo ""
    
    # 2. Seed analytical-base (migrate data from transactional) - FAST
    echo "📈 Seeding analytical-base..."
    if is_service_running "analytical-base"; then
        echo "✅ analytical-base is running, proceeding with data migration..."
        
        cd "$SCRIPT_DIR/services/analytical-base" || {
            echo "❌ Failed to change to analytical-base directory"
            cd "$SCRIPT_DIR"
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
        
        cd "$SCRIPT_DIR"
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
        cat > "$SCRIPT_DIR/temp_es_migration.sh" << 'EOF'
#!/bin/bash
# Background Elasticsearch migration script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/services/retrieval-base" || exit 1

# Log file for background process
LOG_FILE="$SCRIPT_DIR/elasticsearch_migration.log"
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
rm -f "$SCRIPT_DIR/temp_es_migration.sh"
EOF
        
        chmod +x "$SCRIPT_DIR/temp_es_migration.sh"
        
        # Start migration in background
        nohup "$SCRIPT_DIR/temp_es_migration.sh" "$CLEAR_DATA" > /dev/null 2>&1 &
        ES_PID=$!
        
        echo "✅ Elasticsearch migration started in background (PID: $ES_PID)"
        echo ""
        echo "⚠️  IMPORTANT: Elasticsearch migration will take 15-30 minutes to complete!"
        echo "📋 Monitor progress in real-time:"
        echo "   tail -f $SCRIPT_DIR/elasticsearch_migration.log"
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
    echo "   • transactional-base: Seeded with \$FOO_ROWS foo and \$BAR_ROWS bar records"
    if [ "$CLEAR_DATA" = "true" ]; then
        echo "   • Data cleared before seeding"
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
    echo "   tail -f $SCRIPT_DIR/elasticsearch_migration.log"
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

# Function to execute command on services
execute_on_services() {
    local command="$1"
    local target_service="$2"
    local failed_services=()
    
    if [ -n "$target_service" ]; then
        # Execute on specific service
        if [[ " ${SERVICES[@]} " =~ " ${target_service} " ]]; then
            case "$command" in
                "start")
                    start_service "$target_service" || failed_services+=("$target_service")
                    ;;
                "stop")
                    stop_service "$target_service" || failed_services+=("$target_service")
                    ;;
                "restart")
                    restart_service "$target_service" || failed_services+=("$target_service")
                    ;;
                "status")
                    show_service_status "$target_service" || failed_services+=("$target_service")
                    ;;
                "setup")
                    setup_service "$target_service" || failed_services+=("$target_service")
                    ;;
                "seed")
                    echo "❌ Error: seed command does not support targeting specific services"
                    echo "Use '$0 seed' to seed all services"
                    return 1
                    ;;
                "reset")
                    reset_service "$target_service" || failed_services+=("$target_service")
                    ;;
                *)
                    echo "❌ Unknown command: $command"
                    return 1
                    ;;
            esac
        else
            echo "❌ Unknown service: $target_service"
            echo "Available services: ${SERVICES[*]}"
            return 1
        fi
    else
        # Execute on all services
        for service in "${SERVICES[@]}"; do
            echo ""
            case "$command" in
                "start")
                    start_service "$service" || failed_services+=("$service")
                    ;;
                "stop")
                    stop_service "$service" || failed_services+=("$service")
                    ;;
                "restart")
                    restart_service "$service" || failed_services+=("$service")
                    ;;
                "status")
                    show_service_status "$service" || failed_services+=("$service")
                    ;;
                "setup")
                    setup_service "$service" || failed_services+=("$service")
                    ;;
                "seed")
                    # Only run seed_all_data once, not for each service
                    if [ "$service" = "transactional-base" ]; then
                        seed_all_data "$@" || return 1
                    fi
                    ;;
                "reset")
                    reset_service "$service" || failed_services+=("$service")
                    ;;
                *)
                    echo "❌ Unknown command: $command"
                    return 1
                    ;;
            esac
        done
    fi
    
    # Report any failures
    if [ ${#failed_services[@]} -gt 0 ]; then
        echo ""
        echo "❌ The following services failed: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Parse command line arguments
COMMAND=""
TARGET_SERVICE=""

# Handle help flag
if [[ " $@ " =~ " --help " ]] || [[ " $@ " =~ " -h " ]] || [[ " $@ " =~ " help " ]]; then
    show_help
    exit 0
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|restart|status|setup|seed|reset)
            COMMAND="$1"
            shift
            ;;
        --service=*)
            TARGET_SERVICE="${1#*=}"
            shift
            ;;
        --all)
            TARGET_SERVICE=""
            shift
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Use '$0 --help' for usage information."
            exit 1
            ;;
    esac
done

# Validate command
if [ -z "$COMMAND" ]; then
    echo "❌ Error: No command specified"
    echo ""
    show_help
    exit 1
fi

# Execute the command
echo "=========================================="
echo "  Area Code Services Management"
echo "=========================================="
echo ""

if [ -n "$TARGET_SERVICE" ]; then
    echo "🎯 Targeting service: $TARGET_SERVICE"
else
    echo "🎯 Targeting all services: ${SERVICES[*]}"
fi
echo ""

execute_on_services "$COMMAND" "$TARGET_SERVICE"

# Capture the exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Command '$COMMAND' completed successfully!"
else
    echo "❌ Command '$COMMAND' failed with exit code: $EXIT_CODE"
fi

exit $EXIT_CODE 
