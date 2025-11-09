#!/bin/bash
# Setup SSH key for GitHub Actions deployment

echo "=== Step 1: Generate SSH Key ==="
echo "Run this command (press Enter when prompted for passphrase - leave it EMPTY):"
echo ""
echo "ssh-keygen -t ed25519 -C 'github-actions' -f ~/.ssh/github_actions_deploy"
echo ""
read -p "Press Enter after you've generated the key..."

echo ""
echo "=== Step 2: Copy Public Key to VM ==="
echo "Run this command (replace USERNAME with your VM username):"
echo ""
echo "cat ~/.ssh/github_actions_deploy.pub | ssh USERNAME@35.194.55.206 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'"
echo ""
read -p "Press Enter after you've copied the public key..."

echo ""
echo "=== Step 3: Copy Private Key for GitHub Secrets ==="
echo "Run this command and copy the ENTIRE output:"
echo ""
echo "cat ~/.ssh/github_actions_deploy"
echo ""
echo "Then:"
echo "1. Go to GitHub → Your Repo → Settings → Secrets and variables → Actions"
echo "2. Edit VM_SSH_KEY secret"
echo "3. Paste the ENTIRE output (including BEGIN/END lines)"
echo "4. Make sure all newlines are preserved"
echo "5. Save"

