import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Welche Hauptkategorien die Tarifwahl nennt ──────────────────────────────
//
// Die Seite /subscription sagt dem Anbieter "Sie sind heute fuer N
// Hauptkategorien freigegeben". Diese Zahl ist der Grund, warum der Seitenkopf
// eine Passungsfrage sein darf statt einer Kaufaufforderung — sie kommt aus
// SEINEN Daten.
//
// Gelesen wird darum `provider_services`, ABSICHTLICH NICHT die View
// `matchable_provider_services`: die filtert zusaetzlich auf
// `lifecycle_status`, und ein pausiertes Konto haette dort null Zeilen. Die
// Seite wuerde einem Anbieter mit freigegebenen Leistungen "0 Hauptkategorien"
// sagen — falsch, und genau die Art Satz, die jemanden klein macht.

const rows: Record<string, any[]> = {};
vi.mock('../supabase.js', () => ({
    supabaseApi: {
        select: async (table: string) => rows[table] ?? [],
    },
}));

const { releasedAreasOf } = await import('../subscriptions.js');

const KATEGORIEN = [
    { code: 'tax-vat', parent_code: null, label_en: 'Tax & VAT' },
    { code: 'customs', parent_code: null, label_en: 'Customs' },
    { code: 'legal-support', parent_code: null, label_en: 'Legal Support' },
    // Unterkategorien
    { code: 'vat-registration', parent_code: 'tax-vat', label_en: 'VAT registration' },
    { code: 'oss-filing', parent_code: 'tax-vat', label_en: 'OSS filing' },
    { code: 'eori', parent_code: 'customs', label_en: 'EORI registration' },
];

beforeEach(() => {
    rows['service_categories'] = KATEGORIEN;
    rows['provider_services'] = [];
});

describe('releasedAreasOf', () => {
    it('rollt Unterkategorien auf ihren Bereich hoch und zaehlt ihn einmal', async () => {
        rows['provider_services'] = [
            { service_code: 'vat-registration', status: 'approved' },
            { service_code: 'oss-filing', status: 'approved' },
            { service_code: 'eori', status: 'approved' },
        ];
        const areas = await releasedAreasOf('p1');
        // Zwei Bereiche, nicht drei Leistungen.
        expect(areas).toEqual([
            { code: 'customs', label: 'Customs' },
            { code: 'tax-vat', label: 'Tax & VAT' },
        ]);
    });

    it('nimmt einen Bereich auch direkt', async () => {
        rows['provider_services'] = [{ service_code: 'tax-vat', status: 'approved' }];
        expect(await releasedAreasOf('p1')).toEqual([{ code: 'tax-vat', label: 'Tax & VAT' }]);
    });

    it('zaehlt `limited` mit — eingeschraenkt ist freigegeben', async () => {
        rows['provider_services'] = [{ service_code: 'customs', status: 'limited' }];
        expect(await releasedAreasOf('p1')).toEqual([{ code: 'customs', label: 'Customs' }]);
    });

    // Gegenprobe: was NICHT freigegeben ist, darf die Zahl nicht aufblaehen.
    // Sonst verspraeche die Seite eine Breite, die das Matching nie zeigt.
    it('laesst eingereichte, abgelehnte und zurueckgezogene Leistungen weg', async () => {
        rows['provider_services'] = [
            { service_code: 'tax-vat', status: 'approved' },
            { service_code: 'customs', status: 'submitted' },
            { service_code: 'legal-support', status: 'rejected' },
            { service_code: 'eori', status: 'withdrawn' },
        ];
        expect(await releasedAreasOf('p1')).toEqual([{ code: 'tax-vat', label: 'Tax & VAT' }]);
    });

    it('gibt eine leere Liste zurueck, wenn nichts freigegeben ist', async () => {
        rows['provider_services'] = [{ service_code: 'tax-vat', status: 'submitted' }];
        expect(await releasedAreasOf('p1')).toEqual([]);
    });

    // Ein Code ohne Eintrag in der Taxonomie darf nicht verschwinden: lieber
    // der rohe Code als eine stillschweigend kuerzere Liste.
    it('behaelt einen unbekannten Code, statt ihn zu verschlucken', async () => {
        rows['provider_services'] = [{ service_code: 'was-neues', status: 'approved' }];
        expect(await releasedAreasOf('p1')).toEqual([{ code: 'was-neues', label: 'was-neues' }]);
    });

    it('sortiert nach Beschriftung, damit die Reihenfolge stabil ist', async () => {
        rows['provider_services'] = [
            { service_code: 'legal-support', status: 'approved' },
            { service_code: 'customs', status: 'approved' },
            { service_code: 'tax-vat', status: 'approved' },
        ];
        expect((await releasedAreasOf('p1')).map((a) => a.label)).toEqual(['Customs', 'Legal Support', 'Tax & VAT']);
    });
});
