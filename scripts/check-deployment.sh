#!/bin/bash
# Run these commands on your VM to check deployment status

echo "=== 1. Check if files are deployed ==="
echo "ls -la ~/clubverse/backend/ | head -20"
echo "ls -la ~/clubverse/frontend/.next 2>/dev/null || echo 'Frontend not deployed'"
echo ""

echo "=== 2. Check backend service ==="
echo "sudo systemctl status clubverse-backend"
echo "sudo journalctl -u clubverse-backend -n 50 --no-pager"
echo ""

echo "=== 3. Check frontend service ==="
echo "sudo systemctl status clubverse-frontend"
echo "sudo journalctl -u clubverse-frontend -n 50 --no-pager"
echo ""

echo "=== 4. Check if processes are running ==="
echo "ps aux | grep -E 'uvicorn|node|next'"
echo ""

echo "=== 5. Check ports ==="
echo "sudo netstat -tlnp | grep -E ':3000|:8000'"
echo ""

echo "=== 6. Check nginx ==="
echo "sudo nginx -t"
echo "sudo systemctl status nginx"
echo "sudo cat /etc/nginx/sites-enabled/clubverse"
echo ""

echo "=== 7. Test backend directly ==="
echo "curl -v http://localhost:8000/api/docs 2>&1 | head -20"
echo ""

echo "=== 8. Test frontend directly ==="
echo "curl -v http://localhost:3000 2>&1 | head -20"

