#!/bin/bash
# Run this on your VM to fix nginx routing for separate domains

sudo tee /etc/nginx/sites-available/clubverse > /dev/null << 'EOF'
# API subdomain - route to backend
server {
    listen 80;
    server_name api.clubverse.es;

    # Backend API
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# App subdomain - route to frontend
server {
    listen 80;
    server_name app.clubverse.es;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== Test endpoints ==="
echo "curl -H 'Host: api.clubverse.es' http://localhost/health"
echo "curl -H 'Host: app.clubverse.es' http://localhost/ | head -20"

