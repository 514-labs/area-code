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
    echo "  seed                Seed database with sample data across all services"
    echo "  reset               Reset all services (stop, clear data, restart)"
    echo "  --help              Show this help message"
    echo ""
    echo "Options:"
    echo "  --service=SERVICE   Target specific service (transactional-base, retrieval-base, sync-base)"
    echo "  --all               Target all services (default)"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start all services"
    echo "  $0 stop                     # Stop all services"
    echo "  $0 restart                  # Restart all services"
    echo "  $0 status                   # Check status of all services"
    echo "  $0 setup                    # Setup all services"
    echo "  $0 seed                     # Seed database with sample data"
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

# Function to check if a service is running
is_service_running() {
    local service="$1"
    local service_dir="$SCRIPT_DIR/services/$service"
    
    # Change to service directory
    cd "$service_dir" || {
        echo "❌ Failed to change to service directory: $service_dir"
        return 1
    }
    
    case "$service" in
        "transactional-base")
            # Check if containers are running
            if docker compose ps --filter "status=running" | grep -q "supabase-db"; then
                cd "$SCRIPT_DIR"
                return 0
            fi
            ;;
        "retrieval-base")
            # Check if retrieval service is running
            if [ -f "/tmp/retrieval.pid" ] && kill -0 "$(cat /tmp/retrieval.pid)" 2>/dev/null; then
                cd "$SCRIPT_DIR"
                return 0
            fi
            ;;
        "analytical-base")
            # Check if analytical service is running
            if [ -f "/tmp/analytical.pid" ] && kill -0 "$(cat /tmp/analytical.pid)" 2>/dev/null; then
                cd "$SCRIPT_DIR"
                return 0
            fi
            ;;
        "sync-base")
            # Check if sync service is running
            if [ -f "/tmp/sync-base.pid" ] && kill -0 "$(cat /tmp/sync-base.pid)" 2>/dev/null; then
                cd "$SCRIPT_DIR"
                return 0
            fi
            ;;
        *)
            cd "$SCRIPT_DIR"
            return 1
            ;;
    esac
    
    cd "$SCRIPT_DIR"
    return 1
}

# Function to seed data across all services
seed_all_data() {
    echo "🌱 Starting comprehensive data seeding across all services..."
    echo ""
    
    # 1. Seed transactional-base (both foo and bar data)
    echo "📊 Seeding transactional-base..."
    if is_service_running "transactional-base"; then
        echo "✅ transactional-base is running, proceeding with seeding..."
        
        cd "$SCRIPT_DIR/services/transactional-base" || {
            echo "❌ Failed to change to transactional-base directory"
            return 1
        }
        
        # First seed foo data, then bar data
        echo "🌱 Seeding foo data..."
        ./setup.sh --seed
        
        echo "🌱 Seeding bar data..."
        # Run the enhanced SQL script that seeds both foo and bar
        if [ -f "src/scripts/run-sql-seed.sh" ]; then
            chmod +x ./src/scripts/run-sql-seed.sh
            
            # Create a temporary script to seed both foo and bar
            cat > temp_seed_all.sh << 'EOF'
#!/bin/bash
# Environment
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep "supabase-db")
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-postgres}

echo "🌱 Seeding both foo and bar data..."

# Copy the SQL procedures
docker cp src/scripts/seed-transactional-base-rows.sql "$DB_CONTAINER:/tmp/seed.sql"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed.sql

# Seed foo data (1M records)
echo "📝 Seeding foo records..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "CALL seed_foo_data(1000000);"

# Seed bar data (500K records)
echo "📊 Seeding bar records..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "CALL seed_bar_data(500000);"

# Cleanup
docker exec "$DB_CONTAINER" rm -f /tmp/seed.sql
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
    
    # 2. Seed retrieval-base (migrate data from transactional)
    echo "🔍 Seeding retrieval-base..."
    if is_service_running "retrieval-base"; then
        echo "✅ retrieval-base is running, proceeding with data migration..."
        
        cd "$SCRIPT_DIR/services/retrieval-base" || {
            echo "❌ Failed to change to retrieval-base directory"
            cd "$SCRIPT_DIR"
            return 1
        }
        
        ./setup.sh migrate
        cd "$SCRIPT_DIR"
        echo "✅ retrieval-base migration completed"
    else
        echo "⚠️  retrieval-base is not running, skipping migration"
    fi
    echo ""
    
    # 3. Seed analytical-base (migrate data from transactional)
    echo "📈 Seeding analytical-base..."
    if is_service_running "analytical-base"; then
        echo "✅ analytical-base is running, proceeding with data migration..."
        
        cd "$SCRIPT_DIR/services/analytical-base" || {
            echo "❌ Failed to change to analytical-base directory"
            cd "$SCRIPT_DIR"
            return 1
        }
        
        ./setup.sh migrate
        cd "$SCRIPT_DIR"
        echo "✅ analytical-base migration completed"
    else
        echo "⚠️  analytical-base is not running, skipping migration"
    fi
    echo ""
    
    echo "🎉 Data seeding completed across all running services!"
    echo ""
    echo "Summary:"
    echo "• transactional-base: Seeded with foo and bar sample data"
    echo "• retrieval-base: Migrated data from PostgreSQL to Elasticsearch"
    echo "• analytical-base: Migrated data from PostgreSQL to ClickHouse"
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
                        seed_all_data || return 1
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
