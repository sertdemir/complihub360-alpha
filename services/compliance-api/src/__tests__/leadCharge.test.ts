import { describe, it, expect, vi } from 'vitest';

// leadCharge.ts importiert Supabase, Stripe, Benachrichtigungen und Mailer auf
// Modulebene; die reinen Helfer hier beruehren nichts davon.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));
vi.mock('../stripe.js', () => ({ isStripeConfigured: () => false, getCustomerBilling: vi.fn(), createPaymentIntent: vi.fn() }));
vi.mock('../notifications.js', () => ({ notify: vi.fn() }));
vi.mock('../mailer.js', () => ({ sendPaymentFailedMail: vi.fn() }));

import { deriveOpportunity, recheckBudget, priceSnapshotFrom, currentAcknowledgement, SHARED_FIELDS_V1, type MatchableRow } from '../leadCharge.js';

// ─── Phase 4: Opportunity, Snapshot, Bestaetigungstext ───────────────────────

const row = (over: Partial<MatchableRow>): MatchableRow => ({
    service_id: 's1', service_code: 'tax-vat', area_code: 'tax-vat', country_code: 'DE',
    price_min: '900', price_max: '1500', currency: 'EUR', pricing_basis: 'per registration', ...over,
});

describe('deriveOpportunity — die Opportunity des Nutzers, begrenzt auf das Angebot', () => {
    const angebot = [
        row({ service_id: 's1', service_code: 'tax-vat', country_code: 'DE' }),
        row({ service_id: 's2', service_code: 'vat-registration', country_code: 'IT' }),
        row({ service_id: 's3', service_code: 'vat-registration', country_code: 'ES' }),
        row({ service_id: 's4', service_code: 'legal-advisory', area_code: 'legal-advisory', country_code: 'DE' }),
    ];

    it('nimmt Bereich und Maerkte aus der Sitzung, geschnitten mit dem Angebot', () => {
        const r = deriveOpportunity(angebot, { categories: ['tax-vat'], markets: ['IT', 'FR'], country: 'DE' }, {});
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.opp.areaCode).toBe('tax-vat');
        expect(r.opp.countries).toEqual(['IT', 'DE']);          // FR bietet er nicht an
        expect(r.opp.subcategories).toEqual(['vat-registration']);
        expect(r.opp.serviceCount).toBe(2);
        expect(r.opp.recurring).toBeNull();
        expect(['s1', 's2']).toContain(r.serviceRow.service_id);
    });

    it('ein ausdruecklicher Bereich muss im Angebot sein — sonst AREA_NOT_OFFERED', () => {
        expect(deriveOpportunity(angebot, null, { area_code: 'data-privacy' })).toEqual({ ok: false, code: 'AREA_NOT_OFFERED' });
        const r = deriveOpportunity(angebot, null, { area_code: 'legal-advisory' });
        expect(r.ok && r.opp.areaCode).toBe('legal-advisory');
    });

    it('ohne Sitzung und ohne Angabe: der einzige Bereich zaehlt, bei mehreren fehlt die Opportunity', () => {
        const nurEiner = angebot.filter((r) => r.area_code === 'tax-vat');
        expect(deriveOpportunity(nurEiner, null, {}).ok).toBe(true);
        expect(deriveOpportunity(angebot, null, {})).toEqual({ ok: false, code: 'OPPORTUNITY_REQUIRED' });
        expect(deriveOpportunity([], { categories: ['tax-vat'] }, {})).toEqual({ ok: false, code: 'OPPORTUNITY_REQUIRED' });
    });

    it('Laender aus dem Body nur als Rueckfall, und nur aus dem Angebot; sonst alle Laender des Bereichs', () => {
        const r1 = deriveOpportunity(angebot, { categories: ['tax-vat'], markets: ['FR'] }, { countries: ['ES', 'US'] });
        expect(r1.ok && r1.opp.countries).toEqual(['ES']);
        const r2 = deriveOpportunity(angebot, { categories: ['tax-vat'] }, {});
        expect(r2.ok && r2.opp.countries).toEqual(['DE', 'IT', 'ES']);
    });

    it('eine gewuenschte Leistung muss zum Bereich gehoeren', () => {
        expect(deriveOpportunity(angebot, { categories: ['tax-vat'] }, { service_id: 's4' })).toEqual({ ok: false, code: 'SERVICE_NOT_FOUND' });
        const r = deriveOpportunity(angebot, { categories: ['tax-vat'] }, { service_id: 's3' });
        expect(r.ok && r.serviceRow.service_id).toBe('s3');
    });

    it('die Legal-Support-Falle: der Bereich kommt nie aus einer fremden Sitzung, wenn der Anbieter ihn nicht hat', () => {
        // Ein Legal-Support-Anbieter, Sitzung sagt tax-vat: Schnitt leer, nur
        // ein Bereich im Angebot → legal-advisory. leadFeeEnabled sieht damit
        // den richtigen Bereich und laesst die Gebuehr aus.
        const legal = [row({ service_code: 'legal-advisory', area_code: 'legal-advisory' })];
        const r = deriveOpportunity(legal, { categories: ['tax-vat'], markets: ['DE'] }, {});
        expect(r.ok && r.opp.areaCode).toBe('legal-advisory');
    });
});

describe('priceSnapshotFrom — der Preisstand zum Buchungszeitpunkt (Spec A §20)', () => {
    it('nimmt die Leistung, wenn sie da ist, und friert Zeit und Fassung ein', () => {
        const now = new Date('2026-10-01T10:00:00Z');
        const s = priceSnapshotFrom(row({}), { price_min: 1200, price_max: null, currency: 'EUR', pricing_basis: 'Pauschale', deliverables: ['Antrag', 'Nachweise'] }, 'ct-2026-09', now);
        expect(s).toEqual({ price_min: 1200, price_max: null, currency: 'EUR', pricing_basis: 'Pauschale', included: ['Antrag', 'Nachweise'], terms_version: 'ct-2026-09', captured_at: '2026-10-01T10:00:00.000Z' });
    });
    it('faellt auf die View-Zeile zurueck, ohne Leistungen leer, Zahlen aus Strings', () => {
        const s = priceSnapshotFrom(row({ price_min: '900', price_max: '' }), null, null);
        expect(s.price_min).toBe(900);
        expect(s.price_max).toBeNull();
        expect(s.included).toEqual([]);
        expect(s.terms_version).toBeNull();
    });
});

describe('currentAcknowledgement — die gueltige Fassung in der Sprache des Nutzers', () => {
    const rows = [
        { version: 'booking-ack-v1', language: 'en', body: 'v1 en', shared_fields: ['email'], effective_from: '2026-10-01' },
        { version: 'booking-ack-v1', language: 'de', body: 'v1 de', shared_fields: ['email'], effective_from: '2026-10-01' },
        { version: 'booking-ack-v2', language: 'en', body: 'v2 en', shared_fields: ['email', 'phone'], effective_from: '2027-01-01' },
    ];
    it('nimmt die juengste Fassung, die schon gilt', () => {
        expect(currentAcknowledgement(rows, 'de', new Date('2026-10-15'))?.body).toBe('v1 de');
        expect(currentAcknowledgement(rows, 'en', new Date('2027-02-01'))?.body).toBe('v2 en');
    });
    it('faellt auf Englisch zurueck, wenn die Sprache fehlt', () => {
        expect(currentAcknowledgement(rows, 'tr', new Date('2026-10-15'))?.body).toBe('v1 en');
        expect(currentAcknowledgement(rows, 'de', new Date('2027-02-01'))?.body).toBe('v2 en');
    });
    it('ohne gueltige Fassung null', () => {
        expect(currentAcknowledgement(rows, 'en', new Date('2026-09-01'))).toBeNull();
    });
    it('die geteilten Felder des Codes sind die der Fassung v1', () => {
        expect([...SHARED_FIELDS_V1]).toEqual(['email', 'company_name', 'message']);
    });
});

// ─── ADR-0008 A2: Pruefbudget ────────────────────────────────────────────────
describe('recheckBudget', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    it('zaehlt nur die letzten 24 Stunden', () => {
        expect(recheckBudget(['2026-10-09T11:00:00Z', '2026-10-10T08:00:00Z'], now)).toEqual({ left: 2, nextAt: null });
    });
    it('ist das Budget aufgebraucht, nennt es den naechsten moeglichen Zeitpunkt', () => {
        const r = recheckBudget(['2026-10-10T01:00:00Z', '2026-10-10T02:00:00Z', '2026-10-10T03:00:00Z'], now);
        expect(r).toEqual({ left: 0, nextAt: '2026-10-11T01:00:00.000Z' });
    });
});
