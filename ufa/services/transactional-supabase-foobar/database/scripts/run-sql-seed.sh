#!/bin/bash

# Simple help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [record_count]"
    echo "Default: 1,000,000 records"
    echo "Example: $0 5000000"
    exit 0
fi

# Parameters
RECORD_COUNT=${1:-1000000}
if ! [[ "$RECORD_COUNT" =~ ^[0-9]+$ ]]; then
    echo "Error: Record count must be a number"
    exit 1
fi

# Environment
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-your-super-secret-jwt-token-with-at-least-32-characters-long}
DB_NAME=${DB_NAME:-postgres}

# Find container
DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep "supabase-db")

if [ -z "$DB_CONTAINER" ]; then
    echo "Error: No PostgreSQL container found"
    exit 1
fi

echo "Seeding $RECORD_COUNT records in container: $DB_CONTAINER"

# Create seeding procedures
docker cp database/scripts/seed-transactional-database.sql "$DB_CONTAINER:/tmp/seed.sql"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed.sql

# Run seeding procedure (creates foo records only)
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "CALL seed_foo_data($RECORD_COUNT);"

# Cleanup
docker exec "$DB_CONTAINER" rm -f /tmp/seed.sql

echo "Done" 