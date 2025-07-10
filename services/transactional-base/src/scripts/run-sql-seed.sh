#!/bin/bash

# Load environment variables (ignore comments and empty lines)
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Set default values if not provided
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-your-super-secret-jwt-token-with-at-least-32-characters-long}
DB_NAME=${DB_NAME:-postgres}

# Construct connection string
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "🌱 Running SQL seed script..."
echo "📊 Target database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "⏱️  Starting at: $(date)"

echo "🐳 Using Docker container..."
# Find the PostgreSQL container (try common names)
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep -E "(db|postgres|supabase)" | grep -v "temporal" | head -1)
    
    if [ -z "$DB_CONTAINER" ]; then
        echo "❌ Could not find PostgreSQL Docker container"
        echo "💡 Available containers:"
        docker ps --format "table {{.Names}}\t{{.Image}}"
        echo "💡 Please run: docker ps and manually specify container name"
        exit 1
    fi
    
    echo "📦 Using container: $DB_CONTAINER"
    
    # Copy SQL file to container and execute it
    docker cp src/scripts/seed-million-rows.sql "$DB_CONTAINER:/tmp/seed-million-rows.sql"
    
    # Try different ways to run psql in the container
    if docker exec "$DB_CONTAINER" which psql >/dev/null 2>&1; then
        echo "✅ Found psql in container"
        docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed-million-rows.sql
    elif docker exec "$DB_CONTAINER" which /usr/bin/psql >/dev/null 2>&1; then
        echo "✅ Found psql at /usr/bin/psql"
        docker exec "$DB_CONTAINER" /usr/bin/psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed-million-rows.sql
    elif docker exec "$DB_CONTAINER" which /usr/local/bin/psql >/dev/null 2>&1; then
        echo "✅ Found psql at /usr/local/bin/psql"
        docker exec "$DB_CONTAINER" /usr/local/bin/psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed-million-rows.sql
    else
        echo "❌ Could not find psql in container"
        echo "💡 Trying docker compose exec instead..."
        
        # Try using docker compose exec with different approaches
        echo "🔄 Trying docker compose exec db..."
        if docker compose exec db psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed-million-rows.sql; then
            echo "✅ Used docker compose exec successfully"
        else
            echo "❌ Docker compose exec failed, trying with stdin..."
            # Try piping the SQL directly
            if docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < src/scripts/seed-million-rows.sql; then
                echo "✅ Used stdin method successfully"
            else
                echo "❌ All Docker methods failed"
                echo "💡 Please check your Docker setup and database container"
                echo "🔍 Available containers:"
                docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
                exit 1
            fi
        fi
    fi
    
    # Clean up
    docker exec "$DB_CONTAINER" rm -f /tmp/seed-million-rows.sql 2>/dev/null || true

echo "✅ SQL seed completed at: $(date)" 