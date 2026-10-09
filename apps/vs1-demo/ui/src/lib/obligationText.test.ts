import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import { DomainTemplateLibrary, ObligationEnrichmentMap } from '@complihub/compliance-engine';
import { liveObligations } from '../pages/ResultsRiskMap';
import type { SearchLaw } from '../api/search';

// Pflichttitel und Kadenz kommen aus der Engine auf Englisch. Die
// Sprachdateien fuehren sie (markets.obligations / obligationDesc / cadence);
// bis 2026-10-09 las nur die Arbeitsflaeche sie, die Risk Map und die
// Bereichsseiten zeigten "VAT Registration & Filing · Annual" in jeder
// Sprache. Ein fehlender Eintrag faellt still auf Englisch zurueck — deshalb
// prueft das ein Test.

const HERE = dirname(fileURLToPath(import.meta.url));
const LNGS = ['en', 'de', 'es', 'tr'] as const;
const load = (lng: string, ns: string) =>
  JSON.parse(readFileSync(join(HERE, `../../public/locales/${lng}/${ns}.json`), 'utf8'));

const ids = Object.values(DomainTemplateLibrary).flatMap((subs) => subs.map((s) => s.id));
const dues = new Set<string>();
for (const by of Object.values(ObligationEnrichmentMap)) for (const e of Object.values(by)) if (e) dues.add(e.due);

describe('Pflichttitel und Kadenz in vier Sprachen', () => {
  it('hat Vorlagen und Kadenzen zu pruefen', () => {
    expect(ids.length).toBeGreaterThan(20);
    expect(dues.size).toBeGreaterThan(3);
  });

  for (const lng of LNGS) {
    it(`${lng}: jede Vorlage hat Titel und Beschreibung, jede Kadenz einen Text`, () => {
      const m = load(lng, 'common').markets;
      expect(ids.filter((id) => !m.obligations?.[id]?.trim()), 'ohne Titel').toEqual([]);
      expect(ids.filter((id) => !m.obligationDesc?.[id]?.trim()), 'ohne Beschreibung').toEqual([]);
      expect([...dues].filter((d) => !m.cadence?.[d]?.trim()), 'ohne Kadenz').toEqual([]);
    });
  }
});

describe('Risk Map liest Titel und Kadenz in der Sprache des Lesers', () => {
  it('uebersetzt Titel, Kadenz und "Live"', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'de', ns: ['results', 'common'], defaultNS: 'results',
      resources: { de: { results: load('de', 'results'), common: load('de', 'common') } },
      interpolation: { escapeValue: false },
    });
    const law = (o: Partial<SearchLaw>): SearchLaw => ({ id: 'x', title: 'X', description: '', severity: 'high', markets: ['DE'], source: 's', due: 'Ongoing', state: 'likely', ...o });
    const [vat, privacy] = liveObligations(
      [law({ id: 'tax-vat-registration', title: 'VAT Registration & Filing', due: 'Annual', due_days: 120 }),
       law({ id: 'data-privacy', title: 'Data Privacy Policy', due: 'Ongoing' })],
      i18n.t as never, 'de', 'de-DE',
    );
    expect(vat.title).toBe(load('de', 'common').markets.obligations['tax-vat-registration']);
    expect(vat.title).not.toBe('VAT Registration & Filing');
    expect(vat.due).toBe('Jährlich');
    expect(privacy.dueSub).toBe('Gilt jetzt');
  });
});
