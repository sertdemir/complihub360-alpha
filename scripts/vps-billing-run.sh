#!/bin/sh
# CompliHub360 monthly platform-fee run (deployed to /docker/complihub-api/ on
# the VPS, crontab: 0 6 1 * * — runs on the 1st and bills the PREVIOUS month).
# BILLING_PERIOD env overrides the period for manual runs (YYYY-MM).
PERIOD=${BILLING_PERIOD:-$(date -d "yesterday" +%Y-%m)}
API_KEY=$(grep "^API_KEY=" /docker/complihub-api/.env | cut -d= -f2)

docker exec -e KEY="$API_KEY" -e PERIOD="$PERIOD" complihub-api-api-1 node -e "
fetch('http://localhost:3005/api/v1/admin/billing/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.KEY },
  body: JSON.stringify({ period: process.env.PERIOD }),
}).then(r => r.json()).then(d => console.log(new Date().toISOString(), JSON.stringify(d)))
  .catch(e => { console.error(new Date().toISOString(), e.message); process.exit(1); })
" >> /var/log/complihub-billing.log 2>&1
