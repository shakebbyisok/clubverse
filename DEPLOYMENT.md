# Deployment Guide

This guide explains how to set up automatic deployment from GitHub to your GCP VM.

## Prerequisites

1. **GCP VM Setup**
   - VM IP: `35.194.55.206`
   - SSH access configured
   - User with sudo privileges
   - Python 3.10+ installed
   - Node.js 20+ installed
   - Systemd services configured (or PM2)

2. **GitHub Repository**
   - Repository with your code
   - GitHub Actions enabled

## Setup Instructions

### 1. Generate SSH Key for GitHub Actions

On your local machine or VM:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy
```

**Important:** Don't set a passphrase (press Enter when prompted).

### 2. Add Public Key to VM

Copy the public key to your VM's authorized_keys:

```bash
# On your local machine
cat ~/.ssh/github_actions_deploy.pub | ssh user@35.194.55.206 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Or manually:
```bash
# SSH into your VM
ssh user@35.194.55.206

# Add the public key
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VM_HOST` | Your VM IP address | `35.194.55.206` |
| `VM_USER` | SSH username | `your-username` |
| `VM_SSH_KEY` | Private SSH key (entire content) | Content of `~/.ssh/github_actions_deploy` |
| `VM_SSH_PORT` | SSH port (optional, defaults to 22) | `22` |
| `VM_DEPLOY_PATH` | Path where code is deployed (optional) | `/home/user/clubverse` |

**To get the SSH key content:**
```bash
cat ~/.ssh/github_actions_deploy
# Copy the entire output including -----BEGIN and -----END lines
```

### 4. Set Up Services on VM

#### Option A: Systemd Services

Create backend service (`/etc/systemd/system/clubverse-backend.service`):

```ini
[Unit]
Description=Clubverse Backend API
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/clubverse/backend
Environment="PATH=/home/your-username/clubverse/backend/venv/bin"
ExecStart=/home/your-username/clubverse/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create frontend service (`/etc/systemd/system/clubverse-frontend.service`):

```ini
[Unit]
Description=Clubverse Frontend
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/clubverse/frontend
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable clubverse-backend
sudo systemctl enable clubverse-frontend
sudo systemctl start clubverse-backend
sudo systemctl start clubverse-frontend
```

#### Option B: PM2

```bash
# Install PM2
npm install -g pm2

# Start backend
cd /home/your-username/clubverse/backend
source venv/bin/activate
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name clubverse-backend

# Start frontend
cd /home/your-username/clubverse/frontend
pm2 start npm --name clubverse-frontend -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### 5. Initial VM Setup

SSH into your VM and run:

```bash
# Create deployment directory
mkdir -p ~/clubverse
cd ~/clubverse

# Create backend directory structure
mkdir -p backend frontend

# Create Python virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Create frontend directory
cd ../frontend
# Frontend will be deployed via GitHub Actions
```

### 6. Environment Variables

Create `.env` files on the VM:

**Backend** (`~/clubverse/backend/.env`):
```bash
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
# ... other environment variables
```

**Frontend** (`~/clubverse/frontend/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://35.194.55.206:8000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_key
# ... other environment variables
```

### 7. Nginx Configuration (Optional)

If using Nginx as reverse proxy (`/etc/nginx/sites-available/clubverse`):

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or 35.194.55.206

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/clubverse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Deployment Flow

1. **Push to main branch** → GitHub Actions triggers
2. **Build frontend** → Creates production build
3. **Create archive** → Packages backend + frontend build
4. **Deploy to VM** → SCP archive to VM
5. **Extract & Install** → Extracts files, installs dependencies
6. **Restart Services** → Restarts backend and frontend services

## Manual Deployment

If you need to deploy manually:

```bash
# SSH into VM
ssh user@35.194.55.206

# Navigate to project
cd ~/clubverse

# Pull latest code (if using git)
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
# Run migrations if needed: alembic upgrade head

# Update frontend
cd ../frontend
npm install
npm run build

# Restart services
sudo systemctl restart clubverse-backend
sudo systemctl restart clubverse-frontend
```

## Troubleshooting

### Check service status:
```bash
sudo systemctl status clubverse-backend
sudo systemctl status clubverse-frontend
```

### View logs:
```bash
sudo journalctl -u clubverse-backend -f
sudo journalctl -u clubverse-frontend -f
```

### Test SSH connection:
```bash
ssh -i ~/.ssh/github_actions_deploy user@35.194.55.206
```

### Check deployment path:
Make sure `VM_DEPLOY_PATH` secret matches your actual deployment directory.

## Security Notes

- Never commit `.env` files or secrets to Git
- Use strong SSH keys
- Keep VM updated: `sudo apt update && sudo apt upgrade`
- Configure firewall: `sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
- Consider using SSL/TLS certificates (Let's Encrypt)

