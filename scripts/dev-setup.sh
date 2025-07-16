#!/bin/bash -e

########################################################
# Development Environment Setup Script
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
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script sets up the development environment for all area-code services."
    echo "It installs dependencies, initializes databases, and prepares services for development."
    echo ""
    echo "Options:"
    echo "  --service=SERVICE   Setup specific service only"
    echo "  --all               Setup all services (default)"
    echo "  --force             Force re-setup even if service appears configured"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Setup all services"
    echo "  $0 --all                             # Setup all services"
    echo "  $0 --service=transactional-base      # Setup only transactional service"
    echo "  $0 --service=retrieval-base          # Setup only retrieval service"
    echo ""
    echo "Available Services:"
    for service in "${SERVICES[@]}"; do
        echo "  • $service"
    done
    echo ""
    echo "Note: This script handles initial development environment setup."
    echo "For starting/stopping services, use the dedicated scripts in the scripts/ directory."
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
    echo "$PROJECT_ROOT/services/$service/setup.sh"
}

# Function to check if a service is already set up
is_service_setup() {
    local service="$1"
    local service_dir="$PROJECT_ROOT/services/$service"
    
    case "$service" in
        "transactional-base")
            # Check if Docker containers are running or can be started
            if [ -f "$service_dir/docker-compose.yml" ] && command -v docker >/dev/null 2>&1; then
                return 0  # Setup files exist
            fi
            ;;
        "retrieval-base")
            # Check if node_modules exists and Elasticsearch can be started
            if [ -d "$service_dir/node_modules" ] && [ -f "$service_dir/docker-compose.yml" ]; then
                return 0
            fi
            ;;
        "analytical-base")
            # Check if Moose dependencies are installed
            if [ -d "$service_dir/node_modules" ] && command -v moose >/dev/null 2>&1; then
                return 0
            fi
            ;;
        "sync-base")
            # Check if Moose dependencies are installed  
            if [ -d "$service_dir/node_modules" ] && command -v moose >/dev/null 2>&1; then
                return 0
            fi
            ;;
        "data-warehouse")
            # Check if Python dependencies are installed
            if [ -f "$service_dir/requirements.txt" ] && [ -d "$service_dir/.venv" ]; then
                return 0
            fi
            ;;
    esac
    
    return 1  # Not set up
}

# Function to setup a service
setup_service() {
    local service="$1"
    local force_setup="${2:-false}"
    local script_path=$(get_service_script "$service")
    local service_dir="$PROJECT_ROOT/services/$service"
    
    echo "🔧 Setting up $service..."
    
    # Check if already set up (unless forced)
    if [ "$force_setup" != "true" ] && is_service_setup "$service"; then
        echo "✅ $service appears to be already set up (skipping)"
        echo "   Use --force to re-run setup anyway"
        return 0
    fi
    
    if ! check_and_make_executable "$script_path" "$service"; then
        return 1
    fi
    
    # Change to service directory
    cd "$service_dir" || {
        echo "❌ Failed to change to service directory: $service_dir"
        return 1
    }
    
    echo "📦 Running setup for $service..."
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
    cd "$PROJECT_ROOT"
    
    # Verify setup was successful
    if is_service_setup "$service"; then
        echo "✅ $service setup completed successfully"
    else
        echo "⚠️  $service setup completed, but verification failed"
        echo "   Service may still be functional, check manually if needed"
    fi
}

# Function to execute setup on services
execute_setup_on_services() {
    local target_service="$1"
    local force_setup="$2"
    local failed_services=()
    
    if [ -n "$target_service" ]; then
        # Execute setup on specific service
        if [[ " ${SERVICES[@]} " =~ " ${target_service} " ]]; then
            setup_service "$target_service" "$force_setup" || failed_services+=("$target_service")
        else
            echo "❌ Unknown service: $target_service"
            echo "Available services: ${SERVICES[*]}"
            return 1
        fi
    else
        # Execute setup on all services
        for service in "${SERVICES[@]}"; do
            echo ""
            setup_service "$service" "$force_setup" || failed_services+=("$service")
        done
    fi
    
    # Report any failures
    if [ ${#failed_services[@]} -gt 0 ]; then
        echo ""
        echo "❌ The following services failed setup: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Parse command line arguments
TARGET_SERVICE=""
FORCE_SETUP="false"

# Handle help flag
if [[ " $@ " =~ " --help " ]] || [[ " $@ " =~ " -h " ]] || [[ " $@ " =~ " help " ]]; then
    show_help
    exit 0
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --service=*)
            TARGET_SERVICE="${1#*=}"
            shift
            ;;
        --all)
            TARGET_SERVICE=""
            shift
            ;;
        --force)
            FORCE_SETUP="true"
            shift
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Use '$0 --help' for usage information."
            exit 1
            ;;
    esac
done

# Execute the setup
echo "=========================================="
echo "  Area Code Development Environment Setup"
echo "=========================================="
echo ""

# Ensure all scripts are executable first
ensure_scripts_executable
echo ""

if [ -n "$TARGET_SERVICE" ]; then
    echo "🎯 Setting up service: $TARGET_SERVICE"
else
    echo "🎯 Setting up all services: ${SERVICES[*]}"
fi
echo ""
echo "This will install dependencies, initialize databases, and prepare"
echo "services for development. This may take several minutes..."
echo ""

execute_setup_on_services "$TARGET_SERVICE" "$FORCE_SETUP"

# Capture the exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Development environment setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  • Start services: $PROJECT_ROOT/scripts/dev-start.sh"
    echo "  • Check status: $PROJECT_ROOT/scripts/dev-status.sh"
    echo "  • Seed data: $PROJECT_ROOT/scripts/dev-seed.sh"
else
    echo "❌ Development environment setup failed with exit code: $EXIT_CODE"
    echo ""
    echo "Please check the error messages above and try again."
fi

exit $EXIT_CODE 