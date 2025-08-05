#!/bin/bash

# Simple help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [command] [options]"
    echo "Commands:"
    echo "  setup      - Create database, tables, and enable CDC"
    echo "  seed       - Add sample data (clears existing)"
    echo "  connector  - Register Debezium connector"
    echo "  deleteconnector - Delete connector only (keep data)"
    echo "  resetconnector - Delete and re-register connector"
    echo "  clean      - Remove connector and all data"
    echo "  verify     - Check data counts and connector status"
    echo "Default: setup + seed + connector"
    echo ""
    echo "Options:"
    echo "  --foo-count N    - Number of foo records to seed (default: 100)"
    echo "  --bar-count N    - Number of bar records to seed (default: 500)"
    echo ""
    echo "Examples:"
    echo "  $0 seed --foo-count 1000 --bar-count 5000"
    echo "  $0 all --foo-count 10 --bar-count 50"
    echo "  $0 seed  # Uses defaults (100 foo, 500 bar)"
    exit 0
fi

# Parse command line arguments
COMMAND=""
FOO_COUNT=100
BAR_COUNT=500

while [[ $# -gt 0 ]]; do
    case $1 in
        setup|seed|connector|resetconnector|clean|verify|all|deleteconnector)
            COMMAND="$1"
            shift
            ;;
        --foo-count)
            FOO_COUNT="$2"
            shift 2
            ;;
        --bar-count)
            BAR_COUNT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use $0 --help for usage information"
            exit 1
            ;;
    esac
done

# Set default command if not specified
COMMAND=${COMMAND:-"all"}

# Parameters
CONTAINER_NAME="transactional-sqlserver-foobar-sqlserver-1"
CONNECT_URL="http://localhost:8084"
CONNECTOR_NAME="SQLServerToMooseConnector"

# Check if container is running
if ! docker ps --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container $CONTAINER_NAME is not running"
    echo "💡 Start it with: docker compose up -d"
    exit 1
fi

# Wait for SQL Server to be fully ready
echo "⏳ Waiting for SQL Server to be fully ready..."
for i in {1..30}; do
    if docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "SELECT 1" -N -C &>/dev/null; then
        echo "✅ SQL Server is accepting connections"
        
        # Wait a bit more for SQL Server to be fully initialized
        sleep 3
        echo "✅ Connected to SQL Server container: $CONTAINER_NAME"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Cannot connect to SQL Server after 30 attempts"
        exit 1
    fi
    echo "  Waiting for SQL Server... ($i/30)"
    sleep 2
done

# Function to execute SQL file
execute_sql() {
    local sql_file=$1
    local description=$2
    local variables=$3
    
    echo "🔄 $description..."
    
    if ! docker exec -i "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -N -C < "$sql_file"; then
        echo "❌ Failed: $description"
        exit 1
    fi
    echo "✅ $description completed"
}

# Function to execute SQL file with seeding parameters
execute_seed_sql() {
    local sql_file=$1
    local description=$2
    local foo_count=$3
    local bar_count=$4
    
    echo "🔄 $description (foo: $foo_count, bar: $bar_count)..."
    
    # Create a temporary SQL file with variables substituted
    local temp_sql=$(mktemp)
    sed "s/\$(FOO_COUNT)/$foo_count/g; s/\$(BAR_COUNT)/$bar_count/g" "$sql_file" > "$temp_sql"
    
    if ! docker exec -i "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -N -C < "$temp_sql"; then
        rm -f "$temp_sql"
        echo "❌ Failed: $description"
        exit 1
    fi
    
    rm -f "$temp_sql"
    echo "✅ $description completed"
}

# Function to verify data and connector
verify_data() {
    echo "🔍 Verifying data..."
    
    # Check if database exists first
    if ! docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "IF EXISTS (SELECT name FROM sys.databases WHERE name = 'sqlCDC') SELECT 1 ELSE SELECT 0" -N -C -h -1 2>/dev/null | grep -q "1"; then
        echo "📋 Database doesn't exist yet"
        return 0
    fi
    
    # Get foo count
    foo_count=$(docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "USE sqlCDC; SELECT COUNT(*) FROM foo;" -N -C -h -1 2>/dev/null | grep -o '^[0-9]\+$' | head -1)
    
    # Get bar count  
    bar_count=$(docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "USE sqlCDC; SELECT COUNT(*) FROM bar;" -N -C -h -1 2>/dev/null | grep -o '^[0-9]\+$' | head -1)
    
    if [ -n "$foo_count" ] && [ -n "$bar_count" ]; then
        echo "📊 Current data counts: foo=$foo_count, bar=$bar_count"
        total=$((foo_count + bar_count))
        if [ $total -eq 0 ]; then
            echo "✅ Database is empty"
        else
            echo "📈 Total records: $total"
            
            # Show sample of recent records to verify CDC is working
            echo "🔍 Sample foo records (latest 3):"
            docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "USE sqlCDC; SELECT TOP 3 '  ' + CAST(id AS VARCHAR(36)) + ' | ' + LEFT(ISNULL(name, 'NULL'), 25) + ' | ' + ISNULL(status, 'NULL') + ' | ' + FORMAT(created_at, 'yyyy-MM-dd HH:mm') AS record FROM foo ORDER BY created_at DESC;" -N -C -h -1 -W 2>/dev/null | grep -E '^  [A-F0-9-]' || echo "   No foo records found"
            
            echo "🔍 Sample bar records (latest 3):"
            docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "USE sqlCDC; SELECT TOP 3 '  ' + CAST(id AS VARCHAR(36)) + ' | ' + LEFT(ISNULL(label, 'NULL'), 15) + ' | ' + CAST(value AS VARCHAR(10)) + ' | ' + LEFT(ISNULL(notes, 'NULL'), 30) + ' | ' + FORMAT(created_at, 'yyyy-MM-dd HH:mm') AS record FROM bar ORDER BY created_at DESC;" -N -C -h -1 -W 2>/dev/null | grep -E '^  [A-F0-9-]' || echo "   No bar records found"
        fi
    else
        echo "📊 Data verification completed"
    fi
    
    # Check connector status
    check_connector
}

# Function to register connector
register_connector() {
    echo "🔌 Registering Debezium connector..."
    
    # Wait for Kafka Connect to be ready for up to 2 minutes
    echo "⏳ Waiting for Kafka Connect to be ready..."
    for i in {1..120}; do
        health_response=$(curl -s "$CONNECT_URL/health" 2>/dev/null)
        if [ $? -eq 0 ] && echo "$health_response" | grep -q '"status":"healthy"'; then
            echo "✅ Kafka Connect is ready and healthy"
            echo "  Health status: $(echo "$health_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
            break
        fi
        if [ $i -eq 120 ]; then
            echo "❌ CRITICAL ERROR: Kafka Connect not ready/healthy after 2 minutes at $CONNECT_URL/health"
            echo "❌ Last health response: $health_response"
            echo "❌ Cannot proceed without healthy Kafka Connect - this will break the CDC demo"
            echo "💡 Check if Kafka Connect is running with: docker ps | grep connect"
            echo "💡 Check Kafka Connect logs for startup issues"
            exit 1
        fi
        echo "  Waiting for Kafka Connect health... ($i/120) - Status: $(echo "$health_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unreachable")"
        sleep 1
    done
    
    # Check if connector already exists
    if curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME" >/dev/null 2>&1; then
        echo "⚠️  Connector '$CONNECTOR_NAME' already exists, checking status..."
        state=$(curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME/status" 2>/dev/null | grep -o '"state":"[^"]*"' | cut -d'"' -f4 | head -1)
        if [ "$state" = "RUNNING" ]; then
            echo "✅ Existing connector is already running"
            return 0
        else
            echo "🔄 Existing connector is in state: $state, deleting and recreating..."
            echo "🗑️  Forcing deletion of existing connector before registering new one..."
            if ! delete_connector; then
                echo "❌ CRITICAL ERROR: Failed to delete existing connector '$CONNECTOR_NAME'"
                echo "❌ Cannot proceed with registration - this will break the CDC demo"
                echo "💡 Try manually deleting with: curl -X DELETE $CONNECT_URL/connectors/$CONNECTOR_NAME"
                exit 1
            fi
            echo "✅ Successfully deleted existing connector"
        fi
    fi
    
    # Verify connector config file exists
    if [ ! -f "register-sqlserver.json" ]; then
        echo "❌ CRITICAL ERROR: Connector configuration file 'register-sqlserver.json' not found"
        echo "❌ Cannot register connector without configuration - this will break the CDC demo"
        echo "💡 Make sure you're running this script from the correct directory"
        exit 1
    fi
    
    # Register connector
    echo "📡 Registering new connector '$CONNECTOR_NAME'..."
    response=$(curl -s -X POST -H 'Content-Type: application/json' --data @register-sqlserver.json "$CONNECT_URL/connectors" 2>&1)
    curl_exit_code=$?
    
    if [ $curl_exit_code -ne 0 ]; then
        echo "❌ CRITICAL ERROR: Failed to register connector (curl failed with exit code $curl_exit_code)"
        echo "❌ Response: $response"
        echo "❌ Cannot proceed without connector - this will break the CDC demo"
        echo "💡 Check Kafka Connect logs and ensure register-sqlserver.json is valid"
        exit 1
    fi
    
    # Check if registration was actually successful by verifying response
    if echo "$response" | grep -q '"name"'; then
        echo "✅ Connector registered successfully"
    else
        echo "❌ CRITICAL ERROR: Connector registration failed - unexpected response"
        echo "❌ Response: $response"
        echo "❌ Cannot proceed without connector - this will break the CDC demo"
        exit 1
    fi
    
    # Wait a moment for connector to initialize and verify it's running
    echo "⏳ Waiting for connector to initialize..."
    sleep 3
    
    # Verify the connector is actually running
    for i in {1..10}; do
        state=$(curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME/status" 2>/dev/null | grep -o '"state":"[^"]*"' | cut -d'"' -f4 | head -1)
        if [ "$state" = "RUNNING" ]; then
            echo "✅ Connector is now running and ready for CDC"
            return 0
        elif [ "$state" = "FAILED" ]; then
            echo "❌ CRITICAL ERROR: Connector failed to start (state: FAILED)"
            echo "❌ This will break the CDC demo"
            echo "💡 Check connector logs with: curl -s $CONNECT_URL/connectors/$CONNECTOR_NAME/status"
            exit 1
        fi
        echo "  Waiting for connector to start... (state: $state, attempt $i/10)"
        sleep 2
    done
    
    echo "❌ CRITICAL ERROR: Connector did not reach RUNNING state within 20 seconds"
    echo "❌ Current state: $state"
    echo "❌ This will break the CDC demo"
    echo "💡 Check connector status with: curl -s $CONNECT_URL/connectors/$CONNECTOR_NAME/status"
    exit 1
}

# Function to check connector status
check_connector() {
    echo "🔍 Checking connector status..."
    
    health_response=$(curl -s "$CONNECT_URL/health" 2>/dev/null)
    if [ $? -ne 0 ] || ! echo "$health_response" | grep -q '"status":"healthy"'; then
        echo "❌ Kafka Connect not healthy at $CONNECT_URL/health"
        echo "    Health response: $health_response"
        return 1
    fi
    
    status=$(curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME/status" 2>/dev/null)
    if [ $? -eq 0 ] && echo "$status" | grep -q '"state"'; then
        state=$(echo "$status" | grep -o '"state":"[^"]*"' | cut -d'"' -f4 | head -1)
        echo "📊 Connector status: $state"
        
        # Check if connector is running
        if [ "$state" = "RUNNING" ]; then
            echo "✅ Connector is running"
        elif [ "$state" = "UNASSIGNED" ] || [ "$state" = "DESTROYED" ]; then
            echo "📊 Connector was deleted/stopped"
        else
            echo "⚠️  Connector is not running (state: $state)"
        fi
    else
        echo "📊 Connector not found or not registered"
    fi
}

# Function to delete connector
delete_connector() {
    echo "🗑️  Deleting Debezium connector '$CONNECTOR_NAME'..."
    
    health_response=$(curl -s "$CONNECT_URL/health" 2>/dev/null)
    if [ $? -ne 0 ] || ! echo "$health_response" | grep -q '"status":"healthy"'; then
        echo "⚠️  Kafka Connect not healthy at $CONNECT_URL/health, skipping connector deletion"
        echo "    Health response: $health_response"
        return 0
    fi
    
    # Always attempt to delete the connector (whether it exists or not)
    echo "🔍 Attempting to delete connector '$CONNECTOR_NAME'..."
    
    delete_response=$(curl -s -X DELETE "$CONNECT_URL/connectors/$CONNECTOR_NAME" 2>&1)
    delete_exit_code=$?
    
    if [ $delete_exit_code -eq 0 ]; then
        # Check if the response indicates the connector didn't exist (404)
        if echo "$delete_response" | grep -q '"error_code":404' || echo "$delete_response" | grep -q "not found"; then
            echo "✅ Connector '$CONNECTOR_NAME' was already deleted (404 - not found)"
            return 0
        fi
        
        echo "🔄 Connector deletion initiated, waiting for confirmation..."
        
        # Wait for connector to be fully deleted
        for i in {1..15}; do
            check_response=$(curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME" 2>&1)
            # If we get 404 or connection fails, connector is gone
            if echo "$check_response" | grep -q '"error_code":404' || echo "$check_response" | grep -q "not found" || ! curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME" >/dev/null 2>&1; then
                echo "✅ Connector '$CONNECTOR_NAME' deleted successfully"
                return 0
            fi
            echo "  Waiting for deletion to complete... ($i/15)"
            sleep 1
        done
        
        echo "❌ ERROR: Connector deletion timeout after 15 seconds"
        echo "❌ Connector '$CONNECTOR_NAME' may still exist"
        echo "💡 Check manually with: curl -s $CONNECT_URL/connectors/$CONNECTOR_NAME"
        return 1
    else
        echo "❌ ERROR: Failed to delete connector '$CONNECTOR_NAME' (curl failed)"
        echo "❌ Delete response: $delete_response"
        echo "💡 Try manually with: curl -X DELETE $CONNECT_URL/connectors/$CONNECTOR_NAME"
        return 1
    fi
}

# Function to clean data
clean_data() {
    echo "🧹 Clearing all data..."
    
    # Check if database exists first
    if docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "IF EXISTS (SELECT name FROM sys.databases WHERE name = 'sqlCDC') SELECT 1 ELSE SELECT 0" -N -C -h -1 2>/dev/null | grep -q "1"; then
        echo "📋 Database exists, clearing tables..."
        docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "USE sqlCDC; DELETE FROM bar; DELETE FROM foo;" -N -C 2>/dev/null || echo "  Tables may not exist yet"
        echo "✅ Data cleared"
    else
        echo "📋 Database doesn't exist yet, nothing to clear"
    fi
}

# Execute based on command
case $COMMAND in
    "setup")
        execute_sql "scripts/setup-database.sql" "Setting up database and CDC"
        execute_sql "scripts/setup-tables.sql" "Creating tables with CDC"
        ;;
    "seed")
        execute_seed_sql "scripts/seed-data.sql" "Seeding sample data" "$FOO_COUNT" "$BAR_COUNT"
        verify_data
        ;;
    "connector")
        register_connector
        echo "✅ Connector registration completed successfully"
        ;;
    "resetconnector")
        echo "🔄 Resetting connector (delete + register)..."
        if ! delete_connector; then
            echo "❌ CRITICAL ERROR: Failed to delete existing connector during reset"
            exit 1
        fi
        register_connector
        echo "✅ Connector reset completed successfully"
        ;;
    "clean")
        echo "🧹 Cleaning connector and data..."
        if ! delete_connector; then
            echo "⚠️  Warning: Connector deletion failed, but continuing with data cleanup"
        fi
        clean_data
        verify_data
        ;;
    "verify")
        verify_data
        ;;
    "deleteconnector")
        if ! delete_connector; then
            echo "❌ ERROR: Failed to delete connector"
            exit 1
        fi
        echo "✅ Connector deletion completed successfully"
        ;;
    "all"|*)
        echo "🚀 Running complete setup (delete + clean + setup + register)..."
        
        # Delete existing connector (don't fail if it doesn't exist)
        if ! delete_connector; then
            echo "⚠️  Warning: Connector deletion failed, but continuing with setup"
        fi
        
        clean_data
        execute_sql "scripts/setup-database.sql" "Setting up database and CDC"
        execute_sql "scripts/setup-tables.sql" "Creating tables with CDC"
        
        # Critical: connector registration must succeed
        register_connector
        
        echo "✅ Complete setup finished successfully!"
        echo "📡 CDC connector is ready! Now seeding data to demonstrate change capture..."
        ;;
esac