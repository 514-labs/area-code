#!/bin/bash

# Retrieval Base Service Setup Script
# Handles one-time setup tasks only

#set -e  # Exit on any error

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
    echo "  setup     - Run full setup (default)"
    echo "  indices   - Initialize Elasticsearch indices only"
    echo "  config    - Setup configuration files"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # Full setup"
    echo "  $0 indices   # Initialize indices only"
    echo "  $0 config    # Setup config only"
    echo ""
    echo "Note: This script only handles setup tasks."
    echo "Use docker-compose and pnpm commands directly for service management."
    echo ""
}

# Check prerequisites (but don't install them)
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local has_errors=0
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20+"
        has_errors=1
    else
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 20 ]; then
            print_error "Node.js version 20+ is required. Current version: $(node --version)"
            has_errors=1
        else
            print_success "Node.js version: $(node --version)"
        fi
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install pnpm"
        has_errors=1
    else
        print_success "pnpm version: $(pnpm --version)"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker"
        has_errors=1
    else
        print_success "Docker version: $(docker --version)"
    fi
    
    if [ $has_errors -eq 1 ]; then
        print_error "Please install missing prerequisites before continuing"
        exit 1
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

# Wait for Elasticsearch to be ready
wait_for_elasticsearch() {
    print_status "Waiting for Elasticsearch to be ready..."
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            print_success "Elasticsearch is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts: Waiting for Elasticsearch..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Elasticsearch failed to start within expected time"
    return 1
}

# Initialize indices
init_indices() {
    print_status "Initializing Elasticsearch indices..."
    
    # Check if Elasticsearch is running
    if ! is_elasticsearch_running; then
        print_error "Elasticsearch is not running. Please start it first:"
        print_error "  docker-compose up -d"
        exit 1
    fi
    
    npx tsx src/scripts/init-indices.ts
    print_success "Indices initialized successfully"
}

# Setup configuration files
setup_config() {
    print_status "Setting up configuration files..."
    
    # Check if tsconfig.json exists
    if [ ! -f "tsconfig.json" ]; then
        print_warning "tsconfig.json not found - this may be intentional"
    else
        print_success "tsconfig.json found"
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found - this is required"
        exit 1
    else
        print_success "package.json found"
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found - this is required for Elasticsearch"
        exit 1
    else
        print_success "docker-compose.yml found"
    fi
    
    print_success "Configuration files are properly set up"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    # Create volumes directory if it doesn't exist
    if [ ! -d "volumes" ]; then
        mkdir -p volumes
        print_success "Created volumes directory"
    else
        print_status "volumes directory already exists"
    fi
    
    # Create temp_migration directory if it doesn't exist
    if [ ! -d "temp_migration" ]; then
        mkdir -p temp_migration
        print_success "Created temp_migration directory"
    else
        print_status "temp_migration directory already exists"
    fi
}

# Main setup function
full_setup() {
    echo "=========================================="
    echo "  Retrieval Base Service Setup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    setup_config
    echo ""
    
    create_directories
    echo ""
    
    print_status "Checking if dependencies are installed..."
    if [ ! -d "node_modules" ]; then
        print_warning "Dependencies not installed. Please run: pnpm install"
    else
        print_success "Dependencies appear to be installed"
    fi
    echo ""
    
    print_status "Checking if Elasticsearch is running..."
    if is_elasticsearch_running; then
        print_success "Elasticsearch is running"
        echo ""
        init_indices
    else
        print_warning "Elasticsearch is not running"
        print_status "To start Elasticsearch: docker-compose up -d"
        print_status "Then run: $0 indices"
    fi
    echo ""
    
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Install dependencies: pnpm install"
    echo "  2. Start Elasticsearch: docker-compose up -d"
    echo "  3. Initialize indices: $0 indices"
    echo "  4. Start the service: pnpm dev"
    echo ""
    echo "Available endpoints (once running):"
    echo "  • Service: http://localhost:8082"
    echo "  • Health check: http://localhost:8082/health"
    echo "  • API docs: http://localhost:8082/docs"
    echo "  • Kibana: http://localhost:5601"
    echo ""
}

# Main function to handle command-line arguments
main() {
    case "${1:-setup}" in
        "setup")
            full_setup
            ;;
        "indices")
            init_indices
            ;;
        "config")
            setup_config
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