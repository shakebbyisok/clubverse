#!/bin/bash
# Run this on your VM to initialize git and pull source files

echo "=== Checking current directory contents ==="
cd ~/clubverse
ls -la

echo ""
echo "=== Initializing git repo ==="
cd ~/clubverse
git init
git remote add origin https://github.com/shakebbyisok/clubverse.git

echo ""
echo "=== Fetching and checking out main branch ==="
git fetch origin main
git checkout -b main origin/main

echo ""
echo "=== Verifying frontend source files exist ==="
ls -la frontend/app frontend/components frontend/lib frontend/types 2>/dev/null || echo "Some directories missing"

echo ""
echo "=== Setting environment variables ==="
cd ~/clubverse/frontend
cat > .env.production << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://api.clubverse.es
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCyGTyq6vn96nDg-vP7lYecLJOSvZYf1ag
EOF

echo "Created .env.production:"
cat .env.production

echo ""
echo "=== Rebuilding frontend ==="
npm run build

echo ""
echo "=== Restarting frontend service ==="
sudo systemctl restart clubverse-frontend

echo ""
echo "=== Checking service status ==="
sudo systemctl status clubverse-frontend --no-pager -l | head -30

