import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import {
  ObligationEnrichmentMap,
  resolveEnrichment,
  resolveEnrichmentKey,
  type CountryCode,
} from '@complihub/compliance-engine';
import { penaltyText } from './penaltyCeiling';

// Die Strafangaben der Engine (2026-10-07). `penalty` stand bis dahin in der
// Sprache, die der Redaktion gerade zur Hand war — "unbegrenzte Geldstrafe"
// auf der englischen Seite, "amende penale" auf der deutschen, Niederlaendisch
// und Italienisch dazwischen. Jetzt ist `penalty` die englische Fassung, und
// jede Sprache liest compliance.penaltyText.<subdomainId>.<Land|default>.
//
// Ein fehlender Schluessel faellt in der Oberflaeche nicht auf: i18next gibt
// dann die englische Fassung zurueck, und auf der englischen Seite sieht alles
// richtig aus. Deshalb prueft das hier ein Test und nicht das Auge.

const HERE = dirname(fileURLToPath(import.meta.url));
const LNGS = ['en', 'de', 'es', 'tr'] as const;
type Texte = Record<string, Record<string, string>>;
const texte = (lng: string): Texte =>
  JSON.parse(readFileSync(join(HERE, `../../public/locales/${lng}/common.json`), 'utf8')).compliance.penaltyText;

const eintraege: Array<[string, string, string]> = [];
for (const [sub, byCountry] of Object.entries(ObligationEnrichmentMap)) {
  for (const [key, e] of Object.entries(byCountry)) if (e) eintraege.push([sub, key, e.penalty]);
}

describe('Strafangaben in vier Sprachen', () => {
  it('hat Eintraege zu pruefen', () => {
    expect(eintraege.length).toBeGreaterThan(50);
  });

  for (const lng of LNGS) {
    it(`${lng}: jede Strafangabe hat einen Text, kein Text ist verwaist`, () => {
      const t = texte(lng);
      const ohne = eintraege.filter(([sub, key]) => !t[sub]?.[key]?.trim()).map(([s, k]) => `${s}.${k}`);
      expect(ohne, `ohne Text: ${ohne.join(', ')}`).toEqual([]);
      const verwaist = Object.entries(t).flatMap(([sub, by]) =>
        Object.keys(by).filter((key) => !ObligationEnrichmentMap[sub]?.[key as CountryCode | 'default']).map((k) => `${sub}.${k}`),
      );
      expect(verwaist, `ohne Eintrag in der Engine: ${verwaist.join(', ')}`).toEqual([]);
    });
  }

  it('die englische Datei ist woertlich die Fassung der Engine', () => {
    // Zwei Orte, ein Text: wer in der Engine korrigiert, muss es hier auch.
    const en = texte('en');
    const abweichend = eintraege.filter(([sub, key, p]) => en[sub]?.[key] !== p).map(([s, k]) => `${s}.${k}`);
    expect(abweichend, `EN weicht von der Engine ab: ${abweichend.join(', ')}`).toEqual([]);
  });

  it('die englische Fassung ist Englisch', () => {
    // Die Woerter, an denen der alte Mischbestand zu erkennen war. Eigennamen
    // (VerpackDG, Abmahnung, UWG) stehen nicht auf der Liste.
    const fremd = /\b(bis|zu|je|mind|bei|fest|oder|des|der|und|Geldstrafe|Klauseln|majoration|amende|intérêts|sanzioni|multas|cuota|boete|boetes|tot)\b|[äöüß]/i;
    const treffer = eintraege.filter(([, , p]) => fremd.test(p)).map(([s, k, p]) => `${s}.${k}: ${p}`);
    expect(treffer).toEqual([]);
  });

  it('keine Uebersetzung ist die englische Fassung mit anderem Etikett', () => {
    // Fehlt eine Uebersetzung, ist die Versuchung gross, das Englische zu
    // kopieren. Gleich bleiben duerfen nur Eintraege ohne Wort, das sich
    // uebersetzen liesse.
    const en = texte('en');
    for (const lng of ['de', 'es', 'tr']) {
      const t = texte(lng);
      const kopiert = eintraege
        .filter(([sub, key]) => t[sub]?.[key] === en[sub]?.[key])
        .map(([s, k]) => `${lng} ${s}.${k}`);
      expect(kopiert).toEqual([]);
    }
  });
});

describe('Der Schluessel reist mit', () => {
  it('resolveEnrichmentKey zeigt auf denselben Eintrag wie resolveEnrichment', () => {
    const faelle: CountryCode[][] = [['DE'], ['UK'], ['FR', 'DE'], ['US'], ['TR'], []];
    for (const sub of Object.keys(ObligationEnrichmentMap)) {
      for (const markets of faelle) {
        const key = resolveEnrichmentKey(sub, markets);
        const e = resolveEnrichment(sub, markets);
        expect(key ? ObligationEnrichmentMap[sub][key] : null).toBe(e);
      }
    }
  });

  it('penaltyText liest die Sprache des Lesers und faellt ohne Schluessel auf Englisch zurueck', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'de',
      ns: ['common'],
      defaultNS: 'common',
      resources: { de: { common: { compliance: { penaltyText: texte('de') } } } },
    });
    const uk = ObligationEnrichmentMap['prod-epr'].UK!;
    expect(penaltyText(i18n.t, 'prod-epr.UK', uk.penalty)).toBe('unbegrenzte Geldstrafe; Festbetragsstrafe 1.000 £');
    expect(penaltyText(i18n.t, null, uk.penalty)).toBe('unlimited fine; fixed penalty £1,000');
    // Ein Schluessel, den es nicht gibt, zeigt die englische Fassung — nie den Schluessel.
    expect(penaltyText(i18n.t, 'prod-epr.XX', uk.penalty)).toBe(uk.penalty);
  });
});
