#!/usr/bin/env node
// WCAG 2.2 AA Kontrastpruefung fuer die Compass-Tokenpaare.
//
// Prueft die semantischen Vordergrund/Hintergrund-Paare aus der
// Compass-Token-Architektur in Light und Dark. Der zweite binaere Teil des
// STOP in bars/screen.md und bars/landing.md.
//
// Usage:
//   node contrast.mjs                      alle definierten Paare
//   node contrast.mjs --pair <fg> <bg>     ein Ad-hoc-Paar, z.B. --pair #097070 #FFFFFF
//   node contrast.mjs --large              4.5 statt 3.0 auch fuer Large/UI (strenger)
//   node contrast.mjs --no-baseline        bekannte Palette-Findings mitzaehlen
//   node contrast.mjs --json               maschinenlesbar
//
// Exit 0 = keine NEUEN Unterschreitungen. Exit 1 = mindestens eine neue.
//
// Die Compass-v1-Palette hat offene Kontrastprobleme (siehe contrast-baseline.json).
// Die sind bekannt und gehoeren in einen eigenen Palette-Loop — sie halten nicht
// jeden Screen-Loop rot. Sie werden bei jedem Lauf mit ausgegeben, damit sie nicht
// in Vergessenheit geraten, zaehlen aber nur unter --no-baseline als Fehler.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

const AA_TEXT = 4.5;   // normaler Text
const AA_LARGE = 3.0;  // >=18.66px bold / >=24px, und UI-Komponenten (1.4.11)

// --- Compass-Anker (references/token-architecture.md, v1) --------------------
const T = {
  petrol500: '#097070',
  petrol600: '#075C5C',
  petrol700: '#054848',
  petrolDark: '#3FA3A3',
  gold500: '#D3B454',
  neutral50: '#FAF9F9',
  neutral100: '#EFE8E8',
  neutral200: '#E2DADA',
  neutral300: '#CFC7C7',
  neutral900: '#2B2B2B',
  surfaceMuted: '#BFD6D5',
  success: '#3C8C7A',
  warning: '#C59E38',
  error: '#B55353',
  bgDark: '#121616',
  surfaceDark: '#1B2222',
  textDark: '#E7EFEF',
  white: '#FFFFFF',
};

// [Name, Vordergrund, Hintergrund, Stufe]
// Stufe "text" = 4.5, "large" = 3.0 (grosse Schrift, Rahmen, UI-Grenzen)
const PAIRS = [
  ['text.primary auf surface.background', T.neutral900, T.white, 'text'],
  ['text.primary auf neutral.50', T.neutral900, T.neutral50, 'text'],
  ['text.brand auf surface.background', T.petrol500, T.white, 'text'],
  ['text.brand auf surface.muted', T.petrol500, T.surfaceMuted, 'text'],
  ['action.primary fg auf bg (default)', T.neutral50, T.petrol500, 'text'],
  ['action.primary fg auf bg (hover)', T.neutral50, T.petrol600, 'text'],
  ['action.primary fg auf bg (pressed)', T.neutral50, T.petrol700, 'text'],
  ['feedback.success auf surface.background', T.success, T.white, 'text'],
  ['feedback.warning auf surface.background', T.warning, T.white, 'text'],
  ['feedback.error auf surface.background', T.error, T.white, 'text'],
  // Rein dekorativer Trenner: WCAG 1.4.11 gilt nur fuer Grenzen, die eine
  // Komponente ueberhaupt erst identifizierbar machen. Deshalb informativ.
  ['border.default gegen surface.background', T.neutral200, T.white, 'decorative'],
  ['border.strong gegen surface.background', T.neutral300, T.white, 'large'],
  ['focus.ring gegen surface.background', T.petrol500, T.white, 'large'],
  ['brand.partnerBadge auf surface.background', T.gold500, T.white, 'large'],
  // Dark Mode
  ['dark: text.primary auf bg.dark', T.textDark, T.bgDark, 'text'],
  ['dark: text.primary auf surface.dark', T.textDark, T.surfaceDark, 'text'],
  ['dark: petrol.dark auf bg.dark', T.petrolDark, T.bgDark, 'text'],
  ['dark: focus.ring gegen surface.dark', T.petrolDark, T.surfaceDark, 'large'],
];

// --- WCAG-Berechnung --------------------------------------------------------
function srgb(hex) {
  let h = hex.replace('#', '').toLowerCase();
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/.test(h)) throw new Error(`ungueltiger Farbwert: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = srgb(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// --- run --------------------------------------------------------------------
const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const strictLarge = argv.includes('--large');
const useBaseline = !argv.includes('--no-baseline');
const pairIdx = argv.indexOf('--pair');

const baselinePath = join(HERE, 'contrast-baseline.json');
let baseline = new Set();
if (useBaseline && existsSync(baselinePath)) {
  try {
    const b = JSON.parse(readFileSync(baselinePath, 'utf8'));
    baseline = new Set((b.known || []).map((e) => e.pair));
  } catch (err) {
    console.error(`contrast-baseline.json nicht lesbar: ${err.message}`);
    process.exit(2);
  }
}

let pairs = PAIRS;
if (pairIdx !== -1) {
  const fg = argv[pairIdx + 1];
  const bg = argv[pairIdx + 2];
  if (!fg || !bg) {
    console.error('usage: contrast.mjs --pair <fg> <bg>');
    process.exit(2);
  }
  pairs = [[`${fg} auf ${bg}`, fg, bg, 'text']];
}

const results = [];
for (const [name, fg, bg, level] of pairs) {
  let r;
  try {
    r = ratio(fg, bg);
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    process.exit(2);
  }
  const need = level === 'large' && !strictLarge ? AA_LARGE : AA_TEXT;
  const meets = r >= need;
  const known = baseline.has(name);
  results.push({
    name, fg, bg, level,
    ratio: Math.round(r * 100) / 100,
    need,
    meets,
    known,
    // decorative zaehlt nie als Fehler; bekannte Findings nur unter --no-baseline
    pass: level === 'decorative' || meets || (known && useBaseline),
  });
}

if (asJson) {
  console.log(
    JSON.stringify(
      {
        results,
        failed: results.filter((r) => !r.pass).length,
        known: results.filter((r) => !r.meets && r.known).length,
      },
      null,
      2,
    ),
  );
} else {
  for (const r of results) {
    let mark = '✓';
    if (!r.meets) mark = r.level === 'decorative' ? '·' : r.known && useBaseline ? '!' : '✗';
    const tag = !r.meets && r.level === 'decorative' ? '  [dekorativ, 1.4.11 n/a]' : !r.meets && r.known && useBaseline ? '  [bekannt]' : '';
    console.log(
      `${mark} ${r.ratio.toFixed(2).padStart(5)} : 1  (braucht ${r.need})  ${r.name}${tag}` +
        (r.pass ? '' : `\n      ${r.fg} auf ${r.bg}`),
    );
  }
}

const failed = results.filter((r) => !r.pass);
const known = results.filter((r) => !r.meets && r.known && useBaseline);

if (!asJson && known.length) {
  console.log(`\n! ${known.length} bekannte Palette-Finding(s) — offener Compass-Punkt, eigener Loop.`);
}

if (failed.length === 0) {
  if (!asJson) console.log(`✓ keine neuen Unterschreitungen (${results.length} Paare geprueft)`);
  process.exit(0);
}
if (!asJson) console.log(`\n✗ ${failed.length} NEUE Unterschreitung(en) von ${results.length} Paaren`);
process.exit(1);
