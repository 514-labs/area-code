#!/bin/bash

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    pkill -P $$  # Kill all child processes
    moose-cli workflow terminate supabase-listener 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

echo "🚀 Starting moose dev server..."

# Clean up any previous flag file to ensure fresh start
rm -f /tmp/workflow_started

# Start moose dev - this will show all its output
NODE_ENV=${NODE_ENV:-development} moose-cli dev | while IFS= read -r line; do
    echo "$line"
    
    # Check if moose is ready by testing health endpoint in background
    if curl -s http://localhost:4000/health >/dev/null 2>&1 && [ ! -f /tmp/workflow_started ]; then
        touch /tmp/workflow_started
        echo ""
        echo "✅ Moose is ready! Starting workflow..."
        echo "----------------------------------------"
        
        # Start workflow in background so we can continue showing moose output
        NODE_ENV=${NODE_ENV:-development} pnpm dev:workflow &
    fi
done