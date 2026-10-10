import { describe, expect, it, vi } from 'vitest';

vi.mock('../supabase.js', () => ({ supabaseApi: {} }));
import { buildSharedSnapshot, providerSharedView, sharedPreview } from '../sharedSnapshot';
import { deniedPayload } from '../accessDenied';

const FIELDS = ['email', 'company_name', 'message'];

describe('sharedPreview / buildSharedSnapshot — eine Quelle fuer Dialog und Anbieter', () => {
    it('zeigt und speichert dieselben Werte', () => {
        const src = { email: ' a@b.example ', company: 'Acme GmbH', message: 'Hallo', topic: { area_code: 'tax-vat', countries: ['DE'] } };
        const snap = buildSharedSnapshot(FIELDS, src);
        expect(sharedPreview(FIELDS, src)).toEqual({ email: snap.email, company_name: snap.company_name });
        expect(snap).toEqual({ email: 'a@b.example', company_name: 'Acme GmbH', message: 'Hallo', topic: { area_code: 'tax-vat', countries: ['DE'] } });
    });

    it('ein Feld ausserhalb von shared_fields ist null und geht nie raus', () => {
        const snap = buildSharedSnapshot(['message'], { email: 'a@b.example', company: 'Acme', message: 'x' });
        expect(snap.email).toBeNull();
        expect(snap.company_name).toBeNull();
        expect(snap.message).toBe('x');
    });

    it('leere Angaben bleiben leer statt geraten', () => {
        expect(buildSharedSnapshot(FIELDS, { email: '', company: '   ' })).toMatchObject({ email: null, company_name: null, message: null, topic: null });
    });
});

describe('providerSharedView — der Anbieter liest nur den Schnappschuss', () => {
    it('mit Schnappschuss: genau dessen Werte, nicht die Altquelle', () => {
        const v = providerSharedView(
            { shared_snapshot: { email: 'a@b.example', company_name: null, message: null, topic: null }, shared_fields: FIELDS, message: 'alt' },
            { email: 'anders@x.example', company: 'Firma aus einer Anfrage' },
        );
        expect(v).toEqual({ user_email: 'a@b.example', user_company: null, message: null });
    });

    it('Buchung von vor Phase 4 ohne Feldliste: unveraendert, damit der Termin seinen Kontakt behaelt', () => {
        const v = providerSharedView({ shared_fields: [], message: 'm' }, { email: 'a@b.example', company: 'Acme' });
        expect(v).toEqual({ user_email: 'a@b.example', user_company: 'Acme', message: 'm' });
    });

    it('ohne Schnappschuss (aeltere Buchung): nur die freigegebenen Felder', () => {
        const v = providerSharedView({ shared_fields: ['email'], message: 'm' }, { email: 'a@b.example', company: 'Acme' });
        expect(v).toEqual({ user_email: 'a@b.example', user_company: null, message: null });
    });
});

describe('deniedPayload — protokolliert ohne personenbezogene Angaben', () => {
    it('Route ohne Query, IDs statt Namen', () => {
        expect(deniedPayload({ route: 'GET /api/v1/session/abc?email=x@y.example', userId: 'u1', resource: 'session', target: 'abc', status: 404, correlationId: 'c1' }))
            .toEqual({ route: 'GET /api/v1/session/abc', userId: 'u1', resource: 'session', target: 'abc', status: 404, correlationId: 'c1' });
    });
});
