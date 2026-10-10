import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import {
    computePerformance, qualityFactor, serialNoShowState, incidentsInWindow, userNoShowsInWindow, analyticsDepth, trendsBy, bookingsCsv,
    validateAvailabilityHours, validTimezone, availabilitySlots, bookingOpen, performancePolicyFromRow, DEFAULT_PERFORMANCE_POLICY,
    type BookingFact,
} from '../performance.js';

// ─── Phase 6: Fakten statt Annahmen ─────────────────────────────────────────

const NOW = '2026-10-11T12:00:00.000Z';
const daysAgo = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString();
const b = (over: Partial<BookingFact>): BookingFact => ({ id: Math.random().toString(36).slice(2), slot_start: daysAgo(10), status: 'completed', ...over });
const P = DEFAULT_PERFORMANCE_POLICY;

describe('computePerformance', () => {
    it('zaehlt nur Buchungen im Fenster und zeigt Quoten erst ab der Mindeststichprobe', () => {
        const f = computePerformance({ policy: P, nowIso: NOW, incidents: [], reviews: [], bookings: [
            b({}), b({}), b({ status: 'no_show', no_show_by: 'user' }), b({ slot_start: daysAgo(200) }),
        ] });
        expect(f.bookings).toBe(3);
        expect(f.rates_shown).toBe(false);
        expect(f.attended).toEqual({ count: 2, rate: null, of: 3 });
        expect(f.user_no_show.count).toBe(1);
    });

    it('ab fuenf Buchungen stehen die Quoten; alte no_show ohne no_show_by gelten als Anbieter', () => {
        const f = computePerformance({ policy: P, nowIso: NOW, incidents: [], reviews: [], bookings: [
            b({}), b({}), b({}), b({ status: 'no_show', no_show_by: 'user' }), b({ status: 'no_show' }), b({ status: 'cancelled', cancelled_by: 'provider' }),
        ] });
        expect(f.rates_shown).toBe(true);
        expect(f.attended).toEqual({ count: 3, rate: 0.5, of: 6 });
        expect(f.provider_no_show.count).toBe(1);
        expect(f.user_no_show.count).toBe(1);
        expect(f.cancelled_by_provider.count).toBe(1);
    });

    it('Bewertung nur aus verifizierten Nutzer-Reviews, Vorfaelle im eigenen Fenster, offene Widersprueche ohne Fenster', () => {
        const f = computePerformance({ policy: P, nowIso: NOW,
            incidents: [{ id: 'i1', kind: 'no_show', recorded_at: daysAgo(5) }, { id: 'i2', kind: 'no_show', recorded_at: daysAgo(100) }],
            reviews: [{ rating: 5, created_at: NOW }, { rating: 4, created_at: NOW, categories: ['would_use_again'] }, { rating: 1, created_at: NOW, verified: false }, { rating: 2, created_at: NOW, from_role: 'provider' }],
            bookings: [b({ slot_start: daysAgo(300), status: 'no_show', no_show_by: 'user', dispute_status: 'open' }), b({ status: 'confirmed', slot_start: daysAgo(-3) })],
        });
        expect(f.rating).toEqual({ average: 4.5, count: 2, min_count: 5 });
        expect(f.would_use_again).toEqual({ count: 1, rate: null, of: 2 });
        expect(f.incidents).toEqual({ count: 1, window_days: 90, alert_at: 2, pause_at: 3 });
        expect(f.disputes_open).toBe(1);
        expect(f.upcoming).toBe(1);
    });
});

describe('qualityFactor — neutral ohne Daten', () => {
    it('ohne Daten steht alles auf 0.5 bzw. 1 fuer "keine Vorfaelle"', () => {
        const q = qualityFactor({ rating: null, reviews_count: 0, completed: 0, bookings: 0, incidents: 0, incident_window_days: 90, min_sample: 5 });
        expect(q.neutral).toEqual(['rating', 'completion']);
        expect(q.value).toBeCloseTo(0.4 * 0.5 + 0.35 * 0.5 + 0.25, 3);
    });
    it('ein Anbieter ohne Daten liegt nicht vor einem mit ehrlichen Fakten', () => {
        const none = qualityFactor({ rating: null, reviews_count: 0, completed: 0, bookings: 0, incidents: 0, incident_window_days: 90, min_sample: 5 });
        const good = qualityFactor({ rating: 4.6, reviews_count: 7, completed: 9, bookings: 12, incidents: 0, incident_window_days: 90, min_sample: 5 });
        expect(good.value).toBeGreaterThan(none.value);
        expect(good.neutral).toEqual([]);
    });
    it('Vorfaelle zaehlen ab dem ersten', () => {
        const a = qualityFactor({ rating: 4.6, reviews_count: 7, completed: 9, bookings: 12, incidents: 0, incident_window_days: 90, min_sample: 5 });
        const c = qualityFactor({ rating: 4.6, reviews_count: 7, completed: 9, bookings: 12, incidents: 2, incident_window_days: 90, min_sample: 5 });
        expect(a.value - c.value).toBeCloseTo(0.125, 3);
    });
});

describe('Serien-No-Shows', () => {
    it('Hinweis bei 2, Pause bei 3', () => {
        expect(serialNoShowState(1, P)).toBe('none');
        expect(serialNoShowState(2, P)).toBe('alert');
        expect(serialNoShowState(3, P)).toBe('pause');
    });
    it('zaehlt nur im Fenster; widerrufene Nutzer-No-Shows zaehlen nicht', () => {
        expect(incidentsInWindow([{ id: 'a', kind: 'no_show', recorded_at: daysAgo(1) }, { id: 'b', kind: 'no_show', recorded_at: daysAgo(91) }], P, NOW)).toHaveLength(1);
        const u = userNoShowsInWindow([
            b({ status: 'no_show', no_show_by: 'user' }), b({ status: 'no_show', no_show_by: 'user', dispute_status: 'upheld' }), b({ status: 'no_show', no_show_by: 'provider' }),
        ], P, NOW);
        expect(u).toHaveLength(1);
    });
});

describe('Analytics-Tiefe und Verlauf', () => {
    it('basic: nur Fakten; enhanced: Verlauf; advanced: Export', () => {
        expect(analyticsDepth('basic')).toEqual({ level: 'basic', trends: false, export: false });
        expect(analyticsDepth('enhanced')).toEqual({ level: 'enhanced', trends: true, export: false });
        expect(analyticsDepth('advanced')).toEqual({ level: 'advanced', trends: true, export: true });
        expect(analyticsDepth(undefined).level).toBe('basic');
    });
    it('gruppiert nach Bereich, Land, Monat mit denselben Zaehlungen', () => {
        const rows = [b({ area_code: 'tax-vat', country: 'DE' }), b({ area_code: 'tax-vat', country: 'DE', status: 'no_show', no_show_by: 'user' }), b({ area_code: 'epr', country: 'IT', status: 'cancelled' })];
        expect(trendsBy(rows, 'area', 90, NOW)).toEqual([
            { key: 'tax-vat', bookings: 2, attended: 1, user_no_show: 1, provider_no_show: 0, cancelled: 0 },
            { key: 'epr', bookings: 1, attended: 0, user_no_show: 0, provider_no_show: 0, cancelled: 1 },
        ]);
        expect(trendsBy(rows, 'country', 90, NOW).map((r) => r.key)).toEqual(['DE', 'IT']);
        expect(trendsBy(rows, 'month', 90, NOW)[0].key).toBe('2026-10');
    });
    it('CSV traegt keine Nutzerdaten und maskiert Kommas', () => {
        const csv = bookingsCsv([b({ id: 'x1', area_code: 'tax,vat', country: 'DE' })]);
        expect(csv.split('\n')[0]).toBe('booking_id,slot_start,status,no_show_by,cancelled_by,dispute_status,area_code,country');
        expect(csv).toContain('"tax,vat"');
        expect(csv).not.toMatch(/email|user_id/);
    });
});

describe('Verfuegbarkeit', () => {
    it('prueft Fenster: Raster, Reihenfolge, Ueberlappung, Wochentag', () => {
        expect(validateAvailabilityHours({ mon: [{ from: '09:00', to: '12:00' }] })).toEqual({ ok: true, hours: { mon: [{ from: '09:00', to: '12:00' }] } });
        expect(validateAvailabilityHours({ mon: [{ from: '09:15', to: '12:00' }] })).toMatchObject({ ok: false });
        expect(validateAvailabilityHours({ mon: [{ from: '12:00', to: '09:00' }] })).toMatchObject({ ok: false });
        expect(validateAvailabilityHours({ mon: [{ from: '09:00', to: '12:00' }, { from: '11:00', to: '13:00' }] })).toMatchObject({ ok: false });
        expect(validateAvailabilityHours({ xyz: [] })).toMatchObject({ ok: false });
        expect(validateAvailabilityHours(null)).toEqual({ ok: true, hours: {} });
    });
    it('kennt Zeitzonen', () => {
        expect(validTimezone('Europe/Madrid')).toBe(true);
        expect(validTimezone('Mars/Olympus')).toBe(false);
    });
    it('erzeugt 30-Minuten-Slots in der Zeitzone des Anbieters', () => {
        // Sa 2026-10-10 als Start → erster Tag ist So (kein Fenster), dann Mo.
        const slots = availabilitySlots({ hours: { mon: [{ from: '09:00', to: '10:00' }] }, timezone: 'Europe/Berlin', fromIso: '2026-10-10T12:00:00.000Z', days: 7 });
        // Berlin im Oktober (Sommerzeit) = UTC+2 → 09:00 lokal = 07:00Z.
        expect(slots).toEqual(['2026-10-12T07:00:00.000Z', '2026-10-12T07:30:00.000Z']);
    });
    it('ohne Fenster gilt die Vorgabe, Wochenende bleibt leer', () => {
        const slots = availabilitySlots({ hours: null, timezone: 'Europe/Berlin', fromIso: '2026-10-09T12:00:00.000Z', days: 2 });
        expect(slots).toEqual([]); // Sa + So
        const mon = availabilitySlots({ hours: null, timezone: 'Europe/Berlin', fromIso: '2026-10-11T12:00:00.000Z', days: 1 });
        expect(mon).toHaveLength(5 + 3);
    });
    it('Pause schlaegt Abwesenheit', () => {
        expect(bookingOpen({ availability: 'available' })).toEqual({ open: true, reason: null });
        expect(bookingOpen({ availability: 'ooo' })).toEqual({ open: false, reason: 'ooo' });
        expect(bookingOpen({ availability: 'ooo', booking_paused_at: NOW })).toEqual({ open: false, reason: 'paused' });
    });
    it('liest die Policy-Zeile', () => {
        expect(performancePolicyFromRow({ version: 2, rate_min_bookings: 8, window_days: 120, incident_window_days: 60, incident_alert_count: 1, incident_pause_count: 2, user_no_show_alert_count: 3 }))
            .toEqual({ version: 2, rateMinBookings: 8, windowDays: 120, incidentWindowDays: 60, incidentAlertCount: 1, incidentPauseCount: 2, userNoShowAlertCount: 3 });
    });
});
