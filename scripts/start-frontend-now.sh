#!/bin/bash
# Quick script to start Next.js frontend server
# Run this on your VM: bash scripts/start-frontend-now.sh

DEPLOY_PATH="${1:-/home/nexlx99/clubverse}"

cd "$DEPLOY_PATH/frontend" || exit 1

echo "Starting Next.js frontend server..."

# Set environment variables
export NODE_ENV=production
export PORT=3000

# Load .env.production if it exists
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
fi

# Kill any existing Next.js processes on port 3000
echo "Killing existing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Start Next.js server
echo "Starting Next.js server..."
nohup npm start > /tmp/nextjs.log 2>&1 &
PID=$!
echo $PID > /tmp/nextjs.pid

echo "Waiting for server to start..."
sleep 5

# Check if it's running
if curl -f http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Next.js server started successfully!"
  echo "PID: $PID"
  echo "Logs: /tmp/nextjs.log"
  echo "Test: curl http://localhost:3000"
else
  echo "❌ Failed to start server. Check logs:"
  tail -20 /tmp/nextjs.log
  exit 1
fi

