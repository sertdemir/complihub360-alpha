import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ─── Speicher-Seite ↔ Code, in beide Richtungen (18.10.2026) ─────────────────
// Die Cookie- und Speicher-Seite (LegalPages.tsx, STORAGE_KEYS) beschreibt,
// was die App im Browser ablegt. Zwei Fehler sind vorgekommen:
//   - genannt, aber ohne Zweck im Code: `ch360_last_session_id` (Punkt 4);
//   - im Code, aber nicht genannt: neun Schluessel, darunter die Anmeldung,
//     der Ruecksprung nach Sitzungsablauf und die Buchungsbestaetigung samt
//     Nachricht.
// Dieser Waechter haelt beide Richtungen fest.

const SRC = join(__dirname, '..', '..');
const LEGAL = join(__dirname, 'LegalPages.tsx');

/** Schluessel, die eine Bibliothek selbst schreibt — mit dem Ort, der es einschaltet. */
const LIBRARY_KEYS: Record<string, { file: string; marker: string }> = {
  i18nextLng: { file: join(SRC, 'i18n', 'config.ts'), marker: "caches: ['localStorage']" },
  'sb-…-auth-token': { file: join(SRC, 'lib', 'supabase.ts'), marker: 'persistSession: true' },
  'sb-…-auth-token-code-verifier': { file: join(SRC, 'lib', 'supabase.ts'), marker: "flowType: 'pkce'" },
};
/** Nur noch zum Wegraeumen im Code (main.tsx) — bewusst nicht mehr genannt. */
const CLEANUP_ONLY = new Set(['ch360_last_session_id']);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'mock' ? [] : sources(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && p !== LEGAL ? [p] : [];
  });
}

const legal = readFileSync(LEGAL, 'utf8');
const start = legal.indexOf('const STORAGE_KEYS');
const block = legal.slice(start, legal.indexOf('];', start));
const named = [...block.matchAll(/name: '([^']+)'/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()));
const code = sources(SRC).map((p) => readFileSync(p, 'utf8')).join('\n');

/** Schluessel-Literale im Code; ein Template `ch360_x_${id}` wird zu `ch360_x_<id>`. */
const inCode = new Set(
  [...code.matchAll(/(['"`])((?:ch360|c360)[-_][a-z0-9_-]+|complihub360\.[a-z.]+|demo_[a-z_]+)(\1|\$\{)/g)]
    .map((m) => (m[3] === '${' ? `${m[2]}<id>` : m[2])),
);

describe('Speicher-Seite ↔ Code', () => {
  it('liest beide Seiten', () => {
    expect(named).toContain('ch360_guest_key');
    expect(inCode.has('ch360_guest_key')).toBe(true);
    expect(inCode.has('ch360_booking_confirmed_<id>')).toBe(true);
  });

  it.each(named)('„%s" wird im Code verwendet', (key) => {
    const lib = LIBRARY_KEYS[key];
    if (lib) { expect(readFileSync(lib.file, 'utf8')).toContain(lib.marker); return; }
    expect(inCode.has(key), `${key} steht auf der Seite, aber nicht im Code`).toBe(true);
  });

  it('jeder Schluessel im Code steht auf der Seite', () => {
    const missing = [...inCode].filter((k) => !named.includes(k) && !CLEANUP_ONLY.has(k));
    expect(missing).toEqual([]);
  });

  it('ch360_last_session_id wird nur noch weggeraeumt, nie geschrieben', () => {
    expect(named).not.toContain('ch360_last_session_id');
    expect(code.match(/setItem\([^)]*last_session/gi) ?? []).toEqual([]);
  });
});
