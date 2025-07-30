#!/bin/bash 

########################################################
# Global variables
########################################################

DOCKER_COMPOSE_CMD="docker compose"

########################################################
# Utility functions
########################################################

# Function to check if a command exists
check_dependency() {
    local cmd="$1"
    local name="$2"
    
    if ! command -v "$cmd" &> /dev/null; then
        echo "❌ Error: $name is not installed or not in PATH"
        echo "Please install $name and try again."
        return 1
    else
        echo "✅ $name is available: $(command -v "$cmd")"
        return 0
    fi
}

# Function to check if a flag is present in arguments
has_flag() {
    local flag="$1"
    shift
    [[ " $@ " =~ " $flag" ]]
}

########################################################
# Core functionality functions
########################################################

check_dependencies() {
    echo "🔍 Checking required dependencies..."
    
    # Check required dependencies
    check_dependency "git" "Git" || return 1
    check_dependency "docker" "Docker" || return 1
    check_dependency "docker" "Docker Compose" || return 1
    check_dependency "node" "Node.js" || return 1
    check_dependency "pnpm" "pnpm" || return 1

    # Verify docker compose specifically
    if ! docker compose version &> /dev/null; then
        echo "❌ Error: Docker Compose is not working properly"
        echo "Please ensure Docker Compose is properly installed."
        return 1
    else
        echo "✅ Docker Compose is working: $(docker compose version)"
    fi

    echo "✅ All dependencies are available."
    return 0
}

setup_environment() {
    echo "🔧 Setting up environment files..."
    
    # Check if .env file exists, if not copy from env.example
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            echo "📋 .env file not found. Copying env.example to .env..."
            cp env.example .env
            echo "✅ .env file created from env.example"
        else
            echo "❌ Error: .env file not found and env.example does not exist"
            echo "Please create a .env file with the required environment variables."
            return 1
        fi
    else
        echo "✅ .env file already exists"
    fi

    # Check if secrets need to be generated or updated
    if has_flag "--reset-secrets" "$@" || ! grep -q "^JWT_SECRET=" .env 2>/dev/null || grep -q "your-super-secret-jwt-token" .env 2>/dev/null; then
        if [ -f "generate-jwt.mjs" ]; then
            echo "🔐 Generating secrets and updating .env file..."
            
            # Generate secrets and capture output
            SECRETS_OUTPUT=$(node generate-jwt.mjs --quiet 2>/dev/null)
            if [ $? -eq 0 ]; then
                # Update .env file with generated secrets
                while IFS= read -r line; do
                    if [[ $line =~ ^[A-Z_]+= ]]; then
                        # Extract variable name and value
                        var_name=$(echo "$line" | cut -d'=' -f1)
                        var_value=$(echo "$line" | cut -d'=' -f2-)
                        
                        # Update .env file using sed
                        if grep -q "^${var_name}=" .env 2>/dev/null; then
                            # Variable exists, update it
                            sed -i.bak "s/^${var_name}=.*/${var_name}=${var_value}/" .env
                        else
                            # Variable doesn't exist, add it to the secrets section
                            sed -i.bak "/^############$/a\\
${var_name}=${var_value}" .env
                        fi
                    fi
                done <<< "$SECRETS_OUTPUT"
                
                # Clean up backup file
                rm -f .env.bak
                echo "✅ Secrets generated and .env file updated successfully"
            else
                echo "❌ Error: Failed to generate secrets"
                return 1
            fi
        else
            echo "❌ Error: generate-jwt.mjs not found"
            echo "Please ensure generate-jwt.mjs is available to create secrets."
            return 1
        fi
    else
        echo "✅ .env file already contains generated secrets"
    fi
    
    return 0
}

reset_environment() {
    echo "🔄 Resetting environment..."
    
    echo "Stopping and removing all containers with volumes and orphans..."
    $DOCKER_COMPOSE_CMD down -v --remove-orphans

    BIND_MOUNTS=(
        "./volumes/db/data"
    )

    for DIR in "${BIND_MOUNTS[@]}"; do
        if [ -d "$DIR" ]; then
            echo "Deleting $DIR..."
            rm -rf "$DIR"
        fi
    done

    # Delete .moose folder if it exists
    if [ -d ".moose" ]; then
        echo "Deleting .moose folder..."
        rm -rf ".moose"
    fi

    docker volume prune -f
    echo "✅ Environment reset complete"
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script sets up the transactional-supabase-foobar environment by:"
    echo "  - Checking required dependencies"
    echo "  - Creating .env file from env.example if needed"
    echo "  - Generating secrets for the .env file"
    echo ""
    echo "Options:"
    echo "  --help              Show this help message"
    echo "  --reset             Reset environment (stop containers, remove volumes, delete data)"
    echo "  --reset-secrets     Regenerate secrets in .env file"
    echo ""
    echo "Examples:"
    echo "  $0                  # Normal setup"
    echo "  $0 --reset          # Reset and setup"
    echo "  $0 --reset-secrets  # Regenerate secrets and setup"
    echo ""
    echo "After setup, use Docker Compose directly to manage services:"
    echo "  docker compose up -d     # Start services"
    echo "  docker compose down      # Stop services"
    echo "  docker compose ps        # Check status"
    echo "  docker compose logs      # View logs"
}

########################################################
# Main function
########################################################

main() {
    # Handle help flag
    if has_flag "--help" "$@"; then
        show_help
        exit 0
    fi

    # Check dependencies first
    if ! check_dependencies; then
        echo "❌ Dependency check failed. Exiting."
        exit 1
    fi

    # Handle reset flag
    if has_flag "--reset" "$@"; then
        reset_environment
    fi

    # Setup environment
    if ! setup_environment "$@"; then
        echo "❌ Environment setup failed. Exiting."
        exit 1
    fi

    # Verify .env file was created successfully
    if [ ! -f ".env" ]; then
        echo "❌ Error: .env file was not created successfully"
        echo "Setup failed - other services depend on this .env file"
        exit 1
    fi

    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "To start services, run:"
    echo "  docker compose up -d"
    echo ""
    echo "To view service status:"
    echo "  docker compose ps"
    echo ""
    if [ -f ".env" ]; then
        # Extract username and password from .env
        DASHBOARD_USERNAME=$(grep -E '^DASHBOARD_USERNAME=' .env | cut -d '=' -f2-)
        DASHBOARD_PASSWORD=$(grep -E '^DASHBOARD_PASSWORD=' .env | cut -d '=' -f2-)
        if [ -n "$DASHBOARD_USERNAME" ] && [ -n "$DASHBOARD_PASSWORD" ]; then
            echo "Once services are running, Supabase Studio will be available at:"
            echo "  http://$DASHBOARD_USERNAME:$DASHBOARD_PASSWORD@localhost:8000"
            echo ""
        fi
    fi
}

########################################################
# Script execution
########################################################

# Call main function with all arguments
main "$@"

