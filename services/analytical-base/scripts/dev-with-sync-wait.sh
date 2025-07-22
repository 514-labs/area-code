#!/bin/bash

# Function to check if sync-base is ready
check_sync_base_ready() {
    # Check if sync-base moose server is responding
    curl -s http://localhost:4001/health > /dev/null 2>&1
    return $?
}

# Function to wait for sync-base to be ready
wait_for_sync_base() {
    echo "📊 [analytical-base] Waiting for sync-base to initialize..."
    local max_attempts=60  # 60 seconds timeout
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_sync_base_ready; then
            echo "✅ [analytical-base] sync-base is ready! Starting analytical-base..."
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        if [ $((attempt % 10)) -eq 0 ]; then
            echo "⏳ [analytical-base] Still waiting for sync-base... (${attempt}s)"
        fi
    done
    
    echo "❌ [analytical-base] Timeout waiting for sync-base to be ready"
    return 1
}

# Wait for sync-base to be ready, then start analytical-base
if wait_for_sync_base; then
    echo "🚀 [analytical-base] Starting moose-cli dev..."
    exec moose-cli dev
else
    echo "❌ [analytical-base] Cannot start without sync-base"
    exit 1
fi 