#!/usr/bin/env node
// ─── Waechter: self-hosted Runner auf einem OEFFENTLICHEN Repository ──────────
// complihub360-alpha ist public und Forks sind erlaubt. Ein self-hosted Runner
// laeuft auf dem Staging-VPS, mit Schreibrecht auf /docker/complihub/site und
// sudo auf drei Wrapper. Genau zwei Eigenschaften halten diese Kombination
// zusammen, und beide sind eine Zeile weit von der Aufhebung entfernt:
//
//   1. Kein Workflow, der `self-hosted` benutzt, darf durch einen Fork-PR
//      ausloesbar sein. `pull_request` genuegt: der Fork liefert die Workflow-
//      Datei UND den Code mit, und beides laeuft dann auf unserem Server.
//   2. Ein self-hosted Job darf keinen Repository-Code ausfuehren — kein
//      actions/checkout, kein npm/npx/yarn/pnpm. Er laedt ein fertiges
//      Artefakt und kopiert es an seinen Platz. Damit ist selbst ein Angreifer
//      mit Schreibrecht auf einen Build-Schritt noch auf ubuntu-latest
//      eingesperrt.
//
// Ein Review faengt so etwas beim ersten Mal, beim fuenften nicht mehr.
// Deshalb steht es hier und laeuft in ci.yml mit.
//
//   node scripts/check-workflow-runners.mjs

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, '.github', 'workflows');

/** Von einem Fork aus ausloesbar — der Angreifer bestimmt Code und Workflow. */
const FORK_TRIGGERS = ['pull_request', 'pull_request_target'];

/** Kommentarzeilen entfernen: der Dateikopf redet ueber genau diese Begriffe. */
const strip = (src) =>
  src.split('\n').filter((l) => !/^\s*#/.test(l));

function triggersOf(lines) {
  const found = new Set();
  const i = lines.findIndex((l) => /^["']?on["']?:/.test(l));
  if (i < 0) return found;

  const inline = lines[i].replace(/^["']?on["']?:/, '').trim();
  if (inline.startsWith('[')) {
    // on: [push, pull_request]
    inline.slice(1, inline.lastIndexOf(']')).split(',').forEach((s) => {
      if (s.trim()) found.add(s.trim());
    });
    return found;
  }
  if (inline) {
    // on: push
    found.add(inline);
    return found;
  }
  for (let j = i + 1; j < lines.length; j++) {
    if (/^\S/.test(lines[j])) break; // naechster Schluessel auf oberster Ebene
    const key = lines[j].match(/^ {2}([A-Za-z_]+):/); //   push:
    if (key) found.add(key[1]);
    const item = lines[j].match(/^ {2}- +([A-Za-z_]+)\s*$/); //   - push
    if (item) found.add(item[1]);
  }
  return found;
}

/**
 * Der `runs-on`-Wert eines Jobs, in beiden Schreibweisen:
 *   runs-on: ubuntu-latest        runs-on: [self-hosted, x]        runs-on:
 *                                                                    - self-hosted
 * Bewusst NICHT der ganze Job-Rumpf: dieser Waechter hat sich beim ersten Lauf
 * selbst gemeldet, weil in ci.yml ein Schritt "Check self-hosted runner rules"
 * heisst. Eine Regel, die auf korrektem Code feuert, bringt Leuten bei, sie
 * abzuschalten.
 */
function runsOnOf(body) {
  const i = body.findIndex((l) => /^\s*runs-on:/.test(l));
  if (i < 0) return '';
  const inline = body[i].replace(/^\s*runs-on:/, '').trim();
  if (inline) return inline;
  const out = [];
  for (let j = i + 1; j < body.length; j++) {
    const item = body[j].match(/^\s*- +(.+?)\s*$/);
    if (!item) break;
    out.push(item[1]);
  }
  return out.join(',');
}

function jobsOf(lines) {
  const out = [];
  const start = lines.findIndex((l) => /^jobs:/.test(l));
  if (start < 0) return out;

  let current = null;
  for (let j = start + 1; j < lines.length; j++) {
    if (/^\S/.test(lines[j])) break;
    const key = lines[j].match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (key) {
      if (current) out.push(current);
      current = { name: key[1], body: [] };
      continue;
    }
    if (current) current.body.push(lines[j]);
  }
  if (current) out.push(current);
  return out;
}

const files = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f));
const problems = [];

// Schuetzt den Waechter vor sich selbst: ein leeres Verzeichnis waere sonst
// ein bestandener Lauf.
if (files.length === 0) {
  console.error('✗ Keine Workflow-Datei in .github/workflows gefunden.');
  process.exit(1);
}

for (const file of files) {
  const lines = strip(readFileSync(join(DIR, file), 'utf8'));
  const jobs = jobsOf(lines);
  const selfHosted = jobs.filter((j) => /\bself-hosted\b/.test(runsOnOf(j.body)));
  if (selfHosted.length === 0) continue;

  const names = selfHosted.map((j) => j.name).join(', ');

  const forkable = [...triggersOf(lines)].filter((t) => FORK_TRIGGERS.includes(t));
  if (forkable.length > 0) {
    problems.push(
      `${file}: laeuft auf ${forkable.join(' + ')} UND hat self-hosted Jobs (${names}).\n` +
        '    Ein Fork-PR wuerde damit fremden Code auf dem Staging-VPS ausfuehren.\n' +
        '    Entweder den Trigger entfernen oder die Jobs auf ubuntu-latest legen.',
    );
  }

  for (const job of selfHosted) {
    const body = job.body.join('\n');
    if (/uses:\s*actions\/checkout/.test(body)) {
      problems.push(
        `${file}: der self-hosted Job "${job.name}" checkt das Repository aus.\n` +
          '    Self-hosted Jobs bekommen ihre Eingabe als Artefakt, nicht als Checkout.',
      );
    }
    const pm = body.match(/\b(npm|npx|yarn|pnpm)\b/);
    if (pm) {
      problems.push(
        `${file}: der self-hosted Job "${job.name}" ruft ${pm[1]} auf.\n` +
          '    Damit laeuft Repository-Code (Skripte, postinstall, Abhaengigkeiten)\n' +
          '    auf dem VPS. Bauen gehoert nach ubuntu-latest.',
      );
    }
  }
}

if (problems.length > 0) {
  console.error('✗ Self-hosted-Runner-Waechter\n');
  for (const p of problems) console.error('  • ' + p + '\n');
  process.exit(1);
}

console.log(`✓ Self-hosted-Runner-Waechter: ${files.length} Workflow-Dateien geprueft.`);
