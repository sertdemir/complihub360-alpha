#!/usr/bin/env bash
# ─── Test-Nutzerkonten in der Beta anlegen oder entfernen (auf dem VPS) ──────
#
# Fuer Testlaeufe, in denen niemand eine Bestaetigungsmail anklicken kann,
# etwa ein Test-Agent im Browser (Runbook docs/runbooks/beta-test-users.md).
# Legt normale Nutzerkonten an: Mail bereits bestaetigt, Passwort-Login, keine
# Rolle. Adressen <lokal>+<label>-uNN@<domain>, alle Mails landen also im
# Postfach von SEED_EMAIL.
#
#   bash seed-test-users.sh halime 3            # Probelauf: zeigt die Adressen, schreibt nichts
#   bash seed-test-users.sh halime 3 --apply    # anlegen (fragt das Passwort verdeckt ab)
#   bash seed-test-users.sh halime --remove     # alle Konten dieses Labels entfernen
#
# Markiert werden die Konten in app_metadata.test_label. Darueber findet
# --remove sie wieder, nie ueber die Adresse allein. Ein zweiter --apply legt
# nichts doppelt an. Schluessel kommen aus der BETA-Env, nie als Argument;
# Staging wird abgewiesen.
set -euo pipefail

ENV_FILE=${SEED_ENV_FILE:-/docker/complihub-beta-api/.env}
STAGING_REF=kqylqwogxbiwpnomkzsn
SEED_EMAIL=${SEED_EMAIL:-demet@complihub360.com}

LABEL=${1:-}
[[ "$LABEL" =~ ^[a-z][a-z0-9-]{1,19}$ ]] || {
  echo "Aufruf: bash seed-test-users.sh <label> [anzahl] [--apply | --remove]" >&2
  echo "        <label>: Kleinbuchstaben, Ziffern, Bindestrich (z. B. halime)" >&2
  exit 2
}
shift
COUNT=3
if [[ "${1:-}" =~ ^[0-9]+$ ]]; then COUNT=$1; shift; fi
(( COUNT >= 1 && COUNT <= 10 )) || { echo "✗ Anzahl 1 bis 10" >&2; exit 2; }
MODE=${1:-dry}

[ -f "$ENV_FILE" ] || { echo "✗ $ENV_FILE fehlt" >&2; exit 1; }
k() { grep "^$1=" "$ENV_FILE" | cut -d= -f2-; }
URL=$(k SUPABASE_URL); URL=${URL%/}
REF=$(printf '%s' "$URL" | sed -E 's#^https://([a-z0-9]+)\.supabase\.co$#\1#')
[ -n "$REF" ] && [ "$REF" != "$URL" ] || { echo "✗ SUPABASE_URL in $ENV_FILE unerwartet: $URL" >&2; exit 1; }
[ "$REF" != "$STAGING_REF" ] || { echo "✗ Das ist Staging. Dieses Skript laeuft nur gegen die Beta." >&2; exit 1; }

LOCAL=${SEED_EMAIL%@*}; DOMAIN=${SEED_EMAIL#*@}
email() { printf '%s+%s-u%02d@%s' "$LOCAL" "$LABEL" "$1" "$DOMAIN"; }

# Service-Key nur ueber eine Kopf-Datei (600), nie in der Prozessliste.
HDR=$(mktemp); chmod 600 "$HDR"; trap 'rm -f "$HDR"' EXIT
KEY=$(k SUPABASE_SERVICE_ROLE_KEY)
[ -n "$KEY" ] || { echo "✗ SUPABASE_SERVICE_ROLE_KEY fehlt in $ENV_FILE" >&2; exit 1; }
printf 'apikey: %s\nAuthorization: Bearer %s\nContent-Type: application/json\n' "$KEY" "$KEY" > "$HDR"
unset KEY

api() { # $1 Methode, $2 Pfad, Body (optional) auf stdin; gibt "<code>\n<body>" aus
  local body code
  if [ "$1" = POST ]; then
    body=$(curl -sS --max-time 30 -w '\n%{http_code}' -X POST -H @"$HDR" --data-binary @- "$URL$2")
  else
    body=$(curl -sS --max-time 30 -w '\n%{http_code}' -X "$1" -H @"$HDR" "$URL$2")
  fi
  code=${body##*$'\n'}
  printf '%s\n%s' "$code" "${body%$'\n'*}"
}

echo "Projekt $REF · Label $LABEL"

case "$MODE" in
  dry)
    for i in $(seq 1 "$COUNT"); do echo "  würde anlegen: $(email "$i")"; done
    echo "Probelauf, nichts geschrieben. Anlegen mit --apply."
    ;;

  --apply)
    read -rsp "Passwort fuer die $COUNT Testkonten (min. 16 Zeichen): " PW; echo
    read -rsp "Noch einmal: " PW2; echo
    [ "$PW" = "$PW2" ] || { echo "✗ Passwoerter unterschiedlich" >&2; exit 1; }
    [ ${#PW} -ge 16 ] || { echo "✗ Passwort kuerzer als 16 Zeichen" >&2; exit 1; }
    export PW LABEL
    for i in $(seq 1 "$COUNT"); do
      addr=$(email "$i")
      # Das Passwort geht per Umgebung an python und per stdin an curl, nie als Argument.
      res=$(ADDR="$addr" NN=$(printf '%02d' "$i") python3 -c '
import json, os
print(json.dumps({
  "email": os.environ["ADDR"], "password": os.environ["PW"], "email_confirm": True,
  "app_metadata": {"test_label": os.environ["LABEL"]},
  "user_metadata": {"full_name": os.environ["LABEL"].capitalize() + " Test U" + os.environ["NN"], "test_account": True},
}))' | api POST /auth/v1/admin/users)
      code=${res%%$'\n'*}
      case "$code" in
        200|201) echo "  ✓ angelegt: $addr" ;;
        422)     echo "  · vorhanden, übersprungen: $addr" ;;
        *)       echo "  ✗ $addr: HTTP $code ${res#*$'\n'}" >&2; exit 1 ;;
      esac
    done
    unset PW PW2
    echo "Fertig. Login über beta.complihub360.com mit Adresse und Passwort."
    ;;

  --remove)
    ids=$(for page in 1 2 3 4 5; do
      api GET "/auth/v1/admin/users?page=$page&per_page=200" | tail -n +2
      echo
    done | LABEL="$LABEL" python3 -c '
import json, os, sys
seen = set()
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try: users = json.loads(line).get("users", [])
    except ValueError: continue
    for u in users:
        if (u.get("app_metadata") or {}).get("test_label") == os.environ["LABEL"] and u["id"] not in seen:
            seen.add(u["id"]); print(u["id"], u.get("email", ""))
')
    [ -n "$ids" ] || { echo "Keine Konten mit Label $LABEL."; exit 0; }
    fail=0
    while read -r id addr; do
      res=$(api DELETE "/auth/v1/admin/users/$id")
      code=${res%%$'\n'*}
      if [ "$code" = 200 ]; then echo "  ✓ entfernt: $addr"
      else echo "  ✗ $addr: HTTP $code (Buchungen oder Daten haengen daran? Erst klaeren.)" >&2; fail=1; fi
    done <<< "$ids"
    exit $fail
    ;;

  *) echo "✗ Unbekannter Modus: $MODE (erlaubt: --apply, --remove)" >&2; exit 2 ;;
esac
