import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── Waechter: "Risk Map" ist ein Plattformbegriff ───────────────────────────
// Handover 1.0 §14: "Capitalize Risk Map, Verified Provider, and CompliHub360
// when used as defined platform terms." Bis November 2026 stand "risk map" an
// rund 70 Stellen der englischen Sprachdateien klein (PR #429, #454).
//
// Geprueft wird nur EN: DE schreibt "Risk Map" ohnehin gross, ES und TR
// uebersetzen den Begriff ("mapa de riesgos", "risk haritasi").
// terminology:check prueft Begriffe ohne Ruecksicht auf die Schreibweise —
// die Grossschreibung braucht deshalb diesen eigenen Waechter.

const EN = join(__dirname, '../../public/locales/en');

const flat = (o: unknown, p = ''): Array<[string, string]> =>
  o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k))
    : typeof o === 'string' ? [[p, o]] : [];

describe('Risk Map — Grossschreibung in EN', () => {
  it.each(readdirSync(EN).filter((f) => f.endsWith('.json')))('%s schreibt "Risk Map" gross', (datei) => {
    const klein = flat(JSON.parse(readFileSync(join(EN, datei), 'utf8')))
      .filter(([, v]) => /\b(risk map|Risk map|risk Map)s?\b/.test(v))
      .map(([k]) => k);
    expect(klein, `${datei}: "Risk Map" klein geschrieben`).toEqual([]);
  });
});
