# Quick Setup Guide - api.clubverse.es & app.clubverse.es

## ✅ What's Already Done
- GitHub Actions workflow created
- SSH keys configured
- VM basic setup completed
- Environment files created

## 🚀 Remaining Steps

### Step 1: DNS Configuration (5 minutes)

Go to your DNS provider (where you manage clubverse.es) and add these **A records**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `api` | `35.194.55.206` | 300 |
| A | `app` | `35.194.55.206` | 300 |

**This creates:**
- `api.clubverse.es` → `35.194.55.206`
- `app.clubverse.es` → `35.194.55.206`

**Where to add:**
- Google Domains: https://domains.google.com → Select clubverse.es → DNS
- Cloudflare: Dashboard → DNS → Records (turn proxy OFF initially)
- Other: Look for "DNS Management" or "DNS Records"

### Step 2: GCP Firewall (2 minutes)

**Option A: GCP Console**
1. Go to https://console.cloud.google.com
2. **VPC Network** → **Firewall**
3. Click **"Create Firewall Rule"**

**Rule 1: HTTP**
- Name: `allow-http`
- Direction: Ingress
- Target: All instances
- Source: `0.0.0.0/0`
- Port: TCP `80`
- Create

**Rule 2: HTTPS**
- Name: `allow-https`
- Direction: Ingress
- Target: All instances
- Source: `0.0.0.0/0`
- Port: TCP `443`
- Create

**Option B: gcloud CLI**
```bash
gcloud compute firewall-rules create allow-http --allow tcp:80 --source-ranges 0.0.0.0/0
gcloud compute firewall-rules create allow-https --allow tcp:443 --source-ranges 0.0.0.0/0
```

### Step 3: Setup Nginx on VM (5 minutes)

SSH into your VM:
```bash
ssh nexlx99@35.194.55.206
```

Run the setup script:
```bash
# Copy the script from your repo or download it
# Then run:
chmod +x scripts/setup-domains.sh
sudo ./scripts/setup-domains.sh
```

Or manually install:
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy nginx configs (see DOMAIN_SETUP.md for full configs)
# Or use the setup script above
```

### Step 4: Wait for DNS & Get SSL (10 minutes)

**Check DNS propagation:**
```bash
# Wait 5-15 minutes after adding DNS records, then:
dig api.clubverse.es
dig app.clubverse.es
# Both should return: 35.194.55.206
```

**Once DNS is ready, get SSL certificates:**
```bash
sudo certbot --nginx -d api.clubverse.es -d app.clubverse.es
```

Follow prompts:
- Enter email
- Agree to terms
- Redirect HTTP to HTTPS? **Yes** (recommended)

Certbot will automatically configure SSL!

### Step 5: Update Frontend Environment

The setup script should have updated this, but verify:

```bash
nano ~/clubverse/frontend/.env.local
```

Should contain:
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.clubverse.es
```

### Step 6: Restart Services

```bash
sudo systemctl restart clubverse-backend
sudo systemctl restart clubverse-frontend
sudo systemctl restart nginx
```

### Step 7: Test!

**Test API:**
```bash
curl https://api.clubverse.es/api/v1/health
# Or visit: https://api.clubverse.es/docs
```

**Test Frontend:**
```bash
curl https://app.clubverse.es
# Or visit: https://app.clubverse.es
```

## 🎉 Done!

Your app should now be live at:
- **API:** https://api.clubverse.es
- **Frontend:** https://app.clubverse.es

## 🔧 Troubleshooting

**DNS not working?**
- Wait up to 24 hours (usually 5-15 min)
- Check records are correct
- Try: `dig @8.8.8.8 api.clubverse.es`

**SSL fails?**
- DNS must point to VM first
- Firewall must allow 80/443
- Check: `sudo nginx -t`

**Services not running?**
```bash
sudo systemctl status clubverse-backend
sudo systemctl status clubverse-frontend
sudo systemctl status nginx
```

**View logs:**
```bash
sudo journalctl -u clubverse-backend -f
sudo journalctl -u clubverse-frontend -f
sudo tail -f /var/log/nginx/error.log
```

## 📝 Next: Deploy Code

Once everything is set up, push to GitHub and it will auto-deploy:

```bash
git add .
git commit -m "Setup domain deployment"
git push origin main
```

Check deployment status: GitHub → Actions tab

