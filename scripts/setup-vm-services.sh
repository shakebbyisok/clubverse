#!/bin/bash
# Run these commands on your VM to set up services

echo "=== Step 1: Check backend contents ==="
echo "ls -la ~/clubverse/backend/"
echo ""

echo "=== Step 2: Create nginx config ==="
echo "Run this command:"
echo ""
echo "sudo tee /etc/nginx/sites-available/clubverse > /dev/null << 'EOF'
server {
    listen 80;
    server_name app.clubverse.es api.clubverse.es;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF"
echo ""
echo "Then enable it:"
echo "sudo ln -s /etc/nginx/sites-available/clubverse /etc/nginx/sites-enabled/"
echo "sudo nginx -t"
echo "sudo systemctl reload nginx"
echo ""

echo "=== Step 3: Create backend systemd service ==="
echo "Run this command:"
echo ""
echo "sudo tee /etc/systemd/system/clubverse-backend.service > /dev/null << 'EOF'
[Unit]
Description=Clubverse Backend API
After=network.target

[Service]
Type=simple
User=nexlx99
WorkingDirectory=/home/nexlx99/clubverse/backend
Environment=\"PATH=/home/nexlx99/clubverse/backend/venv/bin\"
ExecStart=/home/nexlx99/clubverse/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF"
echo ""
echo "Then enable and start:"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable clubverse-backend"
echo "sudo systemctl start clubverse-backend"
echo ""

echo "=== Step 4: Create frontend systemd service ==="
echo "Run this command:"
echo ""
echo "sudo tee /etc/systemd/system/clubverse-frontend.service > /dev/null << 'EOF'
[Unit]
Description=Clubverse Frontend
After=network.target

[Service]
Type=simple
User=nexlx99
WorkingDirectory=/home/nexlx99/clubverse/frontend
Environment=\"NODE_ENV=production\"
Environment=\"PORT=3000\"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF"
echo ""
echo "Then enable and start:"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable clubverse-frontend"
echo "sudo systemctl start clubverse-frontend"
echo ""

echo "=== Step 5: Check service status ==="
echo "sudo systemctl status clubverse-backend"
echo "sudo systemctl status clubverse-frontend"

