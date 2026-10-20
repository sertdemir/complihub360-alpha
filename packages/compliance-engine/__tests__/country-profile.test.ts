import { describe, it, expect } from 'vitest';
import { getCountryRiskProfile, isKnownCountry, type CountryCode } from '../country-profile';
import { generateRelevantSubdomains } from '../generator';

// Bis 2026-10-19 pruefte isKnownCountry mit `in` und sah geerbte Eigenschaften:
// ein Gast schickte markets: ["toString"], /search liess es durch, und die
// Engine warf. Die Risk Map zeigte dann "We couldn't create your Risk Map".
const GEERBT = ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf'];

describe('isKnownCountry', () => {
    it('kennt die Laender der Matrix', () => {
        expect(isKnownCountry('DE')).toBe(true);
        expect(isKnownCountry('US')).toBe(true);
    });

    it('kennt keine geerbten Objekt-Eigenschaften', () => {
        for (const code of GEERBT) expect(isKnownCountry(code)).toBe(false);
    });

    it('kennt keine unbekannten oder falsch geschriebenen Codes', () => {
        for (const code of ['XX', 'de', '', 'BR']) expect(isKnownCountry(code)).toBe(false);
    });
});

describe('getCountryRiskProfile', () => {
    it('meldet ein geerbtes Merkmal als unbekanntes Land, statt es als Profil zu nehmen', () => {
        for (const code of GEERBT) {
            expect(() => getCountryRiskProfile(code as CountryCode)).toThrow(/Country profile not found/);
        }
    });
});

describe('der Weg von /search', () => {
    it('filtert geerbte Merkmale heraus, bevor die Engine rechnet', () => {
        const countries = ['DE', 'toString', 'constructor'].filter((c): c is CountryCode => isKnownCountry(c));
        expect(countries).toEqual(['DE']);
        expect(generateRelevantSubdomains({ countries }).length).toBeGreaterThan(0);
    });
});
