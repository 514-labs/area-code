#!/bin/bash

# Data Warehouse Service Development Script

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

create_venv_if_missing() {
    if ! check_venv_exists; then
        print_status "Creating Python virtual environment..."

        if python3 -m venv venv; then
            print_success "Virtual environment created successfully at ./venv"
        else
            print_error "Failed to create virtual environment"
            exit 1
        fi
    else
        print_success "Virtual environment already exists at ./venv"
    fi
}

ensure_venv_activated() {
    # First check if venv exists
    if ! check_venv_exists; then
        print_error "Virtual environment not found. Creating it now..."
        create_venv_if_missing
    fi

    # Check if we're already in the virtual environment
    if [ -z "$VIRTUAL_ENV" ]; then
        print_status "Activating virtual environment..."
        source venv/bin/activate

        if [ -n "$VIRTUAL_ENV" ]; then
            print_success "Virtual environment activated: $VIRTUAL_ENV"
        else
            print_error "Failed to activate virtual environment"
            exit 1
        fi
    else
        print_success "Virtual environment already active: $VIRTUAL_ENV"
    fi
}

is_port_in_use() {
    local port=$1
    if lsof -i ":$port" >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is available
    fi
}

check_environment() {
    print_status "Checking Python version..."

    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    else
        # Get Python version
        python_version=$(python3 --version 2>&1 | sed 's/Python //')
        major=$(echo "$python_version" | cut -d. -f1)
        minor=$(echo "$python_version" | cut -d. -f2)

        # Check if version is >= 3.12
        if [ "$major" -lt 3 ] || ([ "$major" -eq 3 ] && [ "$minor" -lt 12 ]); then
            print_error "Python version $python_version is too old (minimum: 3.12)"
            exit 1
        else
            print_success "Python version: $python_version"
        fi
    fi
}

install_dependencies() {
    print_status "Installing dependencies..."

    create_venv_if_missing
    ensure_venv_activated

    print_status "Installing data-warehouse dependencies in virtual environment..."
    pip install .
    print_success "Data warehouse dependencies installed successfully in virtual environment"

    # Check Moose CLI
    if ! command -v moose-cli &> /dev/null; then
        print_error "Moose CLI is not installed."
        exit 1
    fi

    print_status "Moose CLI path: $(which moose-cli 2>/dev/null || echo 'not found')"
    print_status "Moose CLI version: $(moose-cli --version 2>/dev/null || echo 'unknown')"
}

start_data_warehouse_service() {
    ensure_venv_activated

    # Check if port is in use
    if is_port_in_use $DATA_WAREHOUSE_PORT; then
        print_error "Port $DATA_WAREHOUSE_PORT is already in use!"
        print_status "To find what's using port $DATA_WAREHOUSE_PORT: lsof -i :$DATA_WAREHOUSE_PORT"
        exit 1
    fi

    print_status "Starting moose-cli dev on port $DATA_WAREHOUSE_PORT..."
    echo ""

    exec moose-cli dev
}

main() {
    print_status "Starting Data Warehouse service..."

    check_environment
    install_dependencies
    start_data_warehouse_service
}

main "$@"