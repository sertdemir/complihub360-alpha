import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── Waechter: „Risk Map“ bleibt in DE, ES und TR „Risk Map“ ────────────────
// EN-Launch Schritt 3 (10.10.2026): Die gespeicherte Karte heisst ueberall
// „Risk Map“, „Session“ ist abgeschafft. terminology:check erzwingt das nur fuer
// Englisch. In DE/ES/TR standen bis November 2026 noch rund 170 Stellen mit
// „Sitzung“, „sesión“ und „oturum“ (TR „Oturumu aç“ las sich als „Anmelden“)
// sowie „Risikokarte“, „mapa de riesgos“ und „risk haritası“ (PR #472).
//
// Regel 1: Enthaelt der EN-Wert „Risk Map“, enthaelt die Uebersetzung
//          „Risk Map“ (DE auch „Risk-Map“ in Komposita).
// Regel 2: Kein Wert uebersetzt den Begriff.
// Anmelde-Sitzungen bleiben erlaubt: „iniciar sesión“, „oturum aç“ und die
// Browser-Sitzung beim Zuruecksetzen tragen kein „Risk Map“ im EN-Wert.

const LOCALES = join(__dirname, '../../public/locales');
const UEBERSETZT = /Risikokarte|Risiko-Karte|mapas? de riesgos?|risk harita/i;

const flat = (o: unknown, p = ''): Array<[string, string]> =>
  o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k))
    : typeof o === 'string' ? [[p, o]] : [];

const dateien = readdirSync(join(LOCALES, 'en')).filter((f) => f.endsWith('.json'));
const lies = (lang: string, datei: string) =>
  new Map(flat(JSON.parse(readFileSync(join(LOCALES, lang, datei), 'utf8'))));

describe.each(['de', 'es', 'tr'])('Risk Map in %s', (lang) => {
  it.each(dateien)('%s', (datei) => {
    const en = lies('en', datei);
    const tg = lies(lang, datei);
    const fehlt = [...en]
      .filter(([k, v]) => v.includes('Risk Map') && tg.get(k) && !/Risk[ -]Map/.test(tg.get(k)!))
      .map(([k]) => `${k}: ${tg.get(k)}`);
    const uebersetzt = [...tg].filter(([, v]) => UEBERSETZT.test(v)).map(([k, v]) => `${k}: ${v}`);
    expect(fehlt, `${lang}/${datei}: EN sagt „Risk Map“, die Uebersetzung nicht`).toEqual([]);
    expect(uebersetzt, `${lang}/${datei}: „Risk Map“ uebersetzt`).toEqual([]);
  });
});
