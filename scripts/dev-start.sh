#!/bin/bash -e

########################################################
# Development Environment Bootstrap Script
########################################################

# Get the project root directory (one level up from the scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to wait for a service to be ready
wait_for_service() {
    local service_name="$1"
    local port="$2"
    local max_attempts=30
    local attempt=1
    
    print_step "Waiting for $service_name to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo "  Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Function to wait for specific log message in a file
wait_for_log_message() {
    local log_file="$1"
    local message_pattern="$2"
    local service_name="$3"
    local max_attempts=30
    local attempt=1
    
    print_step "Waiting for $service_name to show '$message_pattern' in logs..."
    
    while [ $attempt -le $max_attempts ]; do
        if [ -f "$log_file" ] && grep -q "$message_pattern" "$log_file" 2>/dev/null; then
            print_success "$service_name is ready! (found: $message_pattern)"
            return 0
        fi
        
        echo "  Attempt $attempt/$max_attempts - waiting for log message..."
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to show expected log message within expected time"
    if [ -f "$log_file" ]; then
        print_warning "Last few lines of log:"
        tail -5 "$log_file" | sed 's/^/    /'
    fi
    return 1
}

# Function to cleanup existing processes
cleanup_existing_processes() {
    print_step "Cleaning up existing moose processes..."
    
    # Kill existing moose processes
    pkill -f "moose.*dev" 2>/dev/null || true
    pkill -f "moose-cli.*dev" 2>/dev/null || true
    pkill -f "moose-runner" 2>/dev/null || true
    
    # Terminate existing workflows
    print_step "Terminating existing workflows..."
    cd "$SCRIPT_DIR/services/sync-base" || true
    if command -v pnpm >/dev/null 2>&1; then
        pnpm moose workflow terminate supabase-listener 2>/dev/null || true
    fi
    cd "$SCRIPT_DIR"
    
    # Kill only moose-related processes using our expected ports
    local ports=(4000 4100 8083 5173)
    for port in "${ports[@]}"; do
        # Get processes on this port and filter for moose-related ones
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            for pid in $pids; do
                # Check if this process is moose-related or frontend-related
                local process_info=$(ps -p $pid -o command= 2>/dev/null || true)
                if [[ "$process_info" =~ moose|tsx.*src/server.ts|vite ]]; then
                    print_step "Killing dev-related process using port $port (PID: $pid)"
                    kill $pid 2>/dev/null || true
                else
                    print_step "Skipping non-dev process on port $port (PID: $pid)"
                fi
            done
        fi
    done
    
    sleep 3
    print_success "Existing processes cleaned up"
}

# Function to run command in service directory
run_in_service() {
    local service="$1"
    local command="$2"
    local service_dir="$SCRIPT_DIR/services/$service"
    
    print_step "Running '$command' in $service..."
    
    if [ ! -d "$service_dir" ]; then
        print_error "Service directory not found: $service_dir"
        return 1
    fi
    
    cd "$service_dir" || {
        print_error "Failed to change to service directory: $service_dir"
        return 1
    }
    
    # Run the command
    if eval "$command"; then
        print_success "Command completed successfully in $service"
        cd "$SCRIPT_DIR"
        return 0
    else
        print_error "Command failed in $service"
        cd "$SCRIPT_DIR"
        return 1
    fi
}

# Function to run command in background in service directory
run_in_service_background() {
    local service="$1"
    local command="$2"
    local log_suffix="$3"
    local service_dir="$SCRIPT_DIR/services/$service"
    
    # Use custom log suffix if provided, otherwise use command-based name
    if [ -n "$log_suffix" ]; then
        local log_file="$service_dir/dev-$log_suffix.log"
    else
        local safe_command=$(echo "$command" | sed 's/[^a-zA-Z0-9]/_/g')
        local log_file="$service_dir/dev-$safe_command.log"
    fi
    
    print_step "Running '$command' in background for $service..."
    
    if [ ! -d "$service_dir" ]; then
        print_error "Service directory not found: $service_dir"
        return 1
    fi
    
    cd "$service_dir" || {
        print_error "Failed to change to service directory: $service_dir"
        return 1
    }
    
    # Run the command in background
    nohup bash -c "$command" > "$log_file" 2>&1 &
    local pid=$!
    
    print_success "Started $service with PID $pid (logs: $log_file)"
    cd "$SCRIPT_DIR"
    return 0
}

# Function to copy .env file
copy_env_file() {
    local source_service="$1"
    local target_service="$2"
    local source_env="$SCRIPT_DIR/services/$source_service/.env"
    local target_env="$SCRIPT_DIR/services/$target_service/.env"
    
    print_step "Copying .env from $source_service to $target_service..."
    
    if [ ! -f "$source_env" ]; then
        print_error ".env file not found in $source_service"
        return 1
    fi
    
    if cp "$source_env" "$target_env"; then
        print_success ".env copied successfully"
        return 0
    else
        print_error "Failed to copy .env file"
        return 1
    fi
}

# Function to trigger file watcher by making a content change
trigger_file_watcher() {
    local file_path="$1"
    local full_path="$SCRIPT_DIR/$file_path"
    
    print_step "Triggering file watcher for $file_path by making content change..."
    
    if [ ! -f "$full_path" ]; then
        print_warning "File does not exist: $full_path"
        print_step "Creating file..."
        mkdir -p "$(dirname "$full_path")"
        touch "$full_path"
    else
        # Make a small content change to trigger file watcher
        # Add a comment line, then remove it to trigger the watcher without permanent changes
        echo "// File watcher trigger - $(date)" >> "$full_path"
        sleep 2
        # Remove the last line we just added
        if command -v sed >/dev/null 2>&1; then
            sed -i '' '$ d' "$full_path" 2>/dev/null || true
        fi
    fi
    
    print_success "File watcher triggered successfully"
}

# Main execution function
main() {
    echo "=========================================="
    echo "  Development Environment Bootstrap"
    echo "=========================================="
    echo ""
    
    # Step 0: Cleanup existing processes
    print_step "Step 0: Cleaning up existing processes"
    cleanup_existing_processes || exit 1
    echo ""
    
    # Step 1: Copy .env file from transactional-base to sync-base
    print_step "Step 1: Setting up environment configuration"
    copy_env_file "transactional-base" "sync-base" || exit 1
    echo ""
    
    # Step 2: Start transactional-base services
    print_step "Step 2: Checking Docker status"
    if ! docker ps >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_success "Docker is running"
    
    print_step "Starting transactional-base containers"
    cd "$SCRIPT_DIR/services/transactional-base" && ./setup.sh --restart || exit 1
    print_step "Starting transactional-base docker containers"
    run_in_service "transactional-base" "pnpm db:start" || exit 1
    
    # Wait for docker containers to be ready
    print_step "Waiting for docker containers to be ready..."
    sleep 5
    
    print_step "Starting transactional-base dev server"
    run_in_service_background "transactional-base" "pnpm dev" "main" || exit 1
    
    # Wait for transactional-base to be ready (runs on port 8082)
    wait_for_service "transactional-base" "8082" || {
        print_warning "transactional-base may not be fully ready, continuing anyway..."
    }
    
    # Run setup:replication
    print_step "Setting up replication for transactional-base"
    run_in_service "transactional-base" "pnpm setup:replication" || exit 1
    echo ""
    
    # Step 3: Start sync-base
    print_step "Step 3: Starting sync-base"
    run_in_service_background "sync-base" "pnpm dev" "main" || exit 1
    wait_for_log_message "$SCRIPT_DIR/services/sync-base/dev-main.log" "Starting development mode" "sync-base" || exit 1
    echo ""
    
    # Step 4: Start analytical-base
    print_step "Step 4: Starting analytical-base"
    run_in_service_background "analytical-base" "pnpm dev" "main" || exit 1
    wait_for_log_message "$SCRIPT_DIR/services/analytical-base/dev-main.log" "Started Webserver" "analytical-base" || exit 1
    echo ""
    
    # Step 5: Trigger file watcher for analytical-base
    print_step "Step 5: Triggering file watcher for analytical-base"
    trigger_file_watcher "services/analytical-base/app/index.ts" || exit 1
    sleep 3
    echo ""
    
    # Step 6: Setup and start retrieval-base
    print_step "Step 6: Setting up and starting retrieval-base"
    
    print_step "Running elasticsearch setup..."
    run_in_service "retrieval-base" "pnpm es:setup" || exit 1

    print_step "Starting retrieval-base docker containers"
    run_in_service "retrieval-base" "pnpm es:start" || exit 1
    
    # Wait for docker containers to be ready
    print_step "Waiting for docker containers to be ready..."
    sleep 5
    


    print_step "Initializing elasticsearch indices..."
    run_in_service "retrieval-base" "pnpm es:init-indices" || exit 1
    
    print_step "Starting retrieval-base server..."
    run_in_service_background "retrieval-base" "pnpm run dev:server-only" "main" || exit 1
    wait_for_service "retrieval-base" "8083" || {
        print_warning "retrieval-base may not be fully ready, continuing anyway..."
    }
    echo ""
    
    # Step 7: Start frontend
    print_step "Step 7: Starting frontend (vite-web-base)"
    
    local frontend_dir="$SCRIPT_DIR/apps/vite-web-base"
    print_step "Running 'pnpm dev' for frontend..."
    
    if [ ! -d "$frontend_dir" ]; then
        print_error "Frontend directory not found: $frontend_dir"
        exit 1
    fi
    
    cd "$frontend_dir" || {
        print_error "Failed to change to frontend directory: $frontend_dir"
        exit 1
    }
    
    # Start frontend in background
    nohup bash -c "pnpm dev" > "$frontend_dir/dev-main.log" 2>&1 &
    local frontend_pid=$!
    
    print_success "Started frontend with PID $frontend_pid (logs: $frontend_dir/dev-main.log)"
    cd "$SCRIPT_DIR"
    
    # Wait for frontend to be ready (Vite typically uses port 5173)
    wait_for_service "frontend" "5173" || {
        print_warning "frontend may not be fully ready, continuing anyway..."
    }
    echo ""
    
    print_success "🎉 Development environment bootstrap completed!"
    echo ""
    echo "Services started:"
    echo "  • transactional-base: http://localhost:8082"
    echo "  • sync-base: http://localhost:4000"
    echo "  • analytical-base: http://localhost:4100 (ingest)"
    echo "  • retrieval-base: http://localhost:8083 (search API)"
    echo "  • frontend: http://localhost:5173 (web UI)"
    echo ""
    echo "Log files:"
    echo "  • transactional-base: services/transactional-base/dev-main.log"
    echo "  • sync-base main: services/sync-base/dev-main.log"
    echo "  • analytical-base: services/analytical-base/dev-main.log"
    echo "  • retrieval-base: services/retrieval-base/dev-main.log"
    echo "  • frontend: apps/vite-web-base/dev-main.log"
    echo ""
    echo "To start workflows separately, run: pnpm dev:workflow"
    echo "To stop all services, you can use: ./scripts/dev-shutdown.sh"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Bootstrap the development environment with proper service sequencing."
    echo ""
    echo "This script will:"
    echo "  1. Copy .env from transactional-base to sync-base"
    echo "  2. Start transactional-base and setup replication"
    echo "  3. Start sync-base"
    echo "  4. Start analytical-base"
    echo "  5. Touch analytical-base index.ts to trigger file watcher"
    echo "  6. Setup and start retrieval-base with elasticsearch"
    echo "  7. Start frontend (vite-web-base)"
    echo ""
    echo "Options:"
    echo "  --help              Show this help message"
    echo ""
}

# Handle help flag
if [[ " $@ " =~ " --help " ]] || [[ " $@ " =~ " -h " ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@" 