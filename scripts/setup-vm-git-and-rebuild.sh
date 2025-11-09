#!/bin/bash
# Run this on your VM to install git, pull code, and rebuild frontend

echo "=== Installing git ==="
sudo apt-get update -qq
sudo apt-get install -y git

echo ""
echo "=== Checking if repo exists ==="
if [ -d ~/clubverse/.git ]; then
    echo "Repo exists, pulling latest changes..."
    cd ~/clubverse
    git pull origin main
else
    echo "Repo doesn't exist. You'll need to clone it manually or copy files."
    echo "To clone: git clone https://github.com/shakebbyisok/clubverse.git ~/clubverse"
    exit 1
fi

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
sudo systemctl status clubverse-frontend --no-pager -l | head -20

echo ""
echo "=== Done! ==="

