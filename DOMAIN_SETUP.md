# Domain Setup Guide: api.clubverse.es & app.clubverse.es

## Step 1: DNS Configuration

You need to add **A records** in your DNS provider (wherever you manage clubverse.es):

### DNS Records to Add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `api` | `35.194.55.206` | 300 (or default) |
| A | `app` | `35.194.55.206` | 300 (or default) |

**Example:**
- `api.clubverse.es` → `35.194.55.206`
- `app.clubverse.es` → `35.194.55.206`

### Where to add DNS records:

**If using Google Domains:**
1. Go to https://domains.google.com
2. Select `clubverse.es`
3. Go to "DNS" section
4. Add A records as shown above

**If using Cloudflare:**
1. Go to Cloudflare Dashboard
2. Select `clubverse.es`
3. Go to "DNS" → "Records"
4. Add A records (make sure proxy is OFF initially for SSL setup)

**If using other providers:**
- Look for "DNS Management" or "DNS Records"
- Add A records pointing both subdomains to `35.194.55.206`

## Step 2: GCP Firewall Configuration

### Option A: Using GCP Console

1. Go to [GCP Console](https://console.cloud.google.com)
2. Navigate to: **VPC Network** → **Firewall**
3. Create firewall rules:

**Rule 1: HTTP (Port 80)**
- Name: `allow-http`
- Direction: Ingress
- Target: All instances in the network
- Source IP ranges: `0.0.0.0/0`
- Protocols and ports: TCP port `80`
- Click "Create"

**Rule 2: HTTPS (Port 443)**
- Name: `allow-https`
- Direction: Ingress
- Target: All instances in the network
- Source IP ranges: `0.0.0.0/0`
- Protocols and ports: TCP port `443`
- Click "Create"

### Option B: Using gcloud CLI

```bash
# Allow HTTP
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP traffic"

# Allow HTTPS
gcloud compute firewall-rules create allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTPS traffic"
```

### Option C: Using VM's ufw (if available)

SSH into your VM and run:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

## Step 3: Setup Nginx and SSL on VM

SSH into your VM:

```bash
ssh nexlx99@35.194.55.206
```

Run the setup script:

```bash
# Download and run setup script
curl -o /tmp/setup-domains.sh https://raw.githubusercontent.com/YOUR_REPO/main/scripts/setup-domains.sh
chmod +x /tmp/setup-domains.sh
sudo /tmp/setup-domains.sh
```

Or manually copy the script from `scripts/setup-domains.sh` and run it.

## Step 4: Verify DNS Propagation

Wait a few minutes after adding DNS records, then check:

```bash
# On your local machine
dig api.clubverse.es
dig app.clubverse.es

# Or use nslookup
nslookup api.clubverse.es
nslookup app.clubverse.es
```

Both should return `35.194.55.206`

## Step 5: Setup SSL Certificates

Once DNS is propagated, run Certbot:

```bash
sudo certbot --nginx -d api.clubverse.es -d app.clubverse.es
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

Certbot will automatically:
- Obtain SSL certificates
- Configure Nginx with SSL
- Set up auto-renewal

## Step 6: Update Frontend Environment

Update your frontend `.env.local` on the VM:

```bash
nano ~/clubverse/frontend/.env.local
```

Change to:
```bash
NEXT_PUBLIC_API_URL=https://api.clubverse.es
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key_here
```

## Step 7: Test Deployment

1. **Test API:**
   ```bash
   curl https://api.clubverse.es/api/v1/health
   # Or visit in browser: https://api.clubverse.es/docs
   ```

2. **Test Frontend:**
   ```bash
   curl https://app.clubverse.es
   # Or visit in browser: https://app.clubverse.es
   ```

## Troubleshooting

### DNS not resolving?
- Wait up to 24 hours for full propagation (usually 5-15 minutes)
- Check DNS records are correct
- Try different DNS servers: `dig @8.8.8.8 api.clubverse.es`

### SSL certificate fails?
- Make sure DNS is pointing to your VM
- Check firewall allows ports 80 and 443
- Verify Nginx is running: `sudo systemctl status nginx`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Can't access sites?
- Check GCP firewall rules
- Verify VM firewall: `sudo ufw status`
- Check services are running:
  ```bash
  sudo systemctl status clubverse-backend
  sudo systemctl status clubverse-frontend
  sudo systemctl status nginx
  ```

### Check Nginx configuration:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Auto-renewal

Certbot sets up auto-renewal automatically. Test it:

```bash
sudo certbot renew --dry-run
```

Certificates renew automatically every 90 days.

