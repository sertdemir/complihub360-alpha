#!/usr/bin/env bash
# ─── Beta-Umgebung auf dem VPS einrichten (Beta-Plan Di 20.10.) ───────────────
#
# Einmalig, als root auf dem VPS. Legt neben Staging an:
#   /docker/complihub-beta       nginx-Site, Traefik-Router beta.complihub360.com,
#                                Middlewares complihub-beta-auth (eigene Wand,
#                                eigene Tester) + complihub-noindex (von Staging)
#   /docker/complihub-beta-api   API-Container, abgeleitet aus der Staging-
#                                Compose-Datei, Router Host(beta) && /api,
#                                eigene .env (Beta-Supabase, siehe beta.env.example)
#   /usr/local/sbin/complihub-beta-api-{restart,health,logs} + sudoers-Eintrag
#                                fuer den Runner (deploy-beta.yml)
#
# Ohne --apply zeigt das Skript nur, was es schreiben wuerde (insbesondere die
# aus Staging abgeleitete API-Compose-Datei als diff) — die kennt das Repo nicht,
# deshalb erst ansehen, dann schreiben.
#
#   bash setup-beta.sh            # Probelauf
#   bash setup-beta.sh --apply    # schreibt, legt den ersten Tester-Zugang an
#
# Danach: .env ausfuellen, deploy-beta.yml einmal ausloesen (der erste Lauf
# erzeugt den API-Container), DNS-A-Record beta → VPS. Runbook:
# docs/runbooks/beta-deploy.md.
set -euo pipefail

APPLY=0; [ "${1:-}" = "--apply" ] && APPLY=1
HOST_NAME="beta.complihub360.com"
STAGING_HOST="staging.complihub360.com"
WEB_DIR=/docker/complihub-beta
API_DIR=/docker/complihub-beta-api
STAGING_API_DIR=/docker/complihub-api
RUNNER_USER=github-runner
API_CONTAINER=complihub-beta-api-api-1

log() { printf '\n\033[1m→ %s\033[0m\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die "Bitte als root ausfuehren."
[ -f "$STAGING_API_DIR/docker-compose.yml" ] || die "$STAGING_API_DIR/docker-compose.yml fehlt — Vorlage fuer die Beta-API."
command -v htpasswd >/dev/null || die "htpasswd fehlt (apt install apache2-utils)."
id "$RUNNER_USER" >/dev/null 2>&1 || die "Runner-Benutzer $RUNNER_USER fehlt (install-github-runner.sh)."

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# ─── 1. API-Compose aus Staging ableiten ─────────────────────────────────────
# Nur Host und Router-/Service-Namen werden ersetzt; Image, Ports, Volumes,
# env_file bleiben, wie Staging sie fuehrt (relative Pfade zeigen dann auf das
# Beta-Verzeichnis). Haben die Router keine eindeutigen Namen, sieht man das
# im diff — dann von Hand nachziehen, nicht blind schreiben.
log "API-Compose (abgeleitet aus $STAGING_API_DIR)"
sed -e "s/$STAGING_HOST/$HOST_NAME/g" \
    -e 's/routers\.complihub-api/routers.complihub-beta-api/g' \
    -e 's/services\.complihub-api/services.complihub-beta-api/g' \
    -e 's/service=complihub-api/service=complihub-beta-api/g' \
    "$STAGING_API_DIR/docker-compose.yml" > "$TMP/api-compose.yml"
diff -u "$STAGING_API_DIR/docker-compose.yml" "$TMP/api-compose.yml" || true
grep -q "$STAGING_HOST" "$TMP/api-compose.yml" && die "Abgeleitete Datei nennt noch $STAGING_HOST."
grep -q "$HOST_NAME" "$TMP/api-compose.yml" || die "Abgeleitete Datei nennt $HOST_NAME nicht — Router-Regel pruefen."

# ─── 2. Web-Compose ──────────────────────────────────────────────────────────
log "Web-Compose (nginx + eigene Wand)"
PW=$(openssl rand -base64 18)
HASH=$(htpasswd -nbB complihub "$PW" | sed 's/\$/$$/g')   # $ in compose verdoppeln
cat > "$TMP/web-compose.yml" <<YAML
services:
  web:
    image: nginx:1.27-alpine
    restart: unless-stopped
    volumes:
      - ./site:/usr/share/nginx/html:ro
      - /docker/complihub/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    labels:
      - traefik.enable=true
      - traefik.http.routers.complihub-beta.rule=Host(\`$HOST_NAME\`)
      - traefik.http.routers.complihub-beta.entrypoints=websecure
      - traefik.http.routers.complihub-beta.tls.certresolver=letsencrypt
      - traefik.http.routers.complihub-beta.middlewares=complihub-beta-auth,complihub-noindex
      - traefik.http.middlewares.complihub-beta-auth.basicauth.users=$HASH
      - traefik.http.services.complihub-beta.loadbalancer.server.port=80
YAML
sed 's/basicauth.users=.*/basicauth.users=<bcrypt complihub>/' "$TMP/web-compose.yml"

if [ "$APPLY" -ne 1 ]; then
  echo; echo "Probelauf — nichts geschrieben. Mit --apply ausfuehren."
  exit 0
fi

# ─── 3. Schreiben ────────────────────────────────────────────────────────────
log "Verzeichnisse"
mkdir -p "$WEB_DIR/site" "$API_DIR/app"
[ -f "$WEB_DIR/docker-compose.yml" ] && die "$WEB_DIR/docker-compose.yml existiert schon — Tester-Zugaenge mit scripts/beta-auth.sh verwalten, nicht neu einrichten."
cp "$TMP/web-compose.yml" "$WEB_DIR/docker-compose.yml"
cp "$TMP/api-compose.yml" "$API_DIR/docker-compose.yml"
[ -f "$WEB_DIR/site/index.html" ] || printf '<!doctype html><title>CompliHub360 Beta</title><p>Beta wird eingerichtet.</p>\n' > "$WEB_DIR/site/index.html"
for d in "$WEB_DIR/site" "$API_DIR/app"; do chown -R "$RUNNER_USER:$RUNNER_USER" "$d"; chmod -R a+rX "$d"; done
if [ ! -f "$API_DIR/.env" ]; then
  echo "  $API_DIR/.env fehlt — aus scripts/vps/beta.env.example anlegen (chmod 600), bevor die API startet."
fi

log "sudo-Wrapper fuer den Runner"
write_wrapper() {
  printf '#!/bin/sh\n# Von scripts/vps/setup-beta.sh erzeugt. Nicht von Hand aendern.\nset -eu\n%s\n' "$2" > "$1"
  chown root:root "$1"; chmod 0755 "$1"; echo "  $1"
}
# up -d legt den Container beim ersten Mal an; restart laedt das neue Bundle.
write_wrapper /usr/local/sbin/complihub-beta-api-restart \
  "cd $API_DIR && test -f .env && docker compose up -d api && exec docker compose restart api"
write_wrapper /usr/local/sbin/complihub-beta-api-health \
  "exec docker exec $API_CONTAINER wget -qO- --timeout=5 http://localhost:3005/health"
write_wrapper /usr/local/sbin/complihub-beta-api-logs \
  "exec docker logs --tail 30 $API_CONTAINER"
SUDOERS=/etc/sudoers.d/github-runner-beta
echo "$RUNNER_USER ALL=(root) NOPASSWD: /usr/local/sbin/complihub-beta-api-restart, /usr/local/sbin/complihub-beta-api-health, /usr/local/sbin/complihub-beta-api-logs" > "$SUDOERS.tmp"
visudo -c -f "$SUDOERS.tmp" >/dev/null || { rm -f "$SUDOERS.tmp"; die "sudoers-Eintrag ungueltig — nichts geaendert."; }
chmod 0440 "$SUDOERS.tmp"; mv "$SUDOERS.tmp" "$SUDOERS"

log "Site starten"
(cd "$WEB_DIR" && docker compose up -d 2>&1 | tail -1)

echo
echo "✓ Beta eingerichtet. Haupt-Zugang der Wand (einmalig angezeigt):"
echo "    complihub : $PW"
echo "  In den Passwort-Manager und als Repo-Secret BETA_VERIFY_AUTH (\"complihub:<passwort>\")."
echo "  Tester: scripts/beta-auth.sh add <name> (lokal, per SSH)."
