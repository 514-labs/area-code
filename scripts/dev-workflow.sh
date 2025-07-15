#!/bin/bash -e

########################################################
# Development Workflow Script
########################################################

# Get the project root directory (one level up from the scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Development workflow script that sets up replication and starts the workflow."
    echo ""
    echo "This script will:"
    echo "  0. Terminate any existing workflows"
    echo "  1. Run setup:replication from transactional-base package.json"
    echo "  2. Run dev:workflow (sync-base supabase-listener workflow)"
    echo ""
    echo "Options:"
    echo "  --help              Show this help message"
    echo ""
}

# Function to cleanup existing workflows
cleanup_existing_workflows() {
    print_step "Terminating existing workflows..."
    cd "$SCRIPT_DIR/services/sync-base" || true
    if command -v pnpm >/dev/null 2>&1; then
        pnpm moose workflow terminate supabase-listener 2>/dev/null || true
    fi
    cd "$SCRIPT_DIR"
    
    # Give it a moment to properly terminate
    sleep 2
    print_success "Existing workflows terminated"
}

# Function to run command in service directory
run_in_service() {
    local service="$1"
    local command="$2"
    local service_dir="$SCRIPT_DIR/services/$service"
    
    print_step "Running '$command' in $service..."
    
    if [ ! -d "$service_dir" ]; then
        print_error "Service directory not found: $service_dir"
        return 1
    fi
    
    cd "$service_dir" || {
        print_error "Failed to change to service directory: $service_dir"
        return 1
    }
    
    # Run the command
    if eval "$command"; then
        print_success "Command completed successfully in $service"
        cd "$SCRIPT_DIR"
        return 0
    else
        print_error "Command failed in $service"
        cd "$SCRIPT_DIR"
        return 1
    fi
}

main() {
    echo "=========================================="
    echo "  Development Workflow Execution"
    echo "=========================================="
    echo ""
    
    # Step 0: Cleanup existing workflows
    print_step "Step 0: Cleaning up existing workflows"
    cleanup_existing_workflows || exit 1
    echo ""
    
    # Step 1: Run setup:replication from transactional-base
    print_step "Step 1: Setting up replication for transactional-base"
    run_in_service "transactional-base" "pnpm setup:replication" || {
        print_error "Failed to setup replication"
        exit 1
    }
    echo ""
    
    # Step 2: Run sync-base workflow directly
    print_step "Step 2: Starting sync-base supabase-listener workflow"
    run_in_service "sync-base" "pnpm dev:workflow" || {
        print_error "Failed to start sync-base workflow"
        exit 1
    }
    
    print_success "🎉 Development workflow execution completed!"
}

# Handle help flag
if [[ " $@ " =~ " --help " ]] || [[ " $@ " =~ " -h " ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@" 