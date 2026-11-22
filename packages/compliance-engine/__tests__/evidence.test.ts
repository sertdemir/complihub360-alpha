import { describe, it, expect } from 'vitest';
import { evaluateEvidence, factsFromAnswers, marketPhases, countryPhases, checkScopeOf, storageOf, assessmentOf, answeredQuestions, STORAGE_RULES, EVIDENCE_RULES } from '../evidence';
import { DomainTemplateLibrary } from '../domain-schema';
import { generateRelevantSubdomains } from '../generator';
import { ComplianceDomain } from '../domain-schema';

// ─── Wizard-Audit F1: "confirmed" nur, wenn eine Angabe die Pflicht traegt ───
describe('evidence', () => {
  it('has a rule for every template, so no duty silently defaults', () => {
    const ids = Object.values(DomainTemplateLibrary).flat().map((t) => t.id);
    expect(ids.filter((id) => !EVIDENCE_RULES[id])).toEqual([]);
  });

  it('is open without facts, likely with some, confirmed only with all', () => {
    expect(evaluateEvidence('data-privacy', {}).state).toBe('open');
    expect(evaluateEvidence('data-privacy', { online_sales: true }).state).toBe('likely');
    expect(evaluateEvidence('data-privacy', { online_sales: true, consumer_sales: true, eu_market: true }))
      .toEqual({ state: 'confirmed', supports: ['online_sales', 'consumer_sales', 'eu_market'], decides: [] });
  });

  it('keeps a deciding question open even when every fact holds', () => {
    expect(evaluateEvidence('tax-vat-registration', { online_sales: true }))
      .toEqual({ state: 'likely', supports: ['online_sales'], decides: ['establishment'] });
  });

  it('a fact known to be false leaves the duty open, never confirmed or hidden', () => {
    expect(evaluateEvidence('prod-safety', { physical_goods: false, consumer_sales: true, eu_market: true }).state).toBe('open');
  });

  it('reads only what the wizard cards say', () => {
    expect(factsFromAnswers({ businessTypeNote: 'D2C e-commerce', markets: ['DE'] }))
      .toEqual({ consumer_sales: true, online_sales: true, eu_market: true });
    expect(factsFromAnswers({ businessTypeNote: 'SaaS / digital', markets: ['US'] }))
      .toEqual({ online_sales: true, physical_goods: false });
    // "Marketplace" is ambiguous (seller or operator) — no fact at all.
    expect(factsFromAnswers({ businessTypeNote: 'Marketplace', markets: ['UK'] })).toEqual({});
    // EU membership is not limited to the engine's five profiles.
    expect(factsFromAnswers({ markets: ['AT'] })).toEqual({ eu_market: true });
    expect(factsFromAnswers(null)).toEqual({});
  });

  it('a selected domain alone confirms nothing (the 23.10.2026 bug)', () => {
    const laws = generateRelevantSubdomains({ countries: ['DE'], focusDomains: [ComplianceDomain.PRODUCT] });
    expect(laws.filter((l) => l.domain === ComplianceDomain.PRODUCT).length).toBeGreaterThan(0);
    expect(laws.some((l) => l.evidence.state === 'confirmed')).toBe(false);
  });
});

describe('evidence · scope facts', () => {
  it('an EU market alone makes nothing likely', () => {
    expect(evaluateEvidence('prod-packaging-conformity', { eu_market: true }).state).toBe('open');
    expect(evaluateEvidence('data-privacy', { eu_market: true }).state).toBe('open');
  });
});

// ─── D1 (24.10.2026): die Wizard-v1a-Antworten als Fakten ────────────────────
describe('evidence · current and planned markets (Core Wizard Handover v1.1)', () => {
  it('keeps current and planned apart', () => {
    expect(marketPhases({ country: 'US', markets: ['US'], details: { plannedMarkets: ['DE', 'FR'] } }))
      .toEqual({ current: ['US'], planned: ['DE', 'FR'], outsideScope: [] });
  });
  it('a country may be both; statuses are not countries', () => {
    expect(marketPhases({ markets: ['DE'], details: { plannedMarkets: ['DE', 'undecided', 'not-planned'] } }))
      .toEqual({ current: ['DE'], planned: ['DE'], outsideScope: [] });
  });
  it('the first planned country sent as `country` does not become a current market', () => {
    expect(marketPhases({ country: 'DE', markets: [], details: { plannedMarkets: ['DE', 'FR'] } }))
      .toEqual({ current: [], planned: ['DE', 'FR'], outsideScope: [] });
  });
  it('CW-F02: a specific check scope narrows today; "all current" and "not sure" do not; planned stays planned', () => {
    // S09: alle heutigen Maerkte · S10: nur US.
    const base = { markets: ['US', 'DE'], details: { plannedMarkets: ['FR'] } };
    const s09 = { ...base, details: { ...base.details, checkScope: { mode: 'all-current', countries: [] } } };
    const s10 = { ...base, details: { ...base.details, checkScope: { mode: 'countries', countries: ['US'] } } };
    expect(marketPhases(s09)).toEqual({ current: ['US', 'DE'], planned: ['FR'], outsideScope: [] });
    expect(marketPhases(s10)).toEqual({ current: ['US'], planned: ['FR'], outsideScope: ['DE'] });
    expect(marketPhases({ ...base, details: { ...base.details, checkScope: { mode: 'unknown', countries: [] } } }).current).toEqual(['US', 'DE']);
    // Ein Markt ausserhalb des Umfangs traegt keinen Fakt.
    expect(factsFromAnswers({ markets: ['US', 'DE'], details: { checkScope: { mode: 'countries', countries: ['US'] } } }).eu_market).toBeUndefined();
    expect(factsFromAnswers({ markets: ['US', 'DE'], details: { checkScope: { mode: 'all-current', countries: [] } } }).eu_market).toBe(true);
  });
  it('CW-F02: the seat is not silently added to a narrowed check', () => {
    expect(countryPhases({ markets: ['US', 'DE'], details: { establishment: ['DE'], checkScope: { mode: 'countries', countries: ['US'] } } }))
      .toEqual({ current: ['US'], planned: [], outsideScope: ['DE'] });
    expect(countryPhases({ markets: ['US'], details: { establishment: ['FR'], checkScope: { mode: 'countries', countries: ['US'] } } }))
      .toEqual({ current: ['US'], planned: [], outsideScope: ['FR'] });
  });
  it('CW-F02: the scope as asked — "all current" with unknown markets is not an empty, complete check', () => {
    expect(checkScopeOf({ checkScope: { mode: 'countries', countries: ['us', 'US', 'x'] } })).toEqual({ mode: 'countries', countries: ['US'] });
    expect(checkScopeOf({ checkScope: { mode: 'all-current', countries: [] } })).toEqual({ mode: 'all-current', countries: [] });
    expect(checkScopeOf({ checkScope: { mode: 'unknown', countries: [] } }).mode).toBe('unknown');
    expect(checkScopeOf({}).mode).toBe('none');
    expect(checkScopeOf({ checkScope: { mode: 'countries', countries: [] } }).mode).toBe('none');
  });
  it('CW-F01: storage keeps its own status — undecided, unknown, "no other country" and "not asked" stay apart', () => {
    expect(storageOf({ stock: ['US'], plannedStock: ['de', 'FR'] })).toEqual({ current: { status: 'countries', countries: ['US'], confirmation: { US: 'unstated' } }, planned: { status: 'countries', countries: ['DE', 'FR'], confirmation: { DE: 'unstated', FR: 'unstated' } } });
    expect(storageOf({ stock: ['US'], plannedStock: ['no-other'] }).planned).toEqual({ status: 'no-other', countries: [], confirmation: {} });
    expect(storageOf({ stock: ['US'], plannedStock: ['undecided'] }).planned).toEqual({ status: 'undecided', countries: [], confirmation: {} });
    expect(storageOf({ stock: ['not-sure'], plannedStock: ['not-sure'] })).toEqual({ current: { status: 'unknown', countries: [], confirmation: {} }, planned: { status: 'unknown', countries: [], confirmation: {} } });
    expect(storageOf({ stock: ['none'] })).toEqual({ current: { status: 'none', countries: [], confirmation: {} }, planned: { status: 'not-asked', countries: [], confirmation: {} } });
    expect(storageOf({ stock: ['not-applicable'] }).current.status).toBe('not-applicable');
    expect(storageOf(null).planned.status).toBe('not-asked');
  });
  // Folgeauftrag Lagerung (20.11.2026): Bestaetigungsstand je Standort.
  it('storage keeps a confirmation state per location; older sessions stay "unstated", never "confirmed"', () => {
    const s = storageOf({ stock: ['US'], stockStatus: { US: 'confirmed' }, plannedStock: ['DE', 'NL'], plannedStockStatus: { DE: 'unconfirmed', NL: 'confirmed', FR: 'confirmed' } });
    expect(s.current.confirmation).toEqual({ US: 'confirmed' });
    // Ein Status fuer ein nicht gewaehltes Land (FR) zaehlt nicht.
    expect(s.planned.confirmation).toEqual({ DE: 'unconfirmed', NL: 'confirmed' });
    expect(storageOf({ plannedStock: ['DE'] }).planned.confirmation).toEqual({ DE: 'unstated' });
  });
  it('each storage location reaches the result with country, phase and confirmation — and is never a market', () => {
    // Kontrolle 3: NL nur als Lagerland; Verkaeufe US, geplant DE/FR.
    const a = { markets: ['US'], details: { plannedMarkets: ['DE', 'FR'], stock: ['US', 'NL'], stockStatus: { US: 'confirmed', NL: 'confirmed' }, plannedStock: ['DE'], plannedStockStatus: { DE: 'unconfirmed' } } };
    const r = assessmentOf(a);
    expect(r.assessed).toEqual({ current: ['US'], planned: ['DE', 'FR'] });
    expect(r.storage.locations).toEqual([
      { country: 'US', phase: 'current', confirmation: 'confirmed', also_market: true, assessed: false, reason: 'no_rule', checks: [] },
      { country: 'NL', phase: 'current', confirmation: 'confirmed', also_market: false, assessed: false, reason: 'no_rule', checks: [] },
      { country: 'DE', phase: 'planned', confirmation: 'unconfirmed', also_market: true, assessed: false, reason: 'no_rule', checks: [] },
    ]);
    // Auch ohne erhobene Verkaufsexpansion: das Lagerland bleibt, kein Markt entsteht.
    const noExpansion = assessmentOf({ markets: ['US'], details: { stock: ['US'], plannedStock: ['NL'], plannedStockStatus: { NL: 'confirmed' } } });
    expect(noExpansion.assessed).toEqual({ current: ['US'], planned: [] });
    expect(noExpansion.storage.locations.map((l) => [l.country, l.phase, l.also_market])).toEqual([['US', 'current', true], ['NL', 'planned', false]]);
  });
  it('no storage rule is on file yet — the engine says so instead of inventing one', () => {
    expect(STORAGE_RULES).toEqual({});
  });
  it('CW-F01: a storage country is neither a market nor a fact', () => {
    const a = { markets: ['US'], details: { stock: ['US'], plannedStock: ['DE', 'FR'] } };
    expect(countryPhases(a)).toEqual({ current: ['US'], planned: [], outsideScope: [] });
    expect(factsFromAnswers(a)).toEqual(factsFromAnswers({ markets: ['US'], details: { stock: ['US'], plannedStock: ['no-other'] } }));
  });
  it('planned EU markets reach the facts even when today is US-only', () => {
    expect(factsFromAnswers({ markets: ['US'] }).eu_market).toBeUndefined();
    expect(factsFromAnswers({ markets: ['US'], details: { plannedMarkets: ['DE'] } }).eu_market).toBe(true);
  });
  it('CW-F05: a planned establishment country is assessed as planned — without inventing an expansion', () => {
    const founder = { country: 'DE', markets: [], details: { marketsStatus: 'not-yet', establishment: ['not-yet'], plannedEstablishment: ['DE'] } };
    expect(marketPhases(founder)).toEqual({ current: [], planned: [], outsideScope: [] });
    expect(countryPhases(founder)).toEqual({ current: [], planned: ['DE'], outsideScope: [] });
    // Der Sitz ist kein Verkaufsmarkt: kein eu_market-Fakt aus dem Gruendungsland.
    expect(factsFromAnswers(founder).eu_market).toBeUndefined();
  });
  it('CW-F05: an existing establishment without sales is assessed as current', () => {
    expect(countryPhases({ country: 'FR', markets: [], details: { establishment: ['FR'] } })).toEqual({ current: ['FR'], planned: [], outsideScope: [] });
    expect(countryPhases({ markets: ['US'], details: { establishment: ['US'], plannedMarkets: ['DE'] } })).toEqual({ current: ['US'], planned: ['DE'], outsideScope: [] });
  });

  it('nothing stated means nothing assessed — no default country', () => {
    expect(marketPhases({})).toEqual({ current: [], planned: [], outsideScope: [] });
    expect(marketPhases(null)).toEqual({ current: [], planned: [], outsideScope: [] });
  });
});

describe('evidence · wizard details (D1)', () => {
  const facts = (details: Record<string, unknown>, markets = ['DE']) => factsFromAnswers({ markets, details });

  it('Physical products is a yes; only digital or services is a no; unsure is nothing', () => {
    expect(facts({ offering: ['physical', 'services'] }).physical_goods).toBe(true);
    expect(facts({ offering: ['digital', 'services'] }).physical_goods).toBe(false);
    expect(facts({ offering: ['digital', 'deciding'] }).physical_goods).toBeUndefined();
    expect(facts({ offering: ['not-sure'] }).physical_goods).toBeUndefined();
    expect(facts({ offering: [] }).physical_goods).toBeUndefined();
  });

  it('an explicit Physical products beats the SaaS card', () => {
    expect(factsFromAnswers({ businessTypeNote: 'SaaS / digital', markets: ['DE'], details: { offering: ['physical'] } }).physical_goods).toBe(true);
  });

  it('EPR cards only ever say yes — an unticked battery card is not a no', () => {
    expect(facts({ eprProducts: ['electronics'] })).toMatchObject({ electronics: true, physical_goods: true });
    expect(facts({ eprProducts: ['batteries-inside'] }).batteries).toBe(true);
    expect(facts({ eprProducts: ['batteries-separate'] }).batteries).toBe(true);
    const other = facts({ eprProducts: ['other'] });
    expect(other.physical_goods).toBe(true);
    expect(other.batteries).toBeUndefined();
    expect(other.electronics).toBeUndefined();
    expect(facts({ eprProducts: ['not-sure'] })).toEqual({ eu_market: true });
  });

  it('established in a market: yes only if it covers every target market', () => {
    expect(facts({ establishment: ['DE'] }, ['DE']).established_in_market).toBe(true);
    // Sitz DE, Maerkte DE + NL: die Zeile stuende fuer "DE · NL" — unbekannt.
    expect(facts({ establishment: ['DE'] }, ['DE', 'NL']).established_in_market).toBeUndefined();
    expect(facts({ establishment: ['FR'] }, ['DE', 'NL']).established_in_market).toBe(false);
    expect(facts({ establishment: ['not-yet'] }, ['DE']).established_in_market).toBe(false);
    expect(facts({ establishment: ['not-sure'] }, ['DE']).established_in_market).toBeUndefined();
  });

  it('situation, stock and packaging set no fact; deciding questions stay open', () => {
    const f = facts({ situation: 'existing', stock: ['DE'], packaging: ['packaged', 'shipping'], offering: ['physical'] });
    expect(f).toEqual({ eu_market: true, physical_goods: true });
    expect(evaluateEvidence('prod-epr', { ...f, consumer_sales: true }).state).toBe('likely');
  });

  it('confirms what the answers carry: WEEE, batteries, product safety', () => {
    const f = factsFromAnswers({
      businessTypeNote: 'D2C e-commerce',
      markets: ['DE'],
      details: { offering: ['physical'], eprProducts: ['electronics', 'batteries-inside'], establishment: ['DE'] },
    });
    expect(evaluateEvidence('env-weee-registration', f).state).toBe('confirmed');
    expect(evaluateEvidence('env-batteries-epr', f).state).toBe('confirmed');
    expect(evaluateEvidence('prod-safety', f).state).toBe('confirmed');
    expect(evaluateEvidence('corp-registration', f).state).toBe('confirmed');
    expect(evaluateEvidence('tax-vat-registration', f).state).toBe('likely');
  });

  it('customers and channels set the facts the Operations card used to set', () => {
    expect(facts({ customers: 'consumers', channels: ['own-site'] })).toMatchObject({ consumer_sales: true, online_sales: true });
    expect(facts({ customers: 'both' })).toMatchObject({ consumer_sales: true, business_sales: true });
    expect(facts({ channels: ['marketplaces'] }).online_sales).toBe(true);
  });

  it('never turns an unchosen customer group or channel into a No', () => {
    const f = facts({ customers: 'businesses', channels: ['stores', 'direct'] });
    expect(f.business_sales).toBe(true);
    expect(f.consumer_sales).toBeUndefined();
    expect(f.online_sales).toBeUndefined();
    expect(facts({ customers: 'not-sure', channels: ['not-sure'] })).toEqual({ eu_market: true });
  });

  it('ignores malformed details', () => {
    expect(factsFromAnswers({ markets: ['US'], details: 'x' })).toEqual({});
    expect(factsFromAnswers({ markets: ['US'], details: { offering: 'physical', eprProducts: [1, null] } })).toEqual({});
  });
});

// ─── Feedback CW-F04/F06 (19.11.2026): eine Zeile je Rechtsgrundlage und Phase ─
describe('rows per legal source and phase (CW-F04)', () => {
  const base = { offering: ['physical'], customers: 'consumers', channels: ['own-site'] };
  const rows = (a: { country?: string; markets: string[]; details: Record<string, unknown> }, domains: ComplianceDomain[]) => {
    const ph = countryPhases(a);
    const phase: Record<string, 'current' | 'planned'> = {};
    for (const c of [...ph.current, ...ph.planned]) phase[c] = ph.current.includes(c) ? 'current' : 'planned';
    return generateRelevantSubdomains({
      countries: Object.keys(phase) as never, focusDomains: domains, facts: factsFromAnswers(a),
      perCountry: { phase, factsFor: (cs) => factsFromAnswers(a, cs), row: answeredQuestions(a.details) },
    }).filter((r) => r.focus);
  };
  const of = (rs: ReturnType<typeof rows>, id: string) => rs.filter((r) => r.id === id);

  it('a US-only seller gets US sales tax — not "VAT" with a link to the EU VAT Directive', () => {
    const [vat, ...rest] = of(rows({ country: 'US', markets: ['US'], details: { ...base, establishment: ['US'] } }, [ComplianceDomain.TAX]), 'tax-vat-registration');
    expect(rest).toEqual([]);
    expect(vat.label).toBe('US Sales Tax (state level)');
    expect(vat.labelKey).toBe('tax-vat-registration.US');
    expect(vat.source).toBe('State economic-nexus rules (post-Wayfair)');
    expect(vat.sourceUrl).toBeUndefined();
    expect(vat.celex).toBeUndefined();
    // CW-F06: der Sitz ist bekannt und wird nicht noch einmal erfragt.
    expect(vat.evidence).toEqual({ state: 'likely', supports: ['online_sales'], decides: ['establishment_assessment'] });
  });

  it('UK and Italy: each country cites its own act; only the EU row links EUR-Lex and names what the link opens', () => {
    const vat = of(rows({ country: 'UK', markets: ['UK', 'IT'], details: base }, [ComplianceDomain.TAX]), 'tax-vat-registration');
    expect(vat.map((r) => [r.markets.join('+'), r.source, r.sourceUrl ? r.sourceUrlLabel : null])).toEqual([
      ['UK', 'UK VATA 1994 §3', null],
      ['IT', 'Testo unico IVA (D.Lgs. 10/2026), vorher DPR 633/1972 Art. 35', 'EU VAT Directive 2006/112/EC'],
    ]);
    // Sitz unbekannt: die Frage bleibt.
    expect(vat[0].evidence.decides).toEqual(['establishment']);
    expect(new Set(vat.map((r) => r.key)).size).toBe(2);
  });

  it('Türkiye → Germany, US, Italy: four rows, none cites another country, planned rows carry no deadline', () => {
    const vat = of(rows({ country: 'TR', markets: ['TR'], details: { ...base, establishment: ['TR'], plannedMarkets: ['DE', 'US', 'IT'] } }, [ComplianceDomain.TAX]), 'tax-vat-registration');
    expect(vat.map((r) => [r.markets.join('+'), r.phase, r.source, r.dueDays ?? null])).toEqual([
      ['TR', 'current', 'KDV Kanunu No. 3065', 26],
      ['DE', 'planned', 'UStG §18 / §18i (OSS)', null],
      ['US', 'planned', 'State economic-nexus rules (post-Wayfair)', null],
      ['IT', 'planned', 'Testo unico IVA (D.Lgs. 10/2026), vorher DPR 633/1972 Art. 35', null],
    ]);
  });

  it('US today, Germany and France planned: the US row is not carried by a planned EU market', () => {
    const all = rows({ country: 'US', markets: ['US'], details: { ...base, establishment: ['US'], plannedMarkets: ['DE', 'FR'] } }, [ComplianceDomain.PRODUCT]);
    const safety = of(all, 'prod-safety');
    expect(safety.map((r) => [r.markets.join('+'), r.phase, r.source, r.evidence.state, r.evidence.supports.includes('eu_market')])).toEqual([
      ['US', 'current', 'CPSA / CPSC recall rules', 'likely', false],
      ['DE+FR', 'planned', 'EU GPSR 2023/988', 'confirmed', true],
    ]);
    // In der US-Zeile entscheidet "verkauft in die EU" nichts.
    expect(safety[0].evidence.decides).toEqual([]);
    expect(safety[0].sourceUrl).toBeUndefined();
    // Die EU-Verpackungsverordnung bekommt keine US-Zeile.
    expect(of(all, 'prod-packaging-conformity').flatMap((r) => r.markets)).toEqual(['DE', 'FR']);
  });

  it('a non-EU country without an entry of its own does not inherit the EU act', () => {
    const terms = of(rows({ country: 'US', markets: ['US'], details: base }, [ComplianceDomain.LEGAL]), 'legal-consumer-terms');
    expect(terms).toHaveLength(1);
    expect(terms[0].scope).toBe('placeholder');
    expect(terms[0].source).toBeUndefined();
    expect(terms[0].sourceUrl).toBeUndefined();
  });

  it('S18 (CW-F06): "No packaging" is an answer — not asked again, not an exemption', () => {
    const s18 = { country: 'FR', markets: ['FR'], details: { ...base, establishment: ['FR'], packaging: ['none'] } };
    const epr = of(rows(s18, [ComplianceDomain.PRODUCT]), 'prod-epr')[0];
    expect(epr.evidence.state).toBe('open');
    expect(epr.evidence.decides).toEqual(['packaging_none']);
    // Eine andere Antwort beantwortet die Frage, bestaetigt aber nichts.
    const packed = of(rows({ ...s18, details: { ...s18.details, packaging: ['packaged'] } }, [ComplianceDomain.PRODUCT]), 'prod-epr')[0];
    expect(packed.evidence).toEqual({ state: 'likely', supports: ['physical_goods', 'consumer_sales'], decides: ['packaging_assessment'] });
    // "Nicht sicher" ist keine Antwort.
    expect(answeredQuestions({ packaging: ['not-sure'], establishment: ['not-sure'] }).answered.size).toBe(0);
  });

  it('without perCountry the collected row stays as it was (dashboard)', () => {
    const old = generateRelevantSubdomains({ countries: ['DE', 'US'] as never, focusDomains: [ComplianceDomain.TAX] }).filter((r) => r.id === 'tax-vat-registration');
    expect(old).toHaveLength(1);
    expect(old[0].key).toBeUndefined();
  });
});
