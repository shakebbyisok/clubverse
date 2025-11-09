#!/bin/bash
# Run this on your VM to set up HTTPS with Let's Encrypt

echo "=== 1. Installing certbot ==="
sudo apt-get update -qq
sudo apt-get install -y certbot python3-certbot-nginx

echo ""
echo "=== 2. Stopping nginx temporarily for certbot ==="
sudo systemctl stop nginx

echo ""
echo "=== 3. Obtaining SSL certificates ==="
echo "This will obtain certificates for both app.clubverse.es and api.clubverse.es"
sudo certbot certonly --standalone \
  --preferred-challenges http \
  -d app.clubverse.es \
  -d api.clubverse.es \
  --email admin@clubverse.es \
  --agree-tos \
  --non-interactive || {
    echo "Failed to obtain certificates. Make sure:"
    echo "  1. DNS A records point app.clubverse.es and api.clubverse.es to this server"
    echo "  2. Port 80 is open in firewall"
    echo "  3. Domains are accessible from the internet"
    exit 1
  }

echo ""
echo "=== 4. Updating nginx configuration for HTTPS ==="
sudo tee /etc/nginx/sites-available/clubverse > /dev/null << 'EOF'
# API subdomain - HTTPS
server {
    listen 80;
    server_name api.clubverse.es;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.clubverse.es;

    ssl_certificate /etc/letsencrypt/live/app.clubverse.es/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.clubverse.es/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

# App subdomain - HTTPS
server {
    listen 80;
    server_name app.clubverse.es;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.clubverse.es;

    ssl_certificate /etc/letsencrypt/live/app.clubverse.es/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.clubverse.es/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

echo ""
echo "=== 5. Testing nginx configuration ==="
sudo nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "=== 6. Starting nginx ==="
    sudo systemctl start nginx
    
    echo ""
    echo "=== 7. Setting up automatic certificate renewal ==="
    # Test renewal
    sudo certbot renew --dry-run
    
    echo ""
    echo "=== 8. Updating frontend environment to use HTTPS ==="
    cd ~/clubverse/frontend
    cat > .env.production << 'ENVEOF'
NEXT_PUBLIC_BACKEND_URL=https://api.clubverse.es
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCyGTyq6vn96nDg-vP7lYecLJOSvZYf1ag
ENVEOF
    
    echo "Environment updated. Rebuilding frontend..."
    rm -rf .next
    npm run build
    sudo systemctl restart clubverse-frontend
    
    echo ""
    echo "=== ✅ HTTPS Setup Complete! ==="
    echo ""
    echo "Your sites are now available at:"
    echo "  - https://app.clubverse.es"
    echo "  - https://api.clubverse.es"
    echo ""
    echo "HTTP requests will automatically redirect to HTTPS."
    echo ""
    echo "Certificates will auto-renew via certbot."
else
    echo ""
    echo "❌ Nginx configuration test failed. Please check the errors above."
    exit 1
fi

