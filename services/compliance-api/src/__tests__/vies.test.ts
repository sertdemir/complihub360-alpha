import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normaliseVatId, checkVatId } from '../vies.js';

// VIES is an external service — the network is stubbed so the suite stays
// fast and offline-safe. The live contract was verified manually against
// ec.europa.eu before this module was written.

describe('normaliseVatId', () => {
    it('strips separators and upper-cases', () => {
        expect(normaliseVatId(' de 811193231 ')).toBe('DE811193231');
        expect(normaliseVatId('DE-811.193.231')).toBe('DE811193231');
    });
    it('maps the Greek ISO code to the VIES prefix EL', () => {
        expect(normaliseVatId('GR123456789')).toBe('EL123456789');
    });
});

describe('checkVatId', () => {
    const realFetch = globalThis.fetch;
    beforeEach(() => { globalThis.fetch = vi.fn() as never; });
    afterEach(() => { globalThis.fetch = realFetch; });

    it('returns valid and keeps the disclosed company name', async () => {
        (globalThis.fetch as never as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true, json: async () => ({ isValid: true, name: 'Muster GmbH' }),
        });
        const r = await checkVatId('DE811193231');
        expect(r.status).toBe('valid');
        expect(r.name).toBe('Muster GmbH');
        expect(r.checkedAt).toBeTruthy();
    });

    it("drops VIES's '---' placeholder instead of storing it as a name", async () => {
        (globalThis.fetch as never as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true, json: async () => ({ isValid: true, name: '---' }),
        });
        expect((await checkVatId('DE811193231')).name).toBeNull();
    });

    it('returns invalid for a rejected number', async () => {
        (globalThis.fetch as never as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true, json: async () => ({ isValid: false }),
        });
        expect((await checkVatId('DE000000000')).status).toBe('invalid');
    });

    it('marks non-EU VAT ids unsupported — VIES cannot speak for them', async () => {
        const r = await checkVatId('GB123456789');
        expect(r.status).toBe('unsupported');
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('rejects malformed input without calling the service', async () => {
        expect((await checkVatId('12345')).status).toBe('invalid');
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('degrades to unavailable when VIES is down — never to invalid', async () => {
        (globalThis.fetch as never as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));
        expect((await checkVatId('DE811193231')).status).toBe('unavailable');
    });
});
