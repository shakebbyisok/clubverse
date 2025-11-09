#!/bin/bash
# Run this on your VM to verify and fix frontend environment variables

echo "=== Checking current .env.production ==="
cat ~/clubverse/frontend/.env.production 2>/dev/null || echo "File not found"

echo ""
echo "=== Current frontend build info ==="
# Check if .next exists and when it was built
ls -la ~/clubverse/frontend/.next/BUILD_ID 2>/dev/null || echo ".next directory not found"

echo ""
echo "=== Setting correct environment variables ==="
cd ~/clubverse/frontend

# Use HTTP (not HTTPS) since we're not using SSL yet
cat > .env.production << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://api.clubverse.es
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCyGTyq6vn96nDg-vP7lYecLJOSvZYf1ag
EOF

echo "Created .env.production with:"
cat .env.production

echo ""
echo "=== Rebuilding frontend with correct environment ==="
npm run build

echo ""
echo "=== Restarting frontend service ==="
sudo systemctl restart clubverse-frontend

echo ""
echo "=== Checking service status ==="
sudo systemctl status clubverse-frontend --no-pager -l

echo ""
echo "=== Testing backend connectivity ==="
echo "Backend should be accessible at: http://api.clubverse.es"
curl -s http://api.clubverse.es/health || echo "Backend not reachable"

echo ""
echo "=== Done! ==="
echo "Frontend should now connect to: http://api.clubverse.es"

