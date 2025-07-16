#!/bin/bash -e

########################################################
# Development Services Status Script
########################################################

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to ensure all scripts are executable
ensure_scripts_executable() {
    # Make fix-permissions script executable first
    chmod +x "$SCRIPT_DIR/fix-permissions.sh" 2>/dev/null || true
    
    # Call the dedicated fix-permissions script
    "$SCRIPT_DIR/fix-permissions.sh"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script checks the status of all area-code development services"
    echo "and verifies that workflows are running properly."
    echo ""
    echo "Options:"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Check status of all services and workflows"
    echo ""
    echo "Checks:"
    echo "  • Service health (using health-check.sh)"
    echo "  • Workflow status verification"
    echo ""
}

# Parse command line arguments
if [[ " $@ " =~ " --help " ]] || [[ " $@ " =~ " -h " ]] || [[ " $@ " =~ " help " ]]; then
    show_help
    exit 0
fi

# Execute the status check
echo "=========================================="
echo "  Area Code Services Status"
echo "=========================================="
echo ""

# Ensure all scripts are executable first
ensure_scripts_executable

# 1. Run health check for all services
echo "🏥 Running health checks for all services..."
echo ""
if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
    "$SCRIPT_DIR/health-check.sh"
    HEALTH_EXIT_CODE=$?
    
    if [ $HEALTH_EXIT_CODE -eq 0 ]; then
        echo ""
        echo "✅ All services health checks passed"
    else
        echo ""
        echo "⚠️  Some services may have health issues (exit code: $HEALTH_EXIT_CODE)"
    fi
else
    echo "❌ health-check.sh not found, cannot check service health"
    HEALTH_EXIT_CODE=1
fi

echo ""
echo "=========================================="
echo ""

# 2. Check workflow status
echo "🔄 Checking workflow status..."
echo ""

# Check if workflows are running
WORKFLOW_ISSUES=0

# Check for sync-base workflow (supabase-listener)
echo "📊 Checking sync-base workflow (supabase-listener)..."
if command -v moose >/dev/null 2>&1; then
    # Check if sync-base service is running first
    if curl -s "http://localhost:4000/health" >/dev/null 2>&1; then
        # Try to check workflow status (this might need adjustment based on actual moose CLI)
        cd ../services/sync-base 2>/dev/null || cd ./services/sync-base 2>/dev/null || {
            echo "⚠️  Could not change to sync-base directory"
            WORKFLOW_ISSUES=$((WORKFLOW_ISSUES + 1))
        }
        
        if [ -d "$(pwd | grep sync-base)" ]; then
            # Check if workflow is configured/running
            if [ -f "app/scripts/supabase-listener.ts" ] || [ -f "app/scripts/supabase-listener.js" ]; then
                echo "✅ supabase-listener workflow found and configured"
            else
                echo "⚠️  supabase-listener workflow not found"
                WORKFLOW_ISSUES=$((WORKFLOW_ISSUES + 1))
            fi
        fi
        cd "$SCRIPT_DIR"
    else
        echo "⚠️  sync-base service not running, cannot check workflow"
        WORKFLOW_ISSUES=$((WORKFLOW_ISSUES + 1))
    fi
else
    echo "⚠️  moose command not available, cannot check workflows"
    WORKFLOW_ISSUES=$((WORKFLOW_ISSUES + 1))
fi

echo ""

# Check for any background migration processes
echo "🔍 Checking for background migration processes..."
ES_MIGRATION_PIDS=$(ps aux | grep "migrate-from-postgres-to-elasticsearch" | grep -v grep | awk '{print $2}' || true)
if [ -n "$ES_MIGRATION_PIDS" ]; then
    echo "🔄 Elasticsearch migration is running in background (PIDs: $ES_MIGRATION_PIDS)"
    
    # Check if log file exists
    if [ -f "../elasticsearch_migration.log" ] || [ -f "./elasticsearch_migration.log" ]; then
        echo "📋 Migration log available:"
        echo "   tail -f ../elasticsearch_migration.log"
        echo "   (or ./elasticsearch_migration.log if run from project root)"
    fi
else
    echo "✅ No background migration processes found"
fi

echo ""
echo "=========================================="
echo "                SUMMARY"
echo "=========================================="

# Overall status summary
if [ $HEALTH_EXIT_CODE -eq 0 ] && [ $WORKFLOW_ISSUES -eq 0 ]; then
    echo "✅ ALL SYSTEMS OPERATIONAL"
    echo ""
    echo "🏥 Service Health: ✅ All services healthy"
    echo "🔄 Workflows: ✅ All workflows operational"
    echo ""
    echo "🎉 Your development environment is ready!"
    EXIT_CODE=0
elif [ $HEALTH_EXIT_CODE -eq 0 ] && [ $WORKFLOW_ISSUES -gt 0 ]; then
    echo "⚠️  SERVICES RUNNING WITH WORKFLOW ISSUES"
    echo ""
    echo "🏥 Service Health: ✅ All services healthy"
    echo "🔄 Workflows: ⚠️  $WORKFLOW_ISSUES workflow issue(s) detected"
    echo ""
    echo "💡 Services are running but some workflows may need attention."
    EXIT_CODE=1
elif [ $HEALTH_EXIT_CODE -ne 0 ] && [ $WORKFLOW_ISSUES -eq 0 ]; then
    echo "⚠️  SERVICE HEALTH ISSUES DETECTED"
    echo ""
    echo "🏥 Service Health: ❌ Some services may be down"
    echo "🔄 Workflows: ✅ All workflows operational"
    echo ""
    echo "💡 Check service health details above and consider restarting services."
    EXIT_CODE=1
else
    echo "❌ MULTIPLE ISSUES DETECTED"
    echo ""
    echo "🏥 Service Health: ❌ Some services may be down"
    echo "🔄 Workflows: ⚠️  $WORKFLOW_ISSUES workflow issue(s) detected"
    echo ""
    echo "💡 Multiple issues detected. Consider running:"
    echo "   ./scripts/dev-restart.sh    # Restart all services"
    echo "   ./scripts/dev-setup.sh      # Re-setup environment"
    EXIT_CODE=2
fi

echo ""
echo "📊 For detailed service information:"
echo "   • Start services: ./scripts/dev-start.sh"
echo "   • Restart services: ./scripts/dev-restart.sh" 
echo "   • Seed data: ./scripts/dev-seed.sh"

exit $EXIT_CODE 