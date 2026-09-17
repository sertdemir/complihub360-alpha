#!/usr/bin/env node
// ─── SST-Prototyp: die Sales-Tax-Saetze der 24 Mitgliedsstaaten ──────────────
//
// Gegenstueck zu tedb-vat-rates.mjs, fuer den Markt, in dem wir anfangen. Die
// USA haben keine Bundesumsatzsteuer und keine Bundesbehoerde dafuer. Das
// Naechste zu einer amtlichen Sammelquelle ist das Streamlined Sales Tax
// Governing Board: seine Mitgliedsstaaten sind vertraglich verpflichtet, ihre
// Saetze in einem einheitlichen Format zu veroeffentlichen.
//
// REICHWEITE, damit die Zahl nicht groesser klingt als sie ist: 24 von 45
// Staaten mit Sales Tax. Kalifornien, Texas, New York und Florida sind NICHT
// dabei — zusammen mehr als ein Drittel der US-Wirtschaftsleistung. Fuer die
// braucht es je eine eigene Anbindung an die State DOR. SST ist der Anfang,
// nicht die Loesung.
//
// DAS FORMAT ist nicht geraten, sondern aus dem Technology Guide des Boards
// gelesen (SST160.9, Kapitel 5 "Rates and Boundary Databases", Seiten 36–37):
//
//   A State                 2 Zeichen, FIPS des Staats
//   B Jurisdiction Type     2 Zeichen, X12 Datenelement 1721
//   C Jurisdiction FIPS     2 Stellen = Staat · 3 = County · 5 = alles andere
//   D General Tax Intrastate   0.nnnnn, ohne Prozentzeichen
//   E General Tax Interstate   0, wenn die Jurisdiktion Auswaertsumsaetze nicht besteuert
//   F Food/Drug Intrastate     gleich D, wenn der Staat keinen eigenen Satz fuehrt;
//                             eine 0 heisst "so meldet es der Staat" — ob dahinter
//                             eine Befreiung oder ein anderer Mechanismus steht,
//                             sagt die Datei nicht, und wir raten es nicht
//   G Food/Drug Interstate
//   H Effective Begin Date  CCYYMMDD
//   I Effective End Date    CCYYMMDD
//
// DER STAATSSATZ ist die Zeile mit Jurisdiction Type 45, deren Jurisdiction
// FIPS dem Staats-FIPS entspricht. Der Guide zeigt das zweimal an eigenen
// Beispielen (`49 45 49` = Utah, 4,875 %); an echten Dateien gegengeprueft:
// Ohio `39,45,39`, Wyoming `56,45,56`, Indiana `18,45,18`. Beide Bedingungen
// werden geprueft, nicht nur der Typ.
//
// Die Dateien tragen die VOLLE HISTORIE — Ohio zurueck bis 1979. Es gilt die
// Zeile, deren Zeitraum den Stichtag enthaelt. "Kein Ende" schreiben die
// Staaten uneinheitlich: 99991231 bei den meisten, 29991231 bei Indiana.
// Deshalb wird auf "Ende >= Stichtag" geprueft und nicht auf eine Marke.
//
//   node scripts/sst-sales-tax.mjs                  # live
//   node scripts/sst-sales-tax.mjs --date 2026-01-01
//   node scripts/sst-sales-tax.mjs --record roh/    # Dateien mitschreiben
//   node scripts/sst-sales-tax.mjs --fixture roh/   # ohne Netz auswerten
//   node scripts/sst-sales-tax.mjs --sql            # region-Zeilen als SQL
//   node scripts/sst-sales-tax.mjs --json

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

// Node 22 liest HTTPS_PROXY bei `fetch` nicht von allein. Siehe den
// ausfuehrlichen Kommentar in tedb-vat-rates.mjs — dasselbe Muster.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' },
  });
  process.exit(r.status ?? 1);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = join(ROOT, 'supabase/migrations');
// Das Verzeichnis MUSS ueber den www-Host laufen: die Links auf der Seite
// zeigen auf die Domain ohne www, und die ist in unserer Egress-Allowlist
// nicht enthalten (403 auf CONNECT, sieht aus wie ein Ausfall der Quelle).
const BASE = 'https://www.streamlinedsalestax.org';
const INDEX = `${BASE}/ratesandboundry/Rates/`;

const JURIS_TYPE_STATE = '45';

// ─── ZIP mit Bordmitteln ─────────────────────────────────────────────────────
// 11 der 24 Staaten liefern gepackt. `unzip` gibt es zwar auf den CI-Laeufern,
// aber ein Waechter soll nicht an einem fehlenden Systemwerkzeug scheitern,
// und eine npm-Abhaengigkeit fuer EIN Dateiformat waere zu viel. Die Dateien
// enthalten je genau einen Eintrag, Deflate — dafuer reicht der lokale Kopf.

function unzipSingle(buf) {
  // Local file header: PK\x03\x04, dann 26 Bytes Kopf.
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error('kein ZIP (Signatur fehlt)');
  const method = buf.readUInt16LE(8);
  const flags = buf.readUInt16LE(6);
  let compressed = buf.readUInt32LE(18);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const start = 30 + nameLen + extraLen;

  // Bit 3: Groessen stehen erst im Data Descriptor HINTER den Daten. Dann ist
  // die Groesse im Kopf 0 und wir suchen die naechste Signatur.
  if ((flags & 0x08) && compressed === 0) {
    const next = buf.indexOf(Buffer.from([0x50, 0x4b, 0x07, 0x08]), start);
    const alt = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), start);
    const end = next >= 0 ? next : (alt >= 0 ? alt : buf.length);
    compressed = end - start;
  }
  const body = buf.subarray(start, start + compressed);
  if (method === 0) return body;                 // gespeichert
  if (method === 8) return inflateRawSync(body); // Deflate
  throw new Error(`ZIP-Verfahren ${method} wird nicht unterstuetzt`);
}

const asText = (name, buf) =>
  (name.toLowerCase().endsWith('.zip') ? unzipSingle(buf) : buf).toString('utf8');

// ─── Abruf ───────────────────────────────────────────────────────────────────

async function listFiles() {
  const res = await fetch(INDEX);
  if (!res.ok) throw new Error(`Verzeichnis nicht lesbar: HTTP ${res.status}`);
  const html = await res.text();
  const out = [];
  // Das Verzeichnis ist ein IIS-Listing: <A HREF="/ratesandboundry/Rates/XX.csv">.
  // Das Anfuehrungszeichen ist optional geschrieben, weil ein Listing-Format
  // keine Zusage ist — bricht es weg, faellt es hier auf und nicht still.
  for (const m of html.matchAll(/HREF="?([^\s">]*\/Rates\/([^\s">]+\.(?:csv|zip)))"?/gi)) {
    const file = m[2];
    // Namensmuster: <USPS>R<Jahr>Q<Quartal><MONTAG>.csv — der USPS-Code steht
    // vorn und ist die Kennung, die wir fuer 'US-XX' brauchen.
    const st = file.slice(0, 2).toUpperCase();
    if (/^[A-Z]{2}$/.test(st)) out.push({ state: st, file, url: `${BASE}${m[1]}` });
  }
  // Ein Staat kann mehrere Staende liegen haben; der zuletzt gelistete gewinnt.
  return [...new Map(out.map((o) => [o.state, o])).values()].sort((a, b) => a.state.localeCompare(b.state));
}

// ─── Auswertung ──────────────────────────────────────────────────────────────

const ymd = (d) => d.replaceAll('-', '');

/** Der Staatssatz am Stichtag, plus was sonst in der Datei steht. */
function stateRate(text, usps, on) {
  const rows = text.split(/\r?\n/).map((l) => l.split(',')).filter((c) => c.length >= 9);
  if (!rows.length) return { usps, error: 'keine verwertbaren Zeilen' };

  const fips = rows[0][0].trim();
  // Alle Zeilen einer Datei muessen zum selben Staat gehoeren. Ein Bruch hier
  // hiesse, dass wir eine Datei falsch zugeordnet haben — dann lieber melden
  // als einen fremden Satz als den eigenen ausgeben.
  const foreign = rows.filter((c) => c[0].trim() !== fips).length;

  const candidates = rows.filter((c) =>
    c[1].trim() === JURIS_TYPE_STATE && c[2].trim().replace(/^0+/, '') === fips.replace(/^0+/, ''));
  if (!candidates.length) return { usps, fips, error: `keine Zeile mit Jurisdiction Type ${JURIS_TYPE_STATE}` };

  const active = candidates.filter((c) => c[7].trim() <= on && c[8].trim() >= on);
  if (!active.length) return { usps, fips, foreign, error: `kein Satz gueltig am ${on}` };
  // Bei Ueberschneidung gewinnt der spaetere Beginn — sonst haetten wir die
  // Wahl zwischen zwei Saetzen und keinen Grund fuer die eine oder andere.
  active.sort((a, b) => b[7].trim().localeCompare(a[7].trim()));
  const r = active[0];

  const num = (s) => Number(s.trim());
  const localRows = rows.filter((c) => c[1].trim() !== JURIS_TYPE_STATE);
  const locals = new Set(localRows.map((c) => `${c[1].trim().padStart(2, '0')}-${c[2].trim()}`)).size;

  // BEFUND aus dem ersten Live-Lauf: Nevada meldet als einziger der 24 einen
  // STAATSSATZ VON NULL und traegt den vollen Satz auf den County-Zeilen
  // (6,85 % bis 8,375 %) — die enthalten den staatlichen Anteil bereits. Ein
  // "0 %" auszugeben waere hier keine Ungenauigkeit, sondern eine falsche
  // Auskunft; der Satz ist nicht null, er steht nur woanders.
  //
  // Erkannt wird das an der Kombination: Staatszeile null UND lokale Zeilen,
  // deren kleinster Satz ueber jedem plausiblen reinen Lokalzuschlag liegt.
  // Die Schwelle ist bewusst grob — sie soll den Fall MELDEN, nicht ihn
  // stillschweigend umrechnen.
  const activeLocal = localRows.filter((c) => c[7].trim() <= on && c[8].trim() >= on).map((c) => num(c[3]));
  const minLocal = activeLocal.length ? Math.min(...activeLocal) : null;
  const composite = num(r[3]) === 0 && minLocal !== null && minLocal >= 0.02;

  return {
    usps, fips,
    general: num(r[3]),
    generalInterstate: num(r[4]),
    foodDrug: num(r[5]),
    since: r[7].trim(),
    until: r[8].trim(),
    overlapping: active.length,
    locals,
    minLocal,
    composite,
    foreign,
  };
}

// ─── Was wir heute fuehren ───────────────────────────────────────────────────
// Nach Migration 20260917000000 koennen region-Zeilen existieren ('US-CA').
// Heute gibt es keine — dieser Lauf soll zeigen, womit sie zu fuellen waeren.

function ownRegionFacts() {
  const out = {};
  for (const f of readdirSync(MIGRATIONS).filter((n) => n.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(MIGRATIONS, f), 'utf8').replace(/^\s*--.*$/gm, '');
    for (const m of sql.matchAll(/'(US-[A-Z]{2})'\s*,\s*'([a-z_]+)'\s*,\s*'([^']*)'/g)) {
      (out[m[1]] ??= {})[m[2]] = m[3];
    }
  }
  return out;
}

const pct = (v) => `${(v * 100).toFixed(4).replace(/\.?0+$/, '')}%`;

function table(rows) {
  const head = ['Staat', 'Satz', 'Food/Drug', 'gilt seit', 'lokale Jur.', 'unser Stand'];
  const data = rows.map((r) => r.error
    ? [r.usps ?? '??', `✗ ${r.error}`, '', '', '', '']
    : [`US-${r.usps}`,
       r.composite ? `— (Komposit, ab ${pct(r.minLocal)})` : pct(r.general),
       r.composite ? '—' : (r.foodDrug === r.general ? '=' : pct(r.foodDrug)),
       `${r.since.slice(0, 4)}-${r.since.slice(4, 6)}-${r.since.slice(6)}`, String(r.locals), r.ours ?? '— (neu)']);
  const w = head.map((h, i) => Math.max(h.length, ...data.map((d) => d[i].length)));
  const line = (c) => c.map((x, i) => x.padEnd(w[i])).join('  ').trimEnd();
  console.log(line(head));
  console.log(w.map((n) => '─'.repeat(n)).join('  '));
  for (const d of data) console.log(line(d));
}

function sql(rows, fromFixture) {
  console.log('-- Aus scripts/sst-sales-tax.mjs. VOR dem Uebernehmen lesen:');
  console.log('-- jede Zeile ist eine Steuerangabe, und ein Skript ist kein Beleg.');
  if (fromFixture) {
    console.log('--');
    console.log('-- ⚠ AUS DER FIXTURE ERZEUGT, NICHT AUS DER QUELLE. Die Fixture traegt je');
    console.log('--   Staat nur einen Auszug der lokalen Zeilen — die Zahl in `notes` ist');
    console.log('--   deshalb zu klein. So nicht uebernehmen; fuer echte Zeilen live laufen.');
  }
  for (const r of rows) {
    if (r.error) { console.log(`-- ${r.usps ?? '??'}: ${r.error}`); continue; }
    if (r.composite) {
      console.log(`-- ${r.usps}: KEINE Zeile. Der Staat meldet den Satz nicht getrennt, sondern`);
      console.log(`--   vollstaendig auf den lokalen Zeilen (ab ${pct(r.minLocal)}). Ein "state_rate" waere hier`);
      console.log(`--   erfunden; das gehoert auf die locality-Ebene oder gar nicht in diese Tabelle.`);
      continue;
    }
    const notes = r.foodDrug === r.general ? '' : ` Food/Drug ${pct(r.foodDrug)}.`;
    console.log(`insert into public.jurisdiction_facts (country_code, jurisdiction_code, jurisdiction_level, domain, fact_key, value_text, value_numeric, unit, source, effective_date, notes) values
  ('US', 'US-${r.usps}', 'region', 'sales_tax', 'state_rate', '${pct(r.general)}', ${(r.general * 100).toFixed(5)}, 'percent', 'Streamlined Sales Tax, Rate File ${r.file}', date '${r.since.slice(0, 4)}-${r.since.slice(4, 6)}-${r.since.slice(6)}', '${r.locals} lokale Jurisdiktionen in derselben Datei.${notes}');`);
  }
}

// ─── Hauptlauf ───────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const on = ymd(arg('--date') ?? new Date().toISOString().slice(0, 10));
  const fixture = arg('--fixture');
  const record = arg('--record');

  let files;
  if (fixture) {
    console.error('⚠  FIXTURE-MODUS — ausgewertet werden Dateien, nicht der Dienst.\n');
    files = readdirSync(fixture)
      .filter((n) => /\.(csv|zip)$/i.test(n))
      .map((n) => ({ state: n.slice(0, 2).toUpperCase(), file: n, path: join(fixture, n) }));
  } else {
    files = await listFiles();
    if (record && !existsSync(record)) mkdirSync(record, { recursive: true });
  }

  const own = ownRegionFacts();
  const rows = [];
  for (const f of files.sort((a, b) => a.state.localeCompare(b.state))) {
    try {
      const buf = f.path
        ? readFileSync(f.path)
        : Buffer.from(await (await fetch(f.url)).arrayBuffer());
      if (record && !f.path) writeFileSync(join(record, basename(f.file)), buf);
      const r = stateRate(asText(f.file, buf), f.state, on);
      r.file = f.file;
      r.ours = own[`US-${f.state}`]?.state_rate;
      rows.push(r);
    } catch (e) {
      rows.push({ usps: f.state, file: f.file, error: e.message });
    }
  }

  if (argv.includes('--json')) { console.log(JSON.stringify({ on, rows }, null, 2)); return; }
  if (argv.includes('--sql')) { sql(rows, !!fixture); return; }

  console.log(`Streamlined Sales Tax · Stichtag ${on.slice(0, 4)}-${on.slice(4, 6)}-${on.slice(6)} · ${rows.length} Mitgliedsstaaten\n`);
  table(rows);

  const bad = rows.filter((r) => r.error);
  const comp = rows.filter((r) => r.composite);
  const odd = rows.filter((r) => !r.error && (r.foreign || r.overlapping > 1));
  console.log(`\n${rows.length - bad.length - comp.length} Staatssaetze gelesen · ${comp.length} Komposit · ${bad.length} nicht lesbar`);
  for (const r of comp) {
    console.log(`⚠  ${r.usps} meldet den Staatssatz als 0 und traegt den vollen Satz auf den lokalen Zeilen`);
    console.log(`   (ab ${pct(r.minLocal)}). "0 %" waere hier eine falsche Auskunft, kein ungenauer Wert.`);
  }
  for (const r of odd) {
    if (r.foreign) console.log(`⚠  ${r.usps}: ${r.foreign} Zeile(n) mit fremdem Staats-FIPS in derselben Datei.`);
    if (r.overlapping > 1) console.log(`⚠  ${r.usps}: ${r.overlapping} Staatssaetze gleichzeitig gueltig — der mit dem spaetesten Beginn gilt.`);
  }
  console.log('\nNICHT dabei: CA, TX, NY, FL und die uebrigen 21 Staaten mit Sales Tax.');
  console.log('Fuer die braucht es je eine eigene Anbindung an die State DOR.');
  if (bad.length) process.exitCode = 1;
}

main().catch((e) => { console.error(`\n✗ ${e.message}`); process.exit(1); });
