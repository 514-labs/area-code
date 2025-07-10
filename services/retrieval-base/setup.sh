#!/bin/bash

# Retrieval Base Service Setup Script
# Based on README.md instructions

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  setup     - Full setup (install, start ES, init indices, seed data, start service)"
    echo "  start     - Start the retrieval service only"
    echo "  stop      - Stop the retrieval service"
    echo "  restart   - Restart the retrieval service"
    echo "  status    - Show service status"
    echo "  reset     - Full reset (stop services, clear data, restart everything)"
    echo "  es:start  - Start Elasticsearch and Kibana only"
    echo "  es:stop   - Stop Elasticsearch and Kibana"
    echo "  es:reset  - Reset Elasticsearch data (stop, remove volumes, restart)"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # Full setup"
    echo "  $0 start     # Start service only"
    echo "  $0 stop      # Stop service"
    echo "  $0 reset     # Full reset with fresh data"
    echo "  $0 status    # Check status"
    echo ""
}

# Function to get service PID
get_service_pid() {
    pgrep -f "pnpm dev" | head -1
}

# Function to check if service is running
is_service_running() {
    local pid=$(get_service_pid)
    if [ -n "$pid" ]; then
        return 0  # Service is running
    else
        return 1  # Service is not running
    fi
}

# Function to check if Elasticsearch is running
is_elasticsearch_running() {
    if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
        return 0  # Elasticsearch is running
    else
        return 1  # Elasticsearch is not running
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20+"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js version 20+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js version: $(node --version)"
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install pnpm"
        exit 1
    fi
    
    print_success "pnpm version: $(pnpm --version)"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker"
        exit 1
    fi
    
    print_success "Docker version: $(docker --version)"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose"
        exit 1
    fi
    
    print_success "Docker Compose version: $(docker-compose --version)"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    pnpm install
    print_success "Dependencies installed successfully"
}

# Start Elasticsearch
start_elasticsearch() {
    print_status "Starting Elasticsearch and Kibana..."
    pnpm es:setup
    
    # Wait for Elasticsearch to be ready
    print_status "Waiting for Elasticsearch to be ready..."
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            print_success "Elasticsearch is ready!"
            break
        fi
        
        print_status "Attempt $attempt/$max_attempts: Waiting for Elasticsearch..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Elasticsearch failed to start within expected time"
        exit 1
    fi
}

# Initialize indices
init_indices() {
    print_status "Initializing Elasticsearch indices..."
    pnpm es:init-indices
    print_success "Indices initialized successfully"
}

# Seed sample data
seed_data() {
    print_status "Seeding sample data..."
    pnpm es:seed
    print_success "Sample data seeded successfully"
}

# Start the service
start_service() {
    if is_service_running; then
        print_warning "Service is already running (PID: $(get_service_pid))"
        return 0
    fi
    
    print_status "Starting the retrieval service..."
    print_status "The service will be available at http://localhost:8082"
    print_status "API documentation will be available at http://localhost:8082/docs"
    
    # Start the service in the background
    pnpm dev &
    SERVICE_PID=$!
    
    # Wait a moment for the service to start
    sleep 3
    
    # Check if service is running
    if curl -s http://localhost:8082/health > /dev/null 2>&1; then
        print_success "Service started successfully!"
        print_status "Service PID: $SERVICE_PID"
        print_status "To stop the service, run: $0 stop"
    else
        print_warning "Service may still be starting up..."
        print_status "Check http://localhost:8082/health for service status"
    fi
}

# Stop the service
stop_service() {
    local pid=$(get_service_pid)
    
    if [ -z "$pid" ]; then
        print_warning "Service is not running"
        return 0
    fi
    
    print_status "Stopping retrieval service (PID: $pid)..."
    kill "$pid"
    
    # Wait for the process to stop
    local attempts=0
    while [ $attempts -lt 10 ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            print_success "Service stopped successfully"
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
    done
    
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        print_warning "Service didn't stop gracefully, force killing..."
        kill -9 "$pid"
        print_success "Service force stopped"
    fi
}

# Restart the service
restart_service() {
    print_status "Restarting retrieval service..."
    stop_service
    sleep 2
    start_service
}

# Show service status
show_status() {
    echo "=========================================="
    echo "  Retrieval Base Service Status"
    echo "=========================================="
    echo ""
    
    # Check service status
    if is_service_running; then
        local pid=$(get_service_pid)
        print_success "Service is running (PID: $pid)"
        
        # Check if service is responding
        if curl -s http://localhost:8082/health > /dev/null 2>&1; then
            print_success "Service is responding to health checks"
        else
            print_warning "Service is running but not responding to health checks"
        fi
    else
        print_error "Service is not running"
    fi
    
    echo ""
    
    # Check Elasticsearch status
    if is_elasticsearch_running; then
        print_success "Elasticsearch is running"
        local es_health=$(curl -s http://localhost:9200/_cluster/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        print_status "Elasticsearch status: $es_health"
    else
        print_error "Elasticsearch is not running"
    fi
    
    echo ""
    echo "Available endpoints:"
    echo "  • Service: http://localhost:8082"
    echo "  • Health check: http://localhost:8082/health"
    echo "  • API docs: http://localhost:8082/docs"
    echo "  • Kibana: http://localhost:5601"
    echo "  • Elasticsearch: http://localhost:9200"
    echo ""
}

# Start Elasticsearch only
start_elasticsearch_only() {
    if is_elasticsearch_running; then
        print_warning "Elasticsearch is already running"
        return 0
    fi
    
    print_status "Starting Elasticsearch and Kibana..."
    pnpm es:setup
    
    # Wait for Elasticsearch to be ready
    print_status "Waiting for Elasticsearch to be ready..."
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            print_success "Elasticsearch is ready!"
            break
        fi
        
        print_status "Attempt $attempt/$max_attempts: Waiting for Elasticsearch..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Elasticsearch failed to start within expected time"
        exit 1
    fi
}

# Stop Elasticsearch only
stop_elasticsearch_only() {
    print_status "Stopping Elasticsearch and Kibana..."
    pnpm es:stop 2>/dev/null || docker-compose down
    print_success "Elasticsearch and Kibana stopped"
}

# Reset Elasticsearch data
reset_elasticsearch() {
    print_status "Resetting Elasticsearch data..."
    pnpm es:reset
    print_success "Elasticsearch data reset successfully"
}

# Full reset - stop services, clear data, restart
full_reset() {
    print_status "Performing full reset..."
    echo ""
    
    # Stop the retrieval service
    print_status "Stopping retrieval service..."
    stop_service
    
    # Stop Elasticsearch
    print_status "Stopping Elasticsearch and Kibana..."
    stop_elasticsearch_only
    
    # Wait a moment for services to fully stop
    sleep 3
    
    # Clear Elasticsearch data directory
    print_status "Clearing Elasticsearch data..."
    if [ -d "volumes/elasticsearch/data" ]; then
        sudo rm -rf volumes/elasticsearch/data/* 2>/dev/null || rm -rf volumes/elasticsearch/data/*
        print_success "Elasticsearch data cleared"
    else
        print_warning "Elasticsearch data directory not found"
    fi
    
    # Start Elasticsearch
    print_status "Starting Elasticsearch..."
    start_elasticsearch_only
    
    # Initialize indices
    print_status "Initializing indices..."
    init_indices
    
    # Seed data
    print_status "Seeding sample data..."
    seed_data
    
    # Start the service
    print_status "Starting retrieval service..."
    start_service
    
    echo ""
    print_success "Full reset completed successfully!"
    echo ""
    echo "All services have been restarted with fresh data."
    echo "Available endpoints:"
    echo "  • Service: http://localhost:8082"
    echo "  • Health check: http://localhost:8082/health"
    echo "  • API docs: http://localhost:8082/docs"
    echo "  • Kibana: http://localhost:5601"
    echo ""
}

# Main setup function (full setup)
full_setup() {
    echo "=========================================="
    echo "  Retrieval Base Service Setup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    install_dependencies
    echo ""
    
    start_elasticsearch_only
    echo ""
    
    init_indices
    echo ""
    
    seed_data
    echo ""
    
    start_service
    echo ""
    
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Available endpoints:"
    echo "  • Service: http://localhost:8082"
    echo "  • Health check: http://localhost:8082/health"
    echo "  • API docs: http://localhost:8082/docs"
    echo "  • Kibana: http://localhost:5601"
    echo ""
    echo "Example API calls:"
    echo "  • Search all: curl 'http://localhost:8082/api/search?q=test'"
    echo "  • Search foos: curl 'http://localhost:8082/api/search/foos?q=urgent'"
    echo "  • Search bars: curl 'http://localhost:8082/api/search/bars?fooId=foo-1'"
    echo ""
    echo "To reset data: $0 es:reset"
    echo "To view logs: docker logs retrieval-base-elasticsearch"
    echo ""
}

# Main function to handle command-line arguments
main() {
    case "${1:-setup}" in
        "setup")
            full_setup
            ;;
        "start")
            start_service
            ;;
        "stop")
            stop_service
            ;;
        "restart")
            restart_service
            ;;
        "status")
            show_status
            ;;
        "reset")
            full_reset
            ;;
        "es:start")
            start_elasticsearch_only
            ;;
        "es:stop")
            stop_elasticsearch_only
            ;;
        "es:reset")
            reset_elasticsearch
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 