#!/bin/bash

# Analytical Base Minimal Setup Script
# Configuration and validation only

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
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

# Validate configuration files
validate_config() {
    print_status "Validating configuration..."
    
    # Check if moose.config.toml exists
    if [ ! -f "moose.config.toml" ]; then
        print_error "moose.config.toml not found"
        exit 1
    fi
    
    print_success "Configuration files validated"
}

# Main setup function
setup() {
    echo "=========================================="
    echo "  Analytical Base Setup (Config Only)"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    validate_config
    echo ""
    
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Configuration validated. Next steps:"
    echo "  • Return to project root: cd ../.."
    echo "  • Start all services: pnpm dev:start"
    echo ""
}

# Handle command line arguments
case "${1:-setup}" in
    "setup"|"")
        setup
        ;;
    "--help"|"-h"|"help")
        echo "Usage: $0 [setup]"
        echo "Minimal configuration setup for analytical-base service"
        echo ""
        echo "This script only validates prerequisites and configuration."
        echo "Use the root monorepo commands to install dependencies and start services."
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac 