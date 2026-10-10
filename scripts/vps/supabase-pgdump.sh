#!/usr/bin/env bash
# ─── Vollsicherung einer Supabase-Datenbank, inklusive auth (Beta-Plan Mo 19.10.)
#
# supabase-backup.sh (Staging) exportiert ueber PostgREST: nur die
# oeffentlichen Tabellen, kein `auth.users`, keine Storage-Metadaten. Nach
# einem Verlust muessten sich alle Nutzer neu registrieren — fuer die Alpha
# vertretbar, fuer die Beta nicht. Dieses Skript sichert die GANZE Datenbank
# mit pg_dump ueber die direkte Verbindung: public, auth, storage (Metadaten;
# die Dateien selbst liegen im Objektspeicher und gehoeren nicht hierher).
#
# Die Sicherung enthaelt personenbezogene Daten (E-Mail-Adressen in auth,
# Nachrichten, Buchungen). Darum:
#   - verschluesselt mit age, an einen oeffentlichen Schluessel, dessen
#     privater Teil NICHT auf dem VPS liegt. Wer den VPS hat, hat die
#     Sicherungen nicht im Klartext.
#   - ohne BACKUP_AGE_RECIPIENT laeuft nichts: lieber keine Sicherung als
#     eine im Klartext.
#   - nie ins Repo, nie in den Obsidian-Vault (CLAUDE.md, Privacy).
#
# Supabase Pro sichert selbst taeglich (7 Tage). Diese Kopie liegt ausserhalb
# von Supabase — sie hilft, wenn das Projekt oder das Konto weg ist.
#
# pg_dump kommt aus dem Docker-Image postgres:17, passend zur Server-Version
# (Supabase faehrt 17). Ein aelteres pg_dump verweigert neuere Server.
#
# Konfiguration in $BASE_DIR/.env (chmod 600):
#   DATABASE_URL          postgresql://postgres.<ref>:<pw>@<pooler>:5432/postgres  (Session-Modus)
#   BACKUP_AGE_RECIPIENT  age1…   (oeffentlicher Schluessel; privat: beim Nutzer)
#   BACKUP_LABEL          beta    (Dateiname-Praefix)
# Cron (root):  45 3 * * *  /docker/complihub-backup-beta/supabase-pgdump.sh
#
# Wiederherstellung: docs/runbooks/beta-supabase.md, Abschnitt „Backup".
set -euo pipefail

BASE_DIR="${BASE_DIR:-/docker/complihub-backup-beta}"
ARCHIVE_DIR="$BASE_DIR/archive"
KEEP="${KEEP:-14}"
LOG="$BASE_DIR/pgdump.log"

set -a; source "$BASE_DIR/.env"; set +a
: "${DATABASE_URL:?DATABASE_URL fehlt}"
LABEL="${BACKUP_LABEL:-beta}"

fail() { echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") FAIL $*" >> "$LOG"; echo "FAIL $*" >&2; exit 1; }

[ -n "${BACKUP_AGE_RECIPIENT:-}" ] || fail "BACKUP_AGE_RECIPIENT fehlt — keine Sicherung im Klartext"
command -v age >/dev/null || fail "age ist nicht installiert (apt install age)"
command -v docker >/dev/null || fail "docker fehlt"

mkdir -p "$ARCHIVE_DIR"
chmod 700 "$BASE_DIR" "$ARCHIVE_DIR"
STAMP=$(date -u +"%Y%m%d-%H%M")
OUT="$ARCHIVE_DIR/$LABEL-$STAMP.dump.age"
TMP="$OUT.part"
trap 'rm -f "$TMP"' EXIT

# -Fc: komprimiert, einzeln wiederherstellbar (pg_restore -t …).
# --no-owner/--no-privileges: Supabase-Rollen sind plattformverwaltet; beim
# Einspielen in ein neues Projekt setzen die Migrationen die Rechte.
# Schemata explizit: was Supabase selbst verwaltet (realtime, vault-Inhalte,
# graphql) bleibt draussen; auth und storage-Metadaten sind drin.
docker run --rm -e DATABASE_URL postgres:17 \
  pg_dump "$DATABASE_URL" -Fc --no-owner --no-privileges \
    --schema=public --schema=auth --schema=storage \
  | age -r "$BACKUP_AGE_RECIPIENT" -o "$TMP" \
  || fail "pg_dump oder age abgebrochen"

# Ein leerer oder winziger Dump ist kein Erfolg.
BYTES=$(stat -c %s "$TMP")
[ "$BYTES" -gt 10000 ] || fail "Sicherung nur $BYTES Bytes — verworfen"
mv "$TMP" "$OUT"
chmod 600 "$OUT"

ls -1t "$ARCHIVE_DIR"/"$LABEL"-*.dump.age 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") OK $(du -h "$OUT" | cut -f1) → $OUT" >> "$LOG"
