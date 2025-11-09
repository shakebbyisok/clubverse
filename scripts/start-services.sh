#!/bin/bash
# Run this on your VM after deployment to start services

echo "=== Starting Clubverse Services ==="

# Start backend
echo "Starting backend..."
sudo systemctl start clubverse-backend
sleep 2
sudo systemctl status clubverse-backend --no-pager | head -10

# Start frontend
echo ""
echo "Starting frontend..."
sudo systemctl start clubverse-frontend
sleep 2
sudo systemctl status clubverse-frontend --no-pager | head -10

# Check processes
echo ""
echo "=== Checking processes ==="
ps aux | grep -E 'uvicorn|node|next' | grep -v grep

# Check ports
echo ""
echo "=== Checking ports ==="
sudo netstat -tlnp | grep -E ':3000|:8000'

echo ""
echo "=== Services started! ==="

