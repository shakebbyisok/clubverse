#!/bin/bash
# Run this on your VM to rebuild the frontend

echo "=== 1. Navigate to frontend directory ==="
cd ~/clubverse/frontend || exit 1

echo ""
echo "=== 2. Check current build ==="
ls -la .next/BUILD_ID 2>/dev/null || echo "No build found"

echo ""
echo "=== 3. Pull latest code ==="
cd ~/clubverse
git pull origin main || echo "Git pull failed or not a git repo"

echo ""
echo "=== 4. Set environment variables ==="
cd ~/clubverse/frontend
cat > .env.production << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://api.clubverse.es
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCyGTyq6vn96nDg-vP7lYecLJOSvZYf1ag
EOF

echo "Environment variables set:"
cat .env.production

echo ""
echo "=== 5. Clean old build ==="
rm -rf .next

echo ""
echo "=== 6. Install dependencies (if needed) ==="
npm install

echo ""
echo "=== 7. Rebuild frontend ==="
npm run build

echo ""
echo "=== 8. Restart frontend service ==="
sudo systemctl restart clubverse-frontend

echo ""
echo "=== 9. Check service status ==="
sleep 2
sudo systemctl status clubverse-frontend --no-pager -l | head -30

echo ""
echo "=== Done! ==="
echo "Frontend rebuilt and restarted. Clear your browser cache and try again."
