#!/usr/bin/env bash
#
# Zugangslinks fuer die Beta-Wand: fuer Browser, die das Basic-Auth-Fenster nicht
# bedienen koennen (etwa ein Test-Agent im Browser). Runbook:
# docs/runbooks/beta-test-users.md, Abschnitt „Zugangslink“.
#
#   ./scripts/beta-pass.sh list
#   ./scripts/beta-pass.sh add halime       # legt den Link an, gibt ihn einmalig aus
#   ./scripts/beta-pass.sh remove halime    # entzieht ihn sofort
#
# Wie es wirkt: Der Link https://beta.complihub360.com/__zugang/<token> setzt ein
# Cookie (HttpOnly, Secure, 30 Tage) und leitet auf /de weiter. Anfragen mit
# diesem Cookie nimmt ein eigener Traefik-Router an, ohne Basic Auth. Alles
# andere bleibt hinter der Wand; /api bleibt beim API-Router. Je Name ein Token,
# einzeln entziehbar. Das Token steht im Klartext in den Container-Labels auf
# der VPS (nur root), nie im Repo.
#
# Nach jeder Aenderung prueft das Skript auf der VPS: ohne Cookie 401, mit
# Cookie 200, Link setzt das Cookie, /api antwortet weiter mit JSON. Scheitert
# eine Pruefung, stellt es die vorige Compose-Datei wieder her.
#
# Ueberschreibbar per Env: STAGING_SSH_HOST, STAGING_SSH_KEY.

set -euo pipefail

HOST="${STAGING_SSH_HOST:-root@76.13.159.221}"
SSH_KEY="${STAGING_SSH_KEY:-}"
COMPOSE_DIR=/docker/complihub-beta
SITE_HOST=beta.complihub360.com

usage() {
  sed -n '/^# Zugangslinks/,/^# Ueberschreibbar/p' "$0" | sed 's/^#\{1,2\} \{0,1\}//'
  exit "${1:-1}"
}

cmd="${1:-}"
name="${2:-}"

case "$cmd" in
  list) ;;
  add|remove)
    printf '%s' "$name" | grep -Eq '^[a-z][a-z0-9-]{1,19}$' || {
      echo "Fehler: '$name' ist kein zulaessiger Name (a-z 0-9 -, 2-20 Zeichen, beginnt mit Buchstabe)." >&2
      exit 1
    }
    ;;
  -h|--help|help) usage 0 ;;
  *) usage 1 ;;
esac

ssh_args=(-o BatchMode=no)
[ -n "$SSH_KEY" ] && ssh_args+=(-i "$SSH_KEY")

# Leeres Argument faellt bei ssh weg (siehe staging-auth.sh), darum ein Platzhalter.
ssh "${ssh_args[@]}" "$HOST" bash -s -- "$cmd" "${name:--}" "$COMPOSE_DIR" "$SITE_HOST" <<'REMOTE_EOF'
set -euo pipefail

mode="$1"; name="$2"; dir="$3"; host="$4"
file="$dir/docker-compose.yml"
anchor="traefik.http.services.complihub-beta.loadbalancer.server.port="
begin="# beta-pass $name begin"
end="# beta-pass $name end"

[ -f "$file" ] || { echo "compose-Datei nicht gefunden: $file" >&2; exit 1; }
grep -qF "$anchor" "$file" || { echo "Anker '$anchor' steht nicht in $file" >&2; exit 1; }

if [ "$mode" = "list" ]; then
  echo "Zugangslinks auf $file:"
  sed -n 's/^[[:space:]]*# beta-pass \([a-z0-9-]*\) begin$/  - \1/p' "$file"
  exit 0
fi

has_block() { grep -qF "$begin" "$file"; }
if [ "$mode" = "remove" ] && ! has_block; then
  echo "Hinweis: Fuer '$name' gibt es keinen Zugangslink — nichts zu tun."; exit 0
fi

# Traefik 3 heisst die Regel HeaderRegexp, Traefik 2 HeadersRegexp.
ctr=$(docker ps --format '{{.Names}} {{.Image}}' | awk '$2 ~ /traefik/ {print $1; exit}')
[ -n "$ctr" ] || { echo "Kein laufender Traefik-Container gefunden." >&2; exit 1; }
major=$(docker exec "$ctr" traefik version 2>/dev/null | awk '/^Version:/ {print $2}' | cut -d. -f1 | tr -d 'v')
case "$major" in
  3) hfn=HeaderRegexp ;;
  2) hfn=HeadersRegexp ;;
  *) echo "Traefik-Version nicht erkannt ('$major')." >&2; exit 1 ;;
esac

token=""
if [ "$mode" = "add" ]; then
  token=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n')
fi

# Bisheriges Token dieses Namens, damit remove (und ein erneutes add) pruefen
# kann, dass es danach nicht mehr durchkommt.
oldtok=$(awk -v b="$begin" -v e="$end" 'index($0, b) {on = 1} on {print} on && index($0, e) {exit}' "$file" \
  | grep -o 'ch_beta_pass=[A-Za-z0-9_-]*' | head -1 | cut -d= -f2 || true)

backup="$file.bak.$(date +%Y%m%d-%H%M%S)"
cp -p "$file" "$backup"

# Vorhandenen Block dieses Namens entfernen (add ersetzt, remove loescht).
tmp=$(mktemp)
awk -v b="$begin" -v e="$end" '
  index($0, b) { skip = 1; next }
  skip && index($0, e) { skip = 0; next }
  !skip { print }
' "$file" > "$tmp"

if [ "$mode" = "add" ]; then
  r="complihub-beta-pass-$name"
  hq=$(printf '%s' "$host" | sed 's/\./\\./g')   # Punkte fuer die Regex escapen
  block=$(cat <<BLOCK
# beta-pass $name begin
- traefik.http.routers.$r.rule=Host(\`$host\`) && !PathPrefix(\`/api\`) && $hfn(\`Cookie\`, \`ch_beta_pass=$token\`)
- traefik.http.routers.$r.entrypoints=websecure
- traefik.http.routers.$r.tls.certresolver=letsencrypt
- traefik.http.routers.$r.middlewares=complihub-noindex
- traefik.http.routers.$r.service=complihub-beta
- traefik.http.routers.$r-set.rule=Host(\`$host\`) && Path(\`/__zugang/$token\`)
- traefik.http.routers.$r-set.entrypoints=websecure
- traefik.http.routers.$r-set.tls.certresolver=letsencrypt
- traefik.http.routers.$r-set.middlewares=complihub-noindex,$r-cookie,$r-go
- traefik.http.routers.$r-set.service=complihub-beta
- traefik.http.middlewares.$r-cookie.headers.customresponseheaders.Set-Cookie=ch_beta_pass=$token; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax
- traefik.http.middlewares.$r-go.redirectregex.regex=^https://$hq/__zugang/.*
- traefik.http.middlewares.$r-go.redirectregex.replacement=https://$host/de
# beta-pass $name end
BLOCK
)
  # Block direkt nach der Service-Zeile einfuegen, mit deren Einrueckung.
  tmp2=$(mktemp)
  BLOCK="$block" awk -v a="$anchor" '
    { print }
    index($0, a) {
      match($0, /^[ \t]*/); ind = substr($0, 1, RLENGTH)
      n = split(ENVIRON["BLOCK"], L, "\n")
      for (i = 1; i <= n; i++) print ind L[i]
    }
  ' "$tmp" > "$tmp2"
  mv "$tmp2" "$tmp"
fi
cat "$tmp" > "$file"; rm -f "$tmp"

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
( cd "$dir" && $DC up -d >/dev/null 2>&1 )

code() { curl -s -o /dev/null -w '%{http_code}' "$@" || true; }
check() { # $1 erwartet, Rest curl-Argumente; wartet bis zu 20 s auf Traefik
  local want="$1" got i; shift
  for i in 1 2 3 4 5 6 7 8 9 10; do
    got=$(code "$@"); [ "$got" = "$want" ] && return 0; sleep 2
  done
  echo "  ✗ erwartet $want, bekommen $got: $*" >&2; return 1
}
rollback() {
  cat "$backup" > "$file"; ( cd "$dir" && $DC up -d >/dev/null 2>&1 )
  echo "Pruefung fehlgeschlagen — vorige Compose-Datei wiederhergestellt ($backup)." >&2
  exit 1
}

base="https://$host"
ok=1
check 401 "$base/build-info.json" || ok=0
[ -n "$oldtok" ] && { check 401 --cookie "ch_beta_pass=$oldtok" "$base/build-info.json" || ok=0; }
if [ "$mode" = "add" ]; then
  check 200 --cookie "ch_beta_pass=$token" "$base/build-info.json" || ok=0
  check 401 --cookie "ch_beta_pass=falsch-$token" "$base/build-info.json" || ok=0
  hdr=$(curl -s -o /dev/null -D - "$base/__zugang/$token" || true)
  printf '%s' "$hdr" | grep -qiE '^set-cookie: ch_beta_pass=' || { echo "  ✗ Link setzt kein Cookie" >&2; ok=0; }
  printf '%s' "$hdr" | grep -qiE "^location: https://$host/de" || { echo "  ✗ Link leitet nicht auf /de weiter" >&2; ok=0; }
  ct=$(curl -s -o /dev/null -w '%{content_type}' --cookie "ch_beta_pass=$token" "$base/api/v1/acknowledgement" || true)
  case "$ct" in application/json*) ;; *) echo "  ✗ /api liefert '$ct' statt JSON — Router-Reihenfolge pruefen" >&2; ok=0 ;; esac
fi
[ "$ok" = 1 ] || rollback

echo
if [ "$mode" = "add" ]; then
  echo "OK — Zugangslink aktiv (Traefik $major, ohne Cookie 401, mit Cookie 200, /api unberuehrt)."
  echo
  echo "  Link   $base/__zugang/$token"
  echo
  echo "Der Link wird hier ein einziges Mal angezeigt. In den Passwort-Manager, nicht in den Chat."
  echo "Wer ihn oeffnet, ist 30 Tage durch die Wand. Entziehen: ./scripts/beta-pass.sh remove $name"
else
  echo "OK — Zugangslink '$name' entfernt (ohne Basic Auth wieder 401)."
fi
echo "Backup: $backup"
REMOTE_EOF
