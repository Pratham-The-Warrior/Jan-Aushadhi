#!/bin/bash
# ============================================================
# JAN AUSHADHI — Automated SSL Bootstrapper
# Solves the Nginx chicken-and-egg SSL bootstrap problem:
# 1. Checks if certificates already exist for $DOMAIN
# 2. If missing, creates a temporary dummy certificate so Nginx starts
# 3. Invokes Certbot to request real certificates from Let's Encrypt
# 4. Reloads Nginx with genuine production SSL certificates
# ============================================================

set -euo pipefail

ENV_FILE="${1:-deploy/.env.production}"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR: Environment file $ENV_FILE not found."
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ -z "${DOMAIN:-}" ]; then
    echo "❌ ERROR: DOMAIN is not set in $ENV_FILE."
    exit 1
fi

DOMAINS=("app.${DOMAIN}" "seller.${DOMAIN}" "admin.${DOMAIN}" "api.${DOMAIN}")

echo "============================================================"
echo "🔒 SSL Bootstrapper for domain: $DOMAIN"
echo "   Subdomains: ${DOMAINS[*]}"
echo "============================================================"

# Check if certificates already exist inside docker volume or directory
if docker compose -f docker-compose.prod.yml run --rm --entrypoint "test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem" certbot 2>/dev/null; then
    echo "✅ SSL certificates for $DOMAIN already exist. Skipping dummy bootstrap."
    exit 0
fi

echo "⚠️  No existing certificates found for $DOMAIN."
echo "🔧 Step 1: Creating temporary dummy certificates so Nginx can start..."

make_dummy_cert() {
  docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
    sh -c 'mkdir -p /etc/letsencrypt/live/${DOMAIN} && \
           openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
           -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
           -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
           -subj \"/CN=localhost\"'" certbot
}
make_dummy_cert

echo "   ✅ Dummy certificates generated."

echo "🚀 Step 2: Starting Nginx..."
docker compose -f docker-compose.prod.yml up -d nginx

echo "🗑️  Step 3: Removing dummy certificates before ACME challenge..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/${DOMAIN} /etc/letsencrypt/archive/${DOMAIN} /etc/letsencrypt/renewal/${DOMAIN}.conf" certbot

echo "📜 Step 4: Requesting genuine certificates from Let's Encrypt..."
DOMAIN_ARGS=""
for d in "${DOMAINS[@]}"; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
done

# Request certificate using webroot method. --cert-name keeps it at
# live/${DOMAIN}, the path nginx-proxy.conf expects (certbot would otherwise
# name it after the first -d, i.e. app.${DOMAIN}).
if ! docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --cert-name ${DOMAIN} \
    $DOMAIN_ARGS \
    --email admin@${DOMAIN} \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot; then
    echo "❌ Let's Encrypt request failed (are the DNS records for ${DOMAINS[*]} pointing at this server?)."
    echo "   Restoring a temporary certificate so nginx keeps running; fix DNS and re-run this script."
    make_dummy_cert
    docker compose -f docker-compose.prod.yml exec nginx nginx -s reload || true
    exit 1
fi

echo "🔄 Step 5: Reloading Nginx with production certificates..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "============================================================"
echo "🎉 SSL CERTIFICATES SUCCESSFULLY INSTALLED & ACTIVATED!"
echo "============================================================"
