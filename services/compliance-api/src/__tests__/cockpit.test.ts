import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import { computeCockpit, type CockpitInput } from '../cockpit.js';
import type { PricingConfig } from '../billing.js';

// ─── Founder Cockpit (22.10.2026) ────────────────────────────────────────────
// Vorher: Produkt, Kundenstimme und SLA aus `engagement_requests` (tot seit
// 01.09.), MRR aus angenommenen 12 $ je Assistant-Abo. Hier steht fest, was
// jede Zahl zaehlt — und dass eine fehlende Quelle null ist, nicht 0.

const NOW = new Date('2026-10-22T12:00:00Z');
const h = (n: number) => new Date(NOW.getTime() + n * 3_600_000).toISOString();
// Wie der echte Katalog: USD (Migration provider_pricing_v2).
const PRICING = {
    plans: [
        { code: 'essential', version: 2, label: 'Essential', currency: 'USD', monthlyCents: 4900, annualCents: 49000 },
        { code: 'growth', version: 1, label: 'Growth', currency: 'USD', monthlyCents: 9900, annualCents: 99000 },
    ],
    planVersions: [
        { code: 'essential', version: 1, label: 'Essential', currency: 'USD', monthlyCents: 3900, annualCents: 39000 },
        { code: 'essential', version: 2, label: 'Essential', currency: 'USD', monthlyCents: 4900, annualCents: 49000 },
        { code: 'growth', version: 1, label: 'Growth', currency: 'USD', monthlyCents: 9900, annualCents: 99000 },
    ],
} as unknown as PricingConfig;

const empty = (): CockpitInput => ({
    bookings: [], events7: [], feed: [], sessions: [], invoices: [], subscriptions: [], pricing: PRICING,
    ledger7: [], paymentEvents: [], credits7: [], reviews: [], providers: [], incidents30: [], enforcement: [], userSubs: [],
    truncated: [], watchersShadow: true, now: NOW,
});
const run = (over: Partial<CockpitInput> = {}) => computeCockpit({ ...empty(), ...over });

describe('computeCockpit', () => {
    it('ohne Daten: Zaehler 0, Quoten null', () => {
        const c = run();
        expect(c.unavailable).toEqual([]);
        expect(c.rates).toEqual({ heldRate: null, invoicesPaid: null, billingReady: null, subscriptionsCurrent: null });
        expect(c.money.mrr).toEqual({});
        expect(c.money.baseCurrency).toBe('USD');
        expect(c.trust.attention).toEqual([]);
        expect(c.voice.reviews).toEqual({ count: 0, avgRating: null, fromUsers: 0, fromProviders: 0 });
        expect(c.series.dates).toEqual(['16.10', '17.10', '18.10', '19.10', '20.10', '21.10', '22.10']);
    });

    it('eine fehlende Quelle ist null und steht in unavailable — nie 0', () => {
        const c = run({ invoices: null, pricing: null, reviews: null });
        expect(c.unavailable).toEqual(['invoices', 'pricing', 'reviews']);
        expect(c.platformHealth.db).toBe('degraded');
        expect(c.money.invoices).toBeNull();
        expect(c.money.mrr).toBeNull();
        expect(c.voice.reviews).toBeNull();
        expect(c.rates.invoicesPaid).toBeNull();
        // Was eine andere Quelle hat, bleibt.
        expect(c.product.bookingsTotal).toBe(0);
    });

    it('MRR aus dem Katalog: gebundene Version, Jahrestarif /12, past_due zaehlt mit, beendete und unbekannte nicht', () => {
        const c = run({ subscriptions: [
            { provider_key: 'a', plan_code: 'essential', plan_version: 1, cadence: 'monthly', status: 'active' },
            { provider_key: 'b', plan_code: 'growth', plan_version: 1, cadence: 'annual', status: 'active' },
            { provider_key: 'c', plan_code: 'essential', plan_version: 2, cadence: 'monthly', status: 'past_due' },
            { provider_key: 'd', plan_code: 'growth', plan_version: 1, cadence: 'monthly', status: 'active', ended_at: h(-10) },
            { provider_key: 'e', plan_code: 'enterprise', plan_version: 1, cadence: 'monthly', status: 'active' },
            // gebundene Version steht nicht im geltenden Katalog: nie still der Preis einer anderen
            { provider_key: 'f', plan_code: 'growth', plan_version: 3, cadence: 'monthly', status: 'active' },
        ] });
        expect(c.money.mrr).toEqual({ USD: 3900 + Math.round(99000 / 12) + 4900 });
        expect(c.money.unpriced).toBe(2);
        expect(c.money.subscriptions).toEqual({ active: 4, pastDue: 1 });
        expect(c.rates.subscriptionsCurrent).toBe(0.8);
        expect(c.trust.attention).toContainEqual({ provider_key: 'c', reason: 'past_due', since: null });
    });

    it('Produkt aus Buchungen und Sessions', () => {
        const c = run({
            bookings: [
                { status: 'confirmed', slot_start: h(10), created_at: h(-1) },
                { status: 'completed', slot_start: h(-30), created_at: h(-60) },
                { status: 'no_show', slot_start: h(-20), created_at: h(-24 * 10), no_show_by: 'user' },
            ],
            sessions: [{ status: 'active', created_at: h(-2) }, { status: 'archived', created_at: h(-24 * 9) }, { status: null, created_at: h(-3) }],
        });
        expect(c.product).toEqual({ bookingsToday: 1, bookings7: 2, bookingsTotal: 3, heldRate: 0.5, sessionsActive: 2, sessions7: 2 });
    });

    it('Lead-Gebuehren: Status aus den Zahlungsereignissen, gezaehlt wie im Billing-Lauf (captured, n/a)', () => {
        // Das Ledger ist append-only: auf der Zeile steht nur der Stand beim Schreiben.
        const c = run({
            ledger7: [
                { id: 'l1', kind: 'charge', payment_status: 'pending', final_fee_cents: 4000, currency: 'USD', created_at: h(-1) },
                { id: 'l2', kind: 'charge', payment_status: 'pending', final_fee_cents: 2500, currency: 'USD', created_at: h(-2) },
                { id: 'l3', kind: 'charge', payment_status: 'pending', final_fee_cents: 9900, currency: 'USD', created_at: h(-3) },
                { id: 'l4', kind: 'charge', payment_status: 'n/a', final_fee_cents: 0, currency: 'USD', created_at: h(-4) },
                { id: 'l5', kind: 'charge', payment_status: 'pending', final_fee_cents: 3000, currency: 'USD', created_at: h(-5) },
                { id: 'c1', kind: 'credit', payment_status: 'n/a', final_fee_cents: 0, currency: 'USD', created_at: h(-6) },
            ],
            paymentEvents: [
                { ledger_id: 'l1', status: 'captured', created_at: h(-0.9) },
                { ledger_id: 'l3', status: 'failed', created_at: h(-2.9) },
                { ledger_id: 'l5', status: 'captured', created_at: h(-4.9) },
                { ledger_id: 'l5', status: 'refunded', created_at: h(-1) },
            ],
            credits7: [{ amount_cents: 1200, currency: 'USD', created_at: h(-5) }, { amount_cents: -1200, currency: 'USD', created_at: h(-4) }],
        });
        expect(c.money.leadFees7).toEqual({ charges: 5, collected: { USD: 4000 }, pending: 1, failed: 1 });
        expect(c.series.leadFeeCents?.[6]).toBe(4000);
        // Verbrauch zaehlt nicht gegen die ausgegebenen Gutschriften.
        expect(c.money.credits7).toEqual({ USD: 1200 });
    });

    it('Lead-Gebuehren ohne lesbare Zahlungsereignisse: null, nicht "alles offen"', () => {
        const c = run({ ledger7: [{ id: 'l1', kind: 'charge', payment_status: 'pending', final_fee_cents: 4000, created_at: h(-1) }], paymentEvents: null });
        expect(c.money.leadFees7).toBeNull();
        expect(c.unavailable).toContain('provider_lead_ledger_payment_events');
        expect(c.series.leadFeeCents).toBeNull();
    });

    it('Rechnungen: bezahlt-Quote, ueberfaellig nach due_at', () => {
        const c = run({ invoices: [
            { status: 'paid', amount_cents: 4900, currency: 'USD' }, { status: 'paid', amount_cents: 4600, currency: 'EUR' },
            { status: 'open', amount_cents: 9900, currency: 'usd', due_at: h(-24) }, { status: 'failed', amount_cents: 4900 }, { status: 'void', amount_cents: 100 },
        ] });
        // Gemischte Waehrungen stehen getrennt — eine Summe ueber EUR und USD waere falsch.
        expect(c.money.invoices).toEqual({ open: 1, paid: 2, failed: 1, overdue: 1, openAmounts: { USD: 9900 }, paidAmounts: { USD: 4900, EUR: 4600 } });
        expect(c.rates.invoicesPaid).toBe(0.5);
    });

    it('Kundenstimme: Bewertungen, Stornierungen durch Nutzer nach cancelled_at, offene Einsprueche', () => {
        const c = run({
            reviews: [{ from_role: 'user', rating: 5 }, { from_role: 'user', rating: 4 }, { from_role: 'provider', rating: null }],
            bookings: [
                { status: 'cancelled', cancelled_by: 'user', cancelled_at: h(-2), slot_start: h(20), created_at: h(-24 * 20) },
                { status: 'cancelled', cancelled_by: 'provider', cancelled_at: h(-2), slot_start: h(20), created_at: h(-2) },
                { status: 'no_show', dispute_status: 'open', slot_start: h(-30), created_at: h(-40) },
            ],
        });
        expect(c.voice).toEqual({ reviews: { count: 3, avgRating: 4.5, fromUsers: 2, fromProviders: 1 }, userCancellations7: 1, disputesOpen: 1 });
    });

    it('Vertrauen: Lebenszyklus, Vorfaelle, offene Massnahmen, Handlungsbedarf nach Schwere', () => {
        const c = run({
            providers: [
                { provider_key: 'live-ok', lifecycle_status: 'active', billing_ready: true },
                { provider_key: 'live-blocked', lifecycle_status: 'limited', billing_ready: false },
                { provider_key: 'new', lifecycle_status: 'submitted', billing_ready: false },
                { provider_key: 'sus', lifecycle_status: 'suspended', lifecycle_status_since: h(-48) },
                { provider_key: 'reverif', lifecycle_status: 'reverification_due', reverification_due_at: h(24) },
            ],
            incidents30: [{ provider_key: 'live-ok', recorded_at: h(-5) }],
            enforcement: [
                { provider_key: 'sus', created_at: h(-50) },
                // Einspruch abgelehnt: die Massnahme gilt weiter.
                { provider_key: 'reverif', created_at: h(-70), decision: 'upheld', appeal_at: h(-60) },
                { provider_key: 'live-ok', created_at: h(-80), appeal_at: h(-70) },
            ],
            bookings: [{ status: 'no_show', no_show_by: 'provider', no_show_reported_at: h(-24 * 3), slot_start: h(-24 * 3), created_at: h(-24 * 5) }],
        });
        expect(c.trust.providers).toEqual({ live: 2, onboarding: 1, paused: 0, suspended: 1, reverification: 1, ended: 0 });
        expect(c.trust).toMatchObject({ providerNoShows30: 1, incidents30: 1, enforcementOpen: 3, appealsPending: 1, attentionTotal: 7 });
        expect(c.trust.attention!.map(a => [a.provider_key, a.reason])).toEqual([
            ['sus', 'suspended'], ['sus', 'enforcement'], ['reverif', 'enforcement'], ['live-ok', 'enforcement'],
            ['live-ok', 'incident'], ['live-blocked', 'billing_blocked'], ['reverif', 'reverification_due'],
        ]);
        expect(c.rates.billingReady).toBe(0.5);
    });

    it('Handlungsbedarf: fehlt eine der vier Quellen, wird "niemand" nicht behauptet', () => {
        for (const missing of ['providers', 'enforcement', 'subscriptions', 'incidents30'] as const) {
            const c = run({ [missing]: null });
            expect(c.trust.attention, missing).toBeNull();
        }
    });

    it('Audit-Stream mit Positivliste, Fehler-Ereignisse im Fenster', () => {
        const c = run({
            feed: [{ type: 'email_outbox', timestamp: h(-1), payload: { to: 'kunde@example.com', text: 'Link', kind: 'booking' } }],
            events7: [{ type: 'calendar_event_failed', timestamp: h(-2) }, { type: 'scheduling_confirmed', timestamp: h(-3) }],
        });
        expect(c.events).toEqual([{ type: 'email_outbox', payload: { kind: 'booking' }, created_at: h(-1) }]);
        expect(c.platformHealth).toMatchObject({ errorEvents7: 1, latestEventAt: h(-1) });
        expect(run({ feed: null }).unavailable).toEqual(['event_feed']);
    });
});

// ─── Waechter: jede Spalte im PostgREST-`select` gibt es in den Migrationen ──
// Ein Tippfehler liesse die Quelle in Produktion still auf "nicht lesbar"
// kippen; der Test-Store ignoriert `select`, deshalb hier gegen das Schema.
describe('Cockpit-Spaltenauswahl', () => {
    const src = readFileSync(join(__dirname, '..', 'cockpit.ts'), 'utf8');
    const migrations = readdirSync(join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations'))
        .filter(f => f.endsWith('.sql'))
        .map(f => readFileSync(join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations', f), 'utf8'))
        .join('\n');
    const reads = [...src.matchAll(/sel\("([a-z_]+)", \{ select: "([a-z_,]+)"/g)].map(m => ({ table: m[1], cols: m[2].split(',') }));

    it('liest die Quellen mit Spaltenauswahl', () => {
        expect(reads.length).toBeGreaterThanOrEqual(13);
        expect(reads.map(r => r.table)).toContain('provider_lead_ledger_payment_events');
    });

    it.each(reads.flatMap(r => r.cols.map(c => [r.table, c])))('%s.%s steht in den Migrationen', (table, col) => {
        expect(migrations).toMatch(new RegExp(`\\b${table}\\b`));
        expect(migrations).toMatch(new RegExp(`\\b${col}\\b`));
    });

    it('liest keine Freitexte oder Kontaktdaten', () => {
        const all = reads.flatMap(r => r.cols);
        for (const c of ['message', 'body', 'answers', 'email', 'user_id', 'note', 'dispute_note', 'text']) expect(all).not.toContain(c);
    });
});
