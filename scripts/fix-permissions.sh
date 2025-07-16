#!/bin/bash -e

########################################################
# Fix Permissions Script
########################################################
# This script ensures that all setup scripts have proper permissions.
# It should be called by the main setup scripts to ensure everything works.

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Fixing permissions for setup scripts..."

# Make service setup scripts executable
echo "📄 Making service setup scripts executable..."
find "$PROJECT_ROOT/services" -name "setup.sh" -type f -exec chmod +x {} \; 2>/dev/null || true
find "$PROJECT_ROOT/services" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true

# Make main development scripts executable
echo "📄 Making development scripts executable..."
find "$PROJECT_ROOT/scripts" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true

# Make tmux scripts executable
echo "📄 Making tmux scripts executable..."
find "$PROJECT_ROOT/tmux" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true

echo "✅ All setup script permissions fixed!" 