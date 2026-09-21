#!/usr/bin/env node
// Compass token drift checker.
//
// Der binaere Teil jedes CompliHub-Design-Loops. Prueft drei Dinge:
//   1. Hardkodierte Farbwerte in Quelldateien, die zu keinem Compass-Token gehoeren
//   2. Drift zwischen ui/design-system/tokens.json und der Compass-Architektur
//   3. Off-palette Farben in Icon-SVGs (--svg)
//
// Usage:
//   node token-drift.mjs <pfad|datei> [...]     Quelldateien scannen
//   node token-drift.mjs --tokens               nur tokens.json gegen Compass pruefen
//   node token-drift.mjs --svg <datei.svg> [...] Icon-Palette pruefen
//   node token-drift.mjs --changed [ref]        nur neu hinzugefuegte Zeilen seit <ref> (default HEAD)
//   node token-drift.mjs --strict               px-Werte und #fff/#000 mitzaehlen
//
// Exit 0 = gruen. Exit 1 = Findings. Exit 2 = Aufrufsfehler.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, relative, resolve } from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// --- Compass-Anker (references/token-architecture.md, v1) --------------------
const COMPASS = {
  '#097070': 'color.petrol.500',
  '#075c5c': 'color.petrol.600',
  '#054848': 'color.petrol.700',
  '#3fa3a3': 'color.petrol.dark',
  '#d3b454': 'color.gold.500 (nur color.brand.*)',
  '#b89b3e': 'color.gold.600',
  '#9c8434': 'color.gold.700',
  '#faf9f9': 'color.neutral.50',
  '#efe8e8': 'color.neutral.100',
  '#e2dada': 'color.neutral.200 / color.border.default',
  '#cfc7c7': 'color.neutral.300 / color.border.strong',
  '#2b2b2b': 'color.neutral.900',
  '#bfd6d5': 'color.surface.muted',
  '#3c8c7a': 'color.feedback.success',
  '#c59e38': 'color.feedback.warning',
  '#b55353': 'color.feedback.error',
  '#121616': 'color.bg.dark',
  '#1b2222': 'color.surface.dark',
  '#e7efef': 'color.text.dark.primary',
};

// Der Gradient aus CLAUDE.md ist als Ganzes festgelegt und darf literal stehen.
const GRADIENT_STOPS = new Set(['#eaf3f1', '#ddece8', '#e9e4d3']);

// Icon-Haus-Palette (svg-icon-builder/reference/style-spec.md)
const ICON_PALETTE = new Set(['#b49a5c', '#c9b583', '#1c2433', '#efebe1', 'currentcolor', 'none']);

// Pure white/black: von Compass eigentlich als neutral.50 / neutral.900 gefuehrt,
// aber so verbreitet, dass ein Gate daran nie aufgeht. Nur unter --strict ein Finding.
const UNIVERSAL = new Set(['#ffffff', '#000000']);

const SPACING = new Set([0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96]);

const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.vue', '.svelte']);
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'stitch_exports']);

// --- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const svgMode = argv.includes('--svg');
const tokensOnly = argv.includes('--tokens');
const changedIdx = argv.indexOf('--changed');
const changedMode = changedIdx !== -1;
// Ein Argument direkt nach --changed, das kein Flag ist, gilt als git-ref.
const changedRef =
  changedMode && argv[changedIdx + 1] && !argv[changedIdx + 1].startsWith('--')
    ? argv[changedIdx + 1]
    : 'HEAD';
const targets = argv.filter(
  (a, i) => !a.startsWith('--') && !(changedMode && i === changedIdx + 1 && a === changedRef),
);

const findings = [];
const notes = [];
const add = (file, line, msg) => findings.push({ file, line, msg });

// --- helpers ----------------------------------------------------------------
function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIR.has(e)) continue;
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (SCAN_EXT.has(extname(p))) out.push(p);
  }
  return out;
}

function expand(hex) {
  const h = hex.toLowerCase();
  if (h.length === 4) return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return h.length === 9 ? h.slice(0, 7) : h;
}

const rel = (p) => relative(ROOT, p) || p;

// --- 1. tokens.json gegen Compass -------------------------------------------
function checkTokensFile() {
  const path = join(ROOT, 'ui/design-system/tokens.json');
  if (!existsSync(path)) {
    notes.push('ui/design-system/tokens.json nicht gefunden — Token-Vergleich uebersprungen');
    return;
  }
  let json;
  try {
    json = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    add(rel(path), 0, `nicht parsebar: ${err.message}`);
    return;
  }
  const flat = [];
  (function flatten(o, p = '') {
    for (const [k, v] of Object.entries(o || {})) {
      const np = p ? `${p}.${k}` : k;
      if (v && typeof v === 'object') flatten(v, np);
      else flat.push([np, String(v)]);
    }
  })(json);

  for (const [key, val] of flat) {
    if (!/^#[0-9a-f]{3,8}$/i.test(val)) continue;
    const hex = expand(val);
    if (!COMPASS[hex] && !GRADIENT_STOPS.has(hex) && !(UNIVERSAL.has(hex) && !strict)) {
      add(rel(path), 0, `${key} = ${val} steht in keinem Compass-Anker — Code-Token weicht von der Spezifikation ab`);
    }
  }
}

// --- 2. Quelldateien --------------------------------------------------------
function checkSource(files) {
  for (const file of files) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|#)/.test(line)) return;
      for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        const hex = expand(m[0]);
        if (GRADIENT_STOPS.has(hex)) continue;
        if (UNIVERSAL.has(hex) && !strict) continue;
        const token = COMPASS[hex];
        if (token) {
          add(rel(file), i + 1, `${m[0]} ist ${token} — als Token referenzieren, nicht hart setzen`);
        } else {
          add(rel(file), i + 1, `${m[0]} gehoert zu keinem Compass-Token`);
        }
      }
      if (strict) {
        for (const m of line.matchAll(/(?:padding|margin|gap|top|left|right|bottom)[^:;]*:\s*(-?\d+)px/gi)) {
          const px = Math.abs(Number(m[1]));
          if (!SPACING.has(px)) add(rel(file), i + 1, `${m[1]}px liegt nicht auf der Spacing-Skala`);
        }
      }
    });
  }
}

// --- 2b. Nur geaenderte Zeilen ----------------------------------------------
// Ein Loop haftet fuer seinen eigenen Diff, nicht fuer den Altbestand. Dieser
// Modus prueft ausschliesslich Zeilen, die seit <ref> hinzugekommen sind — damit
// ist ein STOP erreichbar, ohne vorher 600 Altlasten aufzuraeumen.
function checkChanged(ref, paths) {
  let diff;
  try {
    const args = ['diff', '--unified=0', '--no-color', ref, '--'];
    diff = execFileSync('git', paths.length ? args.concat(paths) : args, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    console.error(`git diff gegen "${ref}" fehlgeschlagen: ${(err.stderr || err.message).toString().trim()}`);
    process.exit(2);
  }

  let file = null;
  let lineNo = 0;
  let scanned = 0;

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) {
      const path = raw.slice(4).trim();
      file = path === '/dev/null' ? null : path.replace(/^b\//, '');
      if (file && !SCAN_EXT.has(extname(file))) file = null;
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      lineNo = Number(hunk[1]);
      continue;
    }
    if (!file || !raw.startsWith('+') || raw.startsWith('+++')) continue;

    const line = raw.slice(1);
    scanned++;
    if (!/^\s*(\/\/|\*|#)/.test(line)) {
      for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        const hex = expand(m[0]);
        if (GRADIENT_STOPS.has(hex)) continue;
        if (UNIVERSAL.has(hex) && !strict) continue;
        const token = COMPASS[hex];
        add(
          file,
          lineNo,
          token
            ? `${m[0]} ist ${token} — als Token referenzieren, nicht hart setzen`
            : `${m[0]} gehoert zu keinem Compass-Token`,
        );
      }
      if (strict) {
        for (const m of line.matchAll(/(?:padding|margin|gap|top|left|right|bottom)[^:;]*:\s*(-?\d+)px/gi)) {
          const px = Math.abs(Number(m[1]));
          if (!SPACING.has(px)) add(file, lineNo, `${m[1]}px liegt nicht auf der Spacing-Skala`);
        }
      }
    }
    lineNo++;
  }

  notes.push(`${scanned} hinzugefuegte Zeile(n) gegen "${ref}" geprueft`);
}

// --- 3. SVG-Modus -----------------------------------------------------------
function checkSvg(files) {
  for (const file of files) {
    let svg;
    try {
      svg = readFileSync(file, 'utf8');
    } catch (err) {
      add(rel(file), 0, `nicht lesbar (${err.code})`);
      continue;
    }
    for (const m of svg.matchAll(/\b(fill|stroke|stop-color)\s*=\s*"([^"]*)"/gi)) {
      const raw = m[2].trim().toLowerCase();
      if (!raw) continue;
      const val = raw.startsWith('#') ? expand(raw) : raw;
      if (ICON_PALETTE.has(val)) continue;
      if (COMPASS[val]) {
        add(rel(file), 0, `${m[1]}="${m[2]}" ist ein Compass-UI-Token — Icons nutzen die Icon-Palette (gold/soft-gold/ink/cream)`);
      } else {
        add(rel(file), 0, `${m[1]}="${m[2]}" liegt ausserhalb der Icon-Palette`);
      }
    }
  }
}

// --- run --------------------------------------------------------------------
if (svgMode) {
  const files = targets.filter((t) => t.endsWith('.svg'));
  if (files.length === 0) {
    console.error('usage: token-drift.mjs --svg <datei.svg> [...]');
    process.exit(2);
  }
  checkSvg(files);
} else if (tokensOnly) {
  checkTokensFile();
} else if (changedMode) {
  checkChanged(changedRef, targets);
} else {
  checkTokensFile();
  const files = [];
  const roots = targets.length ? targets : ['ui', 'apps'];
  for (const t of roots) {
    const p = resolve(ROOT, t);
    if (!existsSync(p)) {
      notes.push(`${t} existiert nicht — uebersprungen`);
      continue;
    }
    statSync(p).isDirectory() ? walk(p, files) : files.push(p);
  }
  checkSource(files);
}

for (const n of notes) console.log(`· ${n}`);

if (findings.length === 0) {
  console.log('✓ keine Token-Drift');
  process.exit(0);
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}
for (const [file, list] of byFile) {
  console.log(`✗ ${file}`);
  for (const f of list) console.log(`    ${f.line ? f.line + ': ' : ''}${f.msg}`);
}
console.log(`\n${findings.length} Finding(s) in ${byFile.size} Datei(en)`);
process.exit(1);
