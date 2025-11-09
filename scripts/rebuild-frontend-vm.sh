#!/bin/bash
# Run this on your VM to rebuild frontend with environment variables

echo "=== Rebuild frontend with environment variables ==="
echo ""
echo "cd ~/clubverse/frontend"
echo ""
echo "# Make sure .env.production exists"
echo "cat .env.production"
echo ""
echo "# Rebuild with the environment variables"
echo "npm run build"
echo ""
echo "# Restart frontend"
echo "sudo systemctl restart clubverse-frontend"
echo ""
echo "# Check logs"
echo "sudo journalctl -u clubverse-frontend -n 30 --no-pager"

