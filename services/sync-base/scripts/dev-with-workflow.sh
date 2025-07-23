#!/bin/bash

# Function to check if moose dev server is ready
check_moose_ready() {
    curl -s http://localhost:4000/health > /dev/null 2>&1
    return $?
}

# Function to wait for moose to be ready
wait_for_moose() {
    echo "🚀 Starting moose dev server..."
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

# Start moose dev in the background
echo "🔧 Starting sync-base with workflow..."
moose-cli dev &
MOOSE_PID=$!

# Wait for moose to be ready, then start workflow
if wait_for_moose; then
    echo "🔄 Starting supabase-listener workflow..."
    moose-cli workflow run supabase-listener &
    WORKFLOW_PID=$!
    echo "✅ Both moose dev and workflow are running!"
    echo "   Moose PID: $MOOSE_PID"
    echo "   Workflow PID: $WORKFLOW_PID"
else
    echo "❌ Failed to start moose dev server, stopping..."
    kill $MOOSE_PID 2>/dev/null
    exit 1
fi

# Handle cleanup on script termination
cleanup() {
    echo "🛑 Stopping services..."
    echo "   Stopping workflow..."
    moose-cli workflow terminate supabase-listener 2>/dev/null || true
    echo "   Stopping moose dev server..."
    kill $MOOSE_PID 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running and wait for moose process
echo "🔄 Services are running. Press Ctrl+C to stop both."
wait $MOOSE_PID 