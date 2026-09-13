#!/bin/bash
# ============================================================
# JAN AUSHADHI — Automated Production Deployment Script
# Idempotent, self-validating, zero-downtime deployment runner.
#
# USAGE:
#   chmod +x deploy/deploy.sh
#   ./deploy/deploy.sh
# ============================================================

set -euo pipefail

ENV_FILE="deploy/.env.production"
COMPOSE_FILE="docker-compose.prod.yml"

echo "============================================================"
echo "🚀 JAN AUSHADHI — PRODUCTION DEPLOYMENT RUNNER"
echo "============================================================"
echo ""

# ------------------------------------------------------------
# 1. Pre-flight Environment Validation
# ------------------------------------------------------------
echo "🔍 Step 1: Validating environment configuration..."

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR: $ENV_FILE does not exist!"
    echo "   Create it by copying deploy/.env.production.example:"
    echo "   cp deploy/.env.production.example deploy/.env.production"
    echo "   Then fill in all real production credentials."
    exit 1
fi

# Check for CHANGE_ME placeholders
if grep -q "CHANGE_ME" "$ENV_FILE"; then
    echo "❌ ERROR: $ENV_FILE still contains CHANGE_ME placeholder values!"
    echo "   Please replace all 'CHANGE_ME' tokens with genuine secrets."
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Required critical variables check
REQUIRED_VARS=("DOMAIN" "POSTGRES_PASSWORD" "REDIS_PASSWORD" "MEILI_MASTER_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    val="${!var:-}"
    if [ -z "$val" ]; then
        echo "❌ ERROR: Required variable '$var' is empty in $ENV_FILE."
        exit 1
    fi
done

# Meilisearch 16-byte key validation
if [ "${#MEILI_MASTER_KEY}" -lt 16 ]; then
    echo "❌ ERROR: MEILI_MASTER_KEY must be at least 16 characters long in production mode!"
    echo "   Current length: ${#MEILI_MASTER_KEY} characters."
    echo "   Generate a secure key: openssl rand -base64 48"
    exit 1
fi

echo "   ✅ Pre-flight checks passed."

# ------------------------------------------------------------
# 2. Generate Nginx Proxy Configuration
# ------------------------------------------------------------
echo ""
echo "⚙️  Step 2: Generating Nginx configuration for domain: $DOMAIN..."

if command -v envsubst &> /dev/null; then
    envsubst '${DOMAIN}' < deploy/nginx/nginx-proxy.conf.template > deploy/nginx/nginx-proxy.conf
else
    # Fallback to sed if envsubst is not installed
    sed "s/\${DOMAIN}/$DOMAIN/g" deploy/nginx/nginx-proxy.conf.template > deploy/nginx/nginx-proxy.conf
fi
echo "   ✅ deploy/nginx/nginx-proxy.conf generated."

# ------------------------------------------------------------
# 3. Build Container Images
# ------------------------------------------------------------
echo ""
echo "📦 Step 3: Building container images..."
docker compose -f "$COMPOSE_FILE" build
echo "   ✅ Container images built successfully."

# ------------------------------------------------------------
# 4. Start Storage & Run Migrations
# ------------------------------------------------------------
echo ""
echo "💾 Step 4: Starting database, cache, and search engine..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis meilisearch

echo "⏳ Waiting for PostgreSQL to pass healthcheck..."
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'until pg_isready -U "$POSTGRES_USER"; do sleep 1; done'

echo "🔧 Running database schema migrations..."
docker compose -f "$COMPOSE_FILE" run --rm migrator
echo "   ✅ Migrations completed successfully."

# ------------------------------------------------------------
# 5. Bootstrap SSL / Certificates
# ------------------------------------------------------------
echo ""
echo "🔒 Step 5: Checking SSL certificates..."
chmod +x deploy/init-ssl.sh
./deploy/init-ssl.sh "$ENV_FILE"

# ------------------------------------------------------------
# 6. Launch Entire Production Stack
# ------------------------------------------------------------
echo ""
echo "🚀 Step 6: Launching all application containers..."
docker compose -f "$COMPOSE_FILE" up -d
echo "   ✅ All containers started in background."

# ------------------------------------------------------------
# 7. Poll Backend Readiness Probe
# ------------------------------------------------------------
echo ""
echo "🩺 Step 7: Verifying application readiness..."
HEALTH_URL="http://localhost:5000/api/v1/health/ready"
MAX_ATTEMPTS=20
ATTEMPT=1
IS_HEALTHY=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo -n "   Probing $HEALTH_URL (attempt $ATTEMPT/$MAX_ATTEMPTS)... "
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

    if [ "$STATUS_CODE" -eq 200 ]; then
        echo "HTTP 200 (READY)"
        IS_HEALTHY=true
        break
    else
        echo "HTTP $STATUS_CODE (waiting...)"
        sleep 3
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

if [ "$IS_HEALTHY" = false ]; then
    echo ""
    echo "❌ ERROR: Backend container failed readiness probe after $MAX_ATTEMPTS attempts."
    echo "📋 Dumping recent backend logs:"
    docker compose -f "$COMPOSE_FILE" logs --tail 50 backend
    exit 1
fi

echo ""
echo "============================================================"
echo "🎉 JAN AUSHADHI PRODUCTION DEPLOYMENT COMPLETE & HEALTHY!"
echo "============================================================"
echo ""
echo "Accessible Portals:"
echo "   • Patient App:     https://app.${DOMAIN}"
echo "   • Seller Central:  https://seller.${DOMAIN}"
echo "   • Admin Console:   https://admin.${DOMAIN}"
echo "   • API Backend:     https://api.${DOMAIN}/api/v1"
echo "   • Health Check:    https://api.${DOMAIN}/api/v1/health"
echo ""
