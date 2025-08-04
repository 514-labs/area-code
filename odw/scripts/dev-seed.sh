#!/bin/bash -e

########################################################
# ODW Development Data Seeding Script
########################################################

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the ODW root (parent of scripts directory)
ODW_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
BUCKET_NAME="unstructured-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[ODW-SEED]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[ODW-SEED]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ODW-SEED]${NC} $1"
}

print_error() {
    echo -e "${RED}[ODW-SEED]${NC} $1"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script seeds data for the Operation Data Warehouse."
    echo "It sets up MinIO buckets and populates them with unstructured data."
    echo ""
    echo "Options:"
    echo "  --help              Show this help message"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

main() {
    print_status "Starting ODW data seeding process..."

    # Install MinIO client if needed
    print_status "Installing MinIO client..."
    brew install minio/stable/mc

    # Set up MinIO alias
    print_status "Setting up MinIO connection..."
    mc alias set localminio http://localhost:9500 minioadmin minioadmin

    # Create bucket and set permissions
    print_status "Creating $BUCKET_NAME bucket..."
    if mc mb localminio/$BUCKET_NAME 2>/dev/null; then
        print_success "Bucket created successfully"
    else
        print_warning "Bucket already exists, skipping creation"
    fi

    print_status "Setting bucket permissions..."
    mc anonymous set public localminio/$BUCKET_NAME
    mc anonymous set download localminio/$BUCKET_NAME

    # Run the seed data script
    print_status "Running seed data script..."
    if [ ! -f "$ODW_ROOT/scripts/seed-data.py" ]; then
        print_error "Seed data script not found: $ODW_ROOT/scripts/seed-data.py"
        exit 1
    fi

    cd "$ODW_ROOT/scripts"
    ./seed-data.py

    print_success "ODW data seeding completed successfully!"
}

main "$@"