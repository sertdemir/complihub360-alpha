#!/usr/bin/env bash
# ─── Staging-Supabase data restore ───────────────────────────────────────────
# Restores JSONL table dumps from a backup archive via PostgREST upsert
# (Prefer: resolution=merge-duplicates → primary-key upsert, non-destructive:
# existing rows are overwritten, missing rows re-inserted, extra rows are NOT
# deleted). Prerequisite: the schema exists — on a fresh project apply
# supabase/migrations from git first. See docs/runbooks/staging-backup-restore.md.
#
# Usage: supabase-restore.sh <archive.tar.gz> [table]
set -euo pipefail

BASE_DIR="/docker/complihub-backup"
source "$BASE_DIR/.env"

ARCHIVE="${1:?usage: supabase-restore.sh <archive.tar.gz> [table]}"
ONLY_TABLE="${2:-}"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
tar -xzf "$ARCHIVE" -C "$WORK"

for F in "$WORK"/*.jsonl; do
  T=$(basename "$F" .jsonl)
  [ -n "$ONLY_TABLE" ] && [ "$T" != "$ONLY_TABLE" ] && continue
  ROWS=$(wc -l < "$F" | tr -d ' ')
  if [ "$ROWS" = "0" ]; then echo "· $T: empty, skipped"; continue; fi
  # Batch upserts of 500 rows to stay well under request-size limits.
  split -l 500 "$F" "$WORK/$T.part."
  OK=0
  for P in "$WORK/$T".part.*; do
    BODY=$(python3 -c "import json,sys; print(json.dumps([json.loads(l) for l in open(sys.argv[1])]))" "$P")
    CODE=$(printf '%s' "$BODY" | curl -s -o "$WORK/.resp" -w '%{http_code}' -X POST \
      "$SUPABASE_URL/rest/v1/$T" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "content-type: application/json" \
      -H "Prefer: resolution=merge-duplicates" \
      --data-binary @-)
    if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
      OK=$((OK + $(wc -l < "$P" | tr -d ' ')))
    else
      echo "! $T: batch failed HTTP $CODE — $(head -c 200 "$WORK/.resp")"
    fi
  done
  echo "· $T: $OK/$ROWS rows upserted"
done
