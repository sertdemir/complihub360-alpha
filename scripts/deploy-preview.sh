#!/usr/bin/env bash
# ─── Preview deploy (parallel to staging) ────────────────────────────────────
# Builds the UI from the CURRENT branch and ships it to a SECOND nginx site on
# the VPS: next.staging.complihub360.com. The existing staging site is never
# touched — the old version stays live and reachable the whole time, which is
# the point: compare both, roll back by simply using the old URL.
#
#   ./scripts/deploy-preview.sh            # deploy current branch
#
# One-time prerequisites (see docs/runbooks/preview-deploy.md):
#   · DNS A-record  next.staging.complihub360.com → 76.13.159.221
#   · /docker/complihub-next/ exists on the VPS (this script creates it)
set -euo pipefail

VPS="root@76.13.159.221"
KEY="$HOME/.ssh/complihub_vps"
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new"
HOST="next.staging.complihub360.com"
UI_DIR="apps/vs1-demo/ui"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
SHA=$(git rev-parse HEAD)

echo "→ Preview deploy · branch '$BRANCH' → https://$HOST"

# 1 · Build the workspace graph, then the UI (same env as the staging build,
#     minus the retired frontend API key).
for p in packages/types packages/compliance-engine packages/agent-core \
         packages/agent-registry packages/policy-engine packages/task-orchestrator \
         services/redaction; do
  npm run build --workspace "$p" --if-present >/dev/null
done
VITE_SUPABASE_URL=https://kqylqwogxbiwpnomkzsn.supabase.co \
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeWxxd29neGJpd3Bub21renNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDI1MjgsImV4cCI6MjA5OTExODUyOH0.sReK_846Tx-fawVO71Ojy5zJ3uF7Y4xvxGH0Md45Ptk \
VITE_DEMO_LOGIN=1 \
  npm run build --workspace "$UI_DIR" >/dev/null
printf 'User-agent: *\nDisallow: /\n' > "$UI_DIR/dist/robots.txt"
echo "{\"sha\":\"$SHA\",\"branch\":\"$BRANCH\",\"builtAt\":\"$(date -u +%FT%TZ)\",\"channel\":\"preview\"}" > "$UI_DIR/dist/build-info.json"

# 2 · Ensure the preview site exists on the VPS. Mirrors the staging compose
#     exactly (Traefik discovers containers via the docker socket — no shared
#     network block needed) and REUSES staging's basic-auth + noindex
#     middlewares, so the preview sits behind the same wall.
$SSH "$VPS" "mkdir -p /docker/complihub-next/site && cat > /docker/complihub-next/docker-compose.yml <<'YAML'
services:
  web:
    image: nginx:1.27-alpine
    restart: unless-stopped
    volumes:
      - ./site:/usr/share/nginx/html:ro
      - /docker/complihub/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    labels:
      - traefik.enable=true
      - traefik.http.routers.complihub-next.rule=Host(\`$HOST\`)
      - traefik.http.routers.complihub-next.entrypoints=websecure
      - traefik.http.routers.complihub-next.tls.certresolver=letsencrypt
      - traefik.http.routers.complihub-next.middlewares=complihub-auth,complihub-noindex
      - traefik.http.services.complihub-next.loadbalancer.server.port=80
YAML"

# 3 · Ship + (re)start
rsync -az --delete -e "$SSH" "$UI_DIR/dist/" "$VPS:/docker/complihub-next/site/"
$SSH "$VPS" "chmod -R a+rX /docker/complihub-next/site && cd /docker/complihub-next && docker compose up -d 2>&1 | tail -1"

echo "✓ Preview live (behind the same basic auth): https://$HOST"
echo "  Old version untouched:                     https://staging.complihub360.com"
