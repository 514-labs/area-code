#!/bin/bash

# Kafdrop Service Cleanup Script

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
    echo -e "${BLUE}[KAFDROP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[KAFDROP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[KAFDROP]${NC} $1"
}

print_error() {
    echo -e "${RED}[KAFDROP]${NC} $1"
}

# Kafdrop configuration
KAFDROP_CONTAINER_NAME="data-warehouse-kafdrop"

check_docker() {
    if ! command -v docker &> /dev/null; then
        return 1
    fi

    if ! docker info &> /dev/null; then
        return 1
    fi

    return 0
}

is_kafdrop_running() {
    if ! check_docker; then
        return 1
    fi
    docker ps --filter "name=$KAFDROP_CONTAINER_NAME" --format "{{.Names}}" | grep -q "$KAFDROP_CONTAINER_NAME"
}

stop_kafdrop() {
    if ! check_docker; then
        return 0
    fi

    if ! is_kafdrop_running; then
        print_warning "Kafdrop is not running"
        return 0
    fi

    print_status "Stopping Kafdrop container..."

    if docker stop "$KAFDROP_CONTAINER_NAME" > /dev/null 2>&1; then
        print_success "Kafdrop stopped successfully"
    else
        print_warning "Failed to stop Kafdrop gracefully, trying force removal..."
        docker rm -f "$KAFDROP_CONTAINER_NAME" > /dev/null 2>&1 || true
        print_success "Kafdrop container removed"
    fi
}

main() {
    print_status "Cleaning up Kafdrop service..."
    stop_kafdrop
    print_success "Kafdrop Service cleanup completed"
}

main "$@"