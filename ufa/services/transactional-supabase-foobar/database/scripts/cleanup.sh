#!/bin/bash

# Comprehensive Supabase cleanup script
# This script handles cleanup even when containers are already down

set -e

PROJECT_NAME="transactional-supabase-foobar"

echo "🧹 Starting Supabase cleanup for project: $PROJECT_NAME"

# Step 1: Try Supabase CLI stop (ignore errors if already stopped)
echo "📦 Attempting graceful Supabase stop..."
pnpm supabase stop --no-backup 2>/dev/null || echo "⚠️  Supabase CLI stop failed or containers already down"

# Step 2: Force remove any remaining containers
echo "🐳 Removing any remaining Supabase containers..."
CONTAINERS=$(docker ps -a --filter "label=com.supabase.cli.project=$PROJECT_NAME" -q)
if [ ! -z "$CONTAINERS" ]; then
    echo "Found containers to remove: $CONTAINERS"
    docker rm -f $CONTAINERS
else
    echo "No containers found to remove"
fi

# Step 3: Remove volumes
echo "💾 Removing Supabase volumes..."
VOLUMES=$(docker volume ls --filter "label=com.supabase.cli.project=$PROJECT_NAME" -q)
if [ ! -z "$VOLUMES" ]; then
    echo "Found volumes to remove: $VOLUMES"
    docker volume rm $VOLUMES
else
    echo "No volumes found to remove"
fi

# Step 4: Remove networks (if any)
echo "🌐 Checking for Supabase networks..."
NETWORKS=$(docker network ls --filter "label=com.supabase.cli.project=$PROJECT_NAME" -q)
if [ ! -z "$NETWORKS" ]; then
    echo "Found networks to remove: $NETWORKS"
    docker network rm $NETWORKS
else
    echo "No networks found to remove"
fi

# Step 5: Clean up any orphaned volumes or containers with supabase in the name
echo "🧽 Cleaning up any orphaned Supabase resources..."
docker container prune -f --filter "label=com.supabase.cli.project" 2>/dev/null || true
docker volume prune -f --filter "label=com.supabase.cli.project" 2>/dev/null || true

echo "✅ Cleanup completed successfully!"
echo "💡 You can now run 'pnpm dev:start' to start fresh Supabase containers" 