import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── Waechter: die Sprachdateien siezen ──────────────────────────────────────
// Produkt-Copy und Oberflaechentexte siezen (CLAUDE.md, Ansprache; DeepL laeuft
// fuer DE und ES mit formality "more"). Bis November 2026 duzten die Anbieter-
// Paket-Seite (providerws.intake) und der Bewertungsdialog (userws.review) in
// DE, ES und TR, dazu ein paar spanische Saetze in common — aufgefallen beim
// Nachziehen der Uebersetzungen (PR #469, #471).
//
// DE: du/dich/dir/dein… · ES: tú/tu/tus/te/ti. Geprueft werden nur Werte; die
// Muster verlangen ganze Woerter ("dir" in "direkt" trifft nicht).
// TR hat keinen Waechter: Die Du-Formen stecken in Verbendungen ("alırsın"),
// die ein Wortmuster nicht sauber von anderen Endungen trennt.

const LOCALES = join(__dirname, '../../public/locales');
const MUSTER: Record<string, RegExp> = {
  de: /\b(du|dich|dir|dein|deine[mnrs]?|Du|Dich|Dir|Dein|Deine[mnrs]?)\b/,
  es: /(?<![\p{L}])(tú|tu|tus|te|ti|Tú|Tu|Tus|Te|Ti)(?![\p{L}])/u,
};

const flat = (o: unknown, p = ''): Array<[string, string]> =>
  o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k))
    : typeof o === 'string' ? [[p, o]] : [];

describe.each(Object.keys(MUSTER))('Anrede %s: Sie / usted', (lang) => {
  const dir = join(LOCALES, lang);
  it.each(readdirSync(dir).filter((f) => f.endsWith('.json')))('%s duzt nicht', (datei) => {
    const treffer = flat(JSON.parse(readFileSync(join(dir, datei), 'utf8')))
      .map(([k, v]) => [k, v.match(MUSTER[lang])?.[0]] as const)
      .filter(([, w]) => w)
      .map(([k, w]) => `${k}: ${w}`);
    expect(treffer, `${lang}/${datei}: informelle Anrede`).toEqual([]);
  });
});
