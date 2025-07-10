#!/bin/bash -e

########################################################
# Root Project Setup Script
########################################################

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define available services
SERVICES=(
    "transactional-base"
    "retrieval-base"
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
    echo "  reset               Reset all services (stop, clear data, restart)"
    echo "  --help              Show this help message"
    echo ""
    echo "Options:"
    echo "  --service=SERVICE   Target specific service (transactional-base, retrieval-base)"
    echo "  --all               Target all services (default)"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start all services"
    echo "  $0 stop                     # Stop all services"
    echo "  $0 restart                  # Restart all services"
    echo "  $0 status                   # Check status of all services"
    echo "  $0 setup                    # Setup all services"
    echo "  $0 reset                    # Reset all services"
    echo "  $0 start --service=transactional-base    # Start only transactional service"
    echo "  $0 stop --service=retrieval-base         # Stop only retrieval service"
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
        *)
            echo "❌ Unknown service: $service"
            return 1
            ;;
    esac
    
    # Return to original directory
    cd "$SCRIPT_DIR"
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
        start|stop|restart|status|setup|reset)
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