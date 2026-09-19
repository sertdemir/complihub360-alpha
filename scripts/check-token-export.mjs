#!/usr/bin/env node
// ─── Waechter: tokens.json gegen index.css ───────────────────────────────────
//
// `apps/vs1-demo/ui/tokens.json` ist ein EXPORT, kein Eingabewert: kein Build
// liest ihn, und trotzdem ist er das, was Figma, die Storybook-Doku und jeder
// Aussenstehende als "die Farben des Projekts" liest. Genau das macht ihn
// gefaehrlich — er kann monatelang falsch sein, ohne dass etwas rot wird.
// Gemessen am 2026-09-19: 34 Werte abgewichen, darunter `text/accent-strong`
// auf Petrol #004d40, waehrend die Oberflaeche ein Gold ausliefert.
//
// Der Waechter loest die `--color-*`-Variablen aus index.css fuer beide Themes
// auf und vergleicht sie mit dem Export. Er nennt Namen, keine Zahl (vgl.
// Entscheidung 2026-09-17 "Waechter nennen Namen, nicht Zahlen") und prueft in
// beide Richtungen: ein Token, das nur im Export steht, muss unter
// `$meta.codeGap` namentlich gelistet sein — und wer dort steht und inzwischen
// gebaut wurde, faellt auch auf, weil die Liste dann eine Luege enthaelt.
//
//   node scripts/check-token-export.mjs           pruefen (Exit 1 bei Drift)
//   node scripts/check-token-export.mjs --write   Export aus index.css angleichen
//
// Was er NICHT prueft: ob index.css mit dem Compass-Figma uebereinstimmt. Das
// ist der andere Halbkreis und laeuft ueber die `compass`-Skill. Dieser
// Waechter sorgt nur dafuer, dass die Code-Seite ehrlich abgebildet ist —
// sonst vergleicht der Figma-Abgleich gegen eine Datei, die selbst luegt.
//
// Die Status-Skalen (success/warning/error/blue) stehen bewusst AUSSERHALB der
// Pruefung: index.css fuehrt dort nach eigenem Kommentar Interimswerte
// ("TODO: replace with exact Compass scales"), der Export die echten
// Compass-Skalen. Hier ist der Export der genauere von beiden; ihn aus dem
// Code zu ueberschreiben wuerde Information vernichten statt herstellen.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = resolve(ROOT, 'apps/vs1-demo/ui/src/index.css');
const JSON_PATH = resolve(ROOT, 'apps/vs1-demo/ui/tokens.json');

/** Rumpf eines Blocks: erstes `{` nach `head` bis zur passenden `}` —
 *  Klammern zaehlend, weil verschachtelte At-Regeln drin stehen. */
function blockBody(css, head) {
  const start = css.indexOf(head);
  if (start === -1) throw new Error(`Block nicht gefunden: ${head}`);
  let i = css.indexOf('{', start);
  let depth = 0;
  const from = i + 1;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(from, i);
  }
  throw new Error(`Block nicht geschlossen: ${head}`);
}

/** Alle `--name: wert;` der aeussersten Ebene. Verschachteltes (@media,
 *  &:hover) wird uebersprungen, damit kein bedingter Wert als der gueltige
 *  durchgeht. */
function declarations(body) {
  const out = new Map();
  let depth = 0;
  for (const raw of body.split('\n')) {
    const line = raw.replace(/\/\*.*?\*\//g, '');
    if (depth === 0) {
      const m = /^\s*(--[\w-]+)\s*:\s*([^;]+);/.exec(line);
      if (m) out.set(m[1], m[2].trim());
    }
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
  }
  return out;
}

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const TRIPLE = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/;

/** Loest einen Wert bis auf Hex bzw. rgba() auf. `maps` ist die Suchkette —
 *  fuer Dark zuerst der .dark-Block, dann :root. */
function resolveValue(value, maps, seen = new Set()) {
  const v = value.trim();
  const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(v);
  if (ref) {
    if (seen.has(ref[1])) throw new Error(`Zirkelbezug bei ${ref[1]}`);
    seen.add(ref[1]);
    for (const m of maps) if (m.has(ref[1])) return resolveValue(m.get(ref[1]), maps, seen);
    return null; // Variable existiert nicht — der Aufrufer meldet das
  }
  if (HEX.test(v)) return v.toLowerCase();
  const t = TRIPLE.exec(v);
  if (t) return '#' + [1, 2, 3].map((i) => Number(t[i]).toString(16).padStart(2, '0')).join('');
  if (/^rgba?\(/.test(v)) return v.replace(/\s+/g, '').toLowerCase();
  return null;
}

const css = readFileSync(CSS, 'utf8');
const rootMap = declarations(blockBody(css, ':root {'));
const darkMap = declarations(blockBody(css, '.dark {'));

const light = (name) => resolveValue(`var(${name})`, [rootMap]);
const dark = (name) => resolveValue(`var(${name})`, [darkMap, rootMap]);
const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();

const doc = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const codeGap = new Set(doc.$meta?.codeGap ?? []);
const seenGap = new Set();

const drift = [];   // beidseitig vorhanden, Werte verschieden
const undeclared = []; // nur im Export, nicht in der Liste
let checked = 0;

// ── 1. Semantische Farben ────────────────────────────────────────────────────
// tokens.json `color.color.<gruppe>.<rest>` <-> css `--color-<gruppe>-<rest>`.
// Die Gruppe ist nicht aus dem Namen ableitbar (`bg-brand-light` koennte
// bg/brand-light oder bg-brand/light sein), deshalb kommt sie aus dem Export.
for (const [group, entries] of Object.entries(doc.color.color)) {
  for (const [name, modes] of Object.entries(entries)) {
    const key = `color/${group}/${name}`;
    const cssVar = `--color-${group}-${name}`;
    const want = { light: light(cssVar), dark: dark(cssVar) };
    if (want.light === null) {
      if (codeGap.has(key)) seenGap.add(key);
      else undeclared.push(`${key}  (${cssVar} steht nicht in index.css)`);
      continue;
    }
    if (codeGap.has(key)) {
      seenGap.add(key);
      drift.push({ key, mode: 'liste', have: 'in $meta.codeGap gefuehrt', want: 'inzwischen gebaut — Eintrag streichen' });
      continue;
    }
    // Kein Dark-Override heisst: der Light-Wert gilt in beiden Themes.
    if (want.dark === null) want.dark = want.light;
    checked++;
    for (const mode of ['light', 'dark']) {
      if (norm(modes[mode]) !== want[mode]) {
        drift.push({ key, mode, have: modes[mode] ?? '—', want: want[mode] });
      }
    }
  }
}

// ── 2. Primitive Skalen ──────────────────────────────────────────────────────
// Nur die drei, die index.css vollstaendig und verbindlich fuehrt. `brand` und
// `brand-deep` sind die Messing-Linie der Wortmarke (seit 2026-09-19), keine
// Stufen der Skala — deshalb stehen sie unter ihrem Namen, nicht unter einer
// Zahl.
const PRIMITIVE_MAP = { primary: 'petrol', neutral: 'neutral', accent: 'gold' };
for (const [group, prefix] of Object.entries(PRIMITIVE_MAP)) {
  for (const [step, value] of Object.entries(doc.primitives[group])) {
    const key = `primitives/${group}/${step}`;
    const want = light(`--${prefix}-${step}`);
    if (want === null) {
      if (codeGap.has(key)) seenGap.add(key);
      else undeclared.push(`${key}  (--${prefix}-${step} steht nicht in index.css)`);
      continue;
    }
    if (codeGap.has(key)) {
      seenGap.add(key);
      drift.push({ key, mode: 'liste', have: 'in $meta.codeGap gefuehrt', want: 'inzwischen gebaut — Eintrag streichen' });
      continue;
    }
    checked++;
    if (norm(value) !== want) drift.push({ key, mode: '—', have: value, want });
  }
}

// ── 3. Die Liste in die andere Richtung ──────────────────────────────────────
const stale = [...codeGap].filter((k) => !seenGap.has(k));

// ── Schreiben ────────────────────────────────────────────────────────────────
if (process.argv.includes('--write')) {
  for (const d of drift) {
    if (d.mode === 'liste') continue;
    const parts = d.key.split('/');
    if (parts[0] === 'color') doc.color.color[parts[1]][parts[2]][d.mode] = d.want;
    else doc.primitives[parts[1]][parts[2]] = d.want;
  }
  const gaps = [...new Set([...seenGap, ...undeclared.map((u) => u.split('  ')[0])])].sort();
  doc.$meta.codeGap = gaps;
  doc.$meta.generated = new Date().toISOString().slice(0, 10);
  writeFileSync(JSON_PATH, JSON.stringify(doc, null, 2) + '\n');
  const values = drift.filter((d) => d.mode !== 'liste').length;
  console.log(`tokens.json angeglichen — ${values} Wert(e) korrigiert, ${gaps.length} Token in $meta.codeGap, ${checked} geprueft.`);
  process.exit(0);
}

// ── Melden ───────────────────────────────────────────────────────────────────
if (!drift.length && !undeclared.length && !stale.length) {
  console.log(`tokens.json deckt sich mit index.css — ${checked} Token geprueft, ${codeGap.size} als Code-Luecke gefuehrt.`);
  process.exit(0);
}
if (drift.length) {
  console.error(`\ntokens.json weicht in ${drift.length} Wert(en) von index.css ab:\n`);
  for (const d of drift) console.error(`  ${d.key}  [${d.mode}]   Export: ${d.have}   ausgeliefert: ${d.want}`);
}
if (undeclared.length) {
  console.error(`\nNur im Export, aber nicht in $meta.codeGap gefuehrt:\n`);
  for (const u of undeclared) console.error(`  ${u}`);
  console.error(`\n  Entweder in index.css bauen oder in $meta.codeGap aufnehmen —`);
  console.error(`  stillschweigend im Export stehen lassen ist die dritte Moeglichkeit, die es nicht gibt.`);
}
if (stale.length) {
  console.error(`\nIn $meta.codeGap gefuehrt, aber gar nicht mehr im Export:\n`);
  for (const s of stale) console.error(`  ${s}`);
  console.error(`\n  Eintrag streichen — eine Liste, die Karteileichen fuehrt, wird nicht gelesen.`);
}
console.error(`\nDer Export ist das, was Figma und die Doku als "die Farben" lesen.`);
console.error(`Angleichen: node scripts/check-token-export.mjs --write\n`);
process.exit(1);
