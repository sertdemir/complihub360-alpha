import { describe, it, expect } from 'vitest';
import { computeAdminStats, disclosureSince, windowStart, type BookingRow, type EventRow } from '../adminStats.js';

// ─── Control Center · Kennzahlen (20.10.2026) ────────────────────────────────
// Vorher: tote Tabellen, Nullen, die nach "alles im Plan" aussahen. Hier steht
// fest, was jede Zahl zaehlt — und dass "nicht gemessen" null ist, nicht 0.

const NOW = new Date('2026-10-20T12:00:00Z');
const h = (n: number) => new Date(NOW.getTime() + n * 3_600_000).toISOString();
let seq = 0;
const booking = (over: Partial<BookingRow> = {}): BookingRow => ({
    id: `b-${++seq}`, provider_key: 'studio', status: 'confirmed', slot_start: h(48), created_at: h(-1), ...over,
});
const ev = (type: string, at: string, payload: Record<string, unknown> = {}): EventRow => ({ type, timestamp: at, payload });
const run = (over: Partial<Parameters<typeof computeAdminStats>[0]> = {}) => computeAdminStats({
    bookings: [], events7: [], disclosureEvents: [], feed: [], evidence: [],
    rateLimitPerMinute: 100, reminder24h: true, limits: { bookings: 500, events: 5000 }, now: NOW, ...over,
});

describe('computeAdminStats', () => {
    it('ohne Daten: Zaehler 0, Quoten null — nie 0 % fuer "nicht gemessen"', () => {
        const s = run();
        expect(s.bookings).toMatchObject({ today: 0, total: 0, heldRate: null, disclosureAuditedRate: null, reminderRate: null });
        expect(s.privacy.customerUploads).toBeNull();
        expect(s.truncated).toEqual([]);
        expect(s.series.dates).toEqual(['14.10', '15.10', '16.10', '17.10', '18.10', '19.10', '20.10']);
        expect(windowStart(NOW).toISOString()).toBe('2026-10-14T00:00:00.000Z');
    });

    it('zaehlt Buchungen heute, in 7 Tagen und bevorstehend', () => {
        const s = run({ bookings: [
            booking({ created_at: h(-2) }),
            booking({ created_at: h(-30), slot_start: h(10) }),
            booking({ created_at: h(-24 * 9), slot_start: h(-24 * 8), status: 'completed' }),
        ] });
        expect(s.bookings).toMatchObject({ today: 1, last7: 2, total: 3, upcoming7: 2 });
    });

    it('wahrgenommen = completed / (completed + no_show); offene Meldungen getrennt', () => {
        const s = run({ bookings: [
            booking({ slot_start: h(-5), status: 'completed' }),
            booking({ slot_start: h(-5), status: 'completed' }),
            booking({ slot_start: h(-5), status: 'completed' }),
            booking({ slot_start: h(-5), status: 'no_show', no_show_reported_at: h(-3) }),
            booking({ slot_start: h(-5), status: 'confirmed' }),
        ] });
        expect(s.bookings.heldRate).toBe(0.75);
        expect(s.bookings.unreported).toBe(1);
        expect(s.bookings.noShows7).toBe(1);
    });

    it('ein Plattformfehler zaehlt als Stornierung, nicht als No-Show', () => {
        const s = run({ bookings: [booking({ slot_start: h(-5), status: 'cancelled', cancelled_at: h(-4), no_show_reported_at: h(-4) })] });
        expect(s.bookings).toMatchObject({ cancelled7: 1, noShows7: 0 });
    });

    it('Offenlegung: gezaehlt wird die Audit-Spur ab dem ersten Bestaetigungstext', () => {
        const old = booking({ created_at: h(-200) });
        const a = booking({ created_at: h(-100), acknowledgement_version: 'v2' });
        const b = booking({ created_at: h(-50), acknowledgement_version: 'v2' });
        const rebooked = booking({ created_at: h(-20), acknowledgement_version: 'v2' });
        const s = run({
            bookings: [old, a, b, rebooked],
            disclosureEvents: [ev('lead.revealed', a.created_at, { bookingId: a.id }), ev('booking_rebooked', rebooked.created_at, { bookingId: rebooked.id })],
        });
        expect(disclosureSince([old, a, b])).toBe(a.created_at);
        // b hat keine Spur — genau der Fall, den die Quote sichtbar machen soll.
        expect(s.bookings.disclosureAuditedRate).toBeCloseTo(2 / 3);
    });

    it('Erinnerungsquote ab dem ersten erinnerten Termin, nur wo mehr als 24 h lagen', () => {
        const s = run({ bookings: [
            booking({ created_at: h(-300), slot_start: h(-250), reminder_24h_sent: false }),
            booking({ created_at: h(-100), slot_start: h(-50), reminder_24h_sent: true }),
            booking({ created_at: h(-100), slot_start: h(-40), reminder_24h_sent: false }),
            booking({ created_at: h(-10), slot_start: h(-5), reminder_24h_sent: false }),
            booking({ created_at: h(-100), slot_start: h(-30), status: 'cancelled' }),
        ] });
        expect(s.bookings.reminderRate).toBe(0.5);
    });

    it('ohne laufende Erinnerungen (Shadow, Richtlinie ohne 24 h): Quote null, keine Fehlalarme', () => {
        const pending = booking({ id: 'p', slot_start: h(6), created_at: h(-48), reminder_24h_sent: false });
        expect(run({ bookings: [pending] }).watchlist[0].flag).toBe('soon');
        const live = [pending, booking({ slot_start: h(-50), created_at: h(-100), reminder_24h_sent: true })];
        expect(run({ bookings: live }).watchlist[0].flag).toBe('reminder_missing');
        const s = run({ bookings: live, reminder24h: false });
        expect(s.bookings.reminderRate).toBeNull();
        expect(s.watchlist[0].flag).toBe('soon');
    });

    it('Watchlist: offene Einsprueche zuerst, dann naechste Termine', () => {
        const s = run({ bookings: [
            booking({ id: 'later', slot_start: h(72) }),
            booking({ id: 'soon', slot_start: h(5), created_at: h(-2) }),
            booking({ id: 'dispute', slot_start: h(-30), status: 'no_show', dispute_status: 'open' }),
            booking({ id: 'gone', slot_start: h(30), status: 'cancelled' }),
        ] });
        expect(s.watchlist.map(w => [w.id, w.flag])).toEqual([['dispute', 'dispute'], ['soon', 'soon'], ['later', 'upcoming']]);
    });

    it('Privacy aus den echten Grenzuebertritten: KI (bereinigt) und Offenlegung', () => {
        const s = run({
            events7: [ev('assistant_chat', h(-1), { redacted: true }), ev('assistant_chat', h(-2), { redacted: false }), ev('lead.revealed', h(-3))],
            evidence: [{ upload_confirmed: true, reviewed_at: null }, { upload_confirmed: true, reviewed_at: h(-1) }, { upload_confirmed: false }],
        });
        expect(s.privacy).toEqual({ aiRequests7: 2, aiRedacted7: 1, reveals7: 1, evidenceStored: 2, evidenceToReview: 1, customerUploads: null });
    });

    it('Security: Zugangs- und Fehler-Ereignisse im Fenster, Limit aus der Konfiguration', () => {
        const s = run({ rateLimitPerMinute: 240, events7: [ev('api_key_issued', h(-1)), ev('api_access_requested', h(-2)), ev('calendar_event_failed', h(-3))] });
        expect(s.security).toEqual({ rateLimitPerMinute: 240, accessEvents7: 2, errorEvents7: 1 });
    });

    it('Audit-Stream: nur freigegebene Payload-Schluessel — keine E-Mail, kein Mailtext, keine Notiz, keine Nutzer-ID', () => {
        const s = run({ feed: [ev('email_outbox', h(-1), { to: 'kunde@example.com', text: 'Ihr Link …', kind: 'booking' }), ev('lead.revealed', h(-2), { userId: 'u-1', providerKey: 'studio', bookingId: 'b' }), ev('booking_platform_failure', h(-3), { note: 'Freitext', by: 'u-2' })] });
        expect(s.events.map(e => e.payload)).toEqual([{ kind: 'booking' }, { providerKey: 'studio' }, {}]);
        expect(JSON.stringify(s.events)).not.toMatch(/kunde@|u-1|u-2|Freitext/);
    });

    it('nennt jede Quelle, deren Lesegrenze erreicht ist', () => {
        const s = run({ limits: { bookings: 2, events: 2 }, bookings: [booking(), booking()], events7: [ev('x', h(-1)), ev('y', h(-1))] });
        expect(s.truncated).toEqual(['scheduling', 'event_log']);
    });
});
