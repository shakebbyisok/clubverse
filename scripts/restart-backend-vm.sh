#!/bin/bash
# Run this on your VM to verify and restart the backend

echo "=== 1. Check if updated schema file exists ==="
cat ~/clubverse/backend/app/schemas/bartender.py | head -10

echo ""
echo "=== 2. Check if UUID is imported ==="
grep -n "from uuid import UUID" ~/clubverse/backend/app/schemas/bartender.py || echo "UUID not imported - OLD VERSION"

echo ""
echo "=== 3. Restart backend service ==="
sudo systemctl restart clubverse-backend

echo ""
echo "=== 4. Check backend status ==="
sudo systemctl status clubverse-backend --no-pager -l | head -20

echo ""
echo "=== 5. Check backend logs ==="
sudo journalctl -u clubverse-backend -n 20 --no-pager

echo ""
echo "=== 6. Test backend API ==="
sleep 2
curl -s http://localhost:8000/health || echo "Backend not responding"

echo ""
echo "=== Done! ==="

