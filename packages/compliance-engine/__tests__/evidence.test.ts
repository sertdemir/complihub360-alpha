import { describe, it, expect } from 'vitest';
import { evaluateEvidence, factsFromAnswers, EVIDENCE_RULES } from '../evidence';
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

  it('ignores malformed details', () => {
    expect(factsFromAnswers({ markets: ['US'], details: 'x' })).toEqual({});
    expect(factsFromAnswers({ markets: ['US'], details: { offering: 'physical', eprProducts: [1, null] } })).toEqual({});
  });
});
