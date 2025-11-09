#!/bin/bash
# Commands to check and fix firewall on VM

echo "=== Check if port 80 is listening ==="
echo "sudo netstat -tlnp | grep :80"
echo ""

echo "=== Check VM firewall (ufw) ==="
echo "sudo ufw status"
echo ""

echo "=== Check GCP firewall ==="
echo "This needs to be done in GCP Console or via gcloud CLI"
echo ""
echo "GCP Console:"
echo "1. Go to https://console.cloud.google.com"
echo "2. VPC Network → Firewall"
echo "3. Check if there's a rule allowing port 80 from 0.0.0.0/0"
echo ""
echo "Or via gcloud CLI:"
echo "gcloud compute firewall-rules list | grep 80"
echo ""

echo "=== If no firewall rule exists, create it ==="
echo "gcloud compute firewall-rules create allow-http \\"
echo "    --allow tcp:80 \\"
echo "    --source-ranges 0.0.0.0/0 \\"
echo "    --description 'Allow HTTP traffic'"
echo ""
echo "gcloud compute firewall-rules create allow-https \\"
echo "    --allow tcp:443 \\"
echo "    --source-ranges 0.0.0.0/0 \\"
echo "    --description 'Allow HTTPS traffic'"

