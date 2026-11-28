import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── Waechter: die deutschen Sprachdateien siezen ────────────────────────────
// Produkt-Copy und Oberflaechentexte siezen (CLAUDE.md, Ansprache; DeepL laeuft
// mit formality "more"). Bis November 2026 stand die Anbieter-Paket-Seite
// (providerws.intake) als einzige Flaeche im Du — aufgefallen beim Nachziehen
// der deutschen Uebersetzungen (28.11.2026).
//
// Geprueft werden nur Werte. Die Muster verlangen ganze Woerter, "du" in
// "Produkt" oder "dir" in "direkt" trifft also nicht.

const DE = join(__dirname, '../../public/locales/de');
const DU = /\b(du|dich|dir|dein|deine[mnrs]?|Du|Dich|Dir|Dein|Deine[mnrs]?)\b/;

const flat = (o: unknown, p = ''): Array<[string, string]> =>
  o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k))
    : typeof o === 'string' ? [[p, o]] : [];

describe('Deutsche Anrede: Sie', () => {
  it.each(readdirSync(DE).filter((f) => f.endsWith('.json')))('%s duzt nicht', (datei) => {
    const treffer = flat(JSON.parse(readFileSync(join(DE, datei), 'utf8')))
      .map(([k, v]) => [k, v.match(DU)?.[0]] as const)
      .filter(([, w]) => w)
      .map(([k, w]) => `${k}: ${w}`);
    expect(treffer, `${datei}: Du-Anrede`).toEqual([]);
  });
});
