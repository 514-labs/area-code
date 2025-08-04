#!/bin/bash

# DW Frontend Service Development Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[DW-FRONTEND]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[DW-FRONTEND]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[DW-FRONTEND]${NC} $1"
}

print_error() {
    echo -e "${RED}[DW-FRONTEND]${NC} $1"
}

# Port configuration
DW_FRONTEND_PORT=8501

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

    # Install dw-frontend dependencies in virtual environment
    print_status "Installing dw-frontend dependencies in virtual environment..."
    pip install -r requirements.txt
    print_success "Data Warehouse dashboard dependencies installed successfully in virtual environment"

    # Check streamlit
    if ! command -v streamlit &> /dev/null; then
        print_error "streamlit is not installed."
        exit 1
    fi

    print_status "Streamlit path: $(which streamlit 2>/dev/null || echo 'not found')"
    print_status "Streamlit version: $(streamlit --version 2>/dev/null || echo 'unknown')"
}

start_dw_frontend_service() {
    ensure_venv_activated

    # Check if port is in use
    if is_port_in_use $DW_FRONTEND_PORT; then
        print_error "Port $DW_FRONTEND_PORT is already in use!"
        print_status "To find what's using port $DW_FRONTEND_PORT: lsof -i :$DW_FRONTEND_PORT"
        exit 1
    fi

    print_status "Starting Data Warehouse dashboard with Streamlit..."
    print_status "Dashboard will be available at http://localhost:$DW_FRONTEND_PORT"

    exec streamlit run main.py --server.port $DW_FRONTEND_PORT
}

main() {
    print_status "Starting Data Warehouse dashboard..."

    check_environment
    install_dependencies
    start_dw_frontend_service
}

main "$@"