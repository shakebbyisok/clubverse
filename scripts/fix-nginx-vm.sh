#!/bin/bash
# Run these commands on your VM to fix nginx conflicts

echo "=== Remove old separate configs ==="
echo "sudo rm /etc/nginx/sites-enabled/api.clubverse.es"
echo "sudo rm /etc/nginx/sites-enabled/app.clubverse.es"
echo ""
echo "=== Verify only clubverse config remains ==="
echo "sudo ls -la /etc/nginx/sites-enabled/"
echo ""
echo "=== Test and reload nginx ==="
echo "sudo nginx -t"
echo "sudo systemctl reload nginx"
echo ""
echo "=== Check nginx status ==="
echo "sudo systemctl status nginx"

