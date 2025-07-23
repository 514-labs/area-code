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
if wait_for_moose; then
    echo "🔄 Starting supabase-listener workflow..."
    pnpm dev:workflow:start
else
    echo "❌ Failed to connect to moose dev server"
    exit 1
fi 