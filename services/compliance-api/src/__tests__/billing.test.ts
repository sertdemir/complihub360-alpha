import { describe, it, expect, vi } from 'vitest';

// billing.ts importiert den Supabase-Client auf Modulebene; die reinen
// Preisregeln beruehren ihn nie.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import {
    annualPriceCents, computeLeadBand, applyMonthlyDiscount, categoryAllowanceCheck,
    leadFeeEnabled, subscriptionChargeForPeriod, quoteLeadFee, LEAD_FEE_POLICY_VERSION,
    type PlanConfig, type BandRule, type PricingConfig, type Subscription,
} from '../billing.js';

// ─── Pricing v2 (Spec B, ADR-0003) ───────────────────────────────────────────
// Nagelt jede Regel fest: Jahr = 10 Monate; vier Baender nach Opportunity,
// nie nach Anbietergroesse; 10 % / 15 % auf die ersten 3 / 6 Leads je Zyklus,
// kein Rollover, kein doppeltes Kontingent beim Planwechsel; Hauptkategorien
// begrenzt, Unterkategorien und Laender nicht; regulierte Berufe ohne Gebuehr.

const plan = (over: Partial<PlanConfig>): PlanConfig => ({
    code: 'essential', version: 1, label: 'Essential', currency: 'USD',
    monthlyCents: 5900, annualCents: 59000, categoryAllowance: 1,
    leadDiscountPct: 0, leadDiscountCount: 0, includedBlogArticles: 0, apiEligible: false, analyticsLevel: 'basic',
    ...over,
});
const ESSENTIAL = plan({});
const GROWTH = plan({ code: 'growth', label: 'Growth', monthlyCents: 9900, annualCents: 99000, categoryAllowance: 5, leadDiscountPct: 10, leadDiscountCount: 3, includedBlogArticles: 1, analyticsLevel: 'enhanced' });
const GLOBAL = plan({ code: 'global', label: 'Global', monthlyCents: 18900, annualCents: 189000, categoryAllowance: null, leadDiscountPct: 15, leadDiscountCount: 6, includedBlogArticles: 2, apiEligible: true, analyticsLevel: 'advanced' });

const CFG: PricingConfig = {
    plans: [ESSENTIAL, GROWTH, GLOBAL],
    bands: [
        { band: 1, version: 1, label: 'Focused', feeCents: 9900, currency: 'USD' },
        { band: 2, version: 1, label: 'Core', feeCents: 14900, currency: 'USD' },
        { band: 3, version: 1, label: 'Advanced', feeCents: 29900, currency: 'USD' },
        { band: 4, version: 1, label: 'Strategic', feeCents: 49900, currency: 'USD' },
    ],
    rules: [],
    feeExceptions: [{ areaCode: 'legal-advisory', countryCode: '*', enabled: false }],
};

const sub = (over: Partial<Subscription>): Subscription => ({
    id: 's1', providerKey: 'p1', planCode: 'growth', planVersion: 1, cadence: 'monthly', status: 'active',
    currentPeriodStart: '2026-09-15', currentPeriodEnd: '2026-10-15', startedAt: '2026-09-15T10:00:00Z',
    ...over,
});

describe('Jahrespreis', () => {
    it('kostet zehn Monate', () => {
        expect(annualPriceCents(5900)).toBe(59000);
        expect(annualPriceCents(9900)).toBe(99000);
        expect(annualPriceCents(18900)).toBe(189000);
    });
});

describe('computeLeadBand — Opportunity, nicht Anbieter', () => {
    const opp = { areaCode: 'tax-vat', subcategories: ['tax-vat.registrations'], countries: ['DE'] };

    it('faellt ohne Regeln auf Band 1', () => {
        expect(computeLeadBand(opp, []).band).toBe(1);
    });

    it('trifft eine Bereichsregel', () => {
        const rules: BandRule[] = [{ areaCode: 'tax-vat', serviceCode: null, countryPattern: '*', minCountries: 1, minServices: 1, recurring: null, band: 2, priority: 0 }];
        expect(computeLeadBand(opp, rules).band).toBe(2);
    });

    it('Mehrlaender-Schwelle hebt das Band, ein Land nicht', () => {
        const rules: BandRule[] = [
            { areaCode: 'tax-vat', serviceCode: null, countryPattern: '*', minCountries: 1, minServices: 1, recurring: null, band: 2, priority: 0 },
            { areaCode: 'tax-vat', serviceCode: null, countryPattern: '*', minCountries: 3, minServices: 1, recurring: null, band: 4, priority: 0 },
        ];
        expect(computeLeadBand(opp, rules).band).toBe(2);
        expect(computeLeadBand({ ...opp, countries: ['DE', 'FR', 'IT'] }, rules).band).toBe(4);
    });

    it('"EU" als Muster trifft ein EU-Land, "US" nicht', () => {
        const rules: BandRule[] = [{ areaCode: null, serviceCode: null, countryPattern: 'EU', minCountries: 1, minServices: 1, recurring: null, band: 3, priority: 0 }];
        expect(computeLeadBand(opp, rules).band).toBe(3);
        expect(computeLeadBand({ ...opp, countries: ['US'] }, rules).band).toBe(1);
    });

    it('hoechste Prioritaet gewinnt, bei Gleichstand die spezifischere Regel, dann das niedrigere Band', () => {
        const rules: BandRule[] = [
            { areaCode: null, serviceCode: null, countryPattern: '*', minCountries: 1, minServices: 1, recurring: null, band: 4, priority: 0 },
            { areaCode: 'tax-vat', serviceCode: null, countryPattern: '*', minCountries: 1, minServices: 1, recurring: null, band: 3, priority: 0 },
            { areaCode: 'tax-vat', serviceCode: 'tax-vat.registrations', countryPattern: '*', minCountries: 1, minServices: 1, recurring: null, band: 2, priority: 0 },
        ];
        expect(computeLeadBand(opp, rules).band).toBe(2);
        const gleich: BandRule[] = [
            { areaCode: 'tax-vat', serviceCode: null, countryPattern: '*', minCountries: 1, minServices: 1, recurring: null, band: 3, priority: 0 },
            { areaCode: 'tax-vat', serviceCode: null, countryPattern: '*', minCountries: 1, minServices: 1, recurring: null, band: 2, priority: 0 },
        ];
        expect(computeLeadBand(opp, gleich).band).toBe(2);
        const prio: BandRule[] = [...gleich, { areaCode: null, serviceCode: null, countryPattern: '*', minCountries: 1, minServices: 1, recurring: null, band: 4, priority: 9 }];
        expect(computeLeadBand(opp, prio).band).toBe(4);
    });

    it('kennt keine Anbietergroesse und keinen Plan als Eingang', () => {
        // Die Signatur nimmt nur die Opportunity und die Regeln — nichts vom Anbieter.
        expect(computeLeadBand.length).toBe(2);
    });
});

describe('applyMonthlyDiscount — die ersten n Leads je Zyklus', () => {
    it('Essential: kein Rabatt', () => {
        const r = applyMonthlyDiscount(ESSENTIAL, 0, 14900);
        expect(r).toEqual({ discountPct: 0, discountSequence: null, finalFeeCents: 14900, counterUsedAfter: 0 });
    });

    it('Growth: 10 % auf Lead 1–3, der vierte voll', () => {
        let used = 0;
        const finals: number[] = [];
        for (let i = 0; i < 4; i++) {
            const r = applyMonthlyDiscount(GROWTH, used, 14900);
            finals.push(r.finalFeeCents);
            used = r.counterUsedAfter;
        }
        expect(finals).toEqual([13410, 13410, 13410, 14900]);
        expect(used).toBe(3);
    });

    it('Global: 15 % auf Lead 1–6, der siebte voll, Sequenz zaehlt mit', () => {
        const r1 = applyMonthlyDiscount(GLOBAL, 0, 9900);
        expect(r1.discountSequence).toBe(1);
        expect(r1.finalFeeCents).toBe(8415);
        const r7 = applyMonthlyDiscount(GLOBAL, 6, 9900);
        expect(r7.discountSequence).toBeNull();
        expect(r7.finalFeeCents).toBe(9900);
    });

    it('Planwechsel im Zyklus: der Zaehler bleibt, kein zweites Kontingent', () => {
        // Growth hat drei rabattierte Leads verbraucht, dann Upgrade auf Global:
        // Global darf nur noch 3 weitere (6 − 3), nicht 6 neue.
        expect(applyMonthlyDiscount(GLOBAL, 3, 9900).discountSequence).toBe(4);
        expect(applyMonthlyDiscount(GLOBAL, 6, 9900).discountSequence).toBeNull();
        // Downgrade auf Growth nach 3 verbrauchten: nichts mehr uebrig.
        expect(applyMonthlyDiscount(GROWTH, 3, 9900).discountSequence).toBeNull();
    });

    it('ohne Abo kein Rabatt', () => {
        expect(applyMonthlyDiscount(null, 0, 9900).finalFeeCents).toBe(9900);
    });

    it('rundet auf ganze Cent', () => {
        expect(applyMonthlyDiscount(GROWTH, 0, 9999).finalFeeCents).toBe(8999);
    });
});

describe('categoryAllowanceCheck — Hauptkategorien sind das Kontingent', () => {
    it('Essential: eine Hauptkategorie, die zweite ist zu viel', () => {
        expect(categoryAllowanceCheck(ESSENTIAL, ['tax-vat']).ok).toBe(true);
        const r = categoryAllowanceCheck(ESSENTIAL, ['tax-vat', 'data-privacy']);
        expect(r.ok).toBe(false);
        expect(r.over).toEqual(['data-privacy']);
    });

    it('Growth: bis zu fuenf, Doppelnennungen zaehlen einmal', () => {
        expect(categoryAllowanceCheck(GROWTH, ['a', 'b', 'c', 'd', 'e', 'a']).ok).toBe(true);
        expect(categoryAllowanceCheck(GROWTH, ['a', 'b', 'c', 'd', 'e', 'f']).ok).toBe(false);
    });

    it('Global: alle', () => {
        expect(categoryAllowanceCheck(GLOBAL, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']).ok).toBe(true);
    });

    it('ohne Abo: keine Hauptkategorie', () => {
        expect(categoryAllowanceCheck(null, ['tax-vat']).ok).toBe(false);
        expect(categoryAllowanceCheck(null, []).ok).toBe(true);
    });
});

describe('leadFeeEnabled — regulierte Berufe', () => {
    it('Legal Support: ueberall aus', () => {
        expect(leadFeeEnabled(CFG.feeExceptions, 'legal-advisory', ['DE'])).toBe(false);
        expect(leadFeeEnabled(CFG.feeExceptions, 'legal-advisory', [])).toBe(false);
    });

    it('alles andere: an', () => {
        expect(leadFeeEnabled(CFG.feeExceptions, 'tax-vat', ['DE'])).toBe(true);
        expect(leadFeeEnabled(CFG.feeExceptions, null, ['DE'])).toBe(true);
    });

    it('eine Land-Freigabe schlaegt die Bereichs-Sperre', () => {
        const exc = [...CFG.feeExceptions, { areaCode: 'legal-advisory', countryCode: 'US', enabled: true }];
        expect(leadFeeEnabled(exc, 'legal-advisory', ['US'])).toBe(true);
        expect(leadFeeEnabled(exc, 'legal-advisory', ['US', 'DE'])).toBe(false);
    });
});

describe('subscriptionChargeForPeriod — die Abo-Zeile', () => {
    it('monatlich: jede Periode ab dem Start', () => {
        const s = sub({});
        expect(subscriptionChargeForPeriod(s, GROWTH, '2026-08')).toBeNull();
        expect(subscriptionChargeForPeriod(s, GROWTH, '2026-09')?.amount_cents).toBe(9900);
        expect(subscriptionChargeForPeriod(s, GROWTH, '2026-10')?.amount_cents).toBe(9900);
    });

    it('jaehrlich: nur im Jubilaeumsmonat, zehn Monatspreise', () => {
        const s = sub({ cadence: 'annual' });
        expect(subscriptionChargeForPeriod(s, GROWTH, '2026-09')?.amount_cents).toBe(99000);
        expect(subscriptionChargeForPeriod(s, GROWTH, '2026-10')).toBeNull();
        expect(subscriptionChargeForPeriod(s, GROWTH, '2027-09')?.amount_cents).toBe(99000);
    });

    it('beendet oder gekuendigt: nichts', () => {
        expect(subscriptionChargeForPeriod(sub({ status: 'ended' }), GROWTH, '2026-09')).toBeNull();
        expect(subscriptionChargeForPeriod(sub({ status: 'cancelled' }), GROWTH, '2026-09')).toBeNull();
        expect(subscriptionChargeForPeriod(null, GROWTH, '2026-09')).toBeNull();
    });

    it('traegt keine Lead-Zeile — Leads laufen je Buchung ueber das Ledger', () => {
        const line = subscriptionChargeForPeriod(sub({}), GROWTH, '2026-09');
        expect(line?.label).not.toMatch(/lead/i);
    });
});

describe('quoteLeadFee — das Angebot, das die Buchung ausfuehrt', () => {
    const opp = { areaCode: 'tax-vat', subcategories: [], countries: ['DE'] };

    it('Growth, erster Lead im Zyklus: Band 1, $99, 10 % → $89.10', () => {
        const q = quoteLeadFee(CFG, sub({}), opp, 0, new Date('2026-09-20'));
        expect(q).toMatchObject({
            enabled: true, band: 1, standardFeeCents: 9900, currency: 'USD',
            planCode: 'growth', discountPct: 10, discountSequence: 1, finalFeeCents: 8910,
            counterUsedAfter: 1, cycleStart: '2026-09-15', policyVersion: LEAD_FEE_POLICY_VERSION,
        });
    });

    it('ohne Abo: Standardpreis, Zyklus = Monatserster', () => {
        const q = quoteLeadFee(CFG, null, opp, 0, new Date('2026-09-20T12:00:00Z'));
        expect(q.finalFeeCents).toBe(9900);
        expect(q.planCode).toBeNull();
        expect(q.cycleStart).toBe('2026-09-01');
    });

    it('Legal Support: keine Gebuehr, auch nicht rabattiert', () => {
        const q = quoteLeadFee(CFG, sub({ planCode: 'global' }), { ...opp, areaCode: 'legal-advisory' }, 0);
        expect(q.enabled).toBe(false);
        expect(q.standardFeeCents).toBe(0);
        expect(q.finalFeeCents).toBe(0);
        expect(q.counterUsedAfter).toBe(0);
    });

    it('derselbe Lead kostet mit Essential und Global dasselbe Band — nur der Rabatt unterscheidet sich', () => {
        const e = quoteLeadFee(CFG, sub({ planCode: 'essential' }), opp, 0);
        const g = quoteLeadFee(CFG, sub({ planCode: 'global' }), opp, 0);
        expect(e.band).toBe(g.band);
        expect(e.standardFeeCents).toBe(g.standardFeeCents);
        expect(e.finalFeeCents).toBe(9900);
        expect(g.finalFeeCents).toBe(8415);
    });
});
