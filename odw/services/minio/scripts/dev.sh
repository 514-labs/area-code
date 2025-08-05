#!/bin/bash

# MinIO Service Development Script

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
MINIO_API_PORT=9500
MINIO_CONSOLE_PORT=9501
MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="minioadmin"

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

print_port_conflict_instructions() {
    local port=$1

    print_error "Port $port is already in use!"
    print_status ""
    print_status "To find what's using port $port, try these commands:"
    print_status ""

    if command -v lsof >/dev/null 2>&1; then
        print_status "Using lsof (recommended):"
        print_status "  lsof -i :$port"
        print_status ""
    fi

    print_status "To terminate the process using port $port:"
    print_status "  1. Find the PID using one of the commands above"
    print_status "  2. Kill the process: kill <PID>"
    print_status "  3. Or force kill: kill -9 <PID>"
    print_status ""
    print_status "Then retry this script"
}

is_minio_running() {
    if ! check_docker; then
        return 1
    fi
    docker ps --filter "name=$MINIO_CONTAINER_NAME" --format "{{.Names}}" | grep -q "$MINIO_CONTAINER_NAME"
}

install_minio_client() {
    print_status "Ensuring MinIO client is available..."
    
    # Check if mc is already available in the container
    if docker exec "$MINIO_CONTAINER_NAME" mc --version &>/dev/null; then
        print_success "MinIO client is already available in container"
        return 0
    fi
    
    # Check if mc is available on host system
    if command -v mc &>/dev/null; then
        print_success "MinIO client is available on host system"
        return 0
    fi
    
    # Install mc using Homebrew (macOS/Linux)
    if command -v brew &>/dev/null; then
        print_status "Installing MinIO client via Homebrew..."
        brew install minio/stable/mc
        return 0
    fi
    
    print_warning "MinIO client not found. Please install manually:"
    print_status "  macOS: brew install minio/stable/mc"
    print_status "  Linux: curl https://dl.min.io/client/mc/release/linux-amd64/mc -o mc && chmod +x mc"
    return 1
}

setup_minio_buckets() {
    print_status "Setting up MinIO buckets and permissions..."
    
    # Wait a bit more for MinIO to be fully ready
    sleep 3
    
    # Set up MinIO alias using container's mc client
    print_status "Configuring MinIO client alias..."
    docker exec "$MINIO_CONTAINER_NAME" mc alias set minio http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
    
    # Create unstructured-data bucket
    print_status "Creating unstructured-data bucket..."
    if docker exec "$MINIO_CONTAINER_NAME" mc mb minio/unstructured-data 2>/dev/null; then
        print_success "unstructured-data bucket created successfully"
    else
        print_warning "unstructured-data bucket already exists"
    fi
    
    # Create parseable bucket
    print_status "Creating parseable bucket..."
    if docker exec "$MINIO_CONTAINER_NAME" mc mb minio/parseable 2>/dev/null; then
        print_success "parseable bucket created successfully"
    else
        print_warning "parseable bucket already exists"
    fi
    
    # Set bucket permissions
    print_status "Setting bucket permissions..."
    docker exec "$MINIO_CONTAINER_NAME" mc anonymous set public minio/unstructured-data 2>/dev/null || true
    docker exec "$MINIO_CONTAINER_NAME" mc anonymous set download minio/unstructured-data 2>/dev/null || true
    
    print_success "All buckets configured successfully"
}

start_minio() {
    if ! check_docker; then
        print_error "Docker not available, cannot start MinIO"
        exit 1
    fi

    if is_minio_running; then
        print_warning "MinIO is already running"
        setup_minio_buckets  # Still ensure buckets exist
        return 0
    fi

    if is_port_in_use $MINIO_API_PORT; then
        print_port_conflict_instructions $MINIO_API_PORT
        exit 1
    fi

    if is_port_in_use $MINIO_CONSOLE_PORT; then
        print_port_conflict_instructions $MINIO_CONSOLE_PORT
        exit 1
    fi

    print_status "Starting MinIO..."

    docker run -d \
        --name "$MINIO_CONTAINER_NAME" \
        --rm \
        -p $MINIO_API_PORT:9000 \
        -p $MINIO_CONSOLE_PORT:9001 \
        -e MINIO_ROOT_USER="$MINIO_ROOT_USER" \
        -e MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
        -v data-warehouse_minio-data:/data \
        minio/minio server /data --console-address ":9001" > /dev/null 2>&1

    print_status "Waiting for MinIO to be ready..."
    sleep 5
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if is_minio_running && docker exec "$MINIO_CONTAINER_NAME" mc --version &>/dev/null; then
            print_success "MinIO started successfully"
            print_success "  API: http://localhost:$MINIO_API_PORT"
            print_success "  Console: http://localhost:$MINIO_CONSOLE_PORT"
            print_success "  Credentials: $MINIO_ROOT_USER / $MINIO_ROOT_PASSWORD"
            break
        fi
        
        print_status "Attempt $attempt/$max_attempts - waiting for MinIO to be fully ready..."
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Failed to start MinIO within expected time"
        exit 1
    fi
    
    # Set up buckets once MinIO is ready
    setup_minio_buckets
}

main() {
    print_status "Starting MinIO service..."
    start_minio
}

main "$@"