import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ─── Speicher-Seite · keine Eintraege ohne Code dahinter (Punkt 4, 18.10.2026)
// Die Cookie- und Speicher-Seite (LegalPages.tsx, STORAGE_KEYS) beschreibt,
// was die App im Browser ablegt. `ch360_last_session_id` stand dort mit dem
// Zweck „damit sie wieder geoeffnet werden kann" — gelesen hat ihn nichts.
// Dieser Waechter verlangt: jeder genannte Schluessel kommt im Code vor.
// (Die Gegenrichtung — jeder Schluessel im Code ist genannt — ist noch offen.)

const SRC = join(__dirname, '..', '..');
// Schluessel, die eine Bibliothek selbst schreibt — mit dem Ort, der es einschaltet.
const LIBRARY_KEYS: Record<string, { file: string; marker: string }> = {
  i18nextLng: { file: join(SRC, 'i18n', 'config.ts'), marker: "caches: ['localStorage']" },
};
const LEGAL = join(__dirname, 'LegalPages.tsx');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && p !== LEGAL ? [p] : [];
  });
}

describe('Speicher-Seite', () => {
  const legal = readFileSync(LEGAL, 'utf8');
  const block = legal.slice(legal.indexOf('const STORAGE_KEYS'), legal.indexOf('];', legal.indexOf('const STORAGE_KEYS')));
  const named = [...block.matchAll(/name: '([^']+)'/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()));
  const code = sources(SRC).map((p) => readFileSync(p, 'utf8')).join('\n');

  it('liest die genannten Schluessel', () => {
    expect(named).toContain('ch360_guest_key');
    expect(named.length).toBeGreaterThan(5);
  });

  it.each(named)('„%s" wird im Code verwendet', (key) => {
    const lib = LIBRARY_KEYS[key];
    if (lib) { expect(readFileSync(lib.file, 'utf8')).toContain(lib.marker); return; }
    expect(code.includes(`'${key}'`) || code.includes(`"${key}"`) || code.includes(`\`${key}\``)).toBe(true);
  });

  it('nennt ch360_last_session_id nicht mehr — nur noch das Wegraeumen kennt ihn', () => {
    expect(named).not.toContain('ch360_last_session_id');
    const writes = code.match(/setItem\([^)]*last_session/gi) ?? [];
    expect(writes).toEqual([]);
  });
});
