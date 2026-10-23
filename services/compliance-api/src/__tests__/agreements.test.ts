import { describe, it, expect, vi } from 'vitest';
// Reine Funktionen — das Supabase-Modul wird nur fuer die Routen gebraucht.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));
import { currentAgreement, acceptanceState, type AgreementRow, type AcceptanceRow } from '../agreements.js';

const row = (over: Partial<AgreementRow>): AgreementRow => ({
    agreement: 'beta', version: 'beta-2026-10', language: 'en', title: 'Beta agreement',
    points: [{ lead: 'This is a test.', text: '…' }], effective_from: '2026-10-22', ...over,
});
const acc = (over: Partial<AcceptanceRow>): AcceptanceRow => ({
    id: 'a', user_id: 'u', agreement: 'beta', version: 'beta-2026-10', language: 'en', accepted_at: '2026-10-29T14:12:00Z', ...over,
});

describe('currentAgreement — die geltende Fassung', () => {
    const rows = [
        row({ language: 'en' }), row({ language: 'de', title: 'Beta-Vereinbarung' }),
        row({ version: 'beta-2026-12', language: 'en', effective_from: '2026-12-01' }),   // Zukunft
        row({ agreement: 'terms', version: 'terms-v1', language: 'en', effective_from: '2026-10-01' }),
    ];
    const today = new Date('2026-10-29T00:00:00Z');

    it('nimmt die Sprache, wenn sie da ist', () => {
        expect(currentAgreement(rows, 'beta', 'de', today)?.title).toBe('Beta-Vereinbarung');
    });
    it('faellt auf Englisch zurueck', () => {
        expect(currentAgreement(rows, 'beta', 'tr', today)?.language).toBe('en');
    });
    it('ignoriert eine Fassung, die erst in der Zukunft gilt', () => {
        expect(currentAgreement(rows, 'beta', 'en', today)?.version).toBe('beta-2026-10');
        expect(currentAgreement(rows, 'beta', 'en', new Date('2026-12-02T00:00:00Z'))?.version).toBe('beta-2026-12');
    });
    it('trennt die Vereinbarungen', () => {
        expect(currentAgreement(rows, 'terms', 'de', today)?.version).toBe('terms-v1');
        expect(currentAgreement(rows, 'privacy', 'de', today)).toBeNull();
    });
});

describe('acceptanceState — was der Nutzer noch tun muss', () => {
    const current = row({});
    it('verlangt die Annahme, wenn keine da ist', () => {
        expect(acceptanceState('beta', current, [])).toMatchObject({ required: true, accepted_version: null, current_version: 'beta-2026-10' });
    });
    it('ist zufrieden mit der geltenden Fassung', () => {
        const s = acceptanceState('beta', current, [acc({})]);
        expect(s).toMatchObject({ required: false, accepted_version: 'beta-2026-10', language: 'en', accepted_at: '2026-10-29T14:12:00Z' });
    });
    it('verlangt die neue Fassung, auch wenn eine alte angenommen ist — die juengste Annahme zaehlt', () => {
        const s = acceptanceState('beta', row({ version: 'beta-2026-12' }), [
            acc({ accepted_at: '2026-10-29T14:12:00Z' }),
            acc({ id: 'b', version: 'beta-2026-09', accepted_at: '2026-09-01T00:00:00Z' }),
        ]);
        expect(s).toMatchObject({ required: true, accepted_version: 'beta-2026-10' });
    });
    it('verlangt nichts, wenn keine Fassung gilt', () => {
        expect(acceptanceState('terms', null, [])).toMatchObject({ required: false, current_version: null });
    });
    it('laesst Annahmen anderer Vereinbarungen aussen vor', () => {
        expect(acceptanceState('beta', current, [acc({ agreement: 'terms', version: 'terms-v1' })]).required).toBe(true);
    });
});
