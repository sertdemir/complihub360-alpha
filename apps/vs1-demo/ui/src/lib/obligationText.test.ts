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
    // Bis 20.11.2026 "Gilt jetzt" / "Live": das las sich als laufende Pflicht
    // des Nutzers, gemeint war "ohne festen Termin" (Feedback CW-F04).
    expect(privacy.dueSub).toBe('Kein fester Termin');
  });

  // Feedback CW-F04: Titel, Quelle, Linkziel und Phase je Zeile.
  it('nennt US Sales Tax beim Namen, beschriftet den EU-Link als EU-Grundlage und macht einen Plan nicht faellig', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'de', ns: ['results', 'common'], defaultNS: 'results',
      resources: { de: { results: load('de', 'results'), common: load('de', 'common') } },
      interpolation: { escapeValue: false },
    });
    const law = (o: Partial<SearchLaw>): SearchLaw => ({ id: 'tax-vat-registration', title: 'VAT Registration & Filing', description: '', severity: 'high', markets: ['DE'], source: 's', due: 'Quarterly', state: 'likely', ...o });
    const [us, de, uk] = liveObligations([
      law({ key: 'tax-vat-registration@US:planned', phase: 'planned', markets: ['US'], title: 'US Sales Tax (state level)', title_key: 'tax-vat-registration.US', source: 'State economic-nexus rules (post-Wayfair)', due: 'Monthly' }),
      law({ key: 'tax-vat-registration@DE:planned', phase: 'planned', markets: ['DE'], source: 'UStG §18 / §18i (OSS)', source_url: 'https://eur-lex.europa.eu/x', source_url_label: 'EU VAT Directive 2006/112/EC' }),
      law({ key: 'tax-vat-registration@UK:current', phase: 'current', markets: ['UK'], source: 'UK VATA 1994 §3', due_days: 30 }),
    ], i18n.t as never, 'de', 'de-DE', { US: 'planned', DE: 'planned', UK: 'current' });
    expect(us.title).toBe('US-Sales-Tax (Bundesstaaten)');
    expect([us.sourceUrl, us.law]).toEqual([undefined, 'State economic-nexus rules (post-Wayfair)']);
    expect(us.dueSub).toBe('sobald Sie dort starten');
    // Der Link oeffnet die EU-Richtlinie und heisst so; das UStG steht als Text daneben.
    expect(de.sourceLabel).toBe('EU-Grundlage: EU VAT Directive 2006/112/EC');
    expect(de.law).toBe('UStG §18 / §18i (OSS)');
    expect(de.market).toContain('geplant');
    // Heutige Taetigkeit behaelt ihre Frist; kein Link auf EU-Recht fuer UK.
    expect([uk.sourceUrl, uk.law, uk.dueSub]).toEqual([undefined, 'UK VATA 1994 §3', '30 Tage']);
    expect(new Set([us.rowKey, de.rowKey, uk.rowKey]).size).toBe(3);
  });
});
