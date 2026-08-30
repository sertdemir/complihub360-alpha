#!/usr/bin/env bash
#
# Die Basic-Auth-Wand vor Staging an- oder abschalten.
#
# WAS DIE WAND IST: die Traefik-Middleware `complihub-auth`, referenziert in den
# Router-Labels des Service `web` in /docker/complihub/docker-compose.yml. Sie
# liegt vor der ausgelieferten Seite — vor NICHTS SONST.
#
# BEFUND 2026-08-30, festgehalten, weil vorher das Gegenteil behauptet wurde:
# die API haengt NICHT hinter dieser Wand. Ihr Router lebt in einem eigenen
# Stack (/docker/complihub-api) mit der Regel
#     Host(`staging.complihub360.com`) && PathPrefix(`/api`)
# und traegt als Middleware ausschliesslich `complihub-noindex`. Traefik waehlt
# bei konkurrierenden Regeln die spezifischere, also gewinnt dieser Router fuer
# alles unter /api. Geschuetzt ist die API durch ihren eigenen Riegel in
# services/compliance-api/src/index.ts (Supabase-JWT oder Server-Key, mit einer
# kurzen Liste oeffentlicher Routen ab PUBLIC_ROUTES).
#
# Ein Vorgaengerskript dieser Datei nahm an, die Wand liege auch vor /api, und
# begruendete damit sowohl sich selbst als auch den Polling-Workaround bei den
# Stripe-Rechnungen. Beides war falsch.
#
# `complihub-noindex` bleibt in jedem Fall stehen: Suchmaschinen haelt dieser
# Header fern, nicht die Wand.
#
#   ./scripts/staging-wall.sh check          # nur ansehen, aendert nichts
#   ./scripts/staging-wall.sh off            # Wand abnehmen
#   ./scripts/staging-wall.sh off web        # anderer Service-Name
#   ./scripts/staging-wall.sh on             # letzte Sicherung zurueckspielen
#
# Ueberschreibbar per Env: STAGING_SSH_HOST, STAGING_SSH_KEY,
# STAGING_COMPOSE_DIR, STAGING_VERIFY_HOST.
#
# Schwester-Skript: scripts/staging-auth.sh verwaltet die Zugaenge derselben
# Middleware, solange sie haengt.

set -euo pipefail

HOST="${STAGING_SSH_HOST:-root@76.13.159.221}"
SSH_KEY="${STAGING_SSH_KEY:-}"
COMPOSE_DIR="${STAGING_COMPOSE_DIR:-/docker/complihub}"
VERIFY_HOST="${STAGING_VERIFY_HOST:-https://staging.complihub360.com}"
MIDDLEWARE='complihub-auth'

usage() {
  sed -n '/^# Die Basic-Auth-Wand/,/^# Middleware, solange sie haengt\./p' "$0" | sed 's/^#\{1,2\} \{0,1\}//'
  exit "${1:-1}"
}

cmd="${1:-}"
service="${2:-web}"

case "$cmd" in
  check|off|on) ;;
  -h|--help|help) usage 0 ;;
  *) usage 1 ;;
esac

ssh_args=(-o BatchMode=no)
[ -n "$SSH_KEY" ] && ssh_args+=(-i "$SSH_KEY")

ssh "${ssh_args[@]}" "$HOST" bash -s -- \
  "$cmd" "$service" "$COMPOSE_DIR" "$MIDDLEWARE" "$VERIFY_HOST" <<'REMOTE_EOF'
set -euo pipefail

mode="$1"; service="$2"; dir="$3"; mw="$4"; verify_host="$5"
file="$dir/docker-compose.yml"

[ -f "$file" ] || { echo "compose-Datei nicht gefunden: $file" >&2; exit 1; }
cd "$dir"

# ── on: letzte Sicherung zurueck ──────────────────────────────────────────
if [ "$mode" = "on" ]; then
  newest=$(ls -1t "$file".bak.* 2>/dev/null | head -1 || true)
  [ -n "$newest" ] || { echo "Keine Sicherung gefunden." >&2; exit 1; }
  cp "$newest" "$file"
  echo "Zurueckgespielt: $newest"
  docker compose config -q
  docker compose up -d
  exit 0
fi

# ── Welche Router tragen die Middleware? ──────────────────────────────────
# awk statt grep, weil die Zuordnung Service -> Label die Einrueckung
# braucht: ein Label gehoert dem Service, unter dem es steht.
report() {
  awk -v mw="$mw" '
    /^  [A-Za-z0-9_.-]+:[[:space:]]*$/ { svc = $1; sub(/:$/, "", svc); next }
    /traefik\.http\.routers\..*\.rule/        { printf "  [%s] REGEL       %s\n", svc, $0 }
    /traefik\.http\.routers\..*\.middlewares/ { printf "  [%s] MIDDLEWARE  %s\n", svc, $0 }
  ' "$file"
}

echo "Traefik-Labels in $file:"
report
echo

if [ "$mode" = "check" ]; then
  echo "Nichts geaendert. Wenn oben beim Service \"$service\" eine MIDDLEWARE-Zeile"
  echo "mit \"$mw\" steht, nimmt \"off\" genau die heraus."
  exit 0
fi

# ── off ───────────────────────────────────────────────────────────────────
grep -q "^  ${service}:[[:space:]]*$" "$file" || {
  echo "Service \"$service\" steht nicht in $file — siehe die Liste oben." >&2
  echo "Aufruf mit abweichendem Namen: staging-wall.sh off <service>" >&2
  exit 1
}

backup="$file.bak.$(date +%F-%H%M%S)"
cp "$file" "$backup"
echo "Sicherung: $backup"

tmp=$(mktemp)
awk -v mw="$mw" -v target="$service" '
  function strip(s,   out, n, i, parts, keep) {
    # Wert hinter "middlewares=" um die eine Middleware kuerzen, die anderen
    # bleiben stehen. Traefik erlaubt "name" und "name@docker".
    n = split(s, parts, ",")
    out = ""
    for (i = 1; i <= n; i++) {
      keep = parts[i]
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", keep)
      if (keep == mw || keep == mw "@docker") continue
      out = (out == "" ? keep : out "," keep)
    }
    return out
  }
  /^  [A-Za-z0-9_.-]+:[[:space:]]*$/ { svc = $1; sub(/:$/, "", svc) }
  {
    if (svc == target && $0 ~ /traefik\.http\.routers\..*\.middlewares=/) {
      head = $0; sub(/middlewares=.*/, "middlewares=", head)
      val  = $0; sub(/.*middlewares=/, "", val)
      # Ein etwaiges schliessendes Anfuehrungszeichen mitnehmen und danach
      # wieder anhaengen, sonst zerlegt es der Komma-Split.
      q = ""
      if (val ~ /"[[:space:]]*$/) { q = "\""; sub(/"[[:space:]]*$/, "", val) }
      rest = strip(val)
      if (rest == "") { changed++; next }        # war die einzige -> Zeile faellt weg
      if (rest != val) changed++
      print head rest q
      next
    }
    print
  }
  END { if (changed+0 == 0) exit 3 }
' "$file" > "$tmp" || {
  rc=$?
  rm -f "$tmp"
  if [ "$rc" = 3 ]; then
    echo "Nichts zu tun: beim Service \"$service\" haengt \"$mw\" nicht dran."
    exit 0
  fi
  echo "awk ist gescheitert (Code $rc) — Datei unveraendert." >&2
  exit "$rc"
}

mv "$tmp" "$file"
echo "Geaendert. Unterschied:"
diff -u "$backup" "$file" || true
echo

docker compose config -q || {
  echo "compose-Syntax kaputt — spiele die Sicherung zurueck." >&2
  cp "$backup" "$file"
  exit 1
}

# up -d, NICHT restart: Labels liest Docker nur bei der Container-Erzeugung.
# Genau diese Falle steht in docs/runbooks/preview-deploy.md.
docker compose up -d
echo

# ── Verifizieren ──────────────────────────────────────────────────────────
sleep 3
echo "Pruefe von der Box aus:"
site_hdr=$(curl -sS -o /dev/null -D - --max-time 15 "$verify_host/" || true)

if printf '%s' "$site_hdr" | grep -qi '^www-authenticate:'; then
  echo "  ✗ Die Seite verlangt weiterhin eine Anmeldung:"
  printf '%s\n' "$site_hdr" | grep -i '^HTTP/\|^www-authenticate:' | sed 's/^/      /'
  echo "    Der Router traegt die Middleware offenbar unter einem anderen"
  echo "    Service. Siehe die Liste oben, dann: off <service>."
else
  echo "  ✓ Seite ohne Basic-Auth-Aufforderung"
  printf '%s\n' "$site_hdr" | grep -i '^HTTP/' | sed 's/^/      /'
fi

if printf '%s' "$site_hdr" | grep -qi '^x-robots-tag:.*noindex'; then
  echo "  ✓ noindex steht weiterhin"
else
  echo "  ✗ ACHTUNG: kein noindex mehr — Staging waere indexierbar:"
  echo "      ./scripts/staging-wall.sh on"
fi
REMOTE_EOF
