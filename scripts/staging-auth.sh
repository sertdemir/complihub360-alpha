#!/usr/bin/env bash
#
# Basic-Auth-Zugaenge fuer Staging + Preview verwalten.
#
# Beide Kanaele haengen an derselben Traefik-Middleware (complihub-auth), die als
# Container-Label im Staging-Compose-File definiert ist. Ein Eintrag hier gilt
# daher fuer https://staging.complihub360.com UND https://next.staging.complihub360.com.
#
#   ./scripts/staging-auth.sh list
#   ./scripts/staging-auth.sh add partner-acme      # legt an, gibt Passwort einmalig aus
#   ./scripts/staging-auth.sh remove partner-acme   # entzieht den Zugang sofort
#
# Das Passwort wird auf der VPS erzeugt und nie in ein Git-verwaltetes File
# geschrieben. Weitergabe an Partner ueber einen sicheren Kanal (Passwort-Manager,
# nicht per Mail-Klartext).
#
# Ueberschreibbar per Env: STAGING_SSH_HOST, STAGING_SSH_KEY, STAGING_COMPOSE_DIR,
# STAGING_VERIFY_URL.

set -euo pipefail

HOST="${STAGING_SSH_HOST:-root@76.13.159.221}"
SSH_KEY="${STAGING_SSH_KEY:-}"
COMPOSE_DIR="${STAGING_COMPOSE_DIR:-/docker/complihub}"
VERIFY_URL="${STAGING_VERIFY_URL:-https://staging.complihub360.com/build-info.json}"
LABEL_KEY='traefik.http.middlewares.complihub-auth.basicauth.users'

usage() {
  sed -n '/^# Basic-Auth/,/^# STAGING_VERIFY_URL\./p' "$0" | sed 's/^#\{1,2\} \{0,1\}//'
  exit "${1:-1}"
}

cmd="${1:-}"
user="${2:-}"

case "$cmd" in
  list) ;;
  add|remove)
    [ -n "$user" ] || { echo "Fehler: Benutzername fehlt." >&2; echo >&2; usage 1; }
    if ! printf '%s' "$user" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]{1,31}$'; then
      echo "Fehler: '$user' ist kein zulaessiger Benutzername (erlaubt: A-Z a-z 0-9 . _ -, 2-32 Zeichen)." >&2
      exit 1
    fi
    if [ "$cmd" = "remove" ] && [ "$user" = "complihub" ] && [ "${3:-}" != "--force" ]; then
      echo "Fehler: 'complihub' ist der Haupt-Account (steckt in .env.staging und in den Deploy-Scripts)." >&2
      echo "        Wenn du ihn wirklich entfernen willst: $0 remove complihub --force" >&2
      exit 1
    fi
    ;;
  -h|--help|help) usage 0 ;;
  *) usage 1 ;;
esac

ssh_args=(-o BatchMode=no)
[ -n "$SSH_KEY" ] && ssh_args+=(-i "$SSH_KEY")

ssh "${ssh_args[@]}" "$HOST" bash -s -- "$cmd" "$user" "$COMPOSE_DIR" "$LABEL_KEY" "$VERIFY_URL" <<'REMOTE_EOF'
set -euo pipefail

mode="$1"; user="$2"; dir="$3"; key="$4"; url="$5"
file="$dir/docker-compose.yml"

[ -f "$file" ] || { echo "compose-Datei nicht gefunden: $file" >&2; exit 1; }
grep -qF "$key=" "$file" || { echo "Label '$key' steht nicht in $file" >&2; exit 1; }

line=$(grep -m1 -F "$key=" "$file")
current="${line#*"$key="}"

if [ "$mode" = "list" ]; then
  echo "Zugaenge auf $file:"
  printf '%s\n' "$current" | tr ',' '\n' | sed 's/:.*//; s/^[[:space:]]*//; s/^/  - /'
  exit 0
fi

AWKPROG='
{
  p = index($0, key "=")
  if (p > 0) {
    prefix = substr($0, 1, p + length(key))
    val    = substr($0, p + length(key) + 1)
    n = split(val, parts, ",")
    out = ""
    for (i = 1; i <= n; i++) {
      c  = index(parts[i], ":")
      nm = (c > 0 ? substr(parts[i], 1, c - 1) : parts[i])
      sub(/^[ \t]+/, "", nm)
      if (nm == user) continue
      out = (out == "" ? parts[i] : out "," parts[i])
    }
    if (mode == "add") out = (out == "" ? add : out "," add)
    print prefix out
    next
  }
  print
}'

escaped=""
pw=""

if [ "$mode" = "add" ]; then
  pw=$(openssl rand -base64 18)
  if command -v htpasswd >/dev/null 2>&1; then
    hash=$(htpasswd -nbB "$user" "$pw" | cut -d: -f2-)
  else
    hash=$(openssl passwd -apr1 "$pw")
  fi
  entry="$user:$hash"
  # In compose-Files muss jedes $ verdoppelt werden, sonst frisst die
  # Variablen-Interpolation Teile des bcrypt-Hashes.
  escaped=${entry//\$/\$\$}
else
  printf '%s\n' "$current" | tr ',' '\n' | sed 's/:.*//; s/^[[:space:]]*//' | grep -qx "$user" || {
    echo "Hinweis: '$user' war gar nicht eingetragen — nichts zu tun."; exit 0; }
fi

backup="$file.bak.$(date +%Y%m%d-%H%M%S)"
cp -p "$file" "$backup"

tmp=$(mktemp)
awk -v key="$key" -v user="$user" -v mode="$mode" -v add="$escaped" "$AWKPROG" "$file" > "$tmp"
cat "$tmp" > "$file"
rm -f "$tmp"

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
( cd "$dir" && $DC up -d )

verify() {
  local u="$1" p="$2" want="$3" code i
  for i in 1 2 3 4 5; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -u "$u:$p" "$url" || true)
    [ "$code" = "$want" ] && { echo "$code"; return 0; }
    sleep 2
  done
  echo "$code"
}

echo
if [ "$mode" = "add" ]; then
  code=$(verify "$user" "$pw" 200)
  if [ "$code" = "200" ]; then
    echo "OK — Zugang aktiv (HTTP $code)."
  else
    echo "WARNUNG: Verifikation lieferte HTTP $code statt 200."
    echo "         Backup liegt unter $backup"
  fi
  echo
  echo "  URL       https://staging.complihub360.com"
  echo "            https://next.staging.complihub360.com   (Preview, gleicher Login)"
  echo "  Benutzer  $user"
  echo "  Passwort  $pw"
  echo
  echo "Das Passwort wird hier ein einziges Mal angezeigt — auf der VPS liegt nur der Hash."
else
  code=$(verify "$user" "egal-hauptsache-falsch" 401)
  echo "OK — '$user' entfernt (Login liefert jetzt HTTP $code)."
  echo "Backup: $backup"
fi
REMOTE_EOF
