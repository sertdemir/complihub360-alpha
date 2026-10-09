import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import {
    classifyAttendance, rebookDeadline, rebookDeadlinePassed, creditCents, appointmentReminderDue,
    reminderOffsetsCovered, rebookReminderDue, findRecentLead, canReschedule, disputeOpen,
    attendanceReportable, policyFromRow, DEFAULT_ATTENDANCE_POLICY, type LeadCandidate,
} from '../attendance.js';

// ─── Phase 5: die Regeln ohne Netz und ohne Uhr ──────────────────────────────

describe('classifyAttendance — die Zehn-Minuten-Regel (Spec B)', () => {
    const slot = '2026-10-20T10:00:00.000Z';
    it('beide da → attended', () => {
        expect(classifyAttendance({ slotStart: slot, providerJoinedAt: '2026-10-20T09:58:00Z', providerLeftAt: null, userJoinedAt: '2026-10-20T10:01:00Z', waitMinutes: 10 })).toBe('attended');
    });
    it('Anbieter puenktlich, bleibt zehn Minuten, Nutzer fehlt → user_no_show', () => {
        expect(classifyAttendance({ slotStart: slot, providerJoinedAt: '2026-10-20T10:00:00Z', providerLeftAt: '2026-10-20T10:12:00Z', userJoinedAt: null, waitMinutes: 10 })).toBe('user_no_show');
    });
    it('Anbieter geht nach acht Minuten → nicht verifizierbar, kein No-Show des Nutzers', () => {
        expect(classifyAttendance({ slotStart: slot, providerJoinedAt: '2026-10-20T10:00:00Z', providerLeftAt: '2026-10-20T10:08:00Z', userJoinedAt: null, waitMinutes: 10 })).toBe('unverifiable');
    });
    it('Anbieter kommt zu spaet → kann keinen No-Show erklaeren', () => {
        expect(classifyAttendance({ slotStart: slot, providerJoinedAt: '2026-10-20T10:03:00Z', providerLeftAt: null, userJoinedAt: null, waitMinutes: 10 })).toBe('unverifiable');
    });
    it('Anbieter fehlt, Nutzer da → provider_no_show; niemand da → unverifiable', () => {
        expect(classifyAttendance({ slotStart: slot, providerJoinedAt: null, providerLeftAt: null, userJoinedAt: '2026-10-20T10:00:30Z', waitMinutes: 10 })).toBe('provider_no_show');
        expect(classifyAttendance({ slotStart: slot, providerJoinedAt: null, providerLeftAt: null, userJoinedAt: null, waitMinutes: 10 })).toBe('unverifiable');
    });
});

describe('Frist und Guthaben', () => {
    it('14 Tage ab dem Ereignis, Fristtag zaehlt noch', () => {
        expect(rebookDeadline('2026-10-20T16:45:00Z', 14)).toBe('2026-11-03');
        expect(rebookDeadlinePassed('2026-11-03', '2026-11-03')).toBe(false);
        expect(rebookDeadlinePassed('2026-11-03', '2026-11-04')).toBe(true);
        expect(rebookDeadlinePassed(null, '2026-11-04')).toBe(false);
    });
    it('30 % kaufmaennisch gerundet, 0 bei gebuehrenfrei', () => {
        expect(creditCents(13410, 30)).toBe(4023);
        expect(creditCents(9900, 30)).toBe(2970);
        expect(creditCents(1, 30)).toBe(0);
        expect(creditCents(0, 30)).toBe(0);
        expect(creditCents(10000, 0)).toBe(0);
    });
});

describe('Erinnerungen', () => {
    const slot = '2026-10-20T10:00:00.000Z';
    it('T-24h faellig, T-1h noch nicht', () => {
        expect(appointmentReminderDue({ slotStart: slot, nowIso: '2026-10-19T10:30:00Z', sentOffsets: [], offsets: [1440, 60] })).toBe(1440);
    });
    it('T-24h schon gegangen → nichts bis T-1h', () => {
        expect(appointmentReminderDue({ slotStart: slot, nowIso: '2026-10-19T12:00:00Z', sentOffsets: [1440], offsets: [1440, 60] })).toBeNull();
        expect(appointmentReminderDue({ slotStart: slot, nowIso: '2026-10-20T09:10:00Z', sentOffsets: [1440], offsets: [1440, 60] })).toBe(60);
    });
    it('Watcher kam spaet: nur die naechste Stufe, verpasste gelten als erledigt', () => {
        expect(appointmentReminderDue({ slotStart: slot, nowIso: '2026-10-20T09:30:00Z', sentOffsets: [], offsets: [1440, 60] })).toBe(60);
        expect(reminderOffsetsCovered([1440, 60], 60)).toEqual([1440, 60]);
    });
    it('nach dem Termin nie', () => {
        expect(appointmentReminderDue({ slotStart: slot, nowIso: '2026-10-20T10:00:01Z', sentOffsets: [], offsets: [1440, 60] })).toBeNull();
    });
    it('Neubuchung: Tag 1, 5, 10 — je einmal, nach der Frist nie', () => {
        const base = { noShowAtIso: '2026-10-20T10:30:00Z', deadline: '2026-11-03', days: [1, 5, 10] };
        expect(rebookReminderDue({ ...base, sent: 0, today: '2026-10-20' })).toBeNull();
        expect(rebookReminderDue({ ...base, sent: 0, today: '2026-10-21' })).toBe(1);
        expect(rebookReminderDue({ ...base, sent: 1, today: '2026-10-23' })).toBeNull();
        expect(rebookReminderDue({ ...base, sent: 1, today: '2026-10-25' })).toBe(5);
        expect(rebookReminderDue({ ...base, sent: 2, today: '2026-10-30' })).toBe(10);
        expect(rebookReminderDue({ ...base, sent: 3, today: '2026-11-01' })).toBeNull();
        expect(rebookReminderDue({ ...base, sent: 0, today: '2026-11-04' })).toBeNull();
    });
});

describe('Mehrfachbuchung, Umbuchung, Widerspruch', () => {
    const mk = (over: Partial<LeadCandidate>): LeadCandidate => ({
        id: 'b1', provider_key: 'kanzlei', user_id: 'u1', created_at: '2026-10-01T10:00:00Z', status: 'confirmed', lead_ledger_id: 'l1', ...over,
    });
    it('derselbe Nutzer beim selben Anbieter binnen 30 Tagen → der bestehende Lead', () => {
        const hit = findRecentLead({ bookings: [mk({})], userId: 'u1', providerKey: 'kanzlei', nowIso: '2026-10-20T10:00:00Z', windowDays: 30 });
        expect(hit?.id).toBe('b1');
    });
    it('nach dem Fenster, anderer Nutzer, anderer Anbieter, ohne Ledger → nichts', () => {
        expect(findRecentLead({ bookings: [mk({})], userId: 'u1', providerKey: 'kanzlei', nowIso: '2026-11-05T10:00:00Z', windowDays: 30 })).toBeNull();
        expect(findRecentLead({ bookings: [mk({})], userId: 'u2', providerKey: 'kanzlei', nowIso: '2026-10-20T10:00:00Z', windowDays: 30 })).toBeNull();
        expect(findRecentLead({ bookings: [mk({})], userId: 'u1', providerKey: 'andere', nowIso: '2026-10-20T10:00:00Z', windowDays: 30 })).toBeNull();
        expect(findRecentLead({ bookings: [mk({ lead_ledger_id: null })], userId: 'u1', providerKey: 'kanzlei', nowIso: '2026-10-20T10:00:00Z', windowDays: 30 })).toBeNull();
    });
    it('offene Neubuchungsfrist zaehlt auch jenseits des Fensters, abgeschlossene nicht', () => {
        const old = mk({ created_at: '2026-08-01T10:00:00Z', status: 'no_show', rebook_deadline: '2026-10-25' });
        expect(findRecentLead({ bookings: [old], userId: 'u1', providerKey: 'kanzlei', nowIso: '2026-10-20T10:00:00Z', windowDays: 30 })?.id).toBe('b1');
        expect(findRecentLead({ bookings: [{ ...old, credit_decided_at: '2026-10-26T00:00:00Z' }], userId: 'u1', providerKey: 'kanzlei', nowIso: '2026-10-27T10:00:00Z', windowDays: 30 })).toBeNull();
    });
    it('die Kette zeigt auf die Wurzel', () => {
        const root = mk({ id: 'root', created_at: '2026-10-01T10:00:00Z' });
        const child = mk({ id: 'child', created_at: '2026-10-10T10:00:00Z', rebooked_from: 'root' });
        expect(findRecentLead({ bookings: [child, root], userId: 'u1', providerKey: 'kanzlei', nowIso: '2026-10-20T10:00:00Z', windowDays: 30 })?.id).toBe('root');
    });
    it('zwei Umbuchungen, dann Schluss', () => {
        expect(canReschedule(0, 2)).toBe(true);
        expect(canReschedule(1, 2)).toBe(true);
        expect(canReschedule(2, 2)).toBe(false);
    });
    it('Widerspruch binnen 48 h', () => {
        expect(disputeOpen('2026-10-20T10:00:00Z', '2026-10-22T09:59:00Z', 48)).toBe(true);
        expect(disputeOpen('2026-10-20T10:00:00Z', '2026-10-22T10:01:00Z', 48)).toBe(false);
        expect(disputeOpen(null, '2026-10-22T10:01:00Z', 48)).toBe(false);
    });
    it('Anwesenheit nur nach dem Slot und nur bei bestaetigt', () => {
        expect(attendanceReportable('confirmed', '2026-10-20T10:30:00Z', '2026-10-20T10:31:00Z')).toBe(true);
        expect(attendanceReportable('confirmed', '2026-10-20T10:30:00Z', '2026-10-20T10:00:00Z')).toBe(false);
        expect(attendanceReportable('cancelled', '2026-10-20T10:30:00Z', '2026-10-21T10:00:00Z')).toBe(false);
    });
});

describe('policyFromRow', () => {
    it('leer → Spec-B-Standard; Zeile → sortierte Stufen', () => {
        expect(policyFromRow(null)).toEqual(DEFAULT_ATTENDANCE_POLICY);
        const p = policyFromRow({ version: 1, provider_wait_minutes: 10, rebook_days: 14, credit_pct: 30, dispute_hours: 48, same_user_window_days: 30, reschedule_limit: 2, reminder_offsets_min: [60, 1440], rebook_reminder_days: [10, 1, 5] });
        expect(p.reminderOffsetsMin).toEqual([1440, 60]);
        expect(p.rebookReminderDays).toEqual([1, 5, 10]);
        expect(p.version).toBe(1);
    });
});
