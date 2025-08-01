#!/bin/bash

# Retrieval Base Service Startup Script
echo "🚀 Starting Retrieval Base Service on port 8086..."

# Kill any process on port 8086
echo "🧹 Cleaning up port 8086..."
lsof -ti :8086 | xargs kill -9 2>/dev/null || echo "Port 8086 is clear"

# Check if Elasticsearch is running
echo "🔍 Checking Elasticsearch status..."
if ! docker ps | grep -q "retrieval-base-elasticsearch"; then
    echo "⚠️  Elasticsearch not running. Starting Elasticsearch..."
    pnpm run es:start
fi

# Wait a moment for cleanup
sleep 2

echo "🎯 Starting server on http://localhost:8086..."
PORT=8086 pnpm exec tsx src/server.ts