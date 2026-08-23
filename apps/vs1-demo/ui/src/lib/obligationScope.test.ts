import { describe, expect, it } from 'vitest';
import { ObligationEnrichmentMap } from '@complihub/compliance-engine';
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
      // The weights row is the spine into the area pages: all eight, always.
      expect(p.weights.length, `${code} weights`).toBe(8);
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
