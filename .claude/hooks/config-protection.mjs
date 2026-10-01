#!/usr/bin/env node
// PreToolUse (Edit|Write|MultiEdit|NotebookEdit): Schutz der Prüfinstanzen.
//
// Ein Agent macht einen Check gern grün, indem er den Check abschwächt statt
// den Code zu reparieren. Für die folgenden Dateien entscheidet deshalb nie
// der Agent allein, sondern der Mensch (permissionDecision "ask"):
//
//   - Lint- und Format-Konfiguration (inkl. Ignore-Listen)
//   - die Guard-Infrastruktur selbst (.claude/settings*.json, .claude/hooks/)
//   - die bindenden Regeln und die DNA (.agents/rules/, KN-BRAND-001) —
//     CLAUDE.md: "Einen DNA-Konflikt nie selbst auflösen."
//   - die kanonischen Originale in .knowledge/vault/ (unveränderlich)
//   - die Prüfskripte scripts/check-*.mjs (Terminologie, Copy, Tokens, …)
//
// Das erstmalige Anlegen einer Datei bleibt frei — es gibt dann nichts, was
// abgeschwächt werden könnte.
//
// Grenze: Schreibzugriffe über Bash (sed -i, >) sieht dieser Hook nicht.
//
// Angelehnt an config-protection.js aus affaan-m/ECC (MIT).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readInput, relPath, ask, projectDir } from './lib.mjs';

const LINT_FORMAT_NAMES = new Set([
  '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml',
  '.prettierrc', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs', '.prettierrc.json',
  '.prettierrc.yml', '.prettierrc.yaml', '.eslintignore', '.prettierignore', '.stylelintignore',
]);
const LINT_FORMAT_PATTERNS = [
  /^(eslint|prettier|stylelint|commitlint)\.config(\.[\w-]+)*\.(js|mjs|cjs|ts|mts|cts)$/i,
  /^\.(eslintrc|prettierrc|stylelintrc)(\.[\w-]+)*\.(js|cjs|mjs|json|jsonc|yml|yaml)$/i,
];

const GUARDED_PATHS = [
  { re: /^\.claude\/settings(\.local)?\.json$/, why: 'Hook- und Rechte-Konfiguration' },
  { re: /^\.claude\/hooks\//, why: 'Guard-Hook' },
  { re: /^\.agents\/rules\//, why: 'bindende Agenten-Regel' },
  { re: /^\.knowledge\/memory\/nodes\/KN-BRAND-001[^/]*\.md$/, why: 'CompliHub360-DNA (source of truth)' },
  { re: /^\.knowledge\/vault\//, why: 'kanonisches Original (unveränderlich)' },
  { re: /^scripts\/check-[^/]+\.mjs$/, why: 'Prüfskript eines Quality Gates' },
];

/** Liefert den Schutzgrund für einen repo-relativen Pfad oder null. */
export function protectionReason(rel) {
  if (!rel) return null;
  const base = path.posix.basename(rel);
  if (LINT_FORMAT_NAMES.has(base.toLowerCase()) || LINT_FORMAT_PATTERNS.some((re) => re.test(base))) {
    return 'Lint-/Format-Konfiguration';
  }
  return GUARDED_PATHS.find((g) => g.re.test(rel))?.why ?? null;
}

function exists(file) {
  try {
    fs.lstatSync(file);
    return true;
  } catch (err) {
    // Nur "gibt es nicht" zählt als neu; jeder andere Fehler schützt weiter.
    return err?.code !== 'ENOENT';
  }
}

function main() {
  const input = readInput();
  const target = input?.tool_input?.file_path || input?.tool_input?.notebook_path;
  if (!target) return;
  const rel = relPath(input, target);
  const why = protectionReason(rel);
  if (!why || !exists(path.resolve(projectDir(input), target))) return;
  ask(
    `${rel} ist geschützt (${why}). Diese Datei ändert nur, wer es bewusst will — ` +
    'erkläre dem Menschen, warum die Änderung nötig ist, statt einen Check abzuschwächen.',
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
