#!/bin/bash

# Sync Base Service Setup Script
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
    echo "  start     - Start the sync service only"
    echo "  stop      - Stop the sync service"
    echo "  restart   - Restart the sync service"
    echo "  status    - Show service status"
    echo "  reset     - Full reset (stop service, restart)"
    echo "  env:check - Check environment configuration"
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
    echo "  $0 env:check # Validate environment configuration"
    echo ""
    echo "Note: This service uses 'pnpm dev' to manage infrastructure automatically."
    echo "The service PID is tracked in /tmp/sync-base.pid"
    echo ""
}

# Function to get service PID
get_service_pid() {
    if [ -f "/tmp/sync-base.pid" ]; then
        cat /tmp/sync-base.pid 2>/dev/null || echo ""
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
    
    # Check if transactional-base service is accessible
    local transactional_env_path="../transactional-base/.env"
    if [ ! -f "$transactional_env_path" ]; then
        print_warning "transactional-base/.env not found"
        print_status "Make sure the transactional-base service is set up first"
        print_status "The sync-base service depends on transactional-base configuration"
    else
        print_success "Found transactional-base/.env - will copy configuration values"
    fi
}

# Extract value from transactional-base .env file
get_transactional_env_value() {
    local key=$1
    local transactional_env_path="../transactional-base/.env"
    
    if [ -f "$transactional_env_path" ]; then
        # Extract the value, handling quoted and unquoted values
        grep "^${key}=" "$transactional_env_path" | cut -d'=' -f2- | sed 's/^["'\'']//;s/["'\'']$//' 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Generate .env file with values from transactional-base
generate_env_file() {
    print_status "Generating .env file with values from transactional-base service..."
    
    # Get values from transactional-base .env
    local supabase_url=$(get_transactional_env_value "SUPABASE_PUBLIC_URL")
    local anon_key=$(get_transactional_env_value "ANON_KEY")
    local service_role_key=$(get_transactional_env_value "SERVICE_ROLE_KEY")
    local db_schema=$(get_transactional_env_value "DB_SCHEMA")
    
    # Use defaults if values not found
    if [ -z "$supabase_url" ]; then
        supabase_url="http://localhost:8000"
        print_warning "SUPABASE_PUBLIC_URL not found in transactional-base/.env, using default"
    fi
    
    if [ -z "$anon_key" ]; then
        anon_key="your_actual_anon_key_from_transactional_base"
        print_warning "ANON_KEY not found in transactional-base/.env, using placeholder"
    fi
    
    if [ -z "$service_role_key" ]; then
        service_role_key="your_service_role_key_here"
        print_warning "SERVICE_ROLE_KEY not found in transactional-base/.env, using placeholder"
    fi
    
    if [ -z "$db_schema" ]; then
        db_schema="public"
        print_warning "DB_SCHEMA not found in transactional-base/.env, using default"
    fi
    
    # Generate realtime URL from supabase URL
    local realtime_url=$(echo "$supabase_url" | sed 's|http://|ws://|' | sed 's|https://|wss://|')/realtime/v1
    
    # Create the .env file
    cat > .env << EOF
# Sync Base Service Environment Configuration
# Generated automatically by setup script from transactional-base/.env

# Supabase Configuration for Sync Service
SUPABASE_PUBLIC_URL=$supabase_url

# CRITICAL: Copied from transactional-base/.env
ANON_KEY=$anon_key

# Optional: Service Role Key (copied from transactional-base/.env)
SERVICE_ROLE_KEY=$service_role_key

# Database Schema (copied from transactional-base/.env)
DB_SCHEMA=$db_schema

# Realtime WebSocket URL (auto-generated from SUPABASE_PUBLIC_URL)
REALTIME_URL=$realtime_url
EOF

    print_success ".env file generated successfully"
    
    # Report what was found
    if [ "$anon_key" != "your_actual_anon_key_from_transactional_base" ]; then
        print_success "ANON_KEY copied from transactional-base/.env"
    else
        print_warning "ANON_KEY not found - you may need to update it manually"
    fi
    
    if [ "$service_role_key" != "your_service_role_key_here" ]; then
        print_success "SERVICE_ROLE_KEY copied from transactional-base/.env"
    else
        print_warning "SERVICE_ROLE_KEY not found - you may need to update it manually"
    fi
    
    print_success "SUPABASE_PUBLIC_URL: $supabase_url"
    print_success "DB_SCHEMA: $db_schema"
    print_success "REALTIME_URL: $realtime_url"
    echo ""
}

# Check environment configuration
check_environment() {
    print_status "Checking environment configuration..."
    
    # Check if .env file exists, generate if missing
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Generating with default values..."
        generate_env_file
        print_warning "Setup will continue, but you must update the .env file with actual values before running workflows."
        print_status "You can run '$0 env:check' later to validate your configuration."
        return 0
    fi
    
    # Check required environment variables
    local missing_vars=()
    
    if [ -z "$SUPABASE_PUBLIC_URL" ]; then
        missing_vars+=("SUPABASE_PUBLIC_URL")
    fi
    
    if [ -z "$ANON_KEY" ]; then
        missing_vars+=("ANON_KEY")
    fi
    
    if [ -z "$DB_SCHEMA" ]; then
        missing_vars+=("DB_SCHEMA")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_warning "Some environment variables are missing or have default values: ${missing_vars[*]}"
        print_status "The setup script will attempt to copy values from transactional-base/.env automatically."
        print_status "You can run '$0 env:check' to validate your configuration."
        return 0
    fi
    
    print_success "Environment configuration looks good"
    print_status "SUPABASE_PUBLIC_URL: $SUPABASE_PUBLIC_URL"
    print_status "DB_SCHEMA: $DB_SCHEMA"
    print_status "ANON_KEY: ${ANON_KEY:0:10}... (truncated for security)"
}

# Validate environment configuration (detailed check)
validate_environment() {
    echo "=========================================="
    echo "  Environment Configuration Validation"
    echo "=========================================="
    echo ""
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_error ".env file not found"
        print_status "Run '$0 setup' to generate a default .env file"
        exit 1
    fi
    
    print_success ".env file found"
    
    # Check each environment variable
    local issues=0
    local warnings=0
    
    echo ""
    echo "Checking environment variables:"
    echo "--------------------------------"
    
    # Check SUPABASE_PUBLIC_URL
    if [ -z "$SUPABASE_PUBLIC_URL" ]; then
        print_error "SUPABASE_PUBLIC_URL is not set"
        issues=$((issues + 1))
    elif [ "$SUPABASE_PUBLIC_URL" = "http://localhost:8000" ]; then
        print_warning "SUPABASE_PUBLIC_URL is using default value"
        warnings=$((warnings + 1))
    else
        print_success "SUPABASE_PUBLIC_URL: $SUPABASE_PUBLIC_URL"
    fi
    
    # Check ANON_KEY
    if [ -z "$ANON_KEY" ]; then
        print_error "ANON_KEY is not set"
        print_status "Run '$0 setup' to automatically copy from transactional-base/.env"
        issues=$((issues + 1))
    elif [ "$ANON_KEY" = "your_actual_anon_key_from_transactional_base" ]; then
        print_error "ANON_KEY is using default placeholder value"
        print_status "Run '$0 setup' to automatically copy from transactional-base/.env"
        issues=$((issues + 1))
    else
        print_success "ANON_KEY: ${ANON_KEY:0:10}... (truncated for security)"
    fi
    
    # Check DB_SCHEMA
    if [ -z "$DB_SCHEMA" ]; then
        print_error "DB_SCHEMA is not set"
        issues=$((issues + 1))
    elif [ "$DB_SCHEMA" = "public" ]; then
        print_success "DB_SCHEMA: $DB_SCHEMA (default value is correct)"
    else
        print_success "DB_SCHEMA: $DB_SCHEMA"
    fi
    
    # Check SERVICE_ROLE_KEY (optional)
    if [ -z "$SERVICE_ROLE_KEY" ]; then
        print_warning "SERVICE_ROLE_KEY is not set (optional)"
        warnings=$((warnings + 1))
    elif [ "$SERVICE_ROLE_KEY" = "your_service_role_key_here" ]; then
        print_warning "SERVICE_ROLE_KEY is using default placeholder value (optional)"
        warnings=$((warnings + 1))
    else
        print_success "SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY:0:10}... (truncated for security)"
    fi
    
    # Check REALTIME_URL (optional)
    if [ -z "$REALTIME_URL" ]; then
        print_warning "REALTIME_URL is not set (optional)"
        warnings=$((warnings + 1))
    elif [ "$REALTIME_URL" = "ws://localhost:8000/realtime/v1" ]; then
        print_success "REALTIME_URL: $REALTIME_URL (default value is correct)"
    else
        print_success "REALTIME_URL: $REALTIME_URL"
    fi
    
    echo ""
    echo "=========================================="
    
    if [ $issues -gt 0 ]; then
        print_error "Found $issues critical issue(s) that must be fixed:"
        echo ""
        print_status "1. Run '$0 setup' to automatically copy values from transactional-base/.env"
        print_status "2. Or manually copy ANON_KEY from services/transactional-base/.env"
        print_status "3. Verify SUPABASE_PUBLIC_URL matches your transactional-base service"
        echo ""
        exit 1
    elif [ $warnings -gt 0 ]; then
        print_warning "Found $warnings warning(s) - configuration will work but may need updates:"
        echo ""
        print_status "Consider setting SERVICE_ROLE_KEY and REALTIME_URL for full functionality"
        echo ""
        print_success "Environment configuration is valid for basic operation"
    else
        print_success "Environment configuration is complete and valid!"
    fi
    
    echo ""
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
    
    print_status "Starting the sync-base service..."
    print_status "The service will be available at http://localhost:4000"
    print_status "Management interface will be available at http://localhost:5001"
    print_status "Temporal UI will be available at http://localhost:8080"
    
    # Start the service in the background and track PID
    pnpm dev &
    SERVICE_PID=$!
    
    # Save PID to file
    echo "$SERVICE_PID" > /tmp/sync-base.pid
    
    # Wait a moment for the service to start
    sleep 5
    
    # Check if service is running
    if curl -s http://localhost:4000 > /dev/null 2>&1; then
        print_success "Service started successfully!"
        print_status "Service PID: $SERVICE_PID (saved to /tmp/sync-base.pid)"
        print_status "To stop the service, run: $0 stop"
    else
        print_warning "Service may still be starting up..."
        print_status "Check http://localhost:4000 for service status"
    fi
    sleep 5
    # After startup, check if the service process is still running
    if ! ps -p "$SERVICE_PID" > /dev/null 2>&1; then
        rm -f /tmp/sync-base.pid
        print_error "The sync-base service process stopped unexpectedly after startup."
        print_error "Check logs or try running the service manually for more information."
        return 1
    fi
}

# Stop the service
stop_service() {
    local pid=$(get_service_pid)
    
    if [ -z "$pid" ]; then
        print_warning "Service is not running"
        return 0
    fi
    
    print_status "Stopping sync-base service (PID: $pid)..."
    kill "$pid"
    
    # Wait for the process to stop
    local attempts=0
    while [ $attempts -lt 10 ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            print_success "Service stopped successfully"
            # Remove PID file
            rm -f /tmp/sync-base.pid
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
    rm -f /tmp/sync-base.pid
}



# Restart the service
restart_service() {
    print_status "Restarting sync-base service..."
    stop_service
    sleep 2
    start_service
}

# Show service status
show_status() {
    echo "=========================================="
    echo "  Sync Base Service Status"
    echo "=========================================="
    echo ""
    
    # Check service status
    if is_service_running; then
        local pid=$(get_service_pid)
        print_success "Service is running (PID: $pid)"
        
        # Check if service is responding
        if curl -s http://localhost:4000 > /dev/null 2>&1; then
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
    echo "  • Service: http://localhost:4000"
    echo "  • Management: http://localhost:5001"
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
    
    print_warning "Note: Moose manages its own infrastructure data."
    print_status "To reset infrastructure data, you may need to:"
    print_status "1. Stop the moose dev process"
    print_status "2. Clear any local data directories"
    print_status "3. Restart with 'moose dev'"
    
    # Start infrastructure
    start_infrastructure_only
    
    print_success "Infrastructure reset initiated"
}

# Full reset - stop services, clear data, restart
full_reset() {
    print_status "Performing full reset..."
    echo ""
    
    # Stop the sync service
    print_status "Stopping sync service..."
    stop_service
    
    # Wait a moment for services to fully stop
    sleep 3
    
    # Delete .moose folder if it exists
    if [ -d ".moose" ]; then
        print_status "Deleting .moose folder..."
        rm -rf .moose
        print_success ".moose folder deleted"
    else
        print_status ".moose folder not found (already clean)"
    fi
    
    print_warning "Note: Moose manages its own infrastructure."
    print_status "To perform a complete reset:"
    print_status "1. Stop any running moose dev processes"
    print_status "2. Clear any local data directories if needed"
    print_status "3. Restart with 'pnpm dev'"
    
    # Start the service
    print_status "Starting sync service..."
    start_service
    
    echo ""
    print_success "Full reset completed successfully!"
    echo ""
    echo "All services have been restarted."
    echo "Available endpoints:"
    echo "  • Service: http://localhost:4000"
    echo "  • Management: http://localhost:5001"
    echo "  • Temporal UI: http://localhost:8080"
    echo ""
}

# Main setup function (full setup)
full_setup() {
    echo "=========================================="
    echo "  Sync Base Service Setup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    check_environment
    echo ""
    
    install_dependencies
    echo ""
    
    start_service
    echo ""
    
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Available endpoints:"
    echo "  • Service: http://localhost:4000"
    echo "  • Management: http://localhost:5001"
    echo "  • Temporal UI: http://localhost:8080"
    echo ""
    echo "Next steps:"
    echo "  1. Run '$0 env:check' to validate your configuration"
    echo "  2. Ensure transactional-base service is running"
    echo "  3. Run workflows manually as needed: moose workflow run <workflow-name>"
    echo "  4. Test by making changes to foo/bar tables in transactional-base"
    echo ""
    echo "To stop the service: $0 stop"
    echo "To check status: $0 status"
    echo "To validate environment: $0 env:check"
    echo "Service PID is tracked in: /tmp/sync-base.pid"
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

        "env:check")
            validate_environment
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
