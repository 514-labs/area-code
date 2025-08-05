#!/bin/bash

# Function to check if moose dev server is ready
check_moose_ready() {
    curl -s http://localhost:4000/health > /dev/null 2>&1
    return $?
}

# Function to wait for moose to be ready
wait_for_moose() {
    echo "🔄 Waiting for moose dev server to be ready..."
    local max_attempts=60  # 60 seconds timeout
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_moose_ready; then
            echo "✅ Moose dev server is ready!"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        if [ $((attempt % 10)) -eq 0 ]; then
            echo "⏳ Still waiting for moose dev server... (${attempt}s)"
        fi
    done
    
    echo "❌ Timeout waiting for moose dev server to be ready"
    return 1
}

# Wait for moose to be ready, then start workflow
# Note: Database initialization is now handled by the workflow itself
if wait_for_moose; then
    echo "✅ Moose dev server is ready!"
    echo "🔄 Starting supabase-listener workflow..."
    echo "   (Database initialization will be handled by the workflow)"
    pnpm dev:workflow
else
    echo "❌ Failed to connect to moose dev server"
    exit 1
fi 