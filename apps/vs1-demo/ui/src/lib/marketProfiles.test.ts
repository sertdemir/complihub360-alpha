import { describe, it, expect } from 'vitest';
import { ObligationEnrichmentMap, CountryRiskMatrix } from '@complihub/compliance-engine';
import { getMarketProfile, listMarkets, isMarketCode, MARKET_CODES } from './marketProfiles';
import { DOMAINS } from './domains';

// The market pages exist to show verified ground truth, so the property worth
// pinning is not "does it render" but "does it only ever claim what the engine
// actually holds for that market". Everything below guards that.

describe('marketProfiles', () => {
  it('covers exactly the markets the engine has a risk profile for', () => {
    expect(MARKET_CODES.sort()).toEqual(Object.keys(CountryRiskMatrix).sort());
  });

  it('never claims an obligation the enrichment map has no entry for', () => {
    for (const code of MARKET_CODES) {
      for (const o of getMarketProfile(code).obligations) {
        const entry = (ObligationEnrichmentMap as Record<string, Record<string, unknown>>)[o.subdomainId];
        expect(entry, `${o.subdomainId} missing from the enrichment map`).toBeDefined();
        expect(entry[code], `${o.subdomainId} has no ${code} entry but was shown for ${code}`).toBeDefined();
      }
    }
  });

  it('carries the source verbatim from the enrichment map', () => {
    for (const code of MARKET_CODES) {
      for (const o of getMarketProfile(code).obligations) {
        const entry = (ObligationEnrichmentMap as Record<string, Record<string, { source: string }>>)[o.subdomainId][code];
        expect(o.source).toBe(entry.source);
      }
    }
  });

  it('maps every obligation onto a canonical domain', () => {
    const slugs = DOMAINS.map((d) => d.slug);
    for (const code of MARKET_CODES) {
      for (const o of getMarketProfile(code).obligations) {
        expect(slugs).toContain(o.domainSlug);
      }
    }
  });

  it('weights every canonical domain exactly once, strongest first', () => {
    const slugs = DOMAINS.map((d) => d.slug).sort();
    for (const code of MARKET_CODES) {
      const { weights } = getMarketProfile(code);
      // The engine's domains do not line up one to one with the product's
      // eight — PRODUCT feeds two slugs, CORPORATE and ONGOING_MONITORING
      // share one. All eight must still come out, each exactly once.
      expect(weights.map((w) => w.domainSlug).sort()).toEqual(slugs);
      expect(weights.map((w) => w.weight)).toEqual([...weights.map((w) => w.weight)].sort((a, b) => b - a));
    }
  });

  it('files the two ambiguous subdomains under the domain their statute belongs to', () => {
    // monitor-kyb cites the money-laundering act and the beneficial-owner
    // register, prod-safety cites GPSR/CE — neither is packaging.
    const all = MARKET_CODES.flatMap((c) => getMarketProfile(c).obligations);
    for (const o of all.filter((x) => x.subdomainId === 'monitor-kyb')) {
      expect(o.domainSlug).toBe('corporate-structure');
    }
    for (const o of all.filter((x) => x.subdomainId === 'prod-safety')) {
      expect(o.domainSlug).toBe('product-compliance');
    }
  });

  it('groups obligations in canonical domain order and loses none', () => {
    for (const code of MARKET_CODES) {
      const p = getMarketProfile(code);
      const grouped = p.byDomain.flatMap((g) => g.items);
      expect(grouped).toHaveLength(p.obligations.length);
      const order = DOMAINS.map((d) => d.slug);
      const seen = p.byDomain.map((g) => order.indexOf(g.domainSlug));
      expect(seen).toEqual([...seen].sort((a, b) => a - b));
    }
  });

  it('recognises market codes case-insensitively and rejects unknown ones', () => {
    expect(isMarketCode('de')).toBe(true);
    expect(isMarketCode('DE')).toBe(true);
    expect(isMarketCode('XX')).toBe(false);
  });

  it('lists every market, busiest first', () => {
    const list = listMarkets();
    expect(list).toHaveLength(MARKET_CODES.length);
    expect(list.map((m) => m.obligationCount)).toEqual(
      [...list.map((m) => m.obligationCount)].sort((a, b) => b - a),
    );
  });
});
