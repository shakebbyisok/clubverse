#!/bin/bash
# Run these commands on your VM to check status

echo "=== 1. Check deployment directory ==="
echo "ls -la ~/clubverse/"
echo ""

echo "=== 2. Check if services exist ==="
echo "sudo systemctl list-units | grep -E 'clubverse|uvicorn|nextjs'"
echo "pm2 list"
echo ""

echo "=== 3. Check if processes are running ==="
echo "ps aux | grep -E 'uvicorn|node|next'"
echo ""

echo "=== 4. Check nginx status ==="
echo "sudo systemctl status nginx"
echo "sudo nginx -t"
echo ""

echo "=== 5. Check ports ==="
echo "sudo netstat -tlnp | grep -E ':3000|:8000|:80|:443'"
echo ""

echo "=== 6. Check nginx config ==="
echo "sudo cat /etc/nginx/sites-enabled/clubverse 2>/dev/null || echo 'No nginx config found'"
echo ""

echo "=== 7. Check if files were deployed ==="
echo "ls -la ~/clubverse/frontend/.next 2>/dev/null || echo 'Frontend not deployed'"
echo "ls -la ~/clubverse/backend/ 2>/dev/null || echo 'Backend not deployed'"

