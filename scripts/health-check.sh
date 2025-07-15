#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to get service URL based on service type
get_service_url() {
    local service_name="$1"
    local port="$2"
    
    case "$service_name" in
        "sync-base"|"analytical-base")
            echo "http://localhost:$port/health"
            ;;
        *)
            echo "http://localhost:$port"
            ;;
    esac
}

# Function to build dynamic service list
build_service_list() {
    local base_dir="${1:-$(pwd)}"
    local services="transactional-base sync-base analytical-base retrieval-base frontend"
    
    for service_name in $services; do
        local port=$(discover_service_port "$service_name" "$base_dir")
        if [ -n "$port" ]; then
            local url=$(get_service_url "$service_name" "$port")
            echo "$service_name|$url|$port"
        fi
    done
}

# Build dynamic service definitions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
SERVICES_DYNAMIC=$(build_service_list "$SCRIPT_DIR")

# Fallback to static definitions if dynamic discovery fails
if [ -z "$SERVICES_DYNAMIC" ]; then
    SERVICES="
transactional-base|http://localhost:8082|8082
sync-base|http://localhost:4000/health|4000
analytical-base|http://localhost:4100/health|4100
retrieval-base|http://localhost:8083|8083
frontend|http://localhost:5173|5173
"
else
    SERVICES="$SERVICES_DYNAMIC"
fi

# Function to print colored output
print_status() {
    local service="$1"
    local status="$2"
    local port="$3"
    
    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✅ $service (port $port): UP${NC}"
    elif [ "$status" = "000" ]; then
        echo -e "${RED}❌ $service (port $port): DOWN (no response)${NC}"
    else
        echo -e "${YELLOW}⚠️  $service (port $port): HTTP $status${NC}"
    fi
}

# Function to show usage
show_help() {
    echo "Usage: $0 [SERVICE_NAME] [OPTIONS]"
    echo ""
    echo "Check the health of Area Code services."
    echo ""
    echo "Arguments:"
    echo "  SERVICE_NAME    Check specific service (optional)"
    echo ""
    echo "Options:"
    echo "  --debug         Show port discovery details"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Available services:"
    echo "$SERVICES" | grep -v "^$" | while IFS='|' read -r name url port; do
        echo "  • $name (port $port)"
    done | sort
    echo ""
    echo "Examples:"
    echo "  $0                    # Check all services"
    echo "  $0 analytical-base    # Check only analytical-base"
    echo "  $0 frontend          # Check only frontend"
    echo "  $0 --debug           # Check all with port discovery details"
    echo ""
}

# Function to show port discovery debug info
show_debug_info() {
    echo "=========================================="
    echo "  Port Discovery Debug Information"
    echo "=========================================="
    echo ""
    
    local services="transactional-base sync-base analytical-base retrieval-base frontend"
    for service_name in $services; do
        echo -e "${BLUE}🔍 $service_name:${NC}"
        
        local port=$(discover_service_port "$service_name" "$SCRIPT_DIR")
        local url=$(get_service_url "$service_name" "$port")
        
        case "$service_name" in
            "analytical-base"|"sync-base")
                local config_file="$SCRIPT_DIR/services/$service_name/moose.config.toml"
                if [ -f "$config_file" ]; then
                    echo "  📁 Config: $config_file"
                    echo "  🔧 Source: moose.config.toml [http_server_config].port"
                else
                    echo "  ❌ Config: Missing moose.config.toml"
                fi
                ;;
            "transactional-base"|"retrieval-base")
                local package_file="$SCRIPT_DIR/services/$service_name/package.json"
                local server_file="$SCRIPT_DIR/services/$service_name/src/server.ts"
                local pkg_port=$(get_package_json_port "$SCRIPT_DIR/services/$service_name")
                if [ -n "$pkg_port" ]; then
                    echo "  📁 Source: package.json PORT override"
                    echo "  🔧 Found: PORT=$pkg_port in dev script"
                elif [ -f "$server_file" ]; then
                    echo "  📁 Source: server.ts default"
                    echo "  🔧 Found: process.env.PORT fallback"
                else
                    echo "  ❌ Source: No configuration found"
                fi
                ;;
            "frontend")
                local vite_config="$SCRIPT_DIR/apps/vite-web-base/vite.config.ts"
                echo "  📁 Config: $vite_config"
                if [ -f "$vite_config" ] && grep -q "server.*port" "$vite_config"; then
                    echo "  🔧 Source: vite.config.ts server.port"
                else
                    echo "  🔧 Source: Vite default (5173)"
                fi
                ;;
        esac
        
        echo "  🌐 URL: $url"
        echo "  🔌 Port: $port"
        echo ""
    done
}

# Function to check service health
check_service() {
    local name="$1"
    local url="$2"
    local port="$3"
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    print_status "$name" "$status_code" "$port"
    
    # Return 0 if service is healthy, 1 if not
    if [ "$status_code" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check a single service by name
check_single_service() {
    local service_name="$1"
    
    # Read the service info
    local service_line=$(echo "$SERVICES" | grep "^$service_name|")
    if [ -z "$service_line" ]; then
        echo -e "${RED}❌ Unknown service: $service_name${NC}"
        echo ""
        echo "Available services:"
        echo "$SERVICES" | grep -v "^$" | while IFS='|' read -r name url port; do
            echo "  • $name (port $port)"
        done | sort
        return 1
    fi
    
    local service_url=$(echo "$service_line" | cut -d'|' -f2)
    local service_port=$(echo "$service_line" | cut -d'|' -f3)
    
    echo "=========================================="
    echo "  $service_name Health Check"
    echo "=========================================="
    echo ""
    
    check_service "$service_name" "$service_url" "$service_port"
    
    echo ""
    echo "=========================================="
    
    # Always return 0 to avoid ELIFECYCLE errors
    return 0
}

# Function to check all services
check_all_services() {
    echo "=========================================="
    echo "  Area Code Services Health Check"
    echo "=========================================="
    echo ""

    # Track overall health
    local all_healthy=true

    # Check each service
    while IFS='|' read -r service_name service_url service_port; do        
        check_service "$service_name" "$service_url" "$service_port" || all_healthy=false
    done < <(echo "$SERVICES" | grep -v "^$")

    echo ""
    echo "=========================================="

    # Always return 0 to avoid ELIFECYCLE errors
    return 0
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --debug)
        show_debug_info
        echo ""
        check_all_services
        exit 0
        ;;
    "")
        # No arguments - check all services
        check_all_services
        exit 0
        ;;
    *)
        # Service name provided - check single service
        check_single_service "$1"
        exit 0
        ;;
esac 