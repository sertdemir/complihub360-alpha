import { describe, it, expect, vi } from 'vitest';

// billing.ts imports the supabase client at module level, whose env guard
// throws in tests — the pure pricing functions never touch it.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import { computeProviderCharges, PRICING, type ProviderChargeInput } from '../billing.js';

// ─── Pricing rules (decision 2026-08-09) ─────────────────────────────────────
// Pins every rule of the Phase-1 price architecture: 120 € lead fee, first 2
// leads ever free, abo 149 €/M or 1.490 €/J (anniversary month) incl. 1 lead
// + unlimited detail opens, 3 € detail-open with 50 € monthly cap.

const base: ProviderChargeInput = {
    providerKey: 'p1', period: '2026-08',
    subscriptionPlan: 'none', subscriptionSince: null,
    leadsInPeriod: 0, leadsBeforePeriod: 0, detailOpensInPeriod: 0,
};

describe('computeProviderCharges', () => {
    it('charges nothing for an idle provider', () => {
        expect(computeProviderCharges(base)).toEqual({ lines: [], total_cents: 0 });
    });

    it('free allowance: first 2 leads ever cost nothing, the 3rd costs 120 €', () => {
        const r = computeProviderCharges({ ...base, leadsInPeriod: 3 });
        expect(r.total_cents).toBe(12000);
        expect(r.lines[0].qty).toBe(1);
        expect(r.lines[0].label).toContain('2 Freikontingent');
    });

    it('free allowance is lifetime, not per-period', () => {
        const r = computeProviderCharges({ ...base, leadsInPeriod: 2, leadsBeforePeriod: 2 });
        expect(r.total_cents).toBe(2 * 12000);
    });

    it('partially used allowance carries over', () => {
        const r = computeProviderCharges({ ...base, leadsInPeriod: 2, leadsBeforePeriod: 1 });
        expect(r.total_cents).toBe(12000); // 1 free left + 1 charged
    });

    it('monthly abo: 149 € line every period + 1 included lead after the free allowance', () => {
        const r = computeProviderCharges({
            ...base, subscriptionPlan: 'monthly', subscriptionSince: '2026-07-15T00:00:00Z',
            leadsInPeriod: 2, leadsBeforePeriod: 5,
        });
        // abo 149 € + (2 leads − 1 included) × 120 €
        expect(r.total_cents).toBe(14900 + 12000);
        expect(r.lines[0].label).toContain('monatlich');
        expect(r.lines[1].label).toContain('1 im Abo inkludiert');
    });

    it('annual abo bills 1.490 € only in the anniversary month', () => {
        const since = '2026-08-20T00:00:00Z';
        const anniversary = computeProviderCharges({ ...base, subscriptionPlan: 'annual', subscriptionSince: since });
        expect(anniversary.total_cents).toBe(149000);
        expect(anniversary.lines[0].label).toContain('jährlich');
        const midYear = computeProviderCharges({ ...base, period: '2026-09', subscriptionPlan: 'annual', subscriptionSince: since });
        expect(midYear.total_cents).toBe(0);
        const nextYear = computeProviderCharges({ ...base, period: '2027-08', subscriptionPlan: 'annual', subscriptionSince: since });
        expect(nextYear.total_cents).toBe(149000);
    });

    it('annual abo still includes 1 lead per month, every month', () => {
        const r = computeProviderCharges({
            ...base, period: '2026-11', subscriptionPlan: 'annual', subscriptionSince: '2026-08-20T00:00:00Z',
            leadsInPeriod: 1, leadsBeforePeriod: 9,
        });
        expect(r.total_cents).toBe(0); // no abo line (not anniversary), lead included
    });

    it('a subscription starting AFTER the period does not bill or include anything', () => {
        const r = computeProviderCharges({
            ...base, subscriptionPlan: 'monthly', subscriptionSince: '2026-09-01T00:00:00Z',
            leadsInPeriod: 1, leadsBeforePeriod: 9, detailOpensInPeriod: 2,
        });
        expect(r.total_cents).toBe(12000 + 2 * 300); // full lead fee + detail opens
    });

    it('detail opens: 3 € each for non-subscribers, capped at 50 €/month', () => {
        const under = computeProviderCharges({ ...base, detailOpensInPeriod: 10 });
        expect(under.total_cents).toBe(3000);
        const over = computeProviderCharges({ ...base, detailOpensInPeriod: 25 });
        expect(over.total_cents).toBe(PRICING.detailOpenCapCents);
        expect(over.lines[0].label).toContain('Monats-Cap');
    });

    it('detail opens are free (unlimited) for subscribers', () => {
        const r = computeProviderCharges({
            ...base, subscriptionPlan: 'monthly', subscriptionSince: '2026-01-01T00:00:00Z',
            detailOpensInPeriod: 100,
        });
        expect(r.lines.some((l) => l.label.includes('Detail-Opens'))).toBe(false);
        expect(r.total_cents).toBe(14900); // only the abo line
    });

    it('realistic mixed month adds up correctly', () => {
        // New provider, no abo: 4 leads (2 free), 12 detail opens.
        const r = computeProviderCharges({ ...base, leadsInPeriod: 4, detailOpensInPeriod: 12 });
        expect(r.total_cents).toBe(2 * 12000 + 12 * 300);
    });
});
