#!/usr/bin/env bash
# ─── Test-Provider in der Beta anlegen oder entfernen (auf dem VPS) ─────────
#
# Duenne Huelle um scripts/beta/seed-test-providers.mjs: liest Supabase- und
# Stripe-Schluessel aus der BETA-Env (/docker/complihub-beta-api/.env), fragt
# das gemeinsame Passwort der Testkonten verdeckt ab und laesst das Skript in
# einem Wegwerf-Container laufen (der VPS hat kein Node).
#
#   bash seed-test-providers.sh             # Probelauf: Plan + Abdeckung, schreibt nichts
#   bash seed-test-providers.sh --apply     # 25 Provider anlegen (fragt das Passwort)
#   bash seed-test-providers.sh --remove    # alle tp-* wieder entfernen
#
# Erwartet die Repo-Dateien unter /root/ch360 (scp vom Mac, siehe Runbook
# docs/runbooks/beta-test-providers.md).
set -euo pipefail

ENV_FILE=/docker/complihub-beta-api/.env
SRC=${SEED_SRC:-/root/ch360/beta}
SEED_EMAIL=${SEED_EMAIL:-demet@complihub360.com}

[ -f "$ENV_FILE" ] || { echo "✗ $ENV_FILE fehlt" >&2; exit 1; }
[ -f "$SRC/seed-test-providers.mjs" ] || { echo "✗ $SRC/seed-test-providers.mjs fehlt (scp vom Mac)" >&2; exit 1; }
k() { grep "^$1=" "$ENV_FILE" | cut -d= -f2-; }

URL=$(k SUPABASE_URL)
REF=$(printf '%s' "$URL" | sed -E 's#^https://([a-z0-9]+)\.supabase\.co/?$#\1#')
[ -n "$REF" ] && [ "$REF" != "$URL" ] || { echo "✗ SUPABASE_URL in $ENV_FILE unerwartet: $URL" >&2; exit 1; }

PW=""
if [ "${1:-}" = "--apply" ]; then
  read -rsp "Gemeinsames Passwort der Testkonten (min. 16 Zeichen): " PW; echo
  read -rsp "Noch einmal: " PW2; echo
  [ "$PW" = "$PW2" ] || { echo "✗ Passwoerter unterschiedlich" >&2; exit 1; }
fi

docker run --rm \
  -v "$SRC":/repo/scripts/beta:ro \
  -e TARGET_SUPABASE_URL="$URL" \
  -e TARGET_SERVICE_ROLE_KEY="$(k SUPABASE_SERVICE_ROLE_KEY)" \
  -e STRIPE_SECRET_KEY="$(k STRIPE_SECRET_KEY)" \
  -e SEED_EMAIL="$SEED_EMAIL" \
  -e SEED_PASSWORD="$PW" \
  node:22-alpine node /repo/scripts/beta/seed-test-providers.mjs --ref "$REF" "$@"
