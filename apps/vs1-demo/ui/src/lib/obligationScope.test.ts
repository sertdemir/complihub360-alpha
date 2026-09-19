import { describe, expect, it } from 'vitest';
import { FX_JE_EUR, FX_STAND, inEuro, isEuMember, ObligationEnrichmentMap } from '@complihub/compliance-engine';
import { getAreaObligations } from './areaProfiles';
import { getMarketProfile, MARKET_CODES } from './marketProfiles';
import { DOMAINS } from './domains';

// ─── A placeholder must never reach the page as a legal basis ────────────────
// The area page's whole claim is that every duty traces to a named statute.
// Five of the engine's fallback entries are not statutes: they are strings
// SHAPED like citations — "National corporate income tax act" — standing where
// one belongs. Rendered in the Rechtsgrundlage cell they sit in the same place,
// in the same weight, as "UStG §18i (OSS)", and nothing about them looks wrong.
//
// That is the failure this file exists to make impossible, and it is invisible
// without a test: no error, no empty state, just a citation that cites nothing.

describe('obligation scope', () => {
  it('classifies every fallback entry', () => {
    // A default with no scope is read as 'eu' — the shape that existed before
    // the field was widened. This pins that every entry has been LOOKED at,
    // so a new one that is really a gap cannot inherit "not a gap" silently.
    for (const [id, byCountry] of Object.entries(ObligationEnrichmentMap)) {
      const fallback = (byCountry as Record<string, { scope?: string } | undefined>).default;
      if (!fallback) continue;
      expect(['eu', 'national-pending', 'placeholder'], `${id} default`).toContain(
        fallback.scope ?? 'eu',
      );
    }
  });

  it('never hands a placeholder on as a source', () => {
    // Through the market profile, which is where the gap list is built.
    for (const code of MARKET_CODES) {
      for (const gap of getMarketProfile(code).gaps) {
        if (gap.kind === 'placeholder') {
          expect(gap.source, `${code}/${gap.subdomainId}`).toBeNull();
        }
      }
    }
  });

  it('marks the scope on every fallback obligation and none of the national ones', () => {
    for (const domain of DOMAINS) {
      for (const code of MARKET_CODES) {
        for (const o of getAreaObligations(domain.slug, code)) {
          if (o.marketSpecific) {
            // A country override IS national — a scope would be meaningless.
            expect(o.scope, `${code}/${o.id}`).toBeUndefined();
          } else {
            expect(o.scope, `${code}/${o.id}`).toBeDefined();
          }
        }
      }
    }
  });

  it('counts an EU Regulation standing in as coverage, not as a gap', () => {
    // The whole point. Germany holds no national entry for the GDPR duties,
    // because the GDPR is a Regulation and there is no German text to hold.
    // Reporting that as a hole in our data was reporting the law as a hole.
    const gaps = getMarketProfile('DE').gaps;
    expect(gaps.map((g) => g.subdomainId)).not.toContain('data-privacy');
    expect(gaps.map((g) => g.subdomainId)).not.toContain('prod-safety');
    expect(gaps, 'Germany has no real coverage gap').toHaveLength(0);
  });

  it('still reports the gaps that are real', () => {
    // Turkey is the market where it actually bites, and the one that would
    // regress silently if 'national-pending' ever got folded back into 'eu'.
    const tr = getMarketProfile('TR').gaps.map((g) => g.subdomainId);
    expect(tr).toContain('corp-registration');
    expect(tr).toContain('tax-corporate');
    expect(tr).toContain('prod-epr');
    expect(tr).toContain('legal-commercial-contracts');
  });

  it('does not call a Directive directly applicable', () => {
    // The 16 pre-existing 'eu' markings were written for a looser meaning —
    // "applies market-independently across the EU" — and three of them name a
    // DIRECTIVE in their own source string. A Directive is transposed, so a
    // national text exists and its absence IS a gap. Reading the label is not
    // a legal judgement; letting a Directive claim "nothing is missing" is the
    // exact false comfort this whole change removes.
    for (const [id, byCountry] of Object.entries(ObligationEnrichmentMap)) {
      const fallback = (byCountry as Record<string, { source?: string; scope?: string } | undefined>)
        .default;
      if (!fallback?.source) continue;
      if (!/\bDirective\b|AMLD/.test(fallback.source)) continue;
      expect(fallback.scope, `${id} names a Directive`).not.toBe('eu');
    }
  });
});

// ─── The market profile must be renderable for every market ─────────────────
// Eight market pages ship from one component tree, and the shapes differ: a
// market with three cadence groups, one with five, one with no gaps at all.
// Each of those is a branch that only that market exercises, so a change that
// works on Germany can still blank Turkey.
describe('market profiles', () => {
  it('gives every market something to render in every section', () => {
    for (const code of MARKET_CODES) {
      const p = getMarketProfile(code);
      expect(p.obligations.length, `${code} duties`).toBeGreaterThan(0);
      expect(p.byCadence.length, `${code} cadence groups`).toBeGreaterThan(0);
      // No empty cadence column may reach the calendar.
      for (const g of p.byCadence) expect(g.items.length, `${code}/${g.due}`).toBeGreaterThan(0);
      // The weights row is the spine into the area pages: all nine, always.
      expect(p.weights.length, `${code} weights`).toBe(9);
      // Aggregates the hero pills read.
      expect(p.exposureEur, `${code} exposure`).toBeGreaterThan(0);
      expect(p.heaviest, `${code} heaviest`).not.toBeNull();
    }
  });

  it('orders the calendar by how often it rings, not alphabetically', () => {
    // The canvas puts the most frequent group first because that is where the
    // operational burden falls: a monthly filing costs twelve times an annual
    // one. Alphabetical would open on "Annual" for most markets.
    const order = ['Monthly', 'Quarterly', 'Annual', 'Ongoing', 'One-off'];
    for (const code of MARKET_CODES) {
      const seen = getMarketProfile(code).byCadence.map((g) => order.indexOf(g.due));
      expect([...seen].sort((a, b) => a - b), `${code}`).toEqual(seen);
    }
  });
});

// ─── Ein EU-Rechtsakt ist ausserhalb der EU keine Rechtsgrundlage ────────────
// `scope: 'eu'` traegt im Code eine Begruendung mit: "Directly applicable and
// identical in every member state, so there is no national text to hold: this
// IS the applicable law. NOT a coverage gap, and must never be rendered as
// one." Diese Begruendung gilt INNERHALB der Union.
//
// `getAreaObligations` filtert nicht nach Markt: fehlt einer Pflicht die
// Landes-Ueberschreibung, greift `default`, und der ist fast immer ein
// EU-Rechtsakt. Am gebauten Stand nachgemessen (2026-09-17):
//
//   US  log-intrastat   → EBS Reg. 2019/2152 (Intrastat)
//   TR  log-intrastat   → EBS Reg. 2019/2152 (Intrastat)
//   US  prod-epr        → EU PPWR 2025/40
//
// Intrastat ist die INNERGEMEINSCHAFTLICHE Handelsstatistik — fuer die USA und
// die Tuerkei gibt es diese Pflicht nicht. Bei der PPWR liegt es anders: sie
// bindet jeden, der Verpackungen auf dem EU-Markt in Verkehr bringt, also auch
// einen US-Haendler. Falsch ist dort nicht der Rechtsakt, sondern die SPALTE —
// unter "Markt USA" steht, was fuer den Verkauf in die EU gilt.
//
// Beides ist dieselbe Luecke: ausserhalb der EU fehlt der nationale Eintrag,
// und der EU-Standard tritt an seine Stelle, ohne sich als Luecke zu zeigen.
//
// DIESER TEST BEHEBT DAS NICHT. Er haelt den Bestand fest und verhindert, dass
// er waechst: eine neue Pflicht ohne nationalen Eintrag faellt hier sofort auf.
// Die Liste ist die sichtbare Schuld — sie darf nur schrumpfen.
describe('EU-Standard ausserhalb der EU', () => {
  // Stand 2026-09-18: 35 Kombinationen. Jede Zeile heisst "dieser Markt sieht
  // einen EU-Rechtsakt als seine Rechtsgrundlage, und wir wissen es".
  const BEKANNTE_LUECKEN = new Set([
    'TR/data-hosting', 'UK/data-hosting',
    'TR/log-customs-classification', 'UK/log-customs-classification',
    'US/log-eori',
    'TR/log-intrastat', 'UK/log-intrastat', 'US/log-intrastat',
    'TR/mktg-health-claims', 'UK/mktg-health-claims',
    'TR/prod-packaging-conformity', 'UK/prod-packaging-conformity', 'US/prod-packaging-conformity',
    'TR/prod-packaging-empty-space', 'UK/prod-packaging-empty-space', 'US/prod-packaging-empty-space',
    'TR/prod-packaging-format-bans', 'UK/prod-packaging-format-bans', 'US/prod-packaging-format-bans',
    'TR/prod-packaging-recyclability', 'UK/prod-packaging-recyclability', 'US/prod-packaging-recyclability',
    'TR/prod-packaging-recycled-content', 'UK/prod-packaging-recycled-content', 'US/prod-packaging-recycled-content',
    'TR/prod-packaging-reuse-targets', 'UK/prod-packaging-reuse-targets', 'US/prod-packaging-reuse-targets',
    'TR/prod-safety',
    // Umwelt-Domaene, neu am 18.09.2026. Batterieverordnung und REACH sind
    // Unionsrecht und gelten ausserhalb der EU NICHT — die Fundstelle traegt
    // fuer diese drei Maerkte also nicht. Nationale Entsprechungen existieren
    // (UK REACH und die UK WEEE Regulations nach dem Brexit, in der Tuerkei die
    // AEEE-Regulierung, in den USA Stoffrecht auf Bundes- und E-Schrott-Recht
    // auf Bundesstaatenebene), aber keine davon ist hier am Primaertext
    // geprueft. Sie zu raten waere schlimmer als die Luecke zu benennen —
    // deshalb steht sie hier und nicht in der Enrichment-Map.
    // WEEE selbst faellt nicht an: sein default traegt 'national-pending',
    // weil eine Richtlinie ohnehin nur ueber nationales Umsetzungsrecht gilt.
    'TR/env-batteries-epr', 'UK/env-batteries-epr', 'US/env-batteries-epr',
    'TR/env-reach-substances', 'UK/env-reach-substances', 'US/env-reach-substances',
  ]);

  const gefunden = () => {
    const out = new Set<string>();
    for (const code of MARKET_CODES) {
      // MARKET_CODES fuehrt kein 'EU' — die Bloecksicht hat keine Nationalitaet
      // und faellt deshalb gar nicht erst an.
      if (isEuMember(code)) continue;
      for (const domain of DOMAINS) {
        for (const o of getAreaObligations(domain.slug, code)) {
          if (o.scope === 'eu') out.add(`${code}/${o.id}`);
        }
      }
    }
    return out;
  };

  it('kennt keine unbekannte Luecke', () => {
    const neu = [...gefunden()].filter((k) => !BEKANNTE_LUECKEN.has(k)).sort();
    expect(neu, 'Neue Pflicht ohne nationalen Eintrag: entweder eine Landes-Ueberschreibung ergaenzen oder die Luecke hier eintragen und begruenden').toEqual([]);
  });

  it('fuehrt keine Luecke, die es nicht mehr gibt', () => {
    // Ohne das verrottet die Liste: ein behobener Eintrag bliebe stehen und
    // liesse die Schuld groesser aussehen, als sie ist.
    const ist = gefunden();
    const veraltet = [...BEKANNTE_LUECKEN].filter((k) => !ist.has(k)).sort();
    expect(veraltet, 'Behoben — bitte aus BEKANNTE_LUECKEN entfernen').toEqual([]);
  });
});

// ─── Keine Risikozahl ohne belegte Obergrenze ────────────────────────────────
// `penaltyMaxEur` fuehrt drei verschiedene Dinge in einem Feld. Die Pruefung am
// Primaertext (2026-09-17) hat gezeigt, welche:
//
//   - einen gesetzlichen Betrag in EUR                       33 Eintraege
//   - eine UNDATIERTE UMRECHNUNG aus GBP, USD oder TRY       21 Eintraege
//   - eine SCHAETZUNG, wo das Gesetz keinen Betrag nennt     18 Eintraege
//
// Der letzte Fall ist der schwerste. PPWR Art. 68: "Bis zum 12. Februar 2027
// erlassen die Mitgliedstaaten Vorschriften ueber Sanktionen." Es gibt dort
// keinen Betrag, den man zitieren koennte — er ist noch nicht erlassen. Neben
// so einen Wert passt keine Fundstelle, ohne selbst zu luegen.
//
// Deshalb ersetzt `penaltyCeiling` den eine Woche alten Ansatz `penaltyBasis`:
// Betrag IN SEINER WAEHRUNG, mit Vorschrift und Stand — oder ausdruecklich
// `delegated`, wenn es keinen gibt.
//
// DIESER TEST ENTFERNT NICHTS. `penaltyMaxEur` bleibt vorerst, weil vier
// Flaechen davon leben (eine davon die Startseite); was dort statt einer Zahl
// stehen soll, ist eine Produktentscheidung und keine Aufraeumarbeit. Der Test
// haelt drei Beststaende fest und laesst sie nur schrumpfen.
describe('Belegte Obergrenze', () => {
  // Stand 2026-09-19. Belegt sind 55: 3x DSGVO Art. 83 Abs. 5 (20 Mio EUR oder
  // 4 % Weltjahresumsatz), 7x PPWR Art. 68 (delegiert, kein Betrag), 15 deutsche
  // Eintraege (gesetze-im-internet.de, davon 6 zur PPWR aus VerpackDG § 66),
  // 4 niederlaendische (wetten.overheid.nl), 6 spanische (boe.es),
  // 8 britische (legislation.gov.uk) und 8 US-Eintraege (ecfr.gov,
  // federalregister.gov) — alle am Primaertext gelesen. Von den acht
  // amerikanischen sind drei `subnational`: dort setzt der Bund nichts.
  // Dazu `US/data-hosting`: der EU-US-Datenschutzrahmen kennt keine eigene Busse.
  // Seit 19.09. ausserdem 7 italienische (normattiva.it, ueber den Browser)
  // und 6 franzoesische (legifrance.gouv.fr ueber die PISTE-API).
  const OHNE_OBERGRENZE_STAND = 16;
  // Eintraege, deren Obergrenze GAR KEINEN absoluten Betrag nennt — delegiert,
  // "es gibt keine Geldbusse", rein umsatz- oder steueranteilig — und die
  // trotzdem eine Eurozahl fuehren. Das ist der Widerspruch in Reinform: das
  // Gesetz nennt keinen Betrag, die Oberflaeche zaehlt trotzdem einen hoch.
  //
  // Frueher eine Zahl, die "nur schrumpfen" durfte. Das trug nicht: jedes Mal,
  // wenn eine Obergrenze BELEGT wird, kommt heraus, dass daneben eine Eurozahl
  // ohne gesetzliche Entsprechung steht — der Bestand WAECHST beim Aufraeumen.
  // Deshalb jetzt eine namentliche Liste. Sie darf nur kleiner werden, und
  // jeder Neuzugang muss hier eingetragen werden, mit Namen und in Sichtweite
  // des Reviews. Eine Zahl haette das verschluckt.
  const OHNE_BETRAG_BEKANNT = [
    'DE/legal-commercial-contracts', // keine Geldbusse, nur zivilrechtliche Folge
    'DE/legal-consumer-terms', // 4 % Jahresumsatz, UWG § 19
    'ES/tax-corporate', // 150 % der Steuerschuld, LGT Art. 191
    'FR/prod-epr', // 7.500 EUR JE Einheit/Tonne, Code env. Art. L541-9-5 — kein Deckel
    'FR/tax-corporate', // 80 % der Steuer, CGI Art. 1728/1729
    'FR/tax-vat-registration', // 80 % der Steuer, CGI Art. 1728
    'IT/tax-corporate', // 120 % der Steuer, TU 173/2024 Art. 27
    'IT/tax-vat-registration', // 120 % der Steuer, TU 173/2024 Art. 30
    'ES/tax-vat-registration', // 150 % der Steuerschuld, LGT Art. 191
    'UK/log-eori', // keine Geldbusse; EORI fehlt im Anhang zu SI 2003/3113
    'US/corp-registration', // Landesrecht, 50 Staaten
    'US/data-hosting', // keine eigene Busse; Folge ist Streichung von der Liste
    'US/data-privacy', // Landesrecht, CCPA plus rund 20 weitere
    'US/log-customs-classification', // 100 % des Inlandswerts, 19 CFR 162.73
    'US/tax-corporate', // 25 % der Steuer, 26 CFR 301.6651-1
    'US/tax-vat-registration', // Landesrecht, 45 Staaten plus D.C.
    'UK/prod-epr', // unbegrenzte Geldstrafe, SI 2024/1332 Reg. 119
    'UK/tax-corporate', // 20 % der offenen Steuer, FA 1998 Sch. 18 Abs. 18
    'UK/tax-vat-registration', // 100 % der entgangenen Steuer, FA 2008 Sch. 41
    'default/prod-epr', // PPWR Art. 68, delegiert
    'default/prod-packaging-conformity',
    'default/prod-packaging-empty-space',
    'default/prod-packaging-format-bans',
    'default/prod-packaging-recyclability',
    'default/prod-packaging-recycled-content',
    'default/prod-packaging-reuse-targets',
  ];

  const BESTAND = new Set([
    'corp-registration', 'data-hosting', 'data-privacy', 'legal-commercial-contracts',
    'legal-consumer-terms', 'log-customs-classification', 'log-eori', 'log-intrastat',
    'mktg-consent', 'mktg-health-claims', 'monitor-kyb', 'prod-epr',
    'prod-packaging-conformity', 'prod-packaging-empty-space', 'prod-packaging-format-bans',
    'prod-packaging-recyclability', 'prod-packaging-recycled-content',
    'prod-packaging-reuse-targets', 'prod-safety', 'tax-corporate', 'tax-vat-registration',
  ]);

  type Obergrenze = { kind: string; basis?: string; asOf?: string; note?: string; value?: number; currency?: string; of?: string; per?: string; level?: string; orAmount?: { value: number; currency?: string } };
  type Eintrag = {
    penaltyMaxEur?: number;
    penaltyCeiling?: Obergrenze;
    states?: Record<string, { source?: string; penaltyCeiling?: Obergrenze }>;
  };
  /** Nennt diese Obergrenze einen absoluten Betrag? */
  const nenntBetrag = (c: Obergrenze): boolean =>
    c.kind === 'amount' || (c.kind === 'turnover' && !!c.orAmount);
  const alle = (): [string, Eintrag][] => {
    const out: [string, Eintrag][] = [];
    for (const [id, byCountry] of Object.entries(ObligationEnrichmentMap)) {
      for (const [code, e] of Object.entries(byCountry as Record<string, Eintrag | undefined>)) {
        if (e) out.push([`${code}/${id}`, e]);
      }
    }
    return out.sort(([a], [b]) => a.localeCompare(b));
  };

  const ohneObergrenze = () => alle().filter(([, e]) => e.penaltyMaxEur && !e.penaltyCeiling).map(([k]) => k);

  it('laesst den Bestand ohne Obergrenze nur schrumpfen', () => {
    const ohne = ohneObergrenze();
    expect(
      ohne.length,
      ohne.length > OHNE_OBERGRENZE_STAND
        ? `Neue Risikozahl ohne belegte Obergrenze:\n  ${ohne.slice(0, 8).join('\n  ')}`
        : `Belegt! Bitte OHNE_OBERGRENZE_STAND auf ${ohne.length} senken.`,
    ).toBe(OHNE_OBERGRENZE_STAND);
  });

  it('nennt jeden Widerspruch "kein Betrag im Gesetz, aber eine Eurozahl" beim Namen', () => {
    const w = alle()
      .filter(([, e]) => e.penaltyCeiling && e.penaltyMaxEur && !nenntBetrag(e.penaltyCeiling))
      .map(([k]) => k);
    const neu = w.filter((k) => !OHNE_BETRAG_BEKANNT.includes(k));
    expect(
      neu,
      'Das Gesetz nennt keinen Betrag, die Oberflaeche zaehlt trotzdem einen hoch. '
        + 'Entweder die Zahl faellt weg — oder der Eintrag kommt namentlich in OHNE_BETRAG_BEKANNT.',
    ).toEqual([]);
    const weg = OHNE_BETRAG_BEKANNT.filter((k) => !w.includes(k));
    expect(weg, `Aufgeloest! Bitte aus OHNE_BETRAG_BEKANNT streichen: ${weg.join(', ')}`).toEqual([]);
  });

  it('haelt die Eurozahl und die belegte Euro-Obergrenze zusammen', () => {
    // Solange die vier Flaechen `penaltyMaxEur` lesen und die Obergrenze
    // daneben steht, duerfen die beiden sich nicht widersprechen. Gilt nur fuer
    // EUR — bei GBP/USD/TRY ist der Unterschied ja gerade der Punkt.
    const ab = alle().filter(([, e]) => {
      const c = e.penaltyCeiling;
      return c?.kind === 'amount' && c.currency === 'EUR' && e.penaltyMaxEur !== c.value;
    });
    expect(
      ab.map(([k, e]) => `${k}: Zahl ${e.penaltyMaxEur} vs. Obergrenze ${e.penaltyCeiling?.value}`),
      'Belegter Eurobetrag und angezeigte Zahl gehen auseinander',
    ).toEqual([]);
  });

  // Frueher: "hier IST ein Betrag belegt, nur eben in Pfund, und die Eurozahl
  // daneben ist eine Umrechnung ohne Kurs und ohne Tag". Das ist seit dem
  // eingefrorenen EZB-Kurs aufgeloest — die Eurozahl MUSS jetzt die Umrechnung
  // des belegten Betrags sein, und der Test rechnet nach.
  //
  // Die Liste bleibt trotzdem stehen, aber mit anderer Bedeutung: sie sagt,
  // WELCHE Eintraege eine umgerechnete und keine gesetzliche Eurozahl fuehren.
  // Das ist eine Eigenschaft, die man beim Lesen der Karte wissen will.
  const EUROZAHL_OHNE_KURS = [
    'UK/corp-registration', // GBP 15.000 vs. 1.700 — Faktor 10 daneben
    'UK/data-privacy', // GBP 17,5 Mio vs. 100.000
    'UK/legal-consumer-terms', // GBP 300.000 vs. 15.000
    'UK/prod-safety', // GBP 20.000 vs. 23.000 — plausibel, aber unbelegt
    'US/mktg-consent', // USD 53.088 vs. 48.000
    'US/mktg-health-claims', // USD 53.088 vs. 90.000
    'US/prod-safety', // USD 17,15 Mio vs. 110.000 — Faktor 156
  ];

  it('nennt jede Eurozahl neben einem Fremdwaehrungs-Betrag beim Namen', () => {
    const w = alle()
      .filter(([, e]) => {
        const c = e.penaltyCeiling;
        if (!c || !e.penaltyMaxEur) return false;
        const waehrung = c.kind === 'amount' ? c.currency : c.orAmount?.currency;
        return !!waehrung && waehrung !== 'EUR';
      })
      .map(([k]) => k);
    const neu = w.filter((k) => !EUROZAHL_OHNE_KURS.includes(k));
    expect(
      neu,
      'Das Gesetz nennt den Betrag in einer anderen Waehrung; die Eurozahl daneben '
        + 'ist eine Umrechnung ohne Kurs und ohne Tag. Namentlich in EUROZAHL_OHNE_KURS eintragen.',
    ).toEqual([]);
    const weg = EUROZAHL_OHNE_KURS.filter((k) => !w.includes(k));
    expect(weg, `Aufgeloest! Bitte aus EUROZAHL_OHNE_KURS streichen: ${weg.join(', ')}`).toEqual([]);
  });

  it('rechnet jede Fremdwaehrungs-Eurozahl am eingefrorenen Kurs nach', () => {
    // Der Kern von "der Betrag bleibt in seiner Waehrung": das Gesetz nennt
    // Pfund, die Risikosumme braucht Euro — dann muss die Eurozahl die
    // Umrechnung SEIN und nicht eine zweite, freie Behauptung.
    const ab: string[] = [];
    for (const [k, e] of alle()) {
      const c = e.penaltyCeiling;
      if (!c || !e.penaltyMaxEur) continue;
      const betrag = c.kind === 'amount' ? c.value : c.orAmount?.value;
      const waehrung = c.kind === 'amount' ? c.currency : c.orAmount?.currency;
      if (!betrag || !waehrung || waehrung === 'EUR') continue;
      const soll = inEuro(betrag, waehrung);
      if (soll !== null && soll !== e.penaltyMaxEur) {
        ab.push(`${k}: ${e.penaltyMaxEur} statt ${soll} (${betrag} ${waehrung} zum Kurs vom ${FX_STAND})`);
      }
    }
    expect(
      ab,
      'Die Eurozahl ist nicht die Umrechnung des belegten Betrags. Entweder die '
        + 'Kurse erneuern (node scripts/fetch-fx-rates.mjs) oder die Zahl nachziehen.',
    ).toEqual([]);
  });

  it('meldet einen Kurs, der zu alt geworden ist', () => {
    // Eingefroren heisst nicht vergessen. Ein halbes Jahr alter Kurs ist bei
    // Pfund und Dollar noch vertretbar, bei der tuerkischen Lira laengst nicht
    // mehr — deshalb lieber frueh meckern als spaet falsch rechnen.
    const tage = Math.floor((Date.now() - Date.parse(FX_STAND)) / 86_400_000);
    expect(
      tage,
      `Die EZB-Kurse sind ${tage} Tage alt (Stand ${FX_STAND}). `
        + 'Erneuern mit: node scripts/fetch-fx-rates.mjs',
    ).toBeLessThan(120);
    expect(tage, `Kursdatum ${FX_STAND} liegt in der Zukunft`).toBeGreaterThanOrEqual(0);
    expect(Object.keys(FX_JE_EUR).sort()).toEqual(['GBP', 'TRY', 'USD']);
  });

  it('verlangt von jeder NEUEN Pflicht die Obergrenze', () => {
    const neu = ohneObergrenze().filter((k) => !BESTAND.has(k.split('/')[1]));
    expect(neu, 'Neue Pflicht: jede Zahl braucht ihre belegte Obergrenze').toEqual([]);
  });

  // Pflichten, bei denen ein Land NUR die Sanktion zum EU-Rechtsakt erlassen
  // hat — die Pflicht selbst bleibt die europaeische. Deutschland hat das mit
  // dem VerpackDG fuer die PPWR getan. Solche Eintraege sind Kopien: Quelle,
  // Geltungsbeginn und `scope` MUESSEN mit dem `default` uebereinstimmen, sonst
  // zeigt die deutsche Zeile eine andere Pflicht an als die europaeische.
  const NATIONALE_BUSSE_ZUM_EU_AKT: [string, string][] = [
    ['prod-packaging-conformity', 'DE'],
    ['prod-packaging-empty-space', 'DE'],
    ['prod-packaging-format-bans', 'DE'],
    ['prod-packaging-recyclability', 'DE'],
    ['prod-packaging-recycled-content', 'DE'],
    ['prod-packaging-reuse-targets', 'DE'],
  ];

  it('haelt nationale Bussgeld-Zeilen an der EU-Pflicht, aus der sie stammen', () => {
    for (const [id, code] of NATIONALE_BUSSE_ZUM_EU_AKT) {
      const byCountry = (ObligationEnrichmentMap as Record<string, Record<string, Eintrag & {
        source?: string; appliesFrom?: string; scope?: string;
      }>>)[id];
      const land = byCountry?.[code];
      const eu = byCountry?.default;
      expect(land, `${code}/${id}: Eintrag fehlt`).toBeTruthy();
      expect(eu, `${id}: kein default, an dem der Eintrag haengen koennte`).toBeTruthy();
      for (const feld of ['source', 'appliesFrom', 'scope'] as const) {
        expect(
          land?.[feld],
          `${code}/${id}: "${feld}" weicht vom default ab. Das Land hat nur die Busse erlassen, `
            + 'nicht die Pflicht geaendert — entweder nachziehen oder aus NATIONALE_BUSSE_ZUM_EU_AKT streichen.',
        ).toBe(eu?.[feld]);
      }
    }
  });

  // Gliedstaaten, deren Gesetzestext wir NICHT erreichen. Das ist eine Aussage
  // ueber das Portal, nicht ueber das Recht: beide Staaten haben ein
  // Datenschutzgesetz, wir kommen nur nicht an den Wortlaut.
  //
  // Wieder eine namentliche Liste statt einer Zahl (siehe OHNE_BETRAG_BEKANNT):
  // sie darf nur schrumpfen, und wenn ein Portal zugaenglich wird, faellt es
  // im Review auf, weil eine Zeile verschwindet — nicht nur eine Ziffer.
  const STAATEN_OHNE_ZUGANG: Record<string, string> = {
    // TX ist am 19.09. weggefallen: die Gerueststeite laedt ihren Text von
    // tcss.legis.texas.gov nach, und ueber diesen Host kommt er auch per curl.
    NY: 'www.nysenate.gov steht hinter einer Cloudflare-Bot-Schranke (403). '
      + 'Das ist eine Entscheidung des Betreibers, keine Zugangsluecke.',
  };
  const GEFUEHRTE_STAATEN = ['CA', 'FL', 'NY', 'TX'];

  it('haelt die Gliedstaaten an derselben Beweispflicht wie die Laender', () => {
    for (const [k, e] of alle()) {
      if (!e.states) continue;
      // Staatszahlen gibt es nur, wo der Bund nichts setzt. Stuende daneben
      // eine Bundesobergrenze, waere unklar, welche von beiden gilt.
      expect(
        e.penaltyCeiling?.kind,
        `${k}: states gesetzt, aber die Obergrenze ist nicht 'subnational'`,
      ).toBe('subnational');
      for (const [staat, eintrag] of Object.entries(e.states)) {
        expect(GEFUEHRTE_STAATEN, `${k}/${staat}: kein gefuehrter Staat`).toContain(staat);
        expect(
          STAATEN_OHNE_ZUGANG[staat],
          `${k}/${staat}: Eintrag da, aber der Staat steht noch in STAATEN_OHNE_ZUGANG`,
        ).toBeUndefined();
        const c = eintrag.penaltyCeiling;
        expect(c, `${k}/${staat}: keine Obergrenze`).toBeTruthy();
        expect(eintrag.source, `${k}/${staat}: keine Vorschrift genannt`).toMatch(/\d/);
        expect(c?.basis, `${k}/${staat}: "${c?.basis}" nennt keine Vorschrift`).toMatch(/\d/);
        expect(c?.asOf, `${k}/${staat}: Stand fehlt oder ist kein Datum`)
          .toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('laesst die Liste der unerreichbaren Staaten nur schrumpfen', () => {
    // Einer von vier. Texas ist am 19.09. weggefallen, und der Wegfall lief
    // genau so, wie diese Liste es vorsieht: erst verschwand die Zeile, dann
    // verlangte der Beweispflicht-Test die Zahlen — nicht umgekehrt.
    //
    // Bleibt New York. Das ist die andere Art von Hindernis: bei Texas fehlte
    // uns ein Weg, bei New York sagt der Betreiber Nein. Nur das erste liess
    // sich beheben.
    expect(Object.keys(STAATEN_OHNE_ZUGANG).sort()).toEqual(['NY']);
    for (const [staat, grund] of Object.entries(STAATEN_OHNE_ZUGANG)) {
      expect(grund.length, `${staat}: Grund zu duenn`).toBeGreaterThan(60);
    }
  });

  it('nimmt keine Obergrenze an, die nichts belegt', () => {
    for (const [k, e] of alle()) {
      const c = e.penaltyCeiling;
      if (!c) continue;
      if (c.kind === 'delegated' || c.kind === 'none' || c.kind === 'unlimited'
        || c.kind === 'subnational') {
        expect(c.note?.trim().length ?? 0, `${k}: ${c.kind} ohne Begruendung`).toBeGreaterThan(20);
        // Auch die begruendeten Formen nennen eine Vorschrift — "es gibt keinen
        // Betrag" ist eine Rechtsaussage und braucht ihre Fundstelle wie jede
        // andere. Nur `delegated` nicht: dort IST die Fundstelle der Rechtsakt,
        // der noch nichts erlassen hat.
        if (c.kind !== 'delegated') {
          expect(c.basis, `${k}: "${c.basis}" nennt keine Vorschrift`).toMatch(/\d/);
        }
        // Dieselbe Logik wie `of` beim Prozentsatz: "die Sanktion steht
        // woanders" ist erst dann eine Auskunft, wenn dabeisteht WO und wie
        // viele es davon gibt. Sonst klingt es wie eine Luecke.
        if (c.kind === 'subnational') {
          expect(c.level?.trim().length ?? 0, `${k}: keine Ebene benannt`).toBeGreaterThan(5);
        }
      } else {
        // Dieselbe Falle wie bei den `placeholder`-Quellen: ein String, der wie
        // eine Zitation AUSSIEHT, sitzt in derselben Zelle und im selben
        // Gewicht wie "DSGVO Art. 83 Abs. 5".
        expect(c.basis, `${k}: "${c.basis}" nennt keine Vorschrift`).toMatch(/\d/);
        expect(c.asOf, `${k}: Stand fehlt oder ist kein Datum`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // Ein Prozentsatz ohne Bezugsgroesse ist keine Auskunft, sondern eine
        // Zahl. "150 %" wovon — der Steuerschuld, des Umsatzes, des Gewinns?
        if (c.kind === 'proportional') {
          expect(c.of?.trim().length ?? 0, `${k}: Prozentsatz ohne Bezugsgroesse`).toBeGreaterThan(5);
        }
        // Dasselbe fuer den Betrag je Einheit: "7.500 EUR" ohne die Einheit
        // liest sich wie eine Obergrenze und ist das genaue Gegenteil.
        if (c.kind === 'perUnit') {
          expect(c.per?.trim().length ?? 0, `${k}: Betrag je Einheit ohne Bezugseinheit`).toBeGreaterThan(5);
        }
      }
    }
  });

  // Frankreich rechnet Geldstrafen fuer Unternehmen nicht im Sanktionsartikel
  // aus: Code penal Art. 131-38 setzt sie pauschal auf "le quintuple" des
  // Satzes fuer natuerliche Personen. Der Satz im Artikel ist also NICHT die
  // Zahl, die ein Unternehmen trifft — L574-5 nennt 200.000 EUR und meint
  // fuer eine GmbH eine Million.
  //
  // Das ist dieselbe Fehlerklasse, die bei Italien zweimal zugeschlagen hat
  // und bei FR/legal-consumer-terms ein drittes Mal: der belegte Text stimmt,
  // nur die Ebene nicht. Wo der basis-String den Verweis nennt, rechnet der
  // Test die Multiplikation nach, statt sie zu glauben.
  it('rechnet den Fuenffach-Verweis auf Code penal Art. 131-38 nach', () => {
    let geprueft = 0;
    for (const [k, e] of alle()) {
      const c = e.penaltyCeiling;
      if (!c?.basis || !/131-38/.test(c.basis)) continue;
      const m = c.basis.match(/([\d.]+)\s*EUR/);
      expect(m, `${k}: Verweis auf 131-38, aber kein Ausgangsbetrag im basis-String`).toBeTruthy();
      const sockel = Number(String(m?.[1]).replace(/\./g, ''));
      expect(
        c.value,
        `${k}: ${sockel} EUR verfuenffacht sind ${sockel * 5}, gefuehrt wird ${c.value}. `
          + 'Der Sanktionsartikel nennt den Satz fuer natuerliche Personen.',
      ).toBe(sockel * 5);
      geprueft += 1;
    }
    // Faellt der Verweis aus allen Eintraegen, ist der Test still gruen
    // geworden, ohne je etwas geprueft zu haben.
    expect(geprueft, 'Kein Eintrag verweist mehr auf 131-38 — Test ohne Gegenstand').toBeGreaterThan(0);
  });
});
