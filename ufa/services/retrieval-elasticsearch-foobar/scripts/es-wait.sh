#!/bin/bash

# Elasticsearch Wait Script
# Waits for Elasticsearch to be ready

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

wait_for_elasticsearch() {
    print_info "Waiting for Elasticsearch to be ready..."
    local max_attempts=120
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            print_success "Elasticsearch is ready!"
            return 0
        fi
        
        echo "  Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Elasticsearch failed to start within expected time"
    return 1
}

wait_for_elasticsearch 