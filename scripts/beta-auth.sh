#!/usr/bin/env bash
# Basic-Auth-Zugaenge fuer die Beta verwalten — ein Zugang je Tester.
#
#   ./scripts/beta-auth.sh list
#   ./scripts/beta-auth.sh add tester-anna      # Passwort wird einmalig ausgegeben
#   ./scripts/beta-auth.sh remove tester-anna   # entzieht den Zugang sofort
#
# Dasselbe Werkzeug wie fuer Staging (scripts/staging-auth.sh), nur gegen die
# eigene Wand der Beta (Middleware complihub-beta-auth in /docker/complihub-beta,
# angelegt von scripts/vps/setup-beta.sh). Staging- und Beta-Zugaenge sind
# getrennt: wer Staging sehen darf, sieht nicht automatisch die Beta.
set -euo pipefail
STAGING_COMPOSE_DIR=/docker/complihub-beta \
STAGING_VERIFY_URL=https://beta.complihub360.com/build-info.json \
STAGING_AUTH_LABEL=traefik.http.middlewares.complihub-beta-auth.basicauth.users \
  exec "$(dirname "$0")/staging-auth.sh" "$@"
