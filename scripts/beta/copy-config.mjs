#!/usr/bin/env node
// ─── Konfiguration von Staging in ein neues Projekt kopieren (Beta-Plan Mo 19.10.)
//
// Das Schema kommt aus den Migrationen, die Stammdaten auch — geprueft am
// 10.10.2026: zehn Stammdaten-Tabellen sind auf Staging und aus dem Repo
// Zeile fuer Zeile gleich. Zwei Dinge stehen bewusst NICHT im Repo:
//
//   lead_band_rules   Band-Zuordnung v1, vom Nutzer freigegeben (Vault:
//                     „2026-09-22 Band-Zuordnung v1"). Konfiguration, keine
//                     Migration — ohne sie faellt jeder Lead auf Band 1.
//   knowledge_chunks  Der EY-Korpus mit Embeddings (ingest-ey-corpus.py).
//                     Das PDF liegt nicht im Repo; kopieren statt neu
//                     einbetten spart Gemini-Quote und ergibt dieselben Vektoren.
//
// Dazu das Mail-Logo im Bucket `assets` — aus dem Repo
// (docs/email-templates/assets/), nicht von Staging.
//
// Nur diese drei. Keine Nutzer, keine Anbieter, keine Buchungen: die Beta
// beginnt leer. Kundendaten wandern nie zwischen Projekten.
//
// Aufruf (Schluessel nur aus der Umgebung, nie als Argument):
//   SOURCE_SUPABASE_URL=… SOURCE_SERVICE_ROLE_KEY=… \
//   TARGET_SUPABASE_URL=… TARGET_SERVICE_ROLE_KEY=… \
//   node scripts/beta/copy-config.mjs            # Probelauf: liest, zaehlt, schreibt nichts
//   node scripts/beta/copy-config.mjs --apply    # schreibt (Upsert per id), prueft danach die Zahlen
//
// Upsert per Primaerschluessel: ein zweiter Lauf aendert nichts. Zeilen, die
// im Ziel zusaetzlich stehen, bleiben stehen (kein loeschender Abgleich).

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TABLES = ['lead_band_rules', 'knowledge_chunks'];
const ASSETS = ['logo-lockup-email.png'];
const PAGE = 500;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const apply = process.argv.includes('--apply');
const env = (k) => {
  const v = (process.env[k] || '').trim();
  if (!v) { console.error(`✗ ${k} fehlt`); process.exit(2); }
  return v;
};
const src = { url: env('SOURCE_SUPABASE_URL').replace(/\/$/, ''), key: env('SOURCE_SERVICE_ROLE_KEY') };
const dst = { url: env('TARGET_SUPABASE_URL').replace(/\/$/, ''), key: env('TARGET_SERVICE_ROLE_KEY') };
if (src.url === dst.url) { console.error('✗ Quelle und Ziel sind dasselbe Projekt'); process.exit(2); }

const headers = (p, extra = {}) => ({ apikey: p.key, Authorization: `Bearer ${p.key}`, ...extra });

async function req(p, path, init = {}) {
  const res = await fetch(`${p.url}${path}`, { ...init, headers: headers(p, init.headers) });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${p.url}${path} → ${res.status} ${await res.text()}`);
  return res;
}

async function readAll(p, table) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await req(p, `/rest/v1/${table}?select=*&order=id&limit=${PAGE}&offset=${offset}`);
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < PAGE) return rows;
  }
}

async function count(p, table) {
  const res = await req(p, `/rest/v1/${table}?select=id`, { method: 'HEAD', headers: { Prefer: 'count=exact', Range: '0-0' } });
  return Number((res.headers.get('content-range') || '').split('/')[1] || 0);
}

async function upsert(p, table, rows) {
  for (let i = 0; i < rows.length; i += 100) {
    await req(p, `/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 100)),
    });
  }
}

let failed = false;
console.log(`${apply ? 'SCHREIBT' : 'Probelauf'} · ${src.url} → ${dst.url}`);

for (const table of TABLES) {
  const rows = await readAll(src, table);
  const before = await count(dst, table);
  console.log(`  ${table}: Quelle ${rows.length}, Ziel vorher ${before}`);
  if (!apply) continue;
  await upsert(dst, table, rows);
  const after = await count(dst, table);
  const ok = after >= rows.length;
  if (!ok) failed = true;
  console.log(`    ${ok ? '✓' : '✗'} Ziel nachher ${after}`);
}

for (const name of ASSETS) {
  const file = resolve(ROOT, 'docs/email-templates/assets', name);
  const body = await readFile(file);
  console.log(`  assets/${name}: ${body.length} Bytes aus dem Repo`);
  if (!apply) continue;
  await req(dst, `/storage/v1/object/assets/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png', 'x-upsert': 'true', 'Cache-Control': 'max-age=3600' },
    body,
  });
  // Oeffentlich lesbar, ohne Schluessel — so, wie ein Mail-Programm es laedt.
  const pub = await fetch(`${dst.url}/storage/v1/object/public/assets/${name}`);
  const ok = pub.ok && (pub.headers.get('content-type') || '').startsWith('image/');
  if (!ok) failed = true;
  console.log(`    ${ok ? '✓' : '✗'} oeffentlich abrufbar (${pub.status})`);
}

if (!apply) console.log('Nichts geschrieben. Mit --apply ausfuehren.');
process.exit(failed ? 1 : 0);
