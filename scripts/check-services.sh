#!/bin/bash
# Run these commands on your VM to check service status

echo "=== 1. Check if files were deployed ==="
echo "ls -la ~/clubverse/backend/app/ | head -10"
echo "ls -la ~/clubverse/frontend/.next 2>/dev/null | head -5"
echo ""

echo "=== 2. Check backend service ==="
echo "sudo systemctl status clubverse-backend"
echo "sudo journalctl -u clubverse-backend -n 30 --no-pager"
echo ""

echo "=== 3. Check frontend service ==="
echo "sudo systemctl status clubverse-frontend"
echo "sudo journalctl -u clubverse-frontend -n 30 --no-pager"
echo ""

echo "=== 4. Check if processes are running ==="
echo "ps aux | grep -E 'uvicorn|node|next' | grep -v grep"
echo ""

echo "=== 5. Check ports ==="
echo "sudo netstat -tlnp | grep -E ':3000|:8000'"
echo "curl -v http://localhost:8000/api/docs 2>&1 | head -10"
echo "curl -v http://localhost:3000 2>&1 | head -10"
echo ""

echo "=== 6. Check nginx logs ==="
echo "sudo tail -20 /var/log/nginx/error.log"
echo "sudo tail -20 /var/log/nginx/access.log"

