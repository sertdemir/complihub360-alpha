import { describe, expect, it, vi } from 'vitest';

vi.mock('../supabase.js', () => ({ supabaseApi: {} }));
import { classify } from '../changeControl.js';
import { isPending, isUnreviewedPlan, parseEffectiveDate, withSchedule } from '../changeSchedule.js';
import { renderChangeDecisionMail } from '../mailer.js';

const NOW = new Date('2026-10-04T12:00:00Z');
const svc = { price_min: 1200, price_max: 2400, currency: 'EUR', completion_days_estimate: 15, response_time_hours: 24, exclusions: [] };

describe('parseEffectiveDate', () => {
    it('leer heisst ab sofort', () => {
        expect(parseEffectiveDate(undefined, NOW)).toEqual({ ok: true, at: null });
        expect(parseEffectiveDate('', NOW)).toEqual({ ok: true, at: null });
    });
    it('nimmt einen Tag ab morgen, als Tagesbeginn in UTC', () => {
        expect(parseEffectiveDate('2026-10-05', NOW)).toEqual({ ok: true, at: '2026-10-05T00:00:00.000Z' });
    });
    it('weist heute, Vergangenheit, Unsinn und mehr als ein Jahr ab', () => {
        expect(parseEffectiveDate('2026-10-04', NOW)).toEqual({ ok: false, reason: 'past' });
        expect(parseEffectiveDate('2026-02-30', NOW)).toEqual({ ok: false, reason: 'format' });
        expect(parseEffectiveDate(20270101, NOW)).toEqual({ ok: false, reason: 'format' });
        expect(parseEffectiveDate('2027-10-06', NOW)).toEqual({ ok: false, reason: 'too_far' });
    });
});

describe('withSchedule', () => {
    it('plant guenstigere Konditionen ein, statt sie zu schreiben — die Antwortzeit ist keine Kondition und gilt weiter sofort', () => {
        const c = classify({ price_min: 1000, price_max: 2600, response_time_hours: 12, capacity_status: 'full' }, svc, true, 'direction');
        const { now, scheduled } = withSchedule(c);
        expect(scheduled.map((f) => f.field)).toEqual(['price_min']);
        expect(now.held.map((f) => f.field)).toEqual(['price_max']);
        expect(now.write).toEqual({ response_time_hours: 12, capacity_status: 'full' });
        expect(now.review.map((f) => f.field)).toEqual(['response_time_hours']);
    });
});

describe('Zustaende', () => {
    it('wartend und geplant sind offen; uebernommen, abgelehnt und Ereignisse nicht', () => {
        expect(isPending({ effect: 'held', status: 'submitted' })).toBe(true);
        expect(isPending({ effect: 'held', status: 'approved', applied_at: null })).toBe(true);
        expect(isPending({ effect: 'held', status: 'applied', applied_at: 'x' })).toBe(false);
        expect(isPending({ effect: 'pause', status: 'approved' })).toBe(false);
        expect(isUnreviewedPlan({ effect: 'held', status: 'approved', applied_at: null, reviewed_at: null })).toBe(true);
        expect(isUnreviewedPlan({ effect: 'held', status: 'approved', applied_at: null, reviewed_at: 'x' })).toBe(false);
    });
});

describe('Mail bei geplanter Freigabe', () => {
    it('nennt Einreichung und Stichtag, ohne Druck', () => {
        const m = renderChangeDecisionMail('approved_scheduled', '2026-10-02T09:00:00Z', null, 'de', '2027-01-01T00:00:00.000Z');
        expect(m.subject).toBe('Ihre Änderung gilt ab 1. Januar 2027');
        expect(m.text).toContain('vom 2. Oktober 2026');
        expect(m.text).toContain('zurückziehen');
        expect(m.text).not.toMatch(/sofort|jetzt|schnell/i);
    });
});
