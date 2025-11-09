#!/bin/bash
# Run this on your VM to fix nginx configuration for Next.js

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

# App subdomain - route to frontend (Next.js)
server {
    listen 80;
    server_name app.clubverse.es;

    # Increase buffer sizes for Next.js
    client_max_body_size 50M;
    proxy_buffering off;
    proxy_request_buffering off;

    # Next.js static files and assets
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js image optimization
    location /_next/image {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # All other requests to Next.js
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
        
        # Important headers for Next.js
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== Nginx configuration updated ==="
echo "Testing frontend..."
curl -I http://localhost:3000 2>&1 | head -5

echo ""
echo "=== Done! ==="

