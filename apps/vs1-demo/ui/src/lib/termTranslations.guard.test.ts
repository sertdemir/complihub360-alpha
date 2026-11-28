import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── Waechter: Fachbegriffe bleiben in DE, ES und TR einheitlich ────────────
// terminology:check erzwingt das Vokabular nur fuer Englisch. In den
// Uebersetzungen standen bis November 2026 noch „Partner“ / „socio“ fuer
// Anbieter, „Schweregrad“ / „Severidad“ fuer Prioritaet und ein uebersetztes
// „Verified Provider“ (PR #474).
//
// Regel 1: Spricht EN von „provider“ und nicht von „partner“, steht in der
//          Uebersetzung kein „Partner“ / „socio“ / „ortak“.
// Regel 2: Enthaelt EN den Eigennamen „Verified Provider“, steht er auch in
//          der Uebersetzung (er wird nicht uebersetzt).
// Regel 3: Der Prioritaetsbegriff wird nicht zu „Schweregrad“, „Severidad“
//          oder „Ciddiyet“.
// Echte Partnerschaften (Vertragspartner, Logistikpartner) bleiben erlaubt:
// Dort sagt auch EN „partner“.

const LOCALES = join(__dirname, '../../public/locales');
const PARTNER: Record<string, RegExp> = {
  de: /Partner/,
  es: /\bsocios?\b/i,
  tr: /\bortak/i,
};
const SCHWEREGRAD = /Schweregrad|severidad|ciddiyet/i;

const flat = (o: unknown, p = ''): Array<[string, string]> =>
  o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k))
    : typeof o === 'string' ? [[p, o]] : [];

const dateien = readdirSync(join(LOCALES, 'en')).filter((f) => f.endsWith('.json'));
const lies = (lang: string, datei: string) =>
  new Map(flat(JSON.parse(readFileSync(join(LOCALES, lang, datei), 'utf8'))));
// E-Mail-Adressen (partners@…) sind kein Begriff.
const ohneMail = (v: string) => v.replace(/\S+@\S+/g, '');

describe.each(['de', 'es', 'tr'])('Fachbegriffe in %s', (lang) => {
  it.each(dateien)('%s', (datei) => {
    const en = lies('en', datei);
    const tg = lies(lang, datei);
    const paare = [...en].flatMap(([k, v]) => (tg.get(k) ? [[k, v, tg.get(k)!] as const] : []));

    const partner = paare
      .filter(([, e, t]) => /\bproviders?\b/i.test(e) && !/partner/i.test(e) && PARTNER[lang].test(ohneMail(t)))
      .map(([k, , t]) => `${k}: ${t}`);
    const verified = paare
      .filter(([, e, t]) => e.includes('Verified Provider') && !t.includes('Verified Provider'))
      .map(([k, , t]) => `${k}: ${t}`);
    const schwere = [...tg].filter(([, v]) => SCHWEREGRAD.test(v)).map(([k, v]) => `${k}: ${v}`);

    expect(partner, `${lang}/${datei}: EN sagt „provider“, die Uebersetzung „Partner“`).toEqual([]);
    expect(verified, `${lang}/${datei}: „Verified Provider“ uebersetzt`).toEqual([]);
    expect(schwere, `${lang}/${datei}: Prioritaet als Schweregrad uebersetzt`).toEqual([]);
  });
});
