#!/bin/bash
# Quick fix: Copy frontend source files to VM manually
# Run this from your LOCAL machine (not VM) to copy files via SCP

VM_USER="${VM_USER:-nexlx99}"
VM_HOST="${VM_HOST:-35.194.55.206}"
SSH_KEY="${SSH_KEY:-~/.ssh/github_actions_deploy}"

echo "Copying frontend source files to VM..."
echo "VM: ${VM_USER}@${VM_HOST}"

# Copy essential source directories
scp -i "$SSH_KEY" -r frontend/app "${VM_USER}@${VM_HOST}:~/clubverse/frontend/" || echo "Failed to copy app/"
scp -i "$SSH_KEY" -r frontend/components "${VM_USER}@${VM_HOST}:~/clubverse/frontend/" || echo "Failed to copy components/"
scp -i "$SSH_KEY" -r frontend/lib "${VM_USER}@${VM_HOST}:~/clubverse/frontend/" || echo "Failed to copy lib/"
scp -i "$SSH_KEY" -r frontend/types "${VM_USER}@${VM_HOST}:~/clubverse/frontend/" || echo "Failed to copy types/"
scp -i "$SSH_KEY" frontend/tsconfig.json "${VM_USER}@${VM_HOST}:~/clubverse/frontend/" || echo "Failed to copy tsconfig.json"
scp -i "$SSH_KEY" frontend/tailwind.config.js "${VM_USER}@${VM_HOST}:~/clubverse/frontend/" 2>/dev/null || echo "tailwind.config.js not found"
scp -i "$SSH_KEY" frontend/postcss.config.js "${VM_USER}@${VM_HOST}:~/clubverse/frontend/" 2>/dev/null || echo "postcss.config.js not found"

echo ""
echo "Files copied. Now SSH into VM and run:"
echo "  cd ~/clubverse/frontend"
echo "  cat > .env.production << 'EOF'"
echo "  NEXT_PUBLIC_BACKEND_URL=http://api.clubverse.es"
echo "  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCyGTyq6vn96nDg-vP7lYecLJOSvZYf1ag"
echo "  EOF"
echo "  npm run build"
echo "  sudo systemctl restart clubverse-frontend"

