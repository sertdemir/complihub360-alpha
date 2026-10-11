import { describe, it, expect } from 'vitest';
import {
    generateApiKey, hashApiKey, looksLikeApiKey, hashesEqual, keyMatchesClient, validateScopes, hasScope, apiAccessVerdict,
    ClientRateLimiter, mapEventLogRow, eventBelongsTo, serializeLead, isExtStatus, pageLimit, clientView, REQUESTABLE_SCOPES,
    type ApiClientRow,
} from '../apiClients.js';

const NOW = '2026-10-11T12:00:00.000Z';
const client = (over: Partial<ApiClientRow> = {}): ApiClientRow => ({
    id: 'c1', provider_key: 'test-kanzlei', name: 'CRM', status: 'active', scopes: ['leads:read', 'events:read'],
    rate_limit_per_minute: 120, key_hash: hashApiKey('chk_live_' + 'a'.repeat(48)), key_prefix: 'chk_live_aaaa…', ...over,
});

describe('Schluessel', () => {
    it('erzeugt Praefix, Klartext und Hash — der Klartext steht nirgends im Hash', () => {
        const k = generateApiKey(() => Buffer.alloc(24, 7));
        expect(k.key.startsWith('chk_live_')).toBe(true);
        expect(k.prefix).toBe('chk_live_0707…');
        expect(k.hash).toBe(hashApiKey(k.key));
        expect(k.hash).not.toContain('0707070707');
        expect(looksLikeApiKey(k.key)).toBe(true);
        expect(looksLikeApiKey('eyJhbGciOi')).toBe(false);
    });
    it('vergleicht in konstanter Zeit und kennt den vorigen Schluessel nur bis zum Ablauf', () => {
        const cur = 'chk_live_' + 'a'.repeat(48); const prev = 'chk_live_' + 'b'.repeat(48);
        const c = client({ previous_key_hash: hashApiKey(prev), previous_key_valid_until: '2026-10-12T12:00:00.000Z' });
        expect(hashesEqual(hashApiKey(cur), c.key_hash)).toBe(true);
        expect(keyMatchesClient(hashApiKey(cur), c, NOW)).toBe('current');
        expect(keyMatchesClient(hashApiKey(prev), c, NOW)).toBe('previous');
        expect(keyMatchesClient(hashApiKey(prev), c, '2026-10-13T00:00:00.000Z')).toBeNull();
        expect(keyMatchesClient(hashApiKey('chk_live_' + 'c'.repeat(48)), c, NOW)).toBeNull();
    });
});

describe('Scopes und Zustand', () => {
    it('prueft Scopes gegen die Liste; availability:write ist nicht beantragbar', () => {
        expect(validateScopes(['leads:read', 'leads:read', 'events:read'])).toEqual({ ok: true, scopes: ['leads:read', 'events:read'] });
        expect(validateScopes(['admin:all'])).toMatchObject({ ok: false });
        expect(validateScopes([])).toMatchObject({ ok: false });
        expect(validateScopes(['availability:write'], REQUESTABLE_SCOPES)).toMatchObject({ ok: false });
        expect(hasScope(client(), 'leads:read')).toBe(true);
        expect(hasScope(client(), 'billing:read')).toBe(false);
    });
    it('Zustand vor Tarif: gesperrt 403, widerrufen 401, nicht aktiv 403, unter Global 403', () => {
        expect(apiAccessVerdict({ status: 'active' }, true)).toEqual({ ok: true });
        expect(apiAccessVerdict({ status: 'suspended' }, true)).toMatchObject({ status: 403, code: 'API_CLIENT_SUSPENDED' });
        expect(apiAccessVerdict({ status: 'revoked' }, true)).toMatchObject({ status: 401, code: 'API_CLIENT_REVOKED' });
        expect(apiAccessVerdict({ status: 'approved' }, true)).toMatchObject({ status: 403, code: 'API_CLIENT_NOT_ACTIVE' });
        expect(apiAccessVerdict({ status: 'active' }, false)).toMatchObject({ status: 403, code: 'API_NOT_ELIGIBLE' });
    });
});

describe('Rate Limit', () => {
    it('festes Fenster je Client, 429 mit Retry-After, Fenster laeuft ab', () => {
        const rl = new ClientRateLimiter(60_000);
        const t0 = 1_000_000;
        for (let i = 0; i < 3; i++) expect(rl.check('c1', 3, t0 + i).allowed).toBe(true);
        const over = rl.check('c1', 3, t0 + 10_000);
        expect(over).toMatchObject({ allowed: false, remaining: 0, retryAfterSec: 50 });
        expect(rl.check('c2', 3, t0).allowed).toBe(true);
        expect(rl.check('c1', 3, t0 + 60_001).allowed).toBe(true);
    });
});

describe('Ereignisse', () => {
    it('mappt interne Typen auf Spec-B-Namen und laesst nur freigegebene Felder durch', () => {
        const e = mapEventLogRow({ id: 'e1', type: 'scheduling_confirmed', timestamp: NOW, payload: { providerKey: 'test-kanzlei', bookingId: 'b1', slot_start: NOW, userId: 'u1', email: 'x@y.z' } });
        expect(e).toMatchObject({ type: 'booking.created', booking_id: 'b1', data: { slot_start: NOW } });
        expect(JSON.stringify(e)).not.toMatch(/u1|x@y\.z/);
        expect(mapEventLogRow({ id: 'e2', type: 'attendance_reported', timestamp: NOW, payload: { outcome: 'user_no_show', rebook_until: NOW } })?.type).toBe('user.no_show');
        expect(mapEventLogRow({ id: 'e3', type: 'attendance_reported', timestamp: NOW, payload: { outcome: 'attended' } })?.type).toBe('meeting.completed');
        expect(mapEventLogRow({ id: 'e4', type: 'lead.credit_issued', timestamp: NOW, payload: { amount_cents: 4023, currency: 'USD' } })?.data).toEqual({ amount_cents: 4023, currency: 'USD' });
        expect(mapEventLogRow({ id: 'e5', type: 'email_sent', timestamp: NOW, payload: {} })).toBeNull();
    });
    it('filtert auf den Anbieter', () => {
        expect(eventBelongsTo({ id: 'e', type: 'x', timestamp: NOW, payload: { providerKey: 'a' } }, 'a')).toBe(true);
        expect(eventBelongsTo({ id: 'e', type: 'x', timestamp: NOW, payload: { provider_key: 'b' } }, 'a')).toBe(false);
    });
});

describe('Leads', () => {
    const b = { id: 'b1', provider_key: 'k', status: 'confirmed', slot_start: NOW, identity_revealed: true, shared_fields: ['email', 'company_name', 'message'], user_email: 'a@b.c', user_company: 'Acme', message: 'Hallo', category: 'tax-vat', country: 'DE' };
    it('nur nach Offenlegung, nur freigegebene Felder', () => {
        expect(serializeLead({ ...b, identity_revealed: false })).toBeNull();
        expect(serializeLead(b)?.contact).toEqual({ email: 'a@b.c', company: 'Acme', message: 'Hallo' });
        expect(serializeLead({ ...b, shared_fields: ['company_name'] })?.contact).toEqual({ email: null, company: 'Acme', message: null });
    });
    it('Lead-Status aus der Liste, Seiten mit Obergrenze', () => {
        expect(isExtStatus('won')).toBe(true); expect(isExtStatus('maybe')).toBe(false);
        expect(pageLimit('500')).toBe(100); expect(pageLimit('x')).toBe(50); expect(pageLimit('7')).toBe(7);
    });
    it('die Sicht des Anbieters traegt nie den Hash', () => {
        expect(JSON.stringify(clientView(client()))).not.toContain(client().key_hash as string);
    });
});
