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
