#!/usr/bin/env bash
# ─── Die Datenbank-Tests wirklich ausfuehren ────────────────────────────────
#
# `supabase/tests/database/` lag seit Monaten im Repo und lief in KEINEM
# Schritt — drei Dateien, 00_schema, 01_rls und 02_provider_model, zusammen
# ueber fuenfzig Zusicherungen, die niemand geprueft hat. Eine Zusicherung,
# die nie laeuft, ist eine Notiz.
#
# Dieses Skript baut eine Wegwerf-Datenbank, spielt ALLE Migrationen in
# Reihenfolge ein und faehrt die Tests mit echtem pgTAP.
#
#   npm run db:test                    gegen localhost:5432
#   PGHOST=... PGPORT=... npm run db:test
#
# Standard ist localhost:5432 als postgres; PGHOST, PGPORT, PGUSER, PGPASSWORD
# und DB lassen sich ueberschreiben. Die Datenbank heisst `ch360_test` und wird
# bei jedem Lauf NEU ANGELEGT — was vorher drinstand, ist weg.
#
# Voraussetzungen auf dem Server: die Erweiterungen `pgtap` und `vector`
# (`apt install postgresql-16-pgtap postgresql-16-pgvector`), dazu psql und
# pg_prove im Pfad. Beide Pakete liegen in ubuntu/noble/universe, also auch
# auf dem CI-Runner; der Workflow installiert sie dort selbst.
#
# ─── Warum ALLE Migrationen und nicht nur ein Schema-Dump ───────────────────
#
# Weil der Dump die Frage nicht beantwortet, die zaehlt: laesst sich der
# Stand, den Staging faehrt, aus dem Repo herstellen? Ein Lauf ueber die
# echten Dateien faengt Reihenfolge-Fehler, kaputte Rueckwaerts-Migrationen
# und Tippfehler, die ein Dump laengst geschluckt hat.

set -euo pipefail

export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
DB="${DB:-ch360_test}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
TESTS="$ROOT/supabase/tests/database"
STUB="$ROOT/supabase/tests/fixtures/00_supabase_stub.sql"

echo "── Wegwerf-Datenbank $DB"
psql -q -d postgres -c "DROP DATABASE IF EXISTS $DB;" -c "CREATE DATABASE $DB;"

echo "── Erweiterungen und Supabase-Stub"
psql -q -v ON_ERROR_STOP=1 -d "$DB" \
  -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' \
  -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;' \
  -c 'CREATE EXTENSION IF NOT EXISTS vector;' \
  -c 'CREATE EXTENSION IF NOT EXISTS pgtap;'
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$STUB"

echo "── Migrationen"
# ON_ERROR_STOP=1: eine kaputte Migration bricht den Lauf ab, statt einen
# halben Stand zu hinterlassen, gegen den die Tests dann Unsinn melden.
n=0
for f in "$MIGRATIONS"/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" > /dev/null
  n=$((n + 1))
done
echo "   $n Migrationen eingespielt"

echo "── Tests"
# pg_prove liest die TAP-Ausgabe und setzt den Exit-Code. Ein "not ok",
# eine falsche plan()-Zahl oder ein Abbruch faerben den Lauf rot.
pg_prove --failures --verbose -d "$DB" "$TESTS"/*.sql
