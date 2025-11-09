#!/bin/bash
# Verify SSH key setup for GitHub Actions

echo "=== 1. Check if SSH key exists locally ==="
if [ -f ~/.ssh/github_actions_deploy ]; then
    echo "✓ Private key exists"
    echo ""
    echo "=== Private key (copy this to GitHub Secrets VM_SSH_KEY) ==="
    echo "--- BEGIN PRIVATE KEY ---"
    cat ~/.ssh/github_actions_deploy
    echo "--- END PRIVATE KEY ---"
else
    echo "✗ Private key not found at ~/.ssh/github_actions_deploy"
    echo "Run: ssh-keygen -t ed25519 -C 'github-actions' -f ~/.ssh/github_actions_deploy"
    exit 1
fi

echo ""
echo "=== 2. Check if public key exists ==="
if [ -f ~/.ssh/github_actions_deploy.pub ]; then
    echo "✓ Public key exists"
    echo ""
    echo "=== Public key (add this to VM authorized_keys) ==="
    cat ~/.ssh/github_actions_deploy.pub
else
    echo "✗ Public key not found"
    exit 1
fi

echo ""
echo "=== 3. Test SSH connection ==="
echo "Testing connection to VM..."
ssh -i ~/.ssh/github_actions_deploy nexlx99@35.194.55.206 "echo '✓ SSH connection successful'"

echo ""
echo "=== Next steps ==="
echo "1. Copy the ENTIRE private key (including headers) to GitHub Secrets:"
echo "   Go to: https://github.com/shakebbyisok/clubverse/settings/secrets/actions"
echo "   Update VM_SSH_KEY with the private key shown above"
echo ""
echo "2. Verify VM_HOST secret is set to: 35.194.55.206"
echo "3. Verify VM_USER secret is set to: nexlx99"
echo "4. Trigger deployment again"
