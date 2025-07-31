#!/bin/bash

# Data Warehouse Service Cleanup Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVICE_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[DATA-WAREHOUSE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[DATA-WAREHOUSE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[DATA-WAREHOUSE]${NC} $1"
}

print_error() {
    echo -e "${RED}[DATA-WAREHOUSE]${NC} $1"
}

# Port configuration
DATA_WAREHOUSE_PORT=4200

# Virtual environment utility functions
check_venv_exists() {
    if [ -d "venv" ]; then
        return 0  # venv exists
    else
        return 1  # venv does not exist
    fi
}

ensure_venv_activated() {
    # First check if venv exists
    if ! check_venv_exists; then
        print_warning "Virtual environment not found, skipping moose-cli clean"
        return 1
    fi

    # Check if we're already in the virtual environment
    if [ -z "$VIRTUAL_ENV" ]; then
        print_status "Activating virtual environment..."
        source venv/bin/activate

        if [ -n "$VIRTUAL_ENV" ]; then
            print_success "Virtual environment activated: $VIRTUAL_ENV"
        else
            print_error "Failed to activate virtual environment"
            return 1
        fi
    else
        print_success "Virtual environment already active: $VIRTUAL_ENV"
    fi
}

clean_moose_infrastructure() {
    if ensure_venv_activated; then
        # Check if moose-cli is available
        if command -v moose-cli &> /dev/null; then
            print_status "Cleaning Moose infrastructure..."
            moose-cli clean
            print_success "Moose infrastructure cleaned"
        else
            print_warning "moose-cli not found, skipping infrastructure cleanup"
        fi
    else
        print_warning "Could not activate virtual environment, skipping moose-cli clean"
    fi
}

clean_data_warehouse_port() {
    print_status "Checking for process using port $DATA_WAREHOUSE_PORT..."

    local pid=$(lsof -ti :$DATA_WAREHOUSE_PORT 2>/dev/null)

    if [ -n "$pid" ]; then
        print_warning "Found process $pid using port $DATA_WAREHOUSE_PORT"
        print_status "Attempting to terminate process $pid..."

        # Try graceful termination first
        if kill "$pid" 2>/dev/null; then
            print_status "Waiting up to 10 seconds for process $pid to terminate..."

            local attempts=0
            local max_attempts=10
            while [ $attempts -lt $max_attempts ]; do
                if ! kill -0 "$pid" 2>/dev/null; then
                    print_success "Process $pid terminated gracefully"
                    return 0
                fi
                sleep 1
                attempts=$((attempts + 1))
            done

            # Process still running after 10 seconds, force kill
            print_warning "Process $pid still running after 10 seconds, force killing..."
            kill -9 "$pid" 2>/dev/null
            sleep 1

            # Final check after force kill
            if kill -0 "$pid" 2>/dev/null; then
                print_error "Failed to kill process $pid even with force"
            else
                print_success "Process $pid force killed successfully"
            fi
        else
            print_warning "Could not send signal to process $pid (may already be dead)"
        fi
    else
        print_success "No processes found using port $DATA_WAREHOUSE_PORT"
    fi
}

main() {
    print_status "Cleaning up Data Warehouse service..."

    clean_moose_infrastructure
    clean_data_warehouse_port

    print_success "Data Warehouse service cleanup completed"
}

main "$@"