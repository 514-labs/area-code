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

# Function to check if analytical-base moose process is ready for file changes
check_analytical_base_ready() {
    # Check if port 4100 is being listened to (indicates moose server is up)
    lsof -i :4100 > /dev/null 2>&1
    return $?
}

# Function to wait for analytical-base moose to be ready for file changes
wait_for_analytical_base() {
    echo "📊 [analytical-base] Waiting for moose server to start..."
    local max_attempts=120  # 120 seconds timeout (moose can take longer to start)
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_analytical_base_ready; then
            echo "✅ [analytical-base] Moose server is up! Ready for file changes."
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        if [ $((attempt % 15)) -eq 0 ]; then
            echo "⏳ [analytical-base] Still waiting for moose server to start... (${attempt}s)"
        fi
    done
    
    echo "❌ [analytical-base] Timeout waiting for moose server to start"
    return 1
}

# Wait for sync-base to be ready, then start analytical-base
if wait_for_sync_base; then
    echo "🚀 [analytical-base] Starting moose-cli dev..."
    
    # Start moose-cli dev in the background
    moose-cli dev &
    MOOSE_PID=$!
    
    # Wait for moose to be ready, then touch the index file
    if wait_for_analytical_base; then
        echo "📝 [analytical-base] Touching index file..."
        touch app/index.ts
        echo "✅ [analytical-base] Index file touched successfully!"
    else
        echo "❌ [analytical-base] Failed to initialize moose properly"
        kill $MOOSE_PID 2>/dev/null
        exit 1
    fi
    
    # Keep the script running and forward signals to moose
    echo "🔄 [analytical-base] Moose is running. Press Ctrl+C to stop."
    trap "echo '🛑 [analytical-base] Stopping moose...'; kill $MOOSE_PID 2>/dev/null; exit 0" INT TERM
    wait $MOOSE_PID
else
    echo "❌ [analytical-base] Cannot start without sync-base"
    exit 1
fi 