#!/bin/bash

# Elasticsearch Status Check Script
# Reports the current status of Elasticsearch containers

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Elasticsearch container is running
if docker compose ps elasticsearch --format '{{.State}}' | grep -q 'running'; then
    print_success "Elasticsearch container is running"
    
    # Check if Elasticsearch is actually ready
    if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
        print_success "Elasticsearch is ready and responding"
    else
        print_info "Elasticsearch container is running but not yet ready"
    fi
else
    print_error "Elasticsearch container is not running"
fi

# Always exit with 0 - just report status, don't fail
exit 0 