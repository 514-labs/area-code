#!/bin/bash

# Kafdrop Service Development Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVICE_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Port configuration
REDPANDA_PORT=9092
REDPANDA_ADMIN_PORT=9644
KAFDROP_CONTAINER_NAME="data-warehouse-kafdrop"
KAFDROP_PORT=9999

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

is_port_in_use() {
    local port=$1
    if lsof -i ":$port" >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is available
    fi
}

get_docker_network() {
    local network_name="data-warehouse_default"

    # Check if network exists
    if docker network ls --format "{{.Name}}" | grep -q "^${network_name}$"; then
        echo "$network_name"
    else
        print_warning "Network $network_name not found, using default"
        echo "bridge"  # fallback to bridge network
    fi
}

is_kafdrop_running() {
    if ! check_docker; then
        return 1
    fi
    docker ps --filter "name=$KAFDROP_CONTAINER_NAME" --format "{{.Names}}" | grep -q "$KAFDROP_CONTAINER_NAME"
}

wait_for_redpanda() {
    print_status "Waiting for Redpanda to be ready..."
    local max_attempts=30
    local attempts=0

    while [ $attempts -lt $max_attempts ]; do
        # Check Redpanda status endpoint
        if curl -s --connect-timeout 2 localhost:$REDPANDA_ADMIN_PORT/v1/status/ready >/dev/null 2>&1; then
            print_success "Redpanda is ready!"
            return 0
        fi

        attempts=$((attempts + 1))
        print_status "Waiting for Redpanda... (attempt $attempts/$max_attempts)"
        sleep 2
    done

    print_warning "Redpanda not ready after $max_attempts attempts"
    return 1
}

start_kafdrop() {
    if ! check_docker; then
        print_error "Docker not available, cannot start Kafdrop"
        exit 1
    fi

    if is_kafdrop_running; then
        print_warning "Kafdrop is already running"
        return 0
    fi

    # Check if port is in use
    if is_port_in_use $KAFDROP_PORT; then
        print_error "Port $KAFDROP_PORT is already in use!"
        print_status "To find what's using port $KAFDROP_PORT: lsof -i :$KAFDROP_PORT"
        exit 1
    fi

    print_status "Starting Kafdrop..."

    local network_name=$(get_docker_network)

    # Start Kafdrop container
    docker run -d \
        --name "$KAFDROP_CONTAINER_NAME" \
        --network "$network_name" \
        --rm \
        -p $KAFDROP_PORT:9000 \
        -e KAFKA_BROKERCONNECT=redpanda:$REDPANDA_PORT \
        -e SERVER_SERVLET_CONTEXTPATH="/" \
        obsidiandynamics/kafdrop > /dev/null 2>&1

    # Wait and verify
    sleep 3
    if is_kafdrop_running; then
        print_success "Kafdrop started successfully at http://localhost:$KAFDROP_PORT"
    else
        print_error "Failed to start Kafdrop"
        exit 1
    fi
}

main() {
    print_status "Starting Kafdrop service..."

    if ! wait_for_redpanda; then
        print_warning "Redpanda is not available. Data Warehouse might still be starting up."
        print_status "Kafdrop is not running."
        exit 0
    fi

    start_kafdrop
}

main "$@"