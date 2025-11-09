#!/bin/bash
# Setup script for api.clubverse.es and app.clubverse.es
# Run this on your GCP VM

set -e

echo "🌐 Setting up domains: api.clubverse.es and app.clubverse.es"

# Install Nginx and Certbot
echo "📦 Installing Nginx and Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration for API
echo "⚙️  Creating Nginx configuration for API..."
sudo tee /etc/nginx/sites-available/api.clubverse.es > /dev/null <<'EOF'
server {
    listen 80;
    server_name api.clubverse.es;

    # Logging
    access_log /var/log/nginx/api.clubverse.es.access.log;
    error_log /var/log/nginx/api.clubverse.es.error.log;

    # Backend API
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Create Nginx configuration for Frontend
echo "⚙️  Creating Nginx configuration for Frontend..."
sudo tee /etc/nginx/sites-available/app.clubverse.es > /dev/null <<'EOF'
server {
    listen 80;
    server_name app.clubverse.es;

    # Logging
    access_log /var/log/nginx/app.clubverse.es.access.log;
    error_log /var/log/nginx/app.clubverse.es.error.log;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Enable sites
echo "🔗 Enabling Nginx sites..."
sudo ln -sf /etc/nginx/sites-available/api.clubverse.es /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/app.clubverse.es /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

# Start and enable Nginx
echo "🚀 Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

# Update frontend .env.local
echo "📝 Updating frontend environment..."
if [ -f "/home/nexlx99/clubverse/frontend/.env.local" ]; then
    # Update API URL if exists, otherwise add it
    if grep -q "NEXT_PUBLIC_BACKEND_URL" /home/nexlx99/clubverse/frontend/.env.local; then
        sed -i 's|NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=https://api.clubverse.es|' /home/nexlx99/clubverse/frontend/.env.local
    else
        echo "NEXT_PUBLIC_BACKEND_URL=https://api.clubverse.es" >> /home/nexlx99/clubverse/frontend/.env.local
    fi
else
    echo "NEXT_PUBLIC_BACKEND_URL=https://api.clubverse.es" > /home/nexlx99/clubverse/frontend/.env.local
fi

echo ""
echo "✅ Nginx configured!"
echo ""
echo "📋 Next steps:"
echo "1. Set up DNS A records pointing to your VM IP (35.194.55.206)"
echo "   - api.clubverse.es → 35.194.55.206"
echo "   - app.clubverse.es → 35.194.55.206"
echo ""
echo "2. Configure GCP Firewall (ports 80 and 443)"
echo ""
echo "3. Wait for DNS propagation (5-15 minutes), then check:"
echo "   dig api.clubverse.es"
echo "   dig app.clubverse.es"
echo ""
echo "4. Once DNS is ready, run SSL certificate setup:"
echo "   sudo certbot --nginx -d api.clubverse.es -d app.clubverse.es"
echo ""
echo "5. Restart services:"
echo "   sudo systemctl restart clubverse-backend"
echo "   sudo systemctl restart clubverse-frontend"
echo "   sudo systemctl restart nginx"

