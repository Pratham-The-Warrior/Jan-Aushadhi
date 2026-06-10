#!/bin/bash
# =============================================
# JAN AUSHADHI — First-Time Server Setup Script
# =============================================
# Run this script on a fresh Ubuntu 24.04 VPS:
#   chmod +x deploy/setup-server.sh
#   ./deploy/setup-server.sh
# =============================================

set -euo pipefail

echo "============================================="
echo "  Jan Aushadhi — Production Server Setup"
echo "============================================="
echo ""

# ---- Step 1: System Update ----
echo "📦 Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

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
sudo apt install -y git curl ufw fail2ban

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
if [ ! -d "$HOME/Jan-Aushadhi" ]; then
    git clone https://github.com/Pratham-The-Warrior/Jan-Aushadhi.git "$HOME/Jan-Aushadhi"
    echo "   ✅ Repository cloned to ~/Jan-Aushadhi"
else
    echo "   ✅ Repository already exists at ~/Jan-Aushadhi"
fi

# ---- Step 8: Generate Secrets ----
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
echo "Then edit: nano ~/Jan-Aushadhi/deploy/.env.production"
echo ""

# ---- Step 9: Create env file from template ----
cd "$HOME/Jan-Aushadhi"
if [ ! -f deploy/.env.production ]; then
    cp deploy/.env.production.example deploy/.env.production
    echo "   ✅ Created deploy/.env.production from template"
    echo "   ⚠️  EDIT THIS FILE with real credentials before deploying!"
else
    echo "   ✅ deploy/.env.production already exists"
fi

echo ""
echo "============================================="
echo "  ✅ SERVER SETUP COMPLETE"
echo "============================================="
echo ""
echo "Next steps:"
echo "  1. Edit deploy/.env.production with real credentials"
echo "  2. Configure DNS records (A records for your domain)"
echo "  3. Run the SSL certificate setup (see deploy instructions)"
echo "  4. Build and launch:"
echo "     cd ~/Jan-Aushadhi"
echo "     export \$(grep -v '^#' deploy/.env.production | xargs)"
echo "     docker compose -f docker-compose.prod.yml up --build -d"
echo ""
