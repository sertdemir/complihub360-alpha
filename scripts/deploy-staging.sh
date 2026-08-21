#!/usr/bin/env bash
# Deploy the vs1-demo UI to the Hostinger staging VPS (76.13.159.221).
# Serving stack on the server: /docker/complihub (nginx behind Hostinger's
# host-mode traefik, basic auth + noindex). One command, ~30s:
#   ./scripts/deploy-staging.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UI="$REPO_ROOT/apps/vs1-demo/ui"
SSH_KEY="$HOME/.ssh/complihub_vps"
HOST="root@76.13.159.221"

echo "→ Building frontend…"
# Bake the staging x-api-key + public Supabase values into the bundle.
# VITE_DEMO_LOGIN=1 keeps the one-click stakeholder logins alongside real auth.
# shellcheck disable=SC1091
source "$REPO_ROOT/.env.staging"
# Analytics: beide leer => index.html injiziert nichts, es fliegt kein Byte.
# Erst wenn in .env.staging gesetzt, misst Staging auf die dort genannte Site.
# Bewusst eine EIGENE data-domain nehmen, sonst mischen sich Staging-Klicks
# unter die echten Zahlen.
cd "$UI" && VITE_DEV_API_KEY="$STAGING_API_KEY" \
  VITE_SUPABASE_URL="$SUPABASE_URL" \
  VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  VITE_PLAUSIBLE_DOMAIN="${PLAUSIBLE_DOMAIN:-}" \
  VITE_PLAUSIBLE_HOST="${PLAUSIBLE_HOST:-}" \
  VITE_SITE_ORIGIN="${SITE_ORIGIN:-}" \
  VITE_DEMO_LOGIN=1 \
  npm run build --silent
printf 'User-agent: *\nDisallow: /\n' > "$UI/dist/robots.txt"

echo "→ Syncing to VPS…"
# --chmod: container nginx must be able to read dirs/files regardless of
# local macOS permissions (this bit us on the first deploy).
rsync -az --delete -e "ssh -i $SSH_KEY" \
  "$UI/dist/" "$HOST:/docker/complihub/site/"
# macOS's ancient rsync (2.6.9) applies --chmod unreliably; the container's
# nginx then 403s/500s on unreadable dirs. Normalize on the server instead.
ssh -i "$SSH_KEY" "$HOST" 'chmod -R a+rX /docker/complihub/site'

echo "→ Verifying…"
code=$(curl -s -o /dev/null -w "%{http_code}" https://complihub.srv1759934.hstgr.cloud/)
[ "$code" = "401" ] && echo "✓ Staging up (auth wall active)" || echo "⚠ Unexpected status: $code"
