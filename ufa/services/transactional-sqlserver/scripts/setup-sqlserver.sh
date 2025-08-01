#!/bin/bash

# Simple help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [command]"
    echo "Commands:"
    echo "  setup      - Create database, tables, and enable CDC"
    echo "  seed       - Add sample data (clears existing)"
    echo "  connector  - Register Debezium connector"
    echo "  clean      - Remove connector and all data"
    echo "  verify     - Check data counts and connector status"
    echo "Default: setup + seed + connector"
    exit 0
fi

# Parameters
COMMAND=${1:-"all"}
CONTAINER_NAME="transactional-sqlserver-sqlserver-1"
CONNECT_URL="http://localhost:8084"
CONNECTOR_NAME="SQLServerToMooseConnector"

# Check if container is running
if ! docker ps --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container $CONTAINER_NAME is not running"
    echo "💡 Start it with: docker compose up -d"
    exit 1
fi

# Test connection
if ! docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "SELECT 1" -N -C &>/dev/null; then
    echo "❌ Cannot connect to SQL Server"
    exit 1
fi

echo "✅ Connected to SQL Server container: $CONTAINER_NAME"

# Function to execute SQL file
execute_sql() {
    local sql_file=$1
    local description=$2
    
    echo "🔄 $description..."
    if ! docker exec -i "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -N -C < "$sql_file"; then
        echo "❌ Failed: $description"
        exit 1
    fi
    echo "✅ $description completed"
}

# Function to verify data and connector
verify_data() {
    echo "🔍 Verifying data..."
    
    # Get foo count
    foo_count=$(docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "USE sqlCDC; SELECT COUNT(*) FROM foo;" -N -C -h -1 2>/dev/null | grep -o '[0-9]\+' | head -1)
    
    # Get bar count  
    bar_count=$(docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "USE sqlCDC; SELECT COUNT(*) FROM bar;" -N -C -h -1 2>/dev/null | grep -o '[0-9]\+' | head -1)
    
    if [ -n "$foo_count" ] && [ -n "$bar_count" ]; then
        echo "📊 Data counts: foo=$foo_count, bar=$bar_count"
        total=$((foo_count + bar_count))
        if [ $total -eq 0 ]; then
            echo "✅ Database is empty"
        else
            echo "📈 Total records: $total"
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
    
    # Register connector
    if curl -s -X POST -H 'Content-Type: application/json' --data @register-sqlserver.json "$CONNECT_URL/connectors" >/dev/null; then
        echo "✅ Connector registered successfully"
    else
        echo "❌ Failed to register connector"
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
    
    if curl -s -X DELETE "$CONNECT_URL/connectors/$CONNECTOR_NAME" >/dev/null; then
        echo "✅ Connector deleted successfully"
    else
        echo "⚠️  Connector may not exist or already deleted"
    fi
}

# Function to clean data
clean_data() {
    echo "🧹 Clearing all data..."
    docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password!' -Q "USE sqlCDC; DELETE FROM bar; DELETE FROM foo;" -N -C
    echo "✅ Data cleared"
}

# Execute based on command
case $COMMAND in
    "setup")
        execute_sql "scripts/setup-database.sql" "Setting up database and CDC"
        execute_sql "scripts/setup-tables.sql" "Creating tables with CDC"
        ;;
    "seed")
        execute_sql "scripts/seed-data.sql" "Seeding sample data"
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
        execute_sql "scripts/setup-database.sql" "Setting up database and CDC"
        execute_sql "scripts/setup-tables.sql" "Creating tables with CDC"
        execute_sql "scripts/seed-data.sql" "Seeding sample data"
        register_connector
        verify_data
        echo "🎉 SQL Server setup completed!"
        ;;
esac