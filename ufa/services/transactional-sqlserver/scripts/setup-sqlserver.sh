#!/bin/bash

# Simple help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [command] [options]"
    echo "Commands:"
    echo "  setup      - Create database, tables, and enable CDC"
    echo "  seed       - Add sample data (clears existing)"
    echo "  connector  - Register Debezium connector"
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
        setup|seed|connector|clean|verify|all)
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
CONTAINER_NAME="transactional-sqlserver-sqlserver-1"
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
    
    # Wait for Kafka Connect to be ready
    echo "⏳ Waiting for Kafka Connect to be ready..."
    for i in {1..30}; do
        if curl -s "$CONNECT_URL" >/dev/null 2>&1; then
            echo "✅ Kafka Connect is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Kafka Connect not ready after 30 seconds"
            return 1
        fi
        sleep 1
    done
    
    # Check if connector already exists
    if curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME" >/dev/null 2>&1; then
        echo "⚠️  Connector already exists, checking status..."
        state=$(curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME/status" 2>/dev/null | grep -o '"state":"[^"]*"' | cut -d'"' -f4 | head -1)
        if [ "$state" = "RUNNING" ]; then
            echo "✅ Existing connector is already running"
            return 0
        else
            echo "🔄 Existing connector is in state: $state, deleting and recreating..."
            delete_connector
        fi
    fi
    
    # Register connector
    echo "📡 Registering new connector..."
    response=$(curl -s -X POST -H 'Content-Type: application/json' --data @register-sqlserver.json "$CONNECT_URL/connectors" 2>&1)
    if [ $? -eq 0 ]; then
        echo "✅ Connector registered successfully"
        
        # Wait a moment for connector to initialize
        sleep 2
        check_connector
    else
        echo "❌ Failed to register connector"
        echo "Response: $response"
        return 1
    fi
}

# Function to check connector status
check_connector() {
    echo "🔍 Checking connector status..."
    
    if ! curl -s "$CONNECT_URL" >/dev/null 2>&1; then
        echo "❌ Kafka Connect not available"
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
    echo "🗑️  Deleting Debezium connector..."
    
    if ! curl -s "$CONNECT_URL" >/dev/null 2>&1; then
        echo "⚠️  Kafka Connect not available, skipping connector deletion"
        return 0
    fi
    
    # Check if connector exists first
    if curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME" >/dev/null 2>&1; then
        echo "🔍 Found existing connector, deleting..."
        
        if curl -s -X DELETE "$CONNECT_URL/connectors/$CONNECTOR_NAME" >/dev/null; then
            echo "🔄 Connector deletion initiated, waiting for confirmation..."
            
            # Wait for connector to be fully deleted
            for i in {1..10}; do
                if ! curl -s "$CONNECT_URL/connectors/$CONNECTOR_NAME" >/dev/null 2>&1; then
                    echo "✅ Connector deleted successfully"
                    return 0
                fi
                echo "  Waiting for deletion to complete... ($i/10)"
                sleep 1
            done
            
            echo "⚠️  Connector deletion may not be complete, but proceeding..."
        else
            echo "❌ Failed to delete connector"
            return 1
        fi
    else
        echo "📊 No existing connector found, nothing to delete"
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
        check_connector
        ;;
    "clean")
        delete_connector
        clean_data
        verify_data
        ;;
    "verify")
        verify_data
        ;;
    "all"|*)
        delete_connector
        clean_data
        execute_sql "scripts/setup-database.sql" "Setting up database and CDC"
        execute_sql "scripts/setup-tables.sql" "Creating tables with CDC"
        register_connector
        check_connector
        echo "📡 CDC connector ready! Now seeding data to demonstrate change capture..."
        ;;
esac