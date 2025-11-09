#!/bin/bash
# Run this on your VM to set up frontend environment variables

echo "=== Create frontend .env.production file ==="
echo ""
echo "Run these commands on your VM:"
echo ""
echo "cd ~/clubverse/frontend"
echo ""
echo "# Create .env.production file"
echo "cat > .env.production << 'EOF'"
echo "NEXT_PUBLIC_BACKEND_URL=https://api.clubverse.es"
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE"
echo "EOF"
echo ""
echo "# Replace YOUR_API_KEY_HERE with your actual API key"
echo "# Then restart frontend:"
echo "sudo systemctl restart clubverse-frontend"
echo ""
echo "# Check if it's working:"
echo "sudo systemctl status clubverse-frontend"
echo "sudo journalctl -u clubverse-frontend -n 20 --no-pager"

