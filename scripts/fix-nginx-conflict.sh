#!/bin/bash
# Commands to run on VM to fix nginx conflict

echo "=== Check existing nginx configs ==="
echo "sudo ls -la /etc/nginx/sites-enabled/"
echo ""
echo "=== Check for conflicting server names ==="
echo "sudo grep -r 'server_name.*clubverse' /etc/nginx/sites-enabled/"
echo ""
echo "=== If there's a default config, disable it ==="
echo "sudo rm /etc/nginx/sites-enabled/default 2>/dev/null || echo 'No default config'"
echo ""
echo "=== Then reload nginx ==="
echo "sudo nginx -t"
echo "sudo systemctl reload nginx"

