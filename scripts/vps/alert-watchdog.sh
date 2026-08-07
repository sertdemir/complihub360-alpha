#!/usr/bin/env bash
# ─── Staging alert watchdog (13-layer audit P1 #5) ───────────────────────────
# Cron every 5 min. Two alert classes, both mailed via Resend (key + sender
# reused from /docker/complihub-api/.env):
#
#  1. Availability (state-change alerts, incl. recovery):
#     ui        — https://staging.complihub360.com answers 401 (auth wall)
#     api       — /health inside the api container says ok:true
#     supabase  — REST answers 200 (credentials from complihub-backup/.env)
#     containers— complihub-api-api-1 + complihub-web-1 + traefik running
#     A mail is sent ONLY on transition (OK→FAIL or FAIL→OK) — no spam while
#     a known incident is ongoing.
#
#  2. API error digest: new '"level":"error"' lines in the api container log
#     since the last scan → at most one digest mail per hour.
#
# Usage: alert-watchdog.sh [--test]   (--test sends a test mail and exits)
set -uo pipefail

BASE_DIR="/docker/complihub-alerts"
LOG="$BASE_DIR/watchdog.log"
STATE="$BASE_DIR/state"
ERRMARK="$BASE_DIR/last-error-scan"
ERRMAIL="$BASE_DIR/last-error-mail"
mkdir -p "$BASE_DIR"

set -a
source "$BASE_DIR/.env"                 # ALERT_TO
set +a
# The api .env is docker-compose format, not shell (unquoted 'Name <mail>'
# values) — pull the two vars we need instead of sourcing the file.
export RESEND_API_KEY=$(grep '^RESEND_API_KEY=' /docker/complihub-api/.env | cut -d= -f2-)
export MAIL_FROM=$(grep '^MAIL_FROM=' /docker/complihub-api/.env | cut -d= -f2-)
source /docker/complihub-backup/.env    # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

send_mail() { # $1 subject, $2 body — python only builds the JSON (escaping);
  # delivery goes through curl: Resend's edge 403s the python-urllib UA.
  local payload resp code
  payload=$(python3 -c 'import json,sys,os; print(json.dumps({"from":os.environ["MAIL_FROM"],"to":[os.environ["ALERT_TO"]],"subject":sys.argv[1],"text":sys.argv[2]}))' "$1" "$2")
  resp=$(curl -s --max-time 30 -w '\n%{http_code}' -X POST https://api.resend.com/emails \
    -H "Authorization: Bearer $RESEND_API_KEY" -H "content-type: application/json" \
    --data-binary "$payload")
  code=$(printf '%s' "$resp" | tail -1)
  if [ "$code" = "200" ]; then
    echo "mail sent: $(printf '%s' "$resp" | head -1)"
  else
    echo "mail FAILED: HTTP $code $(printf '%s' "$resp" | head -1)" >&2
    return 1
  fi
}

if [ "${1:-}" = "--test" ]; then
  send_mail "[CompliHub staging] Test alert" "Alert-watchdog test mail — delivery path works. $(ts)" \
    && echo "$(ts) TEST mail ok" >> "$LOG"
  exit $?
fi

# ── 1. Availability checks ───────────────────────────────────────────────────
declare -A NOW DETAIL

CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 https://staging.complihub360.com/ || echo 000)
[ "$CODE" = "401" ] && NOW[ui]=OK || { NOW[ui]=FAIL; DETAIL[ui]="HTTP $CODE (expected 401 auth wall)"; }

HEALTH=$(docker exec complihub-api-api-1 wget -qO- -T 15 http://localhost:3005/health 2>/dev/null || true)
echo "$HEALTH" | grep -q '"ok":true' && NOW[api]=OK || { NOW[api]=FAIL; DETAIL[api]="health: ${HEALTH:-no response}"; }

SCODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
  "$SUPABASE_URL/rest/v1/providers?select=provider_key&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" || echo 000)
[ "$SCODE" = "200" ] && NOW[supabase]=OK || { NOW[supabase]=FAIL; DETAIL[supabase]="REST HTTP $SCODE (paused?)"; }

MISSING=$(for c in complihub-api-api-1 complihub-web-1 traefik-traefik-1; do
  docker ps --format '{{.Names}}' | grep -qx "$c" || echo -n "$c "
done)
[ -z "$MISSING" ] && NOW[containers]=OK || { NOW[containers]=FAIL; DETAIL[containers]="not running: $MISSING"; }

# State-change detection (missing state file = first run, treat all as OK-known).
touch "$STATE"
CHANGES=""
for k in ui api supabase containers; do
  PREV=$(grep "^$k=" "$STATE" | cut -d= -f2)
  [ -z "$PREV" ] && PREV=OK
  if [ "${NOW[$k]}" != "$PREV" ]; then
    if [ "${NOW[$k]}" = "FAIL" ]; then
      CHANGES="$CHANGES\n[DOWN] $k — ${DETAIL[$k]:-}"
    else
      CHANGES="$CHANGES\n[RECOVERED] $k"
    fi
  fi
done
: > "$STATE"; for k in ui api supabase containers; do echo "$k=${NOW[$k]}" >> "$STATE"; done

if [ -n "$CHANGES" ]; then
  BODY="Staging availability change at $(ts):\n$CHANGES\n\nCurrent state: ui=${NOW[ui]} api=${NOW[api]} supabase=${NOW[supabase]} containers=${NOW[containers]}\nRunbook: docs/runbooks/staging-backup-restore.md"
  if printf '%b' "$CHANGES" | grep -q DOWN; then SUBJ="[CompliHub staging] ALERT: service down"; else SUBJ="[CompliHub staging] recovered"; fi
  send_mail "$SUBJ" "$(printf '%b' "$BODY")" >> "$LOG" 2>&1
  echo "$(ts) TRANSITION $(printf '%b' "$CHANGES" | tr '\n' ';')" >> "$LOG"
fi

# ── 2. API error-log digest (≤1 mail/hour) ───────────────────────────────────
SINCE=$(cat "$ERRMARK" 2>/dev/null || date -u -d '5 minutes ago' +"%Y-%m-%dT%H:%M:%SZ")
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$ERRMARK"
ERRS=$(docker logs --since "$SINCE" complihub-api-api-1 2>&1 | grep '"level":"error"' | head -10 || true)
if [ -n "$ERRS" ]; then
  N=$(printf '%s\n' "$ERRS" | wc -l | tr -d ' ')
  LAST_MAIL=$(cat "$ERRMAIL" 2>/dev/null || echo 0)
  NOW_EPOCH=$(date +%s)
  if [ $((NOW_EPOCH - LAST_MAIL)) -ge 3600 ]; then
    echo "$NOW_EPOCH" > "$ERRMAIL"
    send_mail "[CompliHub staging] API errors ($N since $SINCE)" \
      "$(printf 'API error lines since %s (first %s shown):\n\n%s\n\nFull logs: ssh VPS → docker logs complihub-api-api-1' "$SINCE" "$N" "$ERRS")" >> "$LOG" 2>&1
    echo "$(ts) ERROR-DIGEST $N lines" >> "$LOG"
  else
    echo "$(ts) errors seen ($N) — digest suppressed (last mail <1h)" >> "$LOG"
  fi
fi

echo "$(ts) tick ui=${NOW[ui]} api=${NOW[api]} supabase=${NOW[supabase]} containers=${NOW[containers]}" >> "$LOG"
tail -1000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
