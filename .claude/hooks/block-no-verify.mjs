#!/usr/bin/env node
// PreToolUse (Bash): Git-Hooks dürfen nicht umgangen werden.
//
// Blockt `--no-verify` (und jedes eindeutige Präfix davon), `git commit -n`
// sowie das Umbiegen von `core.hooksPath` bei commit/push/merge/cherry-pick/
// rebase/am. Ein Agent soll den Fehler beheben, den ein Hook meldet, nicht den
// Hook abschalten.
//
// Angelehnt an block-no-verify.js aus affaan-m/ECC (MIT), bewusst schlanker:
// kein vollständiger Shell-Parser, sondern Tokenisierung je Kommando-Segment.
import { pathToFileURL } from 'node:url';
import { readInput, deny } from './lib.mjs';

const PROTECTED = new Set(['commit', 'push', 'merge', 'cherry-pick', 'rebase', 'am']);
// Globale git-Optionen, deren Wert im nächsten Token steht.
const GLOBAL_WITH_VALUE = new Set(['-c', '-C', '--config-env', '--git-dir', '--work-tree', '--namespace']);
// commit-Optionen, deren Wert im nächsten Token steht (der Wert ist kein Flag).
const COMMIT_WITH_VALUE = new Set(['-m', '--message', '-F', '--file', '-C', '--reuse-message',
  '-c', '--reedit-message', '--author', '--date', '-t', '--template', '--fixup', '--squash']);
// Kurzoptionen, die den Rest eines Clusters als Wert schlucken (`-mn` = Nachricht "n").
const SHORT_WITH_VALUE = new Set(['m', 'F', 'C', 'c', 't', 'u', 'S']);

/** Zerlegt eine Shell-Zeile grob in Segmente aus Wörtern; Quotes werden respektiert. */
export function tokenize(command) {
  const segments = [[]];
  let word = '';
  let inWord = false;
  let quote = null;
  const flush = () => {
    if (inWord) segments[segments.length - 1].push(word);
    word = '';
    inWord = false;
  };
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < command.length) word += command[++i];
      else word += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; inWord = true; continue; }
    if (ch === '\\' && i + 1 < command.length) { word += command[++i]; inWord = true; continue; }
    if (/\s/.test(ch) && ch !== '\n') { flush(); continue; }
    if (ch === '\n' || ch === ';' || ch === '&' || ch === '|' || ch === '(' || ch === ')') {
      flush();
      if (segments[segments.length - 1].length) segments.push([]);
      continue;
    }
    word += ch;
    inWord = true;
  }
  flush();
  return segments.filter((s) => s.length);
}

const isNoVerifyLong = (v) => v.length >= '--no-v'.length && '--no-verify'.startsWith(v);

function isCommitShortNoVerify(v) {
  if (!v.startsWith('-') || v.startsWith('--') || v === '-') return false;
  for (const opt of v.slice(1)) {
    if (opt === 'n') return true;
    if (SHORT_WITH_VALUE.has(opt)) return false;
  }
  return false;
}

const WRAPPERS = new Set(['sudo', 'env', 'command', 'exec', 'time', 'nice', 'nohup']);
const SHELLS = /(^|\/)(sh|bash|zsh|dash)$/;

/** Index des Kommando-Worts nach Env-Zuweisungen und Wrappern wie `env`/`sudo`. */
function commandIndex(words) {
  let i = 0;
  while (i < words.length && (/^\w+=/.test(words[i]) || WRAPPERS.has(words[i]))) i++;
  return i;
}

/** Liefert einen Blockgrund oder null. */
export function check(command, depth = 0) {
  for (const words of tokenize(command)) {
    const gitAt = commandIndex(words);
    // `bash -c "git commit --no-verify"`: den Skript-String selbst prüfen.
    if (SHELLS.test(words[gitAt] || '') && depth < 3) {
      const script = words[words.indexOf('-c', gitAt) + 1];
      const nested = words.includes('-c') && script ? check(script, depth + 1) : null;
      if (nested) return nested;
      continue;
    }
    if (!/(^|\/)git(\.exe)?$/.test(words[gitAt] || '')) continue;
    // Env-Präfix wie GIT_CONFIG_PARAMETERS="'core.hooksPath=…'" git commit
    const envOverride = words.slice(0, gitAt).some((w) => /^GIT_CONFIG_\w*=.*core\.hookspath/i.test(w));

    let i = gitAt + 1;
    let hooksOverride = envOverride;
    for (; i < words.length && words[i].startsWith('-'); i++) {
      const w = words[i];
      if ((w === '-c' || w === '--config-env') && /^core\.hookspath=/i.test(words[i + 1] || '')) hooksOverride = true;
      if (/^(-c|--config-env=)core\.hookspath=/i.test(w)) hooksOverride = true;
      if (GLOBAL_WITH_VALUE.has(w)) i++;
    }
    const sub = words[i];
    if (!PROTECTED.has(sub)) continue;
    if (hooksOverride) {
      return `core.hooksPath bei \`git ${sub}\` umzubiegen ist gesperrt: Git-Hooks werden nicht umgangen. Behebe, was der Hook meldet.`;
    }
    for (let j = i + 1; j < words.length; j++) {
      const w = words[j];
      if (w === '--') break;
      if (sub === 'commit' && COMMIT_WITH_VALUE.has(w)) { j++; continue; }
      if (sub === 'commit' && /^--(message|file|author|date|template|fixup|squash)=/.test(w)) continue;
      if (isNoVerifyLong(w) || (sub === 'commit' && isCommitShortNoVerify(w))) {
        return `\`--no-verify\` bei \`git ${sub}\` ist gesperrt: Git-Hooks werden nicht umgangen. Behebe, was der Hook meldet.`;
      }
    }
  }
  return null;
}

function main() {
  const input = readInput();
  const command = input?.tool_input?.command;
  if (typeof command !== 'string') return;
  const reason = check(command);
  if (reason) deny(reason);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
