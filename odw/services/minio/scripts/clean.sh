#!/bin/bash

# MinIO Service Cleanup Script

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
    echo -e "${BLUE}[MINIO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[MINIO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[MINIO]${NC} $1"
}

print_error() {
    echo -e "${RED}[MINIO]${NC} $1"
}

# MinIO configuration
MINIO_CONTAINER_NAME="data-warehouse-minio"

check_docker() {
    if ! command -v docker &> /dev/null; then
        return 1
    fi

    if ! docker info &> /dev/null; then
        return 1
    fi

    return 0
}

is_minio_running() {
    if ! check_docker; then
        return 1
    fi
    docker ps --filter "name=$MINIO_CONTAINER_NAME" --format "{{.Names}}" | grep -q "$MINIO_CONTAINER_NAME"
}

stop_minio() {
    if ! check_docker; then
        return 0
    fi

    if ! is_minio_running; then
        print_warning "MinIO is not running"
        return 0
    fi

    print_status "Stopping MinIO container..."

    if docker stop "$MINIO_CONTAINER_NAME" > /dev/null 2>&1; then
        print_success "MinIO stopped successfully"
    else
        print_warning "Failed to stop MinIO gracefully, trying force removal..."
        docker rm -f "$MINIO_CONTAINER_NAME" > /dev/null 2>&1 || true
        print_success "MinIO container removed"
    fi
}

main() {
    print_status "Cleaning up MinIO service..."
    stop_minio
    print_success "MinIO service cleanup completed"
}

main "$@"