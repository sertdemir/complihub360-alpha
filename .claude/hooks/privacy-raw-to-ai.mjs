#!/usr/bin/env node
// PreToolUse (Edit|Write|MultiEdit): mechanische Stütze für
// .agents/rules/privacy-no-raw-to-ai.md — "Nie Rohdaten an eine AI."
//
// Deterministische Heuristik, kein Modell: Eine Code-Datei, die nach dem Edit
// sowohl einen Raw-Ref (raw://, rawStorageRef, rawVault …) als auch einen
// AI-Endpoint (Gemini, Anthropic, OpenAI …) enthält, wird gesperrt — aber nur,
// wenn der Edit diese Kombination NEU herstellt. Dateien, in denen beides schon
// zusammen steht, bleiben editierbar; über sie entscheidet das Review.
//
// Kommentare zählen nicht mit (sie dürfen die Regel erklären). Tests ebenfalls
// nicht: Sie prüfen raw:// gerade als Negativfall.
//
// Falsch-positiv? Raw-Zugriff und AI-Aufruf gehören in getrennte Module — die
// AI-Seite bekommt nur sanitized_storage_ref. Ist die Trennung wirklich
// unmöglich, entscheidet der Mensch, nicht der Agent.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readInput, relPath, deny, projectDir } from './lib.mjs';

const CODE_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|py)$/;
const TEST_PATH = /(\.(test|spec)\.[a-z]+$)|(^|\/)(__tests__|tests?|e2e|fixtures)\//;

const RAW_MARKERS = [/raw:\/\//, /\brawStorageRef\b/, /\braw_storage_ref\b/, /\b[rR]awVault\b/];
const AI_MARKERS = [
  /\bgenerateContent\b/, /\bembedContent\b/, /generativelanguage\.googleapis/, /\bGEMINI_\w+/,
  /@google\/gen(erative-)?ai/, /@anthropic-ai\/sdk/, /api\.anthropic\.com/, /\/v1\/messages\b/,
  /\bopenai\b/i, /chat\/completions/, /api\.mistral\.ai/,
];

/** Entfernt Block- und Zeilenkommentare (grob; `https://` bleibt erhalten). */
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
    .replace(/^\s*#(?!!).*$/gm, '');
}

export function findMarkers(src) {
  const code = stripComments(src);
  const raw = RAW_MARKERS.find((re) => re.test(code));
  const ai = AI_MARKERS.find((re) => re.test(code));
  return raw && ai ? { raw: code.match(raw)[0], ai: code.match(ai)[0] } : null;
}

/** Simuliert den Dateiinhalt nach dem Tool-Aufruf. */
export function contentAfter(toolName, toolInput, before) {
  if (toolName === 'Write') return toolInput.content ?? '';
  const edits = toolName === 'MultiEdit' ? toolInput.edits ?? [] : [toolInput];
  let out = before;
  for (const e of edits) {
    const oldStr = e.old_string ?? '';
    const newStr = e.new_string ?? '';
    if (oldStr && out.includes(oldStr)) {
      out = e.replace_all ? out.split(oldStr).join(newStr) : out.replace(oldStr, () => newStr);
    } else {
      out += `\n${newStr}`; // konservativ: neuer Text zählt in jedem Fall mit
    }
  }
  return out;
}

/** Liefert einen Blockgrund oder null. */
export function check(rel, toolName, toolInput, before) {
  if (!CODE_EXT.test(rel) || TEST_PATH.test(rel)) return null;
  if (findMarkers(before)) return null;
  const hit = findMarkers(contentAfter(toolName, toolInput, before));
  if (!hit) return null;
  return (
    `Privacy-Gate: ${rel} würde Raw-Ref (\`${hit.raw}\`) und AI-Endpoint (\`${hit.ai}\`) ` +
    'in einer Datei zusammenführen. Regel .agents/rules/privacy-no-raw-to-ai.md: Ein raw://-Ref ' +
    'oder Roh-Buffer erreicht nie einen AI-Endpoint — die AI-Seite bekommt nur sanitized_storage_ref. ' +
    'Trenne Raw-Zugriff und AI-Aufruf in getrennte Module. Hältst du das für einen Fehlalarm, ' +
    'stoppe und frage den Menschen.'
  );
}

function main() {
  const input = readInput();
  const toolInput = input?.tool_input ?? {};
  const rel = relPath(input, toolInput.file_path);
  if (!rel) return;
  try {
    let before = '';
    try {
      before = fs.readFileSync(path.resolve(projectDir(input), rel), 'utf8');
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err;
    }
    const reason = check(rel, input.tool_name, toolInput, before);
    if (reason) deny(reason);
  } catch (err) {
    // Fail closed: ein Guard, der nicht prüfen kann, lässt nichts durch.
    deny(`Privacy-Gate konnte ${rel} nicht prüfen (${err?.message ?? err}). Frage den Menschen.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
