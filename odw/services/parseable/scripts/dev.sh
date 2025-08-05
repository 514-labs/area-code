#!/bin/bash

# Parseable Service Development Script

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

# Parseable configuration
PARSEABLE_CONTAINER_NAME="data-warehouse-parseable"
PARSEABLE_PORT=9600
PARSEABLE_IMAGE="parseable/parseable:v2.3.5"

# S3/MinIO configuration for Parseable
MINIO_CONTAINER="data-warehouse-minio"
MINIO_ENDPOINT="http://host.docker.internal:9500"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
S3_BUCKET="parseable"

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        return 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        print_status "Please start Docker Desktop and wait for it to be ready"
        print_status "Then retry: pnpm odw:dev"
        return 1
    fi
    
    return 0
}

check_minio_dependency() {
    print_status "Checking MinIO dependency..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker ps --format "table {{.Names}}" | grep -q "data-warehouse-minio"; then
            print_success "MinIO dependency satisfied"
            return 0
        fi
        
        if [ $attempt -eq 1 ]; then
            print_status "MinIO container not found, waiting for it to start..."
            print_status "This is normal during parallel startup - MinIO may still be initializing"
        fi
        
        print_status "Attempt $attempt/$max_attempts - waiting for MinIO..."
        sleep 3
        ((attempt++))
    done
    
    print_error "MinIO container not found after waiting"
    print_warning "Parseable requires MinIO for S3 storage backend"
    print_status "If this persists, try starting MinIO manually: cd ../minio && pnpm dev"
    return 1
}

verify_s3_bucket() {
    print_status "Verifying S3 bucket exists: $S3_BUCKET"
    
    # Check if bucket exists (MinIO service should have created it)
    if docker exec data-warehouse-minio mc ls "minio/$S3_BUCKET" &>/dev/null; then
        print_success "S3 bucket '$S3_BUCKET' is available"
        return 0
    else
        print_warning "S3 bucket '$S3_BUCKET' not found - MinIO may still be initializing"
        print_status "Attempting to create bucket..."
        if docker exec data-warehouse-minio mc mb "minio/$S3_BUCKET" 2>/dev/null; then
            print_success "S3 bucket '$S3_BUCKET' created successfully"
            return 0
        else
            print_error "Failed to create or access S3 bucket '$S3_BUCKET'"
            return 1
        fi
    fi
}

pull_image() {
    print_status "Pulling Parseable image: $PARSEABLE_IMAGE"
    if docker pull "$PARSEABLE_IMAGE"; then
        print_success "Image pulled successfully"
    else
        print_error "Failed to pull Parseable image"
        return 1
    fi
}

stop_existing_container() {
    if docker ps -a --format "table {{.Names}}" | grep -q "$PARSEABLE_CONTAINER_NAME"; then
        print_status "Stopping existing Parseable container..."
        docker stop "$PARSEABLE_CONTAINER_NAME" 2>/dev/null || true
        docker rm "$PARSEABLE_CONTAINER_NAME" 2>/dev/null || true
        print_success "Existing container stopped and removed"
    fi
}

start_parseable() {
    print_status "Starting Parseable container..."
    
    if docker run -d \
        --name "$PARSEABLE_CONTAINER_NAME" \
        -p "$PARSEABLE_PORT:8000" \
        -e P_S3_URL="$MINIO_ENDPOINT" \
        -e P_S3_ACCESS_KEY="$MINIO_ACCESS_KEY" \
        -e P_S3_SECRET_KEY="$MINIO_SECRET_KEY" \
        -e P_S3_REGION="us-east-1" \
        -e P_S3_BUCKET="$S3_BUCKET" \
        -e P_USERNAME="admin" \
        -e P_PASSWORD="admin" \
        "$PARSEABLE_IMAGE" \
        parseable s3-store; then
        
        print_success "Parseable container started successfully"
        return 0
    else
        print_error "Failed to start Parseable container"
        return 1
    fi
}

wait_for_parseable() {
    print_status "Waiting for Parseable to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Try different health endpoints that Parseable might use
        if curl -s -f "http://localhost:$PARSEABLE_PORT/api/v1/about" &>/dev/null || \
           curl -s -f "http://localhost:$PARSEABLE_PORT/health" &>/dev/null || \
           curl -s -f "http://localhost:$PARSEABLE_PORT/" &>/dev/null; then
            print_success "Parseable is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - waiting for Parseable..."
        sleep 3
        ((attempt++))
    done
    
    print_error "Parseable failed to start within the expected time"
    print_status "You can check the logs with: docker logs $PARSEABLE_CONTAINER_NAME"
    print_status "You can also try accessing it directly at: http://localhost:$PARSEABLE_PORT"
    return 1
}

show_info() {
    echo
    print_success "==================================="
    print_success "Parseable Observability Platform"
    print_success "==================================="
    print_success "Web UI: http://localhost:$PARSEABLE_PORT"
    print_success "Container: $PARSEABLE_CONTAINER_NAME"
    print_success "S3 Backend: $S3_BUCKET bucket on MinIO"
    echo
    print_warning "NOTE: Parseable may take a few minutes to fully initialize"
    print_warning "If the web UI doesn't load immediately, wait and try again"
    echo
    print_status "Useful commands:"
    print_status "  View logs: docker logs $PARSEABLE_CONTAINER_NAME"
    print_status "  Check status: docker ps | grep parseable"
    print_status "  Stop: docker stop $PARSEABLE_CONTAINER_NAME"
    print_status "  Clean: pnpm clean"
    echo
}

main() {
    print_status "Starting Parseable observability service..."
    
    if ! check_docker; then
        exit 1
    fi
    
    if ! check_minio_dependency; then
        exit 1
    fi
    
    if ! verify_s3_bucket; then
        exit 1
    fi
    
    pull_image
    stop_existing_container
    
    if start_parseable; then
        print_status "Parseable container started - allowing time for initialization..."
        sleep 3
        
        # Check multiple times as Parseable may restart during initialization
        local running=false
        for i in {1..3}; do
            if docker ps --format "table {{.Names}}" | grep -q "$PARSEABLE_CONTAINER_NAME"; then
                running=true
                break
            fi
            print_status "Checking again in 2 seconds... (attempt $i/3)"
            sleep 2
        done
        
        if [ "$running" = true ]; then
            print_success "Parseable container is running!"
            show_info
        else
            print_warning "Parseable container may have encountered startup issues"
            print_status "This is common on first startup - checking logs:"
            docker logs "$PARSEABLE_CONTAINER_NAME" | tail -5
            print_status "Container will continue running in background and may recover"
            print_status "Monitor with: docker logs -f $PARSEABLE_CONTAINER_NAME"
            show_info
        fi
    else
        exit 1
    fi
}

main "$@"