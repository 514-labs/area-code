#!/bin/bash

# Analytical Base Service Setup Script
# Based on Moose.js requirements and infrastructure needs

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
    echo "  setup     - Full setup (install, start service with moose dev)"
    echo "  start     - Start the analytical service only"
    echo "  stop      - Stop the analytical service"
    echo "  restart   - Restart the analytical service"
    echo "  status    - Show service status"
    echo "  reset     - Full reset (stop service, restart)"
    echo "  migrate   - Run PostgreSQL to ClickHouse migration"
    echo "  infra:start  - Start Moose infrastructure (managed by moose dev)"
    echo "  infra:stop   - Stop Moose infrastructure"
    echo "  infra:reset  - Reset infrastructure data"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # Full setup"
    echo "  $0 start     # Start service only"
    echo "  $0 stop      # Stop service"
    echo "  $0 reset     # Full reset"
    echo "  $0 status    # Check status"
    echo "  $0 migrate   # Run data migration"
    echo ""
    echo "Note: This service uses 'moose dev' to manage infrastructure automatically."
    echo "The service PID is tracked in /tmp/analytical.pid"
    echo ""
}

# Function to get service PID
get_service_pid() {
    if [ -f "/tmp/analytical.pid" ]; then
        cat /tmp/analytical.pid 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Function to check if service is running
is_service_running() {
    local pid=$(get_service_pid)
    if [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
        return 0  # Service is running
    else
        return 1  # Service is not running
    fi
}



# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Moose CLI
    if ! command -v moose &> /dev/null; then
        print_error "Moose CLI is not installed. Please install it with: npm install -g @514labs/moose-cli"
        exit 1
    fi
    
    print_success "Moose CLI version: $(moose --version 2>/dev/null || echo 'unknown')"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    pnpm install
    print_success "Dependencies installed successfully"
}

# Start Moose infrastructure
start_infrastructure() {
    print_status "Starting Moose infrastructure using 'moose dev'..."
    
    # Check if moose CLI is available
    if ! command -v moose &> /dev/null; then
        print_error "Moose CLI is not installed. Please install it with: npm install -g @514labs/moose-cli"
        exit 1
    fi
    
    print_success "Moose CLI version: $(moose --version 2>/dev/null || echo 'unknown')"
    
    # Note: moose dev will handle infrastructure startup automatically
    print_status "Moose will automatically start required infrastructure services"
    print_status "This may take a few minutes on first run..."
}

# Start the service
start_service() {
    if is_service_running; then
        print_warning "Service is already running (PID: $(get_service_pid))"
        return 0
    fi
    
    print_status "Starting the analytical service..."
    print_status "The service will be available at http://localhost:4100"
    print_status "Management interface will be available at http://localhost:5101"
    print_status "Temporal UI will be available at http://localhost:8080"
    
    # Start the service in the background and track PID
    moose dev &
    SERVICE_PID=$!
    
    # Save PID to file
    echo "$SERVICE_PID" > /tmp/analytical.pid
    
    # Wait for the service to become available
    print_status "Waiting for service to become available on localhost:4100..."
    
    # Get the directory of this script to find wait_for_port.sh
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    WAIT_SCRIPT="$SCRIPT_DIR/../../wait_for_port.sh"
    
    if "$WAIT_SCRIPT" localhost 4100; then
        print_success "Service started successfully!"
        print_status "Service PID: $SERVICE_PID (saved to /tmp/analytical.pid)"
        print_status "To stop the service, run: $0 stop"
    else
        print_warning "Service may still be starting up..."
        print_status "Check http://localhost:4100 for service status"
    fi

    touch app/index.ts
}

# Stop the service
stop_service() {
    local pid=$(get_service_pid)
    
    if [ -z "$pid" ]; then
        print_warning "Service is not running"
        return 0
    fi
    
    print_status "Stopping analytical service (PID: $pid)..."
    kill "$pid"
    
    # Wait for the process to stop
    local attempts=0
    while [ $attempts -lt 10 ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            print_success "Service stopped successfully"
            # Remove PID file
            rm -f /tmp/analytical.pid
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
    
    # Remove PID file
    rm -f /tmp/analytical.pid
}

# Restart the service
restart_service() {
    print_status "Restarting analytical service..."
    stop_service
    sleep 2
    start_service
}

# Show service status
show_status() {
    echo "=========================================="
    echo "  Analytical Base Service Status"
    echo "=========================================="
    echo ""
    
    # Check service status
    if is_service_running; then
        local pid=$(get_service_pid)
        print_success "Service is running (PID: $pid)"
        
        # Check if service is responding
        if curl -s http://localhost:4100 > /dev/null 2>&1; then
            print_success "Service is responding to requests"
        else
            print_warning "Service is running but not responding to requests"
        fi
    else
        print_error "Service is not running"
    fi
    
    echo ""
    echo "Infrastructure: Managed by Moose.js"
    echo "  • All infrastructure services (Redpanda, ClickHouse, Redis, Temporal) are managed automatically"
    echo "  • Infrastructure may take time to start up on first run"
    echo ""
    echo "Available endpoints:"
    echo "  • Service: http://localhost:4100"
    echo "  • Management: http://localhost:5101"
    echo "  • Temporal UI: http://localhost:8080"
    echo "  • Redpanda: localhost:19092"
    echo "  • ClickHouse: localhost:18123"
    echo "  • Redis: localhost:6379"
    echo ""
}

# Start infrastructure only
start_infrastructure_only() {
    print_status "Starting Moose infrastructure..."
    start_infrastructure
}

# Stop infrastructure only
stop_infrastructure_only() {
    print_status "Stopping Moose infrastructure..."
    print_warning "Note: Moose manages its own infrastructure. Use 'moose dev --stop' to stop infrastructure."
    print_status "Or manually stop the moose dev process to stop all services."
}

# Reset infrastructure data
reset_infrastructure() {
    print_status "Resetting infrastructure data..."
    
    # Stop the service first
    stop_service
    
    # Delete .moose folder
    if [ -d ".moose" ]; then
        print_status "Deleting .moose folder..."
        rm -rf .moose
        print_success ".moose folder deleted"
    else
        print_status ".moose folder not found, skipping deletion"
    fi
    
    print_warning "Note: Moose manages its own infrastructure data."
    print_status "To reset infrastructure data, you may need to:"
    print_status "1. Stop the moose dev process"
    print_status "2. Clear any local data directories"
    print_status "3. Restart with 'moose dev'"
    
    # Start infrastructure
    start_infrastructure_only
    
    print_success "Infrastructure reset initiated"
}

# Run PostgreSQL to ClickHouse migration
run_migration() {
    print_status "Running PostgreSQL to ClickHouse migration..."
    
    # Check if migration script exists
    if [ ! -f "./migrate-from-postgres.sh" ]; then
        print_error "Migration script not found: ./migrate-from-postgres.sh"
        exit 1
    fi
    
    # Check if script is executable
    if [ ! -x "./migrate-from-postgres.sh" ]; then
        print_status "Making migration script executable..."
        chmod +x ./migrate-from-postgres.sh
    fi
    
    print_status "Starting migration process..."
    print_warning "This will migrate data from PostgreSQL to ClickHouse"
    print_status "Make sure PostgreSQL is running and contains data to migrate"
    
    # Run the migration script
    if ./migrate-from-postgres.sh; then
        print_success "Migration completed successfully!"
    else
        print_error "Migration failed!"
        exit 1
    fi
}

# Full reset - stop services, clear data, restart
full_reset() {
    print_status "Performing full reset..."
    echo ""
    
    # Stop the analytical service
    print_status "Stopping analytical service..."
    stop_service
    
    # Wait a moment for services to fully stop
    sleep 3
    
    # Delete .moose folder
    if [ -d ".moose" ]; then
        print_status "Deleting .moose folder..."
        rm -rf .moose
        print_success ".moose folder deleted"
    else
        print_status ".moose folder not found, skipping deletion"
    fi
    
    print_warning "Note: Moose manages its own infrastructure."
    print_status "To perform a complete reset:"
    print_status "1. Stop any running moose dev processes"
    print_status "2. Clear any local data directories if needed"
    print_status "3. Restart with 'moose dev'"
    
    # Start the service
    print_status "Starting analytical service..."
    start_service
    
    echo ""
    print_success "Full reset completed successfully!"
    echo ""
    echo "All services have been restarted."
    echo "Available endpoints:"
    echo "  • Service: http://localhost:4100"
    echo "  • Management: http://localhost:5101"
    echo "  • Temporal UI: http://localhost:8080"
    echo ""
}

# Main setup function (full setup)
full_setup() {
    echo "=========================================="
    echo "  Analytical Base Service Setup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    install_dependencies
    echo ""
    
    start_service
    echo ""
    
    run_migration
    echo ""
    
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Available endpoints:"
    echo "  • Service: http://localhost:4100"
    echo "  • Management: http://localhost:5101"
    echo "  • Temporal UI: http://localhost:8080"
    echo ""
    echo "Example API calls:"
    echo "  • Ingest Foo event: curl -X POST http://localhost:4100/ingest/FooThingEvent -H 'Content-Type: application/json' -d '{\"fooId\":\"foo-123\",\"action\":\"created\",\"currentData\":{...}}'"
    echo "  • Ingest Bar event: curl -X POST http://localhost:4100/ingest/BarThingEvent -H 'Content-Type: application/json' -d '{\"barId\":\"bar-456\",\"fooId\":\"foo-123\",\"action\":\"created\",\"currentData\":{...}}'"
    echo ""
    echo "To stop the service: $0 stop"
    echo "To check status: $0 status"
    echo "To run migration later: $0 migrate"
    echo "Service PID is tracked in: /tmp/analytical.pid"
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
        "migrate")
            run_migration
            ;;
        "infra:start")
            start_infrastructure_only
            ;;
        "infra:stop")
            stop_infrastructure_only
            ;;
        "infra:reset")
            reset_infrastructure
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