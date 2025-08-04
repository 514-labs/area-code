#!/bin/bash

# DW Frontend Service Cleanup Script

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

# Reusable function to gracefully terminate a process
terminate_process_gracefully() {
    local pid=$1

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
            return 1
        else
            print_success "Process $pid force killed successfully"
            return 0
        fi
    else
        print_warning "Could not send signal to process $pid (may already be dead)"
        return 1
    fi
}

# Find Streamlit process by searching running processes, then verify it uses our port
clean_streamlit_by_process() {
    print_status "Searching for Streamlit processes..."

    # pgrep -f: search full command line for pattern matching streamlit + our port
    local pid=$(pgrep -f "streamlit.*server\.port[= ]$DW_FRONTEND_PORT" | head -1)

    if [ -n "$pid" ]; then
        terminate_process_gracefully "$pid"
    else
        print_success "No Streamlit processes found using port $DW_FRONTEND_PORT"
    fi
}

clean_dw_frontend_port() {
    print_status "Checking for process using port $DW_FRONTEND_PORT..."

    # Find only the server process in LISTEN state (not browser connections in ESTABLISHED state)
    local pid=$(lsof -ti :$DW_FRONTEND_PORT -sTCP:LISTEN 2>/dev/null | head -1)

    if [ -n "$pid" ]; then
        terminate_process_gracefully "$pid"
    else
        print_success "No processes found using port $DW_FRONTEND_PORT"
    fi
}

main() {
    print_status "Cleaning up Data Warehouse dashboard..."

    # Streamlit should be terminated by ctrl+c
    # This is fallback
    clean_dw_frontend_port
    clean_streamlit_by_process

    print_success "Data Warehouse dashboard cleanup completed"
}

main "$@"