#!/bin/bash

########################################################
# Development Environment Shutdown Script
########################################################

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

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

# Function to read port from moose.config.toml
get_moose_port() {
    local service_dir="$1"
    local config_file="$service_dir/moose.config.toml"
    
    if [ -f "$config_file" ]; then
        # Extract port from [http_server_config] section
        grep -A 10 '\[http_server_config\]' "$config_file" | grep '^port' | head -1 | cut -d'=' -f2 | tr -d ' '
    fi
}

# Function to get port from package.json dev script
get_package_json_port() {
    local service_dir="$1"
    local package_file="$service_dir/package.json"
    
    if [ -f "$package_file" ]; then
        # Look for PORT=XXXX in dev scripts
        grep -o 'PORT=[0-9]*' "$package_file" 2>/dev/null | cut -d'=' -f2 | head -1
    fi
}

# Function to get default port from server.ts
get_server_default_port() {
    local service_dir="$1"
    local server_file="$service_dir/src/server.ts"
    
    if [ -f "$server_file" ]; then
        # Extract default port from process.env.PORT || "XXXX"
        grep 'process\.env\.PORT.*||' "$server_file" | grep -o '"[0-9]*"' | tr -d '"' | head -1
    fi
}

# Function to get Vite dev server port
get_vite_port() {
    local app_dir="$1"
    local vite_config="$app_dir/vite.config.ts"
    
    # Check if vite config has server.port defined
    if [ -f "$vite_config" ] && grep -q "server.*port" "$vite_config"; then
        grep -A 5 'server.*{' "$vite_config" | grep 'port' | grep -o '[0-9]*' | head -1
    else
        # Vite default port
        echo "5173"
    fi
}

# Function to discover service port dynamically
discover_service_port() {
    local service_name="$1"
    local base_dir="${2:-$(pwd)}"
    
    case "$service_name" in
        "analytical-base"|"sync-base")
            local service_dir="$base_dir/services/$service_name"
            get_moose_port "$service_dir"
            ;;
        "transactional-base")
            local service_dir="$base_dir/services/$service_name"
            # Check package.json first, then server.ts default
            local port=$(get_package_json_port "$service_dir")
            if [ -z "$port" ]; then
                port=$(get_server_default_port "$service_dir")
            fi
            echo "$port"
            ;;
        "retrieval-base")
            local service_dir="$base_dir/services/$service_name"
            # retrieval-base overrides PORT in package.json
            local port=$(get_package_json_port "$service_dir")
            if [ -z "$port" ]; then
                port=$(get_server_default_port "$service_dir")
            fi
            echo "$port"
            ;;
        "frontend")
            local app_dir="$base_dir/apps/vite-web-base"
            get_vite_port "$app_dir"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Function to build dynamic service list with discovered ports
build_service_list() {
    local base_dir="${1:-$(pwd)}"
    local services="transactional-base sync-base analytical-base retrieval-base frontend"
    
    for service_name in $services; do
        local port=$(discover_service_port "$service_name" "$base_dir")
        if [ -n "$port" ]; then
            echo "$service_name|$port"
        fi
    done
}

# Build dynamic service definitions
SERVICES_DYNAMIC=$(build_service_list "$SCRIPT_DIR")

# Function to kill processes on a specific port
kill_processes_on_port() {
    local port="$1"
    local service_name="$2"
    
    print_step "Checking for processes on port $port ($service_name)..."
    
    # Get processes using this port
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        echo "  No processes found on port $port"
        return 0
    fi
    
    # Kill each process
    for pid in $pids; do
        local process_info=$(ps -p $pid -o command= 2>/dev/null || true)
        if [ -n "$process_info" ]; then
            print_step "Killing process on port $port (PID: $pid)"
            echo "  Process: $process_info"
            
            # Try graceful shutdown first (SIGTERM)
            if kill -TERM $pid 2>/dev/null; then
                # Wait a moment for graceful shutdown
                sleep 2
                
                # Check if process is still running
                if kill -0 $pid 2>/dev/null; then
                    print_warning "Process $pid still running, using SIGKILL"
                    kill -KILL $pid 2>/dev/null || true
                fi
            fi
        fi
    done
    
    # Verify port is now free
    local remaining_pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -z "$remaining_pids" ]; then
        print_success "Port $port is now free"
    else
        print_error "Some processes may still be using port $port"
    fi
}

# Function to cleanup moose-specific processes
cleanup_moose_processes() {
    print_step "Cleaning up moose-related processes..."
    
    # Kill moose processes
    local moose_pids=$(pgrep -f "moose.*dev" 2>/dev/null || true)
    if [ -n "$moose_pids" ]; then
        for pid in $moose_pids; do
            local process_info=$(ps -p $pid -o command= 2>/dev/null || true)
            print_step "Killing moose process (PID: $pid)"
            echo "  Process: $process_info"
            kill -TERM $pid 2>/dev/null || true
        done
        sleep 2
    fi
    
    # Kill moose-cli processes
    local cli_pids=$(pgrep -f "moose-cli.*dev" 2>/dev/null || true)
    if [ -n "$cli_pids" ]; then
        for pid in $cli_pids; do
            local process_info=$(ps -p $pid -o command= 2>/dev/null || true)
            print_step "Killing moose-cli process (PID: $pid)"
            echo "  Process: $process_info"
            kill -TERM $pid 2>/dev/null || true
        done
        sleep 2
    fi
    
    # Kill moose-runner processes
    local runner_pids=$(pgrep -f "moose-runner" 2>/dev/null || true)
    if [ -n "$runner_pids" ]; then
        for pid in $runner_pids; do
            local process_info=$(ps -p $pid -o command= 2>/dev/null || true)
            print_step "Killing moose-runner process (PID: $pid)"
            echo "  Process: $process_info"
            kill -TERM $pid 2>/dev/null || true
        done
        sleep 2
    fi
    
    print_success "Moose processes cleanup completed"
}

# Function to terminate workflows
terminate_workflows() {
    print_step "Terminating existing workflows..."
    
    # Change to sync-base directory for workflow termination
    local sync_base_dir="$SCRIPT_DIR/services/sync-base"
    if [ -d "$sync_base_dir" ]; then
        cd "$sync_base_dir" || true
        if command -v pnpm >/dev/null 2>&1; then
            # Try to terminate known workflows
            pnpm moose workflow terminate supabase-listener 2>/dev/null || true
        fi
        cd "$SCRIPT_DIR"
    fi
    
    print_success "Workflow termination completed"
}

# Function to cleanup background processes started by dev scripts
cleanup_background_processes() {
    print_step "Cleaning up background processes started by dev scripts..."
    
    # Find processes that might be from our dev scripts
    local dev_processes=$(pgrep -f "tsx.*src/server.ts" 2>/dev/null || true)
    if [ -n "$dev_processes" ]; then
        for pid in $dev_processes; do
            local process_info=$(ps -p $pid -o command= 2>/dev/null || true)
            print_step "Killing dev server process (PID: $pid)"
            echo "  Process: $process_info"
            kill -TERM $pid 2>/dev/null || true
        done
        sleep 2
    fi
    
    # Find vite processes
    local vite_processes=$(pgrep -f "vite" 2>/dev/null || true)
    if [ -n "$vite_processes" ]; then
        for pid in $vite_processes; do
            local process_info=$(ps -p $pid -o command= 2>/dev/null || true)
            # Only kill if it looks like our vite process
            if [[ "$process_info" =~ vite.*dev ]]; then
                print_step "Killing vite dev process (PID: $pid)"
                echo "  Process: $process_info"
                kill -TERM $pid 2>/dev/null || true
            fi
        done
        sleep 2
    fi
    
    print_success "Background processes cleanup completed"
}

# Function to shutdown a single service by name
shutdown_single_service() {
    local service_name="$1"
    local force_kill="$2"
    
    # Find the service in our dynamic list
    local service_line=""
    if [ -n "$SERVICES_DYNAMIC" ]; then
        service_line=$(echo "$SERVICES_DYNAMIC" | grep "^$service_name|")
    fi
    
    if [ -z "$service_line" ]; then
        print_error "Unknown service: $service_name"
        echo ""
        echo "Available services:"
        if [ -n "$SERVICES_DYNAMIC" ]; then
            while IFS='|' read -r name port; do
                echo "  • $name (port $port)"
            done <<< "$SERVICES_DYNAMIC" | sort
        else
            echo "  • No services discovered (check service configurations)"
        fi
        return 1
    fi
    
    local service_port=$(echo "$service_line" | cut -d'|' -f2)
    
    echo "=========================================="
    echo "  $service_name Shutdown"
    echo "=========================================="
    echo ""
    
    # Step 1: Terminate workflows if this is sync-base
    if [ "$service_name" = "sync-base" ]; then
        print_step "Step 1: Terminating workflows for $service_name"
        terminate_workflows
        echo ""
    fi
    
    # Step 2: Kill processes on the specific port
    print_step "Step 2: Shutting down $service_name on port $service_port"
    kill_processes_on_port "$service_port" "$service_name"
    echo ""
    
    # Step 3: Cleanup related processes
    print_step "Step 3: Cleaning up related processes for $service_name"
    case "$service_name" in
        "analytical-base"|"sync-base")
            # Cleanup moose processes for these services
            cleanup_moose_processes
            ;;
        "transactional-base"|"retrieval-base")
            # Cleanup dev server processes
            local dev_processes=$(pgrep -f "tsx.*src/server.ts" 2>/dev/null || true)
            if [ -n "$dev_processes" ]; then
                for pid in $dev_processes; do
                    local process_info=$(ps -p $pid -o command= 2>/dev/null || true)
                    # Only kill if it's from the specific service directory
                    if [[ "$process_info" =~ $service_name ]]; then
                        print_step "Killing $service_name dev server process (PID: $pid)"
                        echo "  Process: $process_info"
                        kill -TERM $pid 2>/dev/null || true
                    fi
                done
                sleep 2
            fi
            ;;
        "frontend")
            # Cleanup vite processes
            local vite_processes=$(pgrep -f "vite" 2>/dev/null || true)
            if [ -n "$vite_processes" ]; then
                for pid in $vite_processes; do
                    local process_info=$(ps -p $pid -o command= 2>/dev/null || true)
                    if [[ "$process_info" =~ vite.*dev ]]; then
                        print_step "Killing vite dev process (PID: $pid)"
                        echo "  Process: $process_info"
                        kill -TERM $pid 2>/dev/null || true
                    fi
                done
                sleep 2
            fi
            ;;
    esac
    echo ""
    
    # Step 4: Final verification
    print_step "Step 4: Verifying $service_name shutdown"
    local pids=$(lsof -ti:$service_port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        print_warning "$service_name (port $service_port) still has processes running"
        echo ""
        echo "You can use --force for more aggressive shutdown or check manually:"
        echo "  lsof -ti:$service_port"
        return 1
    else
        echo "  ✅ $service_name (port $service_port) is clear"
    fi
    
    echo ""
    print_success "🎉 $service_name has been shut down successfully!"
    echo ""
    echo "To verify the service is down, run:"
    echo "  ./scripts/health-check.sh $service_name"
    echo ""
    echo "To start $service_name again, run:"
    echo "  pnpm dev:sequence"
    echo "=========================================="
    
    return 0
}

# Function to show help
show_help() {
    echo "Usage: $0 [SERVICE_NAME] [OPTIONS]"
    echo ""
    echo "Shutdown development processes started by dev-sequence.sh."
    echo ""
    echo "Arguments:"
    echo "  SERVICE_NAME        Shutdown specific service (optional)"
    echo ""
    echo "This script will:"
    echo "  1. Dynamically discover and kill processes on development service ports"
    echo "  2. Cleanup moose-related background processes"
    echo "  3. Terminate any running workflows"
    echo "  4. Cleanup other dev script background processes"
    echo ""
    echo "Options:"
    echo "  --help, -h          Show this help message"
    echo "  --force             Use SIGKILL immediately instead of graceful shutdown"
    echo ""
    echo "Available services:"
    if [ -n "$SERVICES_DYNAMIC" ]; then
        while IFS='|' read -r service_name port; do
            echo "  • $service_name (port $port)"
        done <<< "$SERVICES_DYNAMIC" | sort
    else
        echo "  • No services discovered (check service configurations)"
    fi
    echo ""
    echo "Examples:"
    echo "  $0                      # Shutdown all services"
    echo "  $0 analytical-base      # Shutdown only analytical-base"
    echo "  $0 frontend            # Shutdown only frontend"
    echo "  $0 --force             # Force shutdown all services"
    echo ""
}

# Main execution function
main() {
    local force_kill=false
    local service_name=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --force)
                force_kill=true
                shift
                ;;
            -*)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
            *)
                # This should be a service name
                if [ -z "$service_name" ]; then
                    service_name="$1"
                else
                    print_error "Multiple service names provided: '$service_name' and '$1'"
                    show_help
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # If a specific service is requested, shutdown only that service
    if [ -n "$service_name" ]; then
        shutdown_single_service "$service_name" "$force_kill"
        exit $?
    fi
    
    # Otherwise, shutdown all services
    echo "=========================================="
    echo "  Development Environment Shutdown"
    echo "=========================================="
    echo ""
    
    # Step 1: Terminate workflows first
    print_step "Step 1: Terminating workflows"
    terminate_workflows
    echo ""
    
    # Step 2: Kill processes on specific ports
    print_step "Step 2: Shutting down services on monitored ports"
    if [ -n "$SERVICES_DYNAMIC" ]; then
        while IFS='|' read -r service_name port; do
            kill_processes_on_port "$port" "$service_name"
        done <<< "$SERVICES_DYNAMIC"
    else
        print_warning "No services discovered - check service configurations"
    fi
    echo ""
    
    # Step 3: Cleanup moose processes
    print_step "Step 3: Cleaning up moose processes"
    cleanup_moose_processes
    echo ""
    
    # Step 4: Cleanup other background processes
    print_step "Step 4: Cleaning up other background processes"
    cleanup_background_processes
    echo ""
    
    # Step 5: Final verification
    print_step "Step 5: Verifying shutdown"
    local still_running=false
    if [ -n "$SERVICES_DYNAMIC" ]; then
        while IFS='|' read -r service_name port; do
            local pids=$(lsof -ti:$port 2>/dev/null || true)
            if [ -n "$pids" ]; then
                print_warning "$service_name (port $port) still has processes running"
                still_running=true
            else
                echo "  ✅ $service_name (port $port) is clear"
            fi
        done <<< "$SERVICES_DYNAMIC"
    else
        print_warning "No services to verify - none were discovered"
    fi
    
    echo ""
    if [ "$still_running" = true ]; then
        print_warning "Some services may still be running. Run with --force for more aggressive shutdown."
        echo ""
        echo "You can also use the health check script to verify:"
        echo "  ./scripts/health-check.sh"
    else
        print_success "🎉 All development services have been shut down successfully!"
        echo ""
        echo "To verify all services are down, run:"
        echo "  ./scripts/health-check.sh"
        echo ""
        echo "To start services again, run:"
        echo "  pnpm dev:sequence"
    fi
    
    echo "=========================================="
}

# Run main function
main "$@" 