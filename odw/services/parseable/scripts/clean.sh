#!/bin/bash

# Parseable Service Cleanup Script

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
    echo -e "${BLUE}[PARSEABLE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PARSEABLE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[PARSEABLE]${NC} $1"
}

print_error() {
    echo -e "${RED}[PARSEABLE]${NC} $1"
}

# Configuration
PARSEABLE_CONTAINER_NAME="data-warehouse-parseable"
PARSEABLE_IMAGE="parseable/parseable:v2.3.5"

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        return 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        return 1
    fi
    
    return 0
}

stop_container() {
    print_status "Checking for running Parseable container..."
    
    if docker ps --format "table {{.Names}}" | grep -q "$PARSEABLE_CONTAINER_NAME"; then
        print_status "Stopping Parseable container..."
        if docker stop "$PARSEABLE_CONTAINER_NAME"; then
            print_success "Container stopped successfully"
        else
            print_error "Failed to stop container"
            return 1
        fi
    else
        print_status "No running Parseable container found"
    fi
}

remove_container() {
    print_status "Checking for Parseable container..."
    
    if docker ps -a --format "table {{.Names}}" | grep -q "$PARSEABLE_CONTAINER_NAME"; then
        print_status "Removing Parseable container..."
        if docker rm "$PARSEABLE_CONTAINER_NAME"; then
            print_success "Container removed successfully"
        else
            print_error "Failed to remove container"
            return 1
        fi
    else
        print_status "No Parseable container found"
    fi
}

remove_image() {
    local remove_image_flag=false
    
    # Check for --remove-image flag
    for arg in "$@"; do
        if [ "$arg" = "--remove-image" ]; then
            remove_image_flag=true
            break
        fi
    done
    
    if [ "$remove_image_flag" = true ]; then
        print_status "Checking for Parseable image..."
        
        if docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "$PARSEABLE_IMAGE"; then
            print_status "Removing Parseable image..."
            if docker rmi "$PARSEABLE_IMAGE"; then
                print_success "Image removed successfully"
            else
                print_warning "Failed to remove image (may be in use)"
            fi
        else
            print_status "No Parseable image found"
        fi
    else
        print_status "Keeping Docker image for faster future startups"
        print_status "Use --remove-image flag to remove the image as well"
    fi
}

main() {
    print_status "Cleaning up Parseable observability service..."
    
    if ! check_docker; then
        exit 1
    fi
    
    stop_container
    remove_container
    remove_image "$@"
    
    print_success "Parseable cleanup completed"
}

main "$@"