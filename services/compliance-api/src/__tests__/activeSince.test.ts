import { describe, it, expect } from 'vitest';
import { readActiveSince } from '../activeSince.js';

describe('readActiveSince', () => {
    const now = new Date('2026-10-18T12:00:00Z');
    it('nicht geschickt heisst: nichts aendern', () => expect(readActiveSince(undefined, now)).toBeUndefined());
    it('null heisst: nicht mehr anzeigen', () => expect(readActiveSince(null, now)).toEqual({ value: null }));
    it('nimmt ganze Jahre von 1900 bis zum laufenden Jahr', () => {
        expect(readActiveSince(1900, now)).toEqual({ value: 1900 });
        expect(readActiveSince(2026, now)).toEqual({ value: 2026 });
    });
    it('lehnt alles andere ab, statt es still zu verwerfen', () => {
        for (const v of [1899, 2027, 15, 2013.5, '2013', '', true, NaN, {}]) expect(readActiveSince(v, now), String(v)).toBe('invalid');
    });
});
