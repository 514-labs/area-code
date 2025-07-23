#!/bin/bash

# Data Warehouse Service Setup Script
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

# PID file paths
DATA_WAREHOUSE_PID_FILE="/tmp/data-warehouse.pid"
DW_FRONTEND_PID_FILE="/tmp/dw-frontend.pid"

# Port configurations
DATA_WAREHOUSE_PORT=4200
DW_FRONTEND_PORT=8501

# Kafdrop container configuration
KAFDROP_CONTAINER_NAME="data-warehouse-kafdrop"
KAFDROP_PORT=9999

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  setup     - Full setup (install, start service with moose dev)"
    echo "  start     - Start the Data Warehouse Service only"
    echo "  stop      - Stop the Data Warehouse Service"
    echo "  restart   - Restart the Data Warehouse Service"
    echo "  status    - Show service status"
    echo "  reset     - Full reset (stop service, restart)"
    echo "  env:check - Check environment configuration"
    # Commented out because unclear what these were for
    # echo "  infra:start  - Start Moose infrastructure (managed by moose dev)"
    # echo "  infra:stop   - Stop Moose infrastructure"
    # echo "  infra:reset  - Reset infrastructure data"
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
    echo "Note: This service uses 'moose dev' to manage infrastructure automatically."
    echo "The service PID is tracked in $DATA_WAREHOUSE_PID_FILE and $DW_FRONTEND_PID_FILE"
    echo ""
}

show_services() {
    echo ""
    echo "Available endpoints:"
    echo "  • Data Warehouse Service (moose): http://localhost:$DATA_WAREHOUSE_PORT"
    echo "  • Data Warehouse Frontend: http://localhost:$DW_FRONTEND_PORT"
    echo "  • Management: http://localhost:5001"
    echo "  • Temporal UI: http://localhost:8080"
    echo "  • Kafdrop UI: http://localhost:$KAFDROP_PORT"
    echo "  • Redpanda: localhost:19092"
    echo "  • ClickHouse: localhost:18123"
    echo "  • Redis: localhost:6379"
    echo ""
    echo "Next steps:"
    echo "  1. Explore the data warehouse frontend at http://localhost:$DW_FRONTEND_PORT"
    echo "  2. Run 'source venv/bin/activate' to activate the virtual environment manually"
    echo "  3. Run workflows manually as needed: moose workflow run <workflow-name>"
    echo ""
    echo "To stop the service: $0 stop"
    echo "To check status: $0 status"
    echo "To validate environment: $0 env:check"
    echo "Service PID is tracked in: $DATA_WAREHOUSE_PID_FILE and $DW_FRONTEND_PID_FILE"
    echo ""
}

# Function to get moose service PID
get_moose_service_id() {
    if [ -f "$DATA_WAREHOUSE_PID_FILE" ]; then
        cat "$DATA_WAREHOUSE_PID_FILE" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Function to check if moose service is running
is_moose_service_running() {
    local pid=$(get_moose_service_id)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0  # Service is running
    else
        return 1  # Service is not running
    fi
}

# Function to get dw-frontend PID
get_dw_frontend_pid() {
    if [ -f "$DW_FRONTEND_PID_FILE" ]; then
        cat "$DW_FRONTEND_PID_FILE" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Function to check if dw-frontend is running
is_dw_frontend_running() {
    local pid=$(get_dw_frontend_pid)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0  # Service is running
    else
        return 1  # Service is not running
    fi
}

# Virtual environment utility functions
check_venv_exists() {
    if [ -d "venv" ]; then
        return 0  # venv exists
    else
        return 1  # venv does not exist
    fi
}

create_venv_if_missing() {
    if ! check_venv_exists; then
        print_status "Creating Python virtual environment..."

        if python3 -m venv venv; then
            print_success "Virtual environment created successfully at ./venv"
        else
            print_error "Failed to create virtual environment"
            exit 1
        fi
    else
        print_success "Virtual environment already exists at ./venv"
    fi
}

ensure_venv_activated() {
    # First check if venv exists
    if ! check_venv_exists; then
        print_error "Virtual environment not found. Please run '$0 setup' first to create the virtual environment."
        exit 1
    fi

    # Check if we're already in the virtual environment
    if [ -z "$VIRTUAL_ENV" ]; then
        print_status "Activating virtual environment..."
        source venv/bin/activate

        if [ -n "$VIRTUAL_ENV" ]; then
            print_success "Virtual environment activated: $VIRTUAL_ENV"
        else
            print_error "Failed to activate virtual environment"
            exit 1
        fi
    else
        print_success "Virtual environment already active: $VIRTUAL_ENV"
    fi
}

# Wait for a process to stop gracefully
wait_for_process_to_stop() {
    local pid=$1
    local service_name=$2
    local max_attempts=${3:-10}
    local sleep_interval=${4:-1}

    if [ -z "$pid" ]; then
        return 0  # No PID, consider it stopped
    fi

    print_status "Waiting for $service_name to stop gracefully..."

    local attempts=0
    while [ $attempts -lt $max_attempts ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            print_success "$service_name stopped successfully"
            return 0  # Process stopped
        fi

        sleep $sleep_interval
        attempts=$((attempts + 1))

        print_status "Waiting for $service_name to stop... (attempt $attempts/$max_attempts)"
    done

    return 1  # Process didn't stop within timeout
}

# Check if a port is in use
is_port_in_use() {
    local port=$1

    if lsof -i ":$port" >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is available
    fi
}

# Print instructions for finding and terminating processes using a port
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
    print_status "Then retry: $0 start"
}

# Check if Docker is available
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

# Function to get the network name
get_docker_network() {
    local network_name="$(basename "$(pwd)")_default"

    # Check if network exists
    if docker network ls --format "{{.Name}}" | grep -q "^${network_name}$"; then
        echo "$network_name"
    else
        print_warning "Network $network_name not found, using default"
        echo "bridge"  # fallback to bridge network
    fi
}

# Check if Kafdrop container is running
is_kafdrop_running() {
    if ! check_docker; then
        return 1
    fi
    docker ps --filter "name=$KAFDROP_CONTAINER_NAME" --format "{{.Names}}" | grep -q "$KAFDROP_CONTAINER_NAME"
}

# Start Kafdrop
start_kafdrop() {
    if ! check_docker; then
        print_warning "Docker not available, skipping Kafdrop startup"
        return 0
    fi

    if is_kafdrop_running; then
        print_warning "Kafdrop is already running"
        return 0
    fi

    # Check if port is in use
    if is_port_in_use $KAFDROP_PORT; then
        print_port_conflict_instructions $KAFDROP_PORT
        return 1
    fi

    print_status "Starting Kafdrop..."

    local network_name=$(get_docker_network)

    # Start Kafdrop container
    docker run -d \
        --name "$KAFDROP_CONTAINER_NAME" \
        --network "$network_name" \
        --rm \
        -p $KAFDROP_PORT:9000 \
        -e KAFKA_BROKERCONNECT=redpanda:9092 \
        -e SERVER_SERVLET_CONTEXTPATH="/" \
        obsidiandynamics/kafdrop > /dev/null 2>&1

    # Wait and verify
    sleep 3
    if is_kafdrop_running; then
        print_success "Kafdrop started successfully at http://localhost:$KAFDROP_PORT"
    else
        print_error "Failed to start Kafdrop"
        return 1
    fi
}

# Stop Kafdrop
stop_kafdrop() {
    if ! check_docker; then
        return 0
    fi

    if ! is_kafdrop_running; then
        print_warning "Kafdrop is not running (container: $KAFDROP_CONTAINER_NAME)"
        return 0
    fi

    print_status "Stopping Kafdrop..."

    # Stop the container (--rm flag will auto-remove it)
    docker stop "$KAFDROP_CONTAINER_NAME" &> /dev/null

    # Wait for it to stop
    for i in {1..10}; do
        if ! is_kafdrop_running; then
            print_success "Kafdrop stopped successfully"
            return 0
        fi
        sleep 1
    done

    print_error "Failed to stop Kafdrop gracefully"
    return 1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Commented out because this is not needed for now
    # Check if transactional-base service is accessible
    # local transactional_env_path="../transactional-base/.env"
    # if [ ! -f "$transactional_env_path" ]; then
    #     print_error "transactional-base/.env not found at: $transactional_env_path"
    #     print_error "The data-warehouse service REQUIRES transactional-base configuration"
    #     print_error "Please start transactional-base service first with 'pnpm dev:start --service=transactional-base'"
    #     exit 1
    # else
    #     print_success "Found transactional-base/.env - will copy configuration values"
    # fi
}

print_python_install_instructions() {
    print_status "  • macOS: brew install python@3.12"
    print_status "  • Ubuntu/Debian: sudo apt install python3.12"
    print_status "  • Or use pyenv: pyenv install 3.12 && pyenv global 3.12"
    print_status "  • Or download from: https://www.python.org/downloads/"
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
# Data Warehouse Service Environment Configuration
# Generated automatically by setup script from transactional-base/.env

# Supabase Configuration for Data Warehouse Service
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
    print_status "Checking Python version..."

    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        print_status "Install Python 3.12+ using one of these methods:"
        print_python_install_instructions
        exit 1
    else
        # Get Python version
        python_version=$(python3 --version 2>&1 | sed 's/Python //')

        # Parse version numbers
        major=$(echo "$python_version" | cut -d. -f1)
        minor=$(echo "$python_version" | cut -d. -f2)

        # Check if version is >= 3.12
        if [ "$major" -lt 3 ] || ([ "$major" -eq 3 ] && [ "$minor" -lt 12 ]); then
            print_error "Python version $python_version is too old (minimum: 3.12)"
            print_status "Upgrade Python using one of these methods:"
            print_python_install_instructions
            exit 1
        else
            print_success "Python version: $python_version"
        fi
    fi
    echo ""

    # Commented out because this is not needed for now
    # print_status "Checking environment configuration..."
    
    # # Check if .env file exists, generate if missing
    # if [ ! -f ".env" ]; then
    #     print_warning ".env file not found. Generating with default values..."
    #     generate_env_file
    #     print_warning "Setup will continue, but you must update the .env file with actual values before running workflows."
    #     print_status "You can run '$0 env:check' later to validate your configuration."
    #     return 0
    # fi
    
    # # Check required environment variables
    # local missing_vars=()
    
    # if [ -z "$SUPABASE_PUBLIC_URL" ]; then
    #     missing_vars+=("SUPABASE_PUBLIC_URL")
    # fi
    
    # if [ -z "$ANON_KEY" ]; then
    #     missing_vars+=("ANON_KEY")
    # fi
    
    # if [ -z "$DB_SCHEMA" ]; then
    #     missing_vars+=("DB_SCHEMA")
    # fi
    
    # if [ ${#missing_vars[@]} -gt 0 ]; then
    #     print_warning "Some environment variables are missing or have default values: ${missing_vars[*]}"
    #     print_status "The setup script will attempt to copy values from transactional-base/.env automatically."
    #     print_status "You can run '$0 env:check' to validate your configuration."
    #     return 0
    # fi
    
    # print_success "Environment configuration looks good"
    # print_status "SUPABASE_PUBLIC_URL: $SUPABASE_PUBLIC_URL"
    # print_status "DB_SCHEMA: $DB_SCHEMA"
    # print_status "ANON_KEY: ${ANON_KEY:0:10}... (truncated for security)"
}

# Validate environment configuration (detailed check)
validate_environment() {
    local issues=0
    local warnings=0

    echo "=========================================="
    echo "  Python Version Validation"
    echo "=========================================="
    echo ""

    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        print_status "Install Python 3.12+ using one of these methods:"
        print_python_install_instructions
        issues=$((issues + 1))
    else
        # Get Python version
        python_version=$(python3 --version 2>&1 | sed 's/Python //')

        # Parse version numbers
        major=$(echo "$python_version" | cut -d. -f1)
        minor=$(echo "$python_version" | cut -d. -f2)

        # Check if version is >= 3.12
        if [ "$major" -lt 3 ] || ([ "$major" -eq 3 ] && [ "$minor" -lt 12 ]); then
            print_error "Python version $python_version is too old (minimum: 3.12)"
            print_status "Upgrade Python using one of these methods:"
            print_python_install_instructions
            issues=$((issues + 1))
        else
            print_success "Python version: $python_version"
        fi
    fi
    echo ""

    # Commented out because these are not needed for now
    # echo "=========================================="
    # echo "  Environment Configuration Validation"
    # echo "=========================================="
    # echo ""
    
    # # Check if .env file exists
    # if [ ! -f ".env" ]; then
    #     print_error ".env file not found"
    #     print_status "Run '$0 setup' to generate a default .env file"
    #     exit 1
    # fi
    
    # print_success ".env file found"
    
    # echo ""
    # echo "Checking environment variables:"
    # echo "--------------------------------"

    # # Check SUPABASE_PUBLIC_URL
    # if [ -z "$SUPABASE_PUBLIC_URL" ]; then
    #     print_error "SUPABASE_PUBLIC_URL is not set"
    #     issues=$((issues + 1))
    # elif [ "$SUPABASE_PUBLIC_URL" = "http://localhost:8000" ]; then
    #     print_warning "SUPABASE_PUBLIC_URL is using default value"
    #     warnings=$((warnings + 1))
    # else
    #     print_success "SUPABASE_PUBLIC_URL: $SUPABASE_PUBLIC_URL"
    # fi

    # # Check ANON_KEY
    # if [ -z "$ANON_KEY" ]; then
    #     print_error "ANON_KEY is not set"
    #     print_status "Run '$0 setup' to automatically copy from transactional-base/.env"
    #     issues=$((issues + 1))
    # elif [ "$ANON_KEY" = "your_actual_anon_key_from_transactional_base" ]; then
    #     print_error "ANON_KEY is using default placeholder value"
    #     print_status "Run '$0 setup' to automatically copy from transactional-base/.env"
    #     issues=$((issues + 1))
    # else
    #     print_success "ANON_KEY: ${ANON_KEY:0:10}... (truncated for security)"
    # fi

    # # Check DB_SCHEMA
    # if [ -z "$DB_SCHEMA" ]; then
    #     print_error "DB_SCHEMA is not set"
    #     issues=$((issues + 1))
    # elif [ "$DB_SCHEMA" = "public" ]; then
    #     print_success "DB_SCHEMA: $DB_SCHEMA (default value is correct)"
    # else
    #     print_success "DB_SCHEMA: $DB_SCHEMA"
    # fi

    # # Check SERVICE_ROLE_KEY (optional)
    # if [ -z "$SERVICE_ROLE_KEY" ]; then
    #     print_warning "SERVICE_ROLE_KEY is not set (optional)"
    #     warnings=$((warnings + 1))
    # elif [ "$SERVICE_ROLE_KEY" = "your_service_role_key_here" ]; then
    #     print_warning "SERVICE_ROLE_KEY is using default placeholder value (optional)"
    #     warnings=$((warnings + 1))
    # else
    #     print_success "SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY:0:10}... (truncated for security)"
    # fi

    # # Check REALTIME_URL (optional)
    # if [ -z "$REALTIME_URL" ]; then
    #     print_warning "REALTIME_URL is not set (optional)"
    #     warnings=$((warnings + 1))
    # elif [ "$REALTIME_URL" = "ws://localhost:8000/realtime/v1" ]; then
    #     print_success "REALTIME_URL: $REALTIME_URL (default value is correct)"
    # else
    #     print_success "REALTIME_URL: $REALTIME_URL"
    # fi
    
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

    create_venv_if_missing

    ensure_venv_activated

    # Install data-warehouse dependencies in virtual environment
    print_status "Installing data-warehouse dependencies in virtual environment..."
    pip install .
    print_success "Data warehouse dependencies installed successfully in virtual environment"
    echo ""

    # Check Moose CLI
    if ! command -v moose-cli &> /dev/null; then
        print_error "Moose CLI is not installed."
        exit 1
    fi

    print_success "Moose CLI version: $(moose-cli --version 2>/dev/null || echo 'unknown')"
    echo ""

    # Install dw-frontend dependencies
    print_status "Installing dw-frontend dependencies..."
    local frontend_dir="../../apps/dw-frontend"
    local current_dir=$(pwd)

    if [ -d "$frontend_dir" ]; then
        cd "$frontend_dir" || {
            print_error "Failed to navigate to dw-frontend directory: $frontend_dir"
            exit 1
        }

        pip install -r requirements.txt

        # Check streamlit
        if ! command -v streamlit &> /dev/null; then
            print_error "streamlit is not installed."
            exit 1
        fi

        print_success "Streamlit version: $(streamlit --version 2>/dev/null || echo 'unknown')"
        echo ""

        cd "$current_dir"
    else
        print_error "dw-frontend directory not found at: $frontend_dir"
        exit 1
    fi
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

start_data_warehouse_service() {
    if is_moose_service_running; then
        print_warning "data-warehouse service is already running (PID: $(get_moose_service_id))"
    else
        print_status "Starting the data-warehouse service..."

        # Start the service in the background and track PID
        moose-cli dev &
        MOOSE_SERVICE_PID=$!

        # Save PID to file
        echo "$MOOSE_SERVICE_PID" > "$DATA_WAREHOUSE_PID_FILE"

        # Wait a moment for the service to start
        # We don't really have a way to check if all the moose subprocesses are running
        print_status "Waiting for service to come up..."
        for i in {1..15}; do
            print_status "Waiting for service... ($i/15)"
            sleep 1
        done

        # Check if service is running
        if curl -s http://localhost:$DATA_WAREHOUSE_PORT > /dev/null 2>&1; then
            print_success "data-warehouse service started successfully!"
            print_status "The service will be available at http://localhost:$DATA_WAREHOUSE_PORT"
            print_status "Service PID: $MOOSE_SERVICE_PID (saved to $DATA_WAREHOUSE_PID_FILE)"
            print_status "To stop the service, run: $0 stop"
        else
            print_warning "data-warehouse service may still be starting up..."
            print_status "Check http://localhost:$DATA_WAREHOUSE_PORT for service status"
        fi
    fi
}

start_dw_frontend_service() {
    if is_dw_frontend_running; then
        print_warning "data warehouse dashbaord is already running (PID: $(get_dw_frontend_pid))"
    else
        print_status "Starting the data warehouse dashboard..."

        local frontend_dir="../../apps/dw-frontend"
        local current_dir=$(pwd)

        if [ -d "$frontend_dir" ]; then
            cd "$frontend_dir" || {
                print_error "Failed to navigate to dw-frontend directory: $frontend_dir"
                exit 1
            }

            # Check if port is in use
            if is_port_in_use $DW_FRONTEND_PORT; then
                print_port_conflict_instructions $DW_FRONTEND_PORT
                exit 1
            fi

            streamlit run main.py --server.port $DW_FRONTEND_PORT &
            DW_FRONTEND_PID=$!

            # Save PID to file
            echo "$DW_FRONTEND_PID" > "$DW_FRONTEND_PID_FILE"

            # Wait a moment for the service to start
            sleep 3

            if curl -s http://localhost:$DW_FRONTEND_PORT > /dev/null 2>&1; then
                print_success "data warehouse dashboard started successfully!"
                print_status "The dashboard will be available at http://localhost:$DW_FRONTEND_PORT"
                print_status "Dashboard PID: $DW_FRONTEND_PID (saved to $DW_FRONTEND_PID_FILE)"
                print_status "To stop the dashboard, run: $0 stop"
            else
                print_error "data warehouse dashboard failed to start"
            fi

            cd "$current_dir"
        else
            print_error "dw-frontend directory not found at: $frontend_dir"
            exit 1
        fi
    fi
}

# Start the service
start_service() {
    ensure_venv_activated

    start_data_warehouse_service
    echo ""

    start_kafdrop
    echo ""

    start_dw_frontend_service
    echo ""

    show_services
}

stop_data_warehouse_service() {
    local moose_pid=$(get_moose_service_id)

    if [ -z "$moose_pid" ]; then
        print_warning "data-warehouse service is not running"
    else
        print_status "Stopping data-warehouse service (PID: $moose_pid)..."
        {
            kill "$moose_pid"

            # Wait for the process to stop gracefully
            if ! wait_for_process_to_stop "$moose_pid" "data-warehouse service"; then
                print_warning "data-warehouse service didn't stop gracefully, force killing..."
                kill -9 "$moose_pid" 2>/dev/null

                # Wait a bit more after force kill
                sleep 1

                if ! kill -0 "$moose_pid" 2>/dev/null; then
                    print_success "data-warehouse service force stopped"
                else
                    print_error "Failed to stop data-warehouse service"
                fi
            fi
        } || {
            print_error "Error occurred while stopping data-warehouse service"
        }

        # Remove PID file
        print_status "Removing PID file: $DATA_WAREHOUSE_PID_FILE"
        rm -f "$DATA_WAREHOUSE_PID_FILE"
    fi
}

stop_dw_frontend_service() {
    local dw_frontend_pid=$(get_dw_frontend_pid)

    if [ -z "$dw_frontend_pid" ]; then
        print_warning "dw-frontend service is not running"
    else
        print_status "Stopping dw-frontend service (PID: $dw_frontend_pid)..."
        {
            kill "$dw_frontend_pid"

            # Wait for the process to stop gracefully
            if ! wait_for_process_to_stop "$dw_frontend_pid" "dw-frontend service"; then
                print_warning "dw-frontend service didn't stop gracefully, force killing..."
                kill -9 "$dw_frontend_pid" 2>/dev/null

                # Wait a bit more after force kill
                sleep 1

                if ! kill -0 "$dw_frontend_pid" 2>/dev/null; then
                    print_success "dw-frontend service force stopped"
                else
                    print_error "Failed to stop dw-frontend service"
                fi
            fi
        } || {
            print_error "Error occurred while stopping dw-frontend service"
        }

        # Remove PID file
        print_status "Removing PID file: $DW_FRONTEND_PID_FILE"
        rm -f "$DW_FRONTEND_PID_FILE"
    fi
}

# Stop the service
stop_service() {
    stop_data_warehouse_service
    echo ""

    stop_dw_frontend_service
    echo ""

    stop_kafdrop
    echo ""
}



# Restart the service
restart_service() {
    print_status "Restarting data-warehouse services..."
    stop_service
    sleep 2
    start_service
}

# Show service status
show_status() {
    echo "=========================================="
    echo "  Data Warehouse Service Status"
    echo "=========================================="
    echo ""
    
    # Check service status
    if is_moose_service_running; then
        local pid=$(get_moose_service_id)
        print_success "data-warehouse service is running (PID: $pid)"
        
        # Check if service is responding
        if curl -s http://localhost:$DATA_WAREHOUSE_PORT > /dev/null 2>&1; then
            print_success "data-warehouse service is responding to requests"
        else
            print_warning "data-warehouse service is running but not responding to requests"
        fi
    else
        print_error "data-warehouse service is not running"
    fi

    # Check dw-frontend service status
    if is_dw_frontend_running; then
        local pid=$(get_dw_frontend_pid)
        print_success "dw-frontend service is running (PID: $pid)"

        # Check if service is responding
        if curl -s http://localhost:$DW_FRONTEND_PORT > /dev/null 2>&1; then
            print_success "dw-frontend service is responding to requests"
        else
            print_warning "dw-frontend service is running but not responding to requests"
        fi
    else
        print_error "dw-frontend service is not running"
    fi
    
    # Check Kafdrop status
    if is_kafdrop_running; then
        print_success "Kafdrop is running (container: $KAFDROP_CONTAINER_NAME)"

        # Check if service is responding
        if curl -s http://localhost:$KAFDROP_PORT > /dev/null 2>&1; then
            print_success "Kafdrop is responding to requests"
        else
            print_warning "Kafdrop is running but not responding to requests"
        fi
    else
        print_error "Kafdrop is not running"
    fi

    echo ""
    echo "Infrastructure: Managed by Moose.js"
    echo "  • All infrastructure services (Redpanda, ClickHouse, Redis, Temporal) are managed automatically"
    echo "  • Infrastructure may take time to start up on first run"
    echo ""
    show_services
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
    
    # Stop the Data Warehouse Service
    print_status "Stopping Data Warehouse Service..."
    stop_service
    
    # Wait a moment for services to fully stop
    sleep 3
    
    print_warning "Note: Moose manages its own infrastructure."
    print_status "To perform a complete reset:"
    print_status "1. Stop any running moose dev processes"
    print_status "2. Clear any local data directories if needed"
    print_status "3. Restart with 'moose dev'"
    
    # Start the service
    print_status "Starting Data Warehouse Service..."
    start_service
    
    echo ""
    print_success "Full reset completed successfully!"
    echo ""
    echo "All services have been restarted."
    echo ""
    show_services
}

# Main setup function (full setup)
full_setup() {
    echo "=========================================="
    echo "  Data Warehouse Service Setup"
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
        # Commented out because unclear what these were for
        # "infra:start")
        #     start_infrastructure_only
        #     ;;
        # "infra:stop")
        #     stop_infrastructure_only
        #     ;;
        # "infra:reset")
        #     reset_infrastructure
        #     ;;
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

