#!/bin/bash
# Commands to check and fix firewall issues

echo "=== Option 1: Add 'label' tag to VM ==="
echo "In GCP Console:"
echo "1. Go to Compute Engine → VM instances"
echo "2. Click on your VM (clubverse)"
echo "3. Click 'Edit'"
echo "4. Go to 'Network tags' section"
echo "5. Add tag: label"
echo "6. Save"
echo ""

echo "=== Option 2: Change firewall rule to target all instances ==="
echo "In firewall rule 'allow-http':"
echo "1. Change 'Destinos' from 'Etiquetas de destino especificadas'"
echo "2. To 'Todas las instancias de la red' (All instances in the network)"
echo "3. Remove the 'label' tag requirement"
echo "4. Save"
echo ""

echo "=== On VM: Check nginx and services ==="
echo "sudo systemctl status nginx"
echo "sudo netstat -tlnp | grep :80"
echo "curl http://localhost:3000 | head -20"
echo "curl http://localhost:8000/health"

