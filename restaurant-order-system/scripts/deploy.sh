#!/bin/bash
# ── FoodHub Deployment Script ──────────────────────────────────────────────────
# Runs on EC2 during CI/CD deployment (called by GitHub Actions via SSH)
# Usage: bash scripts/deploy.sh

set -euo pipefail

REPO_DIR="$HOME/Restaurant-Order-System"
BACKEND_DIR="$REPO_DIR/restaurant-order-system/backend"
NGINX_CONF_SRC="$REPO_DIR/restaurant-order-system/nginx/foodhub.conf"
NGINX_CONF_DEST="/etc/nginx/conf.d/foodhub.conf"
APP_NAME="restaurant"

echo "╔══════════════════════════════════════════════╗"
echo "║   🍕 FoodHub Deployment — $(date '+%Y-%m-%d %H:%M')   ║"
echo "╚══════════════════════════════════════════════╝"

# ── Step 1: Pull Latest Code ───────────────────────────────────────────────────
echo ""
echo "⬇️  [1/5] Pulling latest code from GitHub..."
cd "$REPO_DIR"
git fetch --all
git reset --hard origin/main
echo "✅ Code updated to: $(git log --oneline -1)"

# ── Step 2: Install Dependencies ──────────────────────────────────────────────
echo ""
echo "📦 [2/5] Installing production dependencies..."
cd "$BACKEND_DIR"
source ~/.nvm/nvm.sh
npm ci --omit=dev
echo "✅ Dependencies installed"

# ── Step 3: Update Nginx Config ───────────────────────────────────────────────
echo ""
echo "⚙️  [3/5] Updating Nginx configuration..."
if [ -f "$NGINX_CONF_SRC" ]; then
  sudo cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"
  # Test Nginx config before reloading
  if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
  else
    echo "⚠️  Nginx config test failed — skipping reload (old config preserved)"
  fi
else
  echo "⚠️  Nginx config not found at $NGINX_CONF_SRC — skipping"
fi

# ── Step 4: Restart Application with PM2 ─────────────────────────────────────
echo ""
echo "♻️  [4/5] Restarting application with PM2..."
cd "$BACKEND_DIR"

if pm2 list | grep -q "$APP_NAME"; then
  # Zero-downtime reload (graceful restart for existing processes)
  pm2 reload "$APP_NAME" --update-env
  echo "✅ Application reloaded (zero-downtime)"
else
  # First-time start using ecosystem config
  pm2 start ecosystem.config.js --env production
  pm2 save
  echo "✅ Application started for the first time"
fi

# ── Step 5: Verify Deployment ─────────────────────────────────────────────────
echo ""
echo "🩺 [5/5] Running health check..."
sleep 5

HEALTH_RESPONSE=$(curl -sf --max-time 10 http://localhost:5000/health 2>/dev/null || echo "FAILED")

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  echo "✅ Health check passed!"
  echo "   Response: $HEALTH_RESPONSE"
elif echo "$HEALTH_RESPONSE" | grep -q '"status":"degraded"'; then
  echo "⚠️  App running but DB connection is degraded"
  echo "   Check your .env DB credentials"
else
  echo "❌ Health check failed! App may not have started correctly."
  echo "   Run: pm2 logs $APP_NAME --lines 50"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅ Deployment Complete!                    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
pm2 list
