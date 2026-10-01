// Gemeinsame Helfer für die Claude-Code-Hooks dieses Repos.
// Hooks bekommen das Tool-Event als JSON auf stdin und antworten mit JSON auf
// stdout (Exit 0). Format: https://code.claude.com/docs/en/hooks
import fs from 'node:fs';
import path from 'node:path';

export function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();
}

/** Repo-relativer Pfad mit Vorwärtsschrägstrichen; '' wenn außerhalb des Repos. */
export function relPath(input, filePath) {
  if (!filePath) return '';
  const root = projectDir(input);
  const rel = path.relative(root, path.resolve(root, filePath)).split(path.sep).join('/');
  return rel.startsWith('..') ? '' : rel;
}

function emitPreToolUse(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  }));
}

/** Tool-Aufruf verweigern; der Grund geht an Claude zurück. */
export const deny = (reason) => emitPreToolUse('deny', reason);

/** Den Menschen fragen, statt selbst zu entscheiden. */
export const ask = (reason) => emitPreToolUse('ask', reason);

/** PostToolUse: Befund an Claude zurückmelden, damit er ihn behebt. */
export function postFeedback(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}
