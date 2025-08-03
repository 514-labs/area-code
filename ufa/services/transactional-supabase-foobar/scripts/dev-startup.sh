#!/bin/bash

# Dev Startup Script for Transactional Base
# Checks and starts dependencies, runs migrations, starts server

check_supabase_status() {
    if curl -s http://localhost:54321/rest/v1/ > /dev/null 2>&1; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

start_supabase() {
    echo "Supabase is not started"
    echo "Starting Supabase services..."
    
    if ! pnpm db:start; then
        echo "Failed to start Supabase services"
        exit 1
    fi
    
    # Wait for services to be ready using supabase status
    echo "Waiting for services to be ready..."
    for i in {1..30}; do
        if pnpm supabase status > /dev/null 2>&1; then
            echo "Supabase services are ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "Timeout waiting for Supabase services"
            exit 1
        fi
        sleep 2
    done
    
    echo "Supabase services started successfully"
}

setup_realtime_replication() {
    echo "Setting up Supabase realtime replication..."
    
    if ! pnpm setup:replication; then
        echo "Failed to setup realtime replication"
        exit 1
    fi
    
    echo "Realtime replication setup completed"
}

run_migrations() {
    echo "Checking database migrations..."
    
    if ! pnpm run dev:migrate; then
        echo "Failed to run database migrations"
        exit 1
    fi
    
    echo "Database migrations completed"
}

start_server() {
    echo "Starting Fastify server..."
    
    # Start server with .env file watching
    pnpm dev:fastify
}

# Main execution
main() {
    # Check if Supabase is running
    if check_supabase_status; then
        echo "Supabase is already running"
    else
        start_supabase
    fi
    
    # Setup realtime replication for Supabase listener
    setup_realtime_replication
    
    # Run migrations
    run_migrations
    
    # Start the server
    start_server
}

# Handle interruption signals
trap 'echo "Shutting down..."; exit 0' SIGINT SIGTERM

main "$@" 