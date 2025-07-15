#!/bin/bash -e

########################################################
# Development Services Reset Script
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
    echo "This script resets all area-code development services."
    echo "It performs: shutdown → seed with fresh data → start services."
    echo ""
    echo "Options:"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Full reset: shutdown → seed → start"
    echo ""
    echo "Process:"
    echo "  1. Shutdown all services"
    echo "  2. Seed fresh data (clears existing data)"
    echo "  3. Start all services"
    echo ""
    echo "⚠️  WARNING: This will delete all existing data and replace it with fresh seed data!"
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

# Function to execute full reset: shutdown -> seed -> start
execute_full_reset() {
    echo "🔄 Starting full reset process..."
    echo ""
    
    # Step 1: Shutdown all services
    echo "🛑 Step 1: Shutting down all services..."
    if [ -f "$SCRIPT_DIR/dev-shutdown.sh" ]; then
        "$SCRIPT_DIR/dev-shutdown.sh"
        SHUTDOWN_EXIT_CODE=$?
        
        if [ $SHUTDOWN_EXIT_CODE -ne 0 ]; then
            echo "⚠️  Shutdown completed with warnings (exit code: $SHUTDOWN_EXIT_CODE)"
            echo "   Proceeding with reset anyway..."
        else
            echo "✅ Shutdown completed successfully"
        fi
    else
        echo "❌ dev-shutdown.sh not found, cannot shutdown services"
        return 1
    fi
    
    echo ""
    echo "⏳ Waiting for services to fully stop..."
    sleep 5
    
    # Step 2: Seed with fresh data (clear existing data)
    echo ""
    echo "🌱 Step 2: Seeding with fresh data..."
    if [ -f "$SCRIPT_DIR/dev-seed.sh" ]; then
        # Run seed with clear-data flag and default amounts
        "$SCRIPT_DIR/dev-seed.sh" --clear-data --foo-rows=1,000,000 --bar-rows=100,000
        SEED_EXIT_CODE=$?
        
        if [ $SEED_EXIT_CODE -eq 0 ]; then
            echo "✅ Seeding completed successfully"
        else
            echo "❌ Seeding failed (exit code: $SEED_EXIT_CODE)"
            echo "   Services may be in an inconsistent state"
            return 1
        fi
    else
        echo "❌ dev-seed.sh not found, cannot seed data"
        return 1
    fi
    
    # Step 3: Start all services
    echo ""
    echo "🚀 Step 3: Starting all services..."
    if [ -f "$SCRIPT_DIR/dev-start.sh" ]; then
        "$SCRIPT_DIR/dev-start.sh"
        START_EXIT_CODE=$?
        
        if [ $START_EXIT_CODE -eq 0 ]; then
            echo "✅ Services started successfully"
        else
            echo "❌ Service startup failed (exit code: $START_EXIT_CODE)"
            return 1
        fi
    else
        echo "❌ dev-start.sh not found, cannot start services"
        return 1
    fi
    
    return 0
}

# Parse command line arguments
# Handle help flag
if [[ " $@ " =~ " --help " ]] || [[ " $@ " =~ " -h " ]] || [[ " $@ " =~ " help " ]] || [[ $# -gt 0 ]]; then
    show_help
    exit 0
fi

# Execute the reset
echo "=========================================="
echo "  Area Code Full Reset"
echo "=========================================="
echo ""

# Ensure all scripts are executable first
ensure_scripts_executable

echo "🔄 Full reset process: shutdown → seed → start"
echo ""
echo "This will:"
echo "  1. 🛑 Shutdown all services"
echo "  2. 🌱 Seed fresh data (1M foo records, 100K bar records)"
echo "  3. 🚀 Start all services"
echo ""
echo "⚠️  WARNING: This will delete ALL existing data!"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to proceed with full reset? [y/N]: " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Reset cancelled."
    exit 1
fi

echo ""

execute_full_reset

# Capture the exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Full reset completed successfully!"
    echo ""
    echo "🎉 Your development environment is ready with fresh data!"
    echo ""
    echo "What's available:"
    echo "  • 1,000,000 foo records in transactional-base"
    echo "  • 100,000 bar records in transactional-base"
    echo "  • Data migrated to analytical-base (ClickHouse)"
    echo "  • Background migration to retrieval-base (Elasticsearch) in progress"
    echo ""
    echo "💡 Check status: ./scripts/dev-status.sh"
else
    echo "❌ Full reset failed with exit code: $EXIT_CODE"
    echo ""
    echo "💡 Try individual operations:"
    echo "  • Check status: ./scripts/dev-status.sh"
    echo "  • Start services: ./scripts/dev-start.sh"
    echo "  • Seed data: ./scripts/dev-seed.sh"
fi

exit $EXIT_CODE 