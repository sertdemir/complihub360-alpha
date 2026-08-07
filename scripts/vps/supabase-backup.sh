#!/usr/bin/env bash
# ─── Staging-Supabase data backup (13-layer audit P0 #2) ─────────────────────
# Data-level export of every PostgREST-exposed table to JSONL, archived and
# rotated on the VPS. Schema recovery comes from git (supabase/migrations) —
# together they form the full restore path (see docs/runbooks/
# staging-backup-restore.md). Runs from cron; credentials live in
# /docker/complihub-backup/.env (root-only, chmod 600).
set -euo pipefail

BASE_DIR="/docker/complihub-backup"
ARCHIVE_DIR="$BASE_DIR/archive"
KEEP=14
LOG="$BASE_DIR/backup.log"

# set -a exports the vars so the embedded python sees them via os.environ.
set -a; source "$BASE_DIR/.env"; set +a   # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

STAMP=$(date -u +"%Y%m%d-%H%M")
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$ARCHIVE_DIR"

SUMMARY=$(python3 - "$WORK" <<'PYEOF'
import json, os, sys, urllib.request

work = sys.argv[1]
base = os.environ['SUPABASE_URL'].rstrip('/')
key = os.environ['SUPABASE_SERVICE_ROLE_KEY']

def get(path):
    req = urllib.request.Request(base + path, headers={
        'apikey': key, 'authorization': f'Bearer {key}'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

tables = sorted(get('/rest/v1/').get('definitions', {}).keys())
if not tables:
    print('ERROR: empty table list', file=sys.stderr); sys.exit(1)

total = 0
for t in tables:
    rows, offset = [], 0
    while True:
        chunk = get(f'/rest/v1/{t}?select=*&limit=1000&offset={offset}')
        rows.extend(chunk)
        if len(chunk) < 1000:
            break
        offset += 1000
    with open(os.path.join(work, f'{t}.jsonl'), 'w') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    total += len(rows)

print(f'{len(tables)} tables, {total} rows')
PYEOF
)

OUT="$ARCHIVE_DIR/staging-$STAMP.tar.gz"
tar -czf "$OUT" -C "$WORK" $(cd "$WORK" && ls *.jsonl)
SIZE=$(du -h "$OUT" | cut -f1)

# Rotate: keep the newest $KEEP archives.
ls -1t "$ARCHIVE_DIR"/staging-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") OK $SUMMARY, $SIZE → $OUT" >> "$LOG"
