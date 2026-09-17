import { describe, it, expect } from 'vitest';
import { jurisdictionChain, resolveFacts, type JurisdictionFact } from '../jurisdiction.js';

const f = (fact_key: string, value_text: string, jurisdiction_code: string): JurisdictionFact =>
    ({ fact_key, value_text, jurisdiction_code });

describe('jurisdictionChain', () => {
    it('zerlegt von grob nach fein', () => {
        expect(jurisdictionChain('US')).toEqual(['US']);
        expect(jurisdictionChain('US-CA')).toEqual(['US', 'US-CA']);
        expect(jurisdictionChain('US-CA-08031')).toEqual(['US', 'US-CA', 'US-CA-08031']);
    });
});

describe('resolveFacts', () => {
    const rows = [
        f('economic_nexus_threshold', 'USD 100,000', 'US'),
        f('economic_nexus_threshold', 'USD 500,000', 'US-CA'),
        f('economic_nexus_threshold', 'USD 500,000', 'US-TX'),
        f('marketplace_facilitator', 'Alle Staaten', 'US'),
    ];

    it('nimmt den Staatswert, wo es einen gibt', () => {
        const out = resolveFacts(rows, 'US-CA');
        expect(out.find((r) => r.fact_key === 'economic_nexus_threshold')?.value_text).toBe('USD 500,000');
    });

    it('faellt auf den Landeswert zurueck, wo der Staat nichts eigenes hat', () => {
        const out = resolveFacts(rows, 'US-CA');
        expect(out.find((r) => r.fact_key === 'marketplace_facilitator')?.value_text).toBe('Alle Staaten');
    });

    it('laesst fremde Staaten weg — Texas gehoert nicht in eine Auskunft fuer Kalifornien', () => {
        const out = resolveFacts(rows, 'US-CA');
        expect(out).toHaveLength(2);
        expect(out.filter((r) => r.fact_key === 'economic_nexus_threshold')).toHaveLength(1);
        expect(out.map((r) => r.jurisdiction_code)).not.toContain('US-TX');
    });

    it('ohne Region gilt NUR der Landeswert — nie zwei widersprechende Zahlen nebeneinander', () => {
        const out = resolveFacts(rows, 'US');
        expect(out).toHaveLength(2);
        expect(out.find((r) => r.fact_key === 'economic_nexus_threshold')?.value_text).toBe('USD 100,000');
    });

    it('nimmt den Ort vor dem Staat', () => {
        const withLocal = [...rows, f('economic_nexus_threshold', 'USD 25,000', 'US-CA-08031')];
        const out = resolveFacts(withLocal, 'US-CA-08031');
        expect(out.find((r) => r.fact_key === 'economic_nexus_threshold')?.value_text).toBe('USD 25,000');
    });

    it('nimmt den Staat, wenn der Ort nichts eigenes hat', () => {
        const out = resolveFacts(rows, 'US-CA-08031');
        expect(out.find((r) => r.fact_key === 'economic_nexus_threshold')?.value_text).toBe('USD 500,000');
    });

    it('behandelt Zeilen ohne Code als Landeszeilen (Bestand vor der Migration)', () => {
        const legacy = [{ fact_key: 'standard_rate', value_text: '19%' } as JurisdictionFact];
        expect(resolveFacts(legacy, 'DE')).toHaveLength(1);
        expect(resolveFacts(legacy, 'DE-BY')).toHaveLength(1);
    });

    it('aendert nichts an den europaeischen Maerkten', () => {
        const eu = [f('standard_rate', '19%', 'DE'), f('reduced_rates', '7%', 'DE')];
        expect(resolveFacts(eu, 'DE')).toHaveLength(2);
    });

    it('kommt mit leerer Eingabe klar', () => {
        expect(resolveFacts([], 'US-CA')).toEqual([]);
    });
});
