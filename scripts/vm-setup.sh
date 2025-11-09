#!/bin/bash
# VM Setup Script for Clubverse Deployment
# Run this script on your GCP VM to prepare it for deployment

set -e

echo "🚀 Setting up Clubverse deployment environment..."

# Get current user
CURRENT_USER=$(whoami)
DEPLOY_PATH="/home/$CURRENT_USER/clubverse"

echo "📁 Creating deployment directory at $DEPLOY_PATH..."
mkdir -p $DEPLOY_PATH/{backend,frontend}
cd $DEPLOY_PATH

# Setup Python virtual environment
echo "🐍 Setting up Python virtual environment..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
cd ..

# Setup Node.js (check if installed)
echo "📦 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found. Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Create systemd service files
echo "⚙️  Creating systemd service files..."

# Backend service
sudo tee /etc/systemd/system/clubverse-backend.service > /dev/null <<EOF
[Unit]
Description=Clubverse Backend API
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$DEPLOY_PATH/backend
Environment="PATH=$DEPLOY_PATH/backend/venv/bin"
ExecStart=$DEPLOY_PATH/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
sudo tee /etc/systemd/system/clubverse-frontend.service > /dev/null <<EOF
[Unit]
Description=Clubverse Frontend
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$DEPLOY_PATH/frontend
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

echo "✅ Systemd services created"

# Setup firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    echo "🔥 Configuring firewall..."
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 8000/tcp  # Backend API
    sudo ufw allow 3000/tcp  # Frontend (if not using nginx)
    echo "✅ Firewall configured"
fi

# Create .env template files
echo "📝 Creating .env template files..."

cat > $DEPLOY_PATH/backend/.env.example <<EOF
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/clubverse
SUPABASE_DB_URL=

# Security
SECRET_KEY=your-secret-key-here-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenRouter (optional)
OPENROUTER_KEY=

# Remove.bg (optional)
REMOVEBG_API_KEY=

# Google Maps (optional)
GOOGLE_MAPS_KEY=

# App
ENVIRONMENT=production
API_V1_PREFIX=/api/v1
EOF

cat > $DEPLOY_PATH/frontend/.env.local.example <<EOF
# API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EOF

echo "✅ .env.example files created"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.example files to .env and fill in your values:"
echo "   cp $DEPLOY_PATH/backend/.env.example $DEPLOY_PATH/backend/.env"
echo "   cp $DEPLOY_PATH/frontend/.env.local.example $DEPLOY_PATH/frontend/.env.local"
echo ""
echo "2. Set up GitHub Secrets (see DEPLOYMENT.md)"
echo ""
echo "3. Enable services (after first deployment):"
echo "   sudo systemctl enable clubverse-backend"
echo "   sudo systemctl enable clubverse-frontend"
echo ""
echo "4. Start services:"
echo "   sudo systemctl start clubverse-backend"
echo "   sudo systemctl start clubverse-frontend"
echo ""
echo "✅ VM setup completed!"

