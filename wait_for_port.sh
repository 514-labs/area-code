#!/bin/bash

# Check if host and port arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <host> <port>"
    echo "Example: $0 localhost 5432"
    exit 1
fi

HOST=$1
PORT=$2
TIMEOUT=10
SLEEP_INTERVAL=0.1
MAX_ATTEMPTS=$((TIMEOUT * 10))  # 10 seconds * 10 attempts per second
attempts=0

echo "Waiting for $HOST:$PORT to become available..."

while [ $attempts -lt $MAX_ATTEMPTS ]; do
    # Try to connect to the host and port
    if timeout 1 bash -c "</dev/tcp/$HOST/$PORT" 2>/dev/null; then
        echo "Port $HOST:$PORT is now available!"
        exit 0
    fi
    
    attempts=$((attempts + 1))
    sleep $SLEEP_INTERVAL
done

echo "Timeout: Port $HOST:$PORT is not available after ${TIMEOUT}s"
exit 124
