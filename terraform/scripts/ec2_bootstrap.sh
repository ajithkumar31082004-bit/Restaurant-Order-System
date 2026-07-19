#!/bin/bash
# ── EC2 Bootstrap Script ───────────────────────────────────────────────────────
# This runs ONCE on first launch via EC2 User Data (Terraform injects variables)
# Sets up Node.js, PM2, Nginx, clones repo, and configures auto-start.

set -euo pipefail

LOG_FILE="/var/log/foodhub-bootstrap.log"
exec > >(tee -a $LOG_FILE) 2>&1

echo "═══════════════════════════════════════════"
echo "  FoodHub Bootstrap — $(date)"
echo "═══════════════════════════════════════════"

# ── System Update ──────────────────────────────────────────────
echo "📦 Updating system packages..."
dnf update -y

# ── Install Git, Nginx, MySQL Client ──────────────────────────
echo "📦 Installing Git, Nginx, MySQL client..."
dnf install -y git nginx mysql

# ── Install NVM + Node.js ──────────────────────────────────────
echo "📦 Installing NVM and Node.js ${node_version}..."
su - ec2-user -c "
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.nvm/nvm.sh
  nvm install ${node_version}
  nvm alias default ${node_version}
  npm install -g pm2
"

# ── Clone Repository ──────────────────────────────────────────
echo "📥 Cloning FoodHub repository..."
su - ec2-user -c "
  git clone ${repo_url} ~/Restaurant-Order-System
"

# ── Install Dependencies ───────────────────────────────────────
echo "📦 Installing Node.js dependencies..."
su - ec2-user -c "
  source ~/.nvm/nvm.sh
  cd ~/Restaurant-Order-System/restaurant-order-system/backend
  npm ci --omit=dev
"

# ── Configure Nginx ────────────────────────────────────────────
echo "⚙️  Configuring Nginx..."
cat > /etc/nginx/conf.d/foodhub.conf << 'NGINX'
server {
    listen 80;
    server_name _;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1024;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Reverse proxy to Node.js
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
}
NGINX

nginx -t && systemctl enable nginx && systemctl start nginx
echo "✅ Nginx configured and started"

# ── Setup PM2 Auto-start ───────────────────────────────────────
echo "⚙️  Setting up PM2 startup..."
su - ec2-user -c "
  source ~/.nvm/nvm.sh
  pm2 startup systemd -u ec2-user --hp /home/ec2-user
" | tail -1 | bash || true

echo "═══════════════════════════════════════════"
echo "  ✅ Bootstrap complete! $(date)"
echo "  ⚠️  Create /home/ec2-user/Restaurant-Order-System/restaurant-order-system/backend/.env"
echo "  ⚠️  Then run: pm2 start ecosystem.config.js && pm2 save"
echo "═══════════════════════════════════════════"
