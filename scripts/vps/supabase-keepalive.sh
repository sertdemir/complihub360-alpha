#!/usr/bin/env bash
# ─── Staging-Supabase keep-alive (13-layer audit P0 #1) ──────────────────────
# The free tier pauses a project after prolonged inactivity. The API's
# watchers already query every 5 min WHILE the container runs — this cron is
# the container-independent second line of defense: one cheap REST read every
# run keeps the project marked active and logs reachability.
set -uo pipefail

BASE_DIR="/docker/complihub-backup"
LOG="$BASE_DIR/keepalive.log"
source "$BASE_DIR/.env"

CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
  "$SUPABASE_URL/rest/v1/providers?select=provider_key&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") HTTP $CODE" >> "$LOG"
# Non-200 lines in the log = the DB was unreachable (paused or down) — the
# runbook's first diagnostic stop. Keep the log bounded.
tail -500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
[ "$CODE" = "200" ]
