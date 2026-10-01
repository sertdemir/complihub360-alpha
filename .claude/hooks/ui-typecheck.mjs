#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit): Typecheck der UI nach jedem Edit unter
// apps/vs1-demo/ui/src/.
//
// Schließt die Lücke aus CLAUDE.md: `npm run typecheck` überspringt
// @vs1-demo/ui still (kein typecheck-Skript), ein UI-Typfehler fiel bisher
// erst bei `npm run build` auf. Der Hook baut zuerst die Workspace-Pakete
// (`tsc -b`, inkrementell — die UI braucht deren Typen) und prüft dann die UI
// inkrementell; warm dauert das wenige Sekunden.
//
// Fehler gehen als Befund an Claude zurück (Fehler der editierten Datei
// zuerst). Ohne installierte Abhängigkeiten tut der Hook nichts.
//
// Angelehnt an post-edit-typecheck.js aus affaan-m/ECC (MIT).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readInput, relPath, postFeedback, projectDir } from './lib.mjs';

const UI_SRC = /^apps\/vs1-demo\/ui\/src\/.+\.(ts|tsx)$/;
const UI_TSCONFIG = 'apps/vs1-demo/ui/tsconfig.json';
const MAX_LINES = 30;

export const isUiSource = (rel) => UI_SRC.test(rel);

/** Sortiert Fehler der editierten Datei nach vorn und kürzt die Ausgabe. */
export function summarize(output, rel) {
  const lines = output.split('\n').filter((l) => /error TS\d+/.test(l));
  const own = lines.filter((l) => l.startsWith(rel));
  const rest = lines.filter((l) => !l.startsWith(rel));
  const shown = [...own, ...rest].slice(0, MAX_LINES);
  const more = lines.length - shown.length;
  return { count: lines.length, text: shown.join('\n') + (more > 0 ? `\n… und ${more} weitere` : '') };
}

function main() {
  const input = readInput();
  const rel = relPath(input, input?.tool_input?.file_path);
  if (!isUiSource(rel)) return;

  const root = projectDir(input);
  const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
  if (!fs.existsSync(tsc)) return;

  const cacheDir = path.join(root, 'node_modules', '.cache', 'claude-hooks');
  fs.mkdirSync(cacheDir, { recursive: true });

  // Workspace-Pakete bauen, damit die UI deren Typen findet (wie `npm run build`).
  spawnSync(tsc, ['-b'], { cwd: root, encoding: 'utf8' });

  const res = spawnSync(tsc, [
    '--noEmit', '--pretty', 'false', '--incremental',
    '--tsBuildInfoFile', path.join(cacheDir, 'vs1-demo-ui.tsbuildinfo'),
    '-p', UI_TSCONFIG,
  ], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (res.status === 0) return;

  // tsc meldet Pfade relativ zum cwd (Repo-Wurzel) — also im selben Format wie rel.
  const { count, text } = summarize(`${res.stdout}\n${res.stderr}`, rel);
  if (!count) return;
  postFeedback(
    `UI-Typecheck rot nach Edit an ${rel} (${count} Fehler). \`npm run build\` würde scheitern — ` +
    `bitte beheben:\n${text}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
