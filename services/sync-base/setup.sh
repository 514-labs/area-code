#!/bin/bash

# Sync Base Service Setup Script
# Handles configuration and environment setup only

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
    echo "  setup     - Setup environment configuration (default)"
    echo "  env:check - Validate environment configuration"
    echo "  env:reset - Reset environment configuration"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # Setup environment configuration"
    echo "  $0 env:check # Validate environment configuration"
    echo "  $0 env:reset # Reset environment configuration"
    echo ""
    echo "Note: This script only handles configuration setup."
    echo "To manage services and dependencies, use the appropriate tools:"
    echo "  - Install dependencies: pnpm install"
    echo "  - Start service: pnpm dev"
    echo "  - Stop service: Use process manager or Ctrl+C"
    echo ""
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
        print_error "transactional-base/.env not found at: $transactional_env_path"
        print_error "The sync-base service REQUIRES transactional-base configuration"
        print_error "Please run 'pnpm dev:setup --service=transactional-base' first"
        exit 1
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
    
    # Load environment variables from .env file
    set -a
    source .env
    set +a
    
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
    
    # Load environment variables from .env file
    set -a
    source .env
    set +a
    
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

# Reset environment configuration
reset_environment() {
    print_status "Resetting environment configuration..."
    
    if [ -f ".env" ]; then
        print_status "Backing up existing .env to .env.backup"
        cp .env .env.backup
        print_success "Backup created: .env.backup"
    fi
    
    generate_env_file
    print_success "Environment configuration reset completed"
}

# Main setup function (configuration setup only)
setup_configuration() {
    echo "=========================================="
    echo "  Sync Base Service Configuration Setup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    check_environment
    echo ""
    
    echo "=========================================="
    print_success "Configuration setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Run '$0 env:check' to validate your configuration"
    echo "  2. Install dependencies: pnpm install"
    echo "  3. Ensure transactional-base service is running"
    echo "  4. Start the service: pnpm dev"
    echo "  5. Test by making changes to foo/bar tables in transactional-base"
    echo ""
    echo "Configuration validation: $0 env:check"
    echo "Reset configuration: $0 env:reset"
    echo ""
}

# Main function to handle command-line arguments
main() {
    case "${1:-setup}" in
        "setup")
            setup_configuration
            ;;
        "env:check")
            validate_environment
            ;;
        "env:reset")
            reset_environment
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
