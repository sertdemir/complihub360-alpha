#!/usr/bin/env bash
# ─── GitHub-Actions-Runner auf dem Staging-VPS einrichten ────────────────────
# Ersetzt die SSH-Strecke von GitHub zum VPS durch das Gegenteil: der Runner
# laeuft hier und HOLT sich die Jobs ueber ausgehendes HTTPS. Damit gibt es
# keine eingehende Verbindung mehr, die timeouten kann — 4 von 31 Deploys sind
# genau daran gescheitert, bei nachweislich gesundem Server.
#
# Einmal als root auf 76.13.159.221 ausfuehren, idempotent:
#
#   RUNNER_TOKEN=AXXXX... bash install-github-runner.sh
#
# Das Token kommt aus GitHub → Settings → Actions → Runners → "New self-hosted
# runner" (Linux/x64). Es ist ~60 Minuten gueltig und wird nur zum Registrieren
# gebraucht; danach haelt der Runner eigene Credentials in .credentials.
#
# VORHER lesen: docs/ops/self-hosted-runner.md. Dieses Repository ist
# oeffentlich, und darauf beruht ein Teil des Zuschnitts hier:
#   • Der Runner-Benutzer ist NICHT root und NICHT in der docker-Gruppe
#     (Mitgliedschaft dort ist root-aequivalent).
#   • Er darf genau drei root-eigene Wrapper per sudo aufrufen, ohne Argumente.
#   • Die Deploy-Jobs fuehren keinen Repository-Code aus; sie laden ein
#     Artefakt und kopieren es. Gehalten von scripts/check-workflow-runners.mjs.
set -euo pipefail

REPO_URL="https://github.com/sertdemir/complihub360-alpha"
RUNNER_USER="github-runner"
RUNNER_HOME="/opt/github-runner"
RUNNER_NAME="${RUNNER_NAME:-complihub-staging}"
RUNNER_LABELS="${RUNNER_LABELS:-complihub-staging}"

SITE_DIR="/docker/complihub/site"
API_APP_DIR="/docker/complihub-api/app"
API_COMPOSE_DIR="/docker/complihub-api"
API_CONTAINER="complihub-api-api-1"

# Leer => neueste Version von der GitHub-API. Nach dem ersten Lauf die unten
# ausgegebene Kombination hier eintragen, dann wird die Pruefsumme erzwungen.
RUNNER_VERSION="${RUNNER_VERSION:-}"
RUNNER_SHA256="${RUNNER_SHA256:-}"

log() { printf '\n\033[1m→ %s\033[0m\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Bitte als root ausfuehren."
[ -n "${RUNNER_TOKEN:-}" ] || die "RUNNER_TOKEN fehlt (GitHub → Settings → Actions → Runners → New self-hosted runner)."

# ─── 1. Pakete ───────────────────────────────────────────────────────────────
# rsync braucht der UI-Job, curl/tar den Download hier, sudo die Wrapper.
log "Pakete pruefen"
missing=()
for p in curl tar rsync sudo; do command -v "$p" >/dev/null || missing+=("$p"); done
if [ ${#missing[@]} -gt 0 ]; then
  apt-get update -qq && apt-get install -y --no-install-recommends "${missing[@]}"
fi
command -v docker >/dev/null || die "docker nicht gefunden — die API-Wrapper brauchen es."

# ─── 2. Benutzer ─────────────────────────────────────────────────────────────
log "Benutzer $RUNNER_USER"
if id "$RUNNER_USER" >/dev/null 2>&1; then
  echo "  existiert bereits"
else
  # Kein Login-Shell: systemd startet das Binary direkt, eine Shell braucht
  # dieser Benutzer nie. Wer den Runner von Hand bedienen will, nimmt
  # `sudo -u github-runner bash`.
  useradd --system --create-home --home-dir "$RUNNER_HOME" \
          --shell /usr/sbin/nologin "$RUNNER_USER"
  echo "  angelegt"
fi

# ─── 3. Schreibrechte auf die beiden Ziele ───────────────────────────────────
# Der Runner schreibt ausschliesslich hierhin. Alles andere auf dem Server
# bleibt fuer ihn unerreichbar.
log "Schreibrechte"
for d in "$SITE_DIR" "$API_APP_DIR"; do
  [ -d "$d" ] || die "$d existiert nicht — stimmt der Pfad noch?"
  chown -R "$RUNNER_USER:$RUNNER_USER" "$d"
  # nginx im Container liest als eigene uid; a+rX haelt das offen.
  chmod -R a+rX "$d"
  echo "  $d → $RUNNER_USER"
done

# ─── 4. Die drei sudo-Wrapper ────────────────────────────────────────────────
# Warum Wrapper und nicht `sudo docker ...`: die docker-Gruppe (und ein sudo-
# Recht auf das docker-Binary) ist gleichbedeutend mit root — `docker run -v /:/
# host` genuegt. Feste, root-eigene Skripte ohne Argumente lassen dem Aufrufer
# keinen Spielraum.
log "sudo-Wrapper"
write_wrapper() {
  local path="$1"; shift
  printf '#!/bin/sh\n# Von scripts/vps/install-github-runner.sh erzeugt. Nicht von Hand aendern.\nset -eu\n%s\n' "$*" > "$path"
  chown root:root "$path"
  chmod 0755 "$path"
  echo "  $path"
}
write_wrapper /usr/local/sbin/complihub-api-restart \
  "cd $API_COMPOSE_DIR && exec docker compose restart api"
write_wrapper /usr/local/sbin/complihub-api-health \
  "exec docker exec $API_CONTAINER wget -qO- --timeout=5 http://localhost:3005/health"
write_wrapper /usr/local/sbin/complihub-api-logs \
  "exec docker logs --tail 30 $API_CONTAINER"

SUDOERS=/etc/sudoers.d/github-runner
cat > "$SUDOERS.tmp" <<EOF
# Von scripts/vps/install-github-runner.sh erzeugt.
# Genau diese drei Kommandos, ohne Argumente, ohne Passwort. Sonst nichts.
$RUNNER_USER ALL=(root) NOPASSWD: /usr/local/sbin/complihub-api-restart, /usr/local/sbin/complihub-api-health, /usr/local/sbin/complihub-api-logs
EOF
chmod 0440 "$SUDOERS.tmp"
# visudo -c vor dem Verschieben: eine kaputte sudoers-Datei sperrt den Server.
visudo -c -f "$SUDOERS.tmp" >/dev/null || { rm -f "$SUDOERS.tmp"; die "sudoers-Eintrag ist ungueltig — nichts geaendert."; }
mv "$SUDOERS.tmp" "$SUDOERS"
echo "  $SUDOERS"

# ─── 5. Runner herunterladen ─────────────────────────────────────────────────
log "Runner-Paket"
if [ -z "$RUNNER_VERSION" ]; then
  RUNNER_VERSION=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
    | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p' | head -1)
  [ -n "$RUNNER_VERSION" ] || die "Konnte die aktuelle Runner-Version nicht ermitteln."
  echo "  neueste Version: $RUNNER_VERSION"
fi
TARBALL="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
curl -fsSL -o "$TMP/$TARBALL" \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${TARBALL}"

ACTUAL=$(sha256sum "$TMP/$TARBALL" | cut -d' ' -f1)
if [ -n "$RUNNER_SHA256" ]; then
  [ "$ACTUAL" = "$RUNNER_SHA256" ] || die "Pruefsumme weicht ab: $ACTUAL statt $RUNNER_SHA256"
  echo "  Pruefsumme ok"
else
  echo "  ⚠ keine Pruefsumme gesetzt — Vertrauensanker ist nur TLS zu github.com."
  echo "    Zum Festnageln beim naechsten Mal:"
  echo "      RUNNER_VERSION=$RUNNER_VERSION RUNNER_SHA256=$ACTUAL"
fi

mkdir -p "$RUNNER_HOME"
tar xzf "$TMP/$TARBALL" -C "$RUNNER_HOME"
chown -R "$RUNNER_USER:$RUNNER_USER" "$RUNNER_HOME"
# Systembibliotheken des Runners (libicu &c.); auf einem fertigen Host ein No-op.
"$RUNNER_HOME/bin/installdependencies.sh" >/dev/null 2>&1 || \
  echo "  ⚠ installdependencies.sh meldete einen Fehler — weiter, meist schon vorhanden."

# ─── 6. Registrieren ─────────────────────────────────────────────────────────
log "Registrieren als '$RUNNER_NAME'"
# --replace: ein zweiter Lauf uebernimmt den bestehenden Eintrag, statt einen
# zweiten Runner gleichen Namens zu hinterlassen.
sudo -u "$RUNNER_USER" env HOME="$RUNNER_HOME" \
  "$RUNNER_HOME/config.sh" \
    --url "$REPO_URL" \
    --token "$RUNNER_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS" \
    --work _work \
    --unattended --replace

# ─── 7. systemd ──────────────────────────────────────────────────────────────
log "systemd-Dienst"
(cd "$RUNNER_HOME" && ./svc.sh install "$RUNNER_USER" >/dev/null)
SVC=$(systemctl list-unit-files --no-legend 'actions.runner.*' | awk '{print $1}' | head -1)
[ -n "$SVC" ] || die "Der systemd-Dienst wurde nicht angelegt."

# Zwei Eigenschaften, auf die sich der Deploy verlaesst, explizit festschreiben
# statt sie der Vorlage zu glauben: nach einem Reboot muss der Runner wieder
# hochkommen, und er darf nicht vor Docker starten — der Health-Check der API
# braucht es in der ersten Sekunde.
mkdir -p "/etc/systemd/system/${SVC}.d"
cat > "/etc/systemd/system/${SVC}.d/override.conf" <<'EOF'
[Unit]
After=network-online.target docker.service
Wants=network-online.target

[Service]
Restart=always
RestartSec=10
EOF
systemctl daemon-reload
systemctl enable "$SVC" >/dev/null 2>&1 || true
systemctl restart "$SVC"
sleep 3
systemctl is-active --quiet "$SVC" || { systemctl status "$SVC" --no-pager -l; die "Dienst laeuft nicht."; }
echo "  $SVC laeuft"

# ─── 8. Selbsttest ───────────────────────────────────────────────────────────
log "Selbsttest"
sudo -u "$RUNNER_USER" sudo -n /usr/local/sbin/complihub-api-health >/dev/null 2>&1 \
  && echo "  ✓ Health-Wrapper per sudo erreichbar" \
  || echo "  ⚠ Health-Wrapper antwortet nicht — laeuft der API-Container ($API_CONTAINER)?"
sudo -u "$RUNNER_USER" test -w "$SITE_DIR" \
  && echo "  ✓ $SITE_DIR beschreibbar" || echo "  ⚠ $SITE_DIR NICHT beschreibbar"
sudo -u "$RUNNER_USER" test -w "$API_APP_DIR" \
  && echo "  ✓ $API_APP_DIR beschreibbar" || echo "  ⚠ $API_APP_DIR NICHT beschreibbar"

cat <<EOF

Fertig. Der Runner sollte jetzt unter
  $REPO_URL/settings/actions/runners
als "$RUNNER_NAME" mit dem Label "$RUNNER_LABELS" und Status "Idle" stehen.

Naechster Schritt: "Deploy Staging" von Hand ausloesen (Actions → Deploy
Staging → Run workflow) und zusehen, ob deploy-api und deploy-ui hier landen.

Dienst:   systemctl status $SVC
Logbuch:  journalctl -u $SVC -f
Entfernen: cd $RUNNER_HOME && ./svc.sh uninstall && sudo -u $RUNNER_USER ./config.sh remove --token <neues Token>
EOF
