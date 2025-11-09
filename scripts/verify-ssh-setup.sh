#!/bin/bash
# Script to verify SSH setup on VM

echo "=== Run these commands on your VM ==="
echo ""
echo "1. Check if public key is in authorized_keys:"
echo "   cat ~/.ssh/authorized_keys | grep github-actions"
echo ""
echo "2. Check file permissions:"
echo "   ls -la ~/.ssh/"
echo ""
echo "3. Check SSH config (should allow publickey):"
echo "   sudo grep -i PubkeyAuthentication /etc/ssh/sshd_config"
echo ""
echo "4. Verify the key format:"
echo "   tail -1 ~/.ssh/authorized_keys"
echo ""
echo "Expected permissions:"
echo "   ~/.ssh should be 700 (drwx------)"
echo "   ~/.ssh/authorized_keys should be 600 (-rw-------)"

