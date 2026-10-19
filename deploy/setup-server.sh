#!/bin/bash
# =============================================
# JAN AUSHADHI — First-Time Server Setup Script
# =============================================
# Run this script on a fresh Ubuntu 24.04 VPS:
#   chmod +x deploy/setup-server.sh
#   ./deploy/setup-server.sh
# =============================================

set -euo pipefail

APP_DIR="$HOME/Jan-Aushadhi"

echo "============================================="
echo "  Jan Aushadhi — Production Server Setup"
echo "============================================="
echo ""

# ---- Step 1: System Update ----
echo "📦 Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

# ---- Step 1b: Swap (lets a 2 GB Droplet absorb short memory peaks) ----
echo "💾 Step 1b: Ensuring a 2 GB swapfile..."
if [ "$(swapon --show --noheadings | wc -l)" -eq 0 ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
    # Prefer RAM; only swap under real pressure
    echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-janaushadhi.conf > /dev/null
    sudo sysctl -p /etc/sysctl.d/99-janaushadhi.conf > /dev/null
    echo "   ✅ 2 GB swap enabled"
else
    echo "   ✅ Swap already configured"
fi

# ---- Step 2: Install Docker ----
echo "🐳 Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo "   ✅ Docker installed"
else
    echo "   ✅ Docker already installed"
fi

# ---- Step 3: Install Docker Compose Plugin ----
echo "🔧 Step 3: Installing Docker Compose plugin..."
if ! docker compose version &> /dev/null; then
    sudo apt install -y docker-compose-plugin
    echo "   ✅ Docker Compose plugin installed"
else
    echo "   ✅ Docker Compose plugin already installed"
fi

# ---- Step 4: Install essential tools ----
echo "🛠️  Step 4: Installing essential tools..."
sudo apt install -y git curl ufw fail2ban gettext-base

# ---- Step 5: Configure Firewall ----
echo "🔥 Step 5: Configuring UFW Firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for Let's Encrypt ACME + redirect)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
echo "   ✅ Firewall configured (SSH, HTTP, HTTPS only)"

# ---- Step 6: Enable Fail2Ban ----
echo "🛡️  Step 6: Enabling Fail2Ban for SSH brute-force protection..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
echo "   ✅ Fail2Ban active"

# ---- Step 7: Clone Repository ----
echo "📂 Step 7: Cloning repository..."
if [ ! -d "$APP_DIR" ]; then
    git clone https://github.com/Pratham-The-Warrior/Jan-Aushadhi.git "$APP_DIR"
    echo "   ✅ Repository cloned to $APP_DIR"
else
    echo "   ✅ Repository already exists at $APP_DIR"
fi

cd "$APP_DIR"

# ---- Step 7b: Nightly database backup (free; kept on this server) ----
echo "🗄️  Step 7b: Scheduling nightly database backups..."
sudo mkdir -p /opt/backups && sudo chown "$USER" /opt/backups
chmod +x "$APP_DIR/deploy/backup.sh"
CRON_LINE="30 2 * * * cd $APP_DIR && ./deploy/backup.sh >> /opt/backups/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'deploy/backup.sh' ; echo "$CRON_LINE" ) | crontab -
echo "   ✅ Backups run daily at 02:30 server time into /opt/backups (7 days kept)"

# ---- Step 8: Create env file from template if missing ----
echo "🔑 Step 8: Setting up environment file..."
if [ ! -f deploy/.env.production ]; then
    cp deploy/.env.production.example deploy/.env.production
    echo "   ✅ Created deploy/.env.production from template"
    echo "   ⚠️  EDIT THIS FILE with real credentials before deploying!"
else
    echo "   ✅ deploy/.env.production already exists"
fi

# ---- Step 9: Generate Secrets ----
echo ""
echo "============================================="
echo "  🔐 GENERATE PRODUCTION SECRETS"
echo "============================================="
echo ""
echo "Run these commands to generate strong passwords:"
echo ""
echo "  POSTGRES_PASSWORD:"
echo "    openssl rand -base64 48"
echo ""
echo "  REDIS_PASSWORD:"
echo "    openssl rand -base64 24"
echo ""
echo "  MEILI_MASTER_KEY:"
echo "    openssl rand -base64 48"
echo ""
echo "Then edit: nano $APP_DIR/deploy/.env.production"
echo ""

# ---- Step 10: Pre-flight environment validation ----
echo "============================================="
echo "  🔍 PRE-FLIGHT VALIDATION"
echo "============================================="
echo ""

ENV_FILE="$APP_DIR/deploy/.env.production"

if grep -q "CHANGE_ME" "$ENV_FILE"; then
    echo "❌ ERROR: deploy/.env.production still contains CHANGE_ME placeholder values!"
    echo "   Please edit the file and replace ALL 'CHANGE_ME' values with real credentials."
    echo "   File: $ENV_FILE"
    echo ""
    echo "   Aborting deployment. Run this after fixing the env file:"
    echo "   cd $APP_DIR && ./deploy/setup-server.sh deploy"
    exit 1
fi

# Check critical required fields are not empty
REQUIRED_VARS=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "MEILI_MASTER_KEY" "FIREBASE_SERVICE_ACCOUNT_KEY" "DOMAIN")
for var in "${REQUIRED_VARS[@]}"; do
    value=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -z "$value" ]; then
        echo "❌ ERROR: Required variable '$var' is empty in deploy/.env.production"
        echo "   Please set a value for '$var' before deploying."
        exit 1
    fi
done

echo "   ✅ Environment file validation passed"

# ---- Step 11: Generate Nginx config from template ----
echo ""
echo "⚙️  Step 11: Generating Nginx config from template..."

# Source the production env to get DOMAIN
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ -z "${DOMAIN:-}" ]; then
    echo "❌ ERROR: DOMAIN variable is not set in deploy/.env.production"
    echo "   Add: DOMAIN=yourdomain.com (e.g. DOMAIN=janaushadhi.in)"
    exit 1
fi

# Use envsubst to replace ${DOMAIN} in the template
envsubst '${DOMAIN}' < "$APP_DIR/deploy/nginx/nginx-proxy.conf.template" > "$APP_DIR/deploy/nginx/nginx-proxy.conf"
echo "   ✅ nginx-proxy.conf generated for domain: $DOMAIN"

echo ""
echo "============================================="
echo "  ✅ SERVER SETUP COMPLETE"
echo "============================================="
echo ""
echo "Next steps:"
echo "  1. Confirm domain DNS A-records point to this server's IP:"
echo "     app.$DOMAIN, seller.$DOMAIN, admin.$DOMAIN, api.$DOMAIN"
echo ""
echo "  2. Execute the automated deployment runner:"
echo "     cd \"$APP_DIR\""
echo "     chmod +x deploy/deploy.sh deploy/init-ssl.sh"
echo "     ./deploy/deploy.sh"
echo ""
echo "  3. Verify production health:"
echo "     curl https://api.$DOMAIN/api/v1/health"
echo ""
echo ""
