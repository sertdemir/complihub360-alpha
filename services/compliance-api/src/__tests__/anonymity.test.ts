import { describe, it, expect } from 'vitest';
import {
    identityScan, letterFor, maskIdentity, publicTitle, rankBasis, scanFields, serializeProvider, verificationDepth,
    type VisibilityClass,
} from '../anonymity.js';
import { requiredEvidence } from '../verificationRules.js';

// ─── Anonymes Matching, ohne Datenbank ───────────────────────────────────────
// Der Serializer haelt sich an das Register, der Titel entsteht im System, der
// Scan findet Identitaet und laesst Fachwoerter stehen, die Verifikationstiefe
// ersetzt partner_status. Jede Zusage einzeln.

const reg = (pairs: Array<[string, VisibilityClass]>) => new Map(pairs);
const REG = reg([
    ['providers.public_ref', 'anonymous'], ['providers.region', 'anonymous'], ['providers.rating', 'anonymous'],
    ['providers.name', 'revealed'], ['providers.website_url', 'revealed'],
    ['providers.confirmation_rate', 'internal'], ['providers.pseudonym_label', 'internal'],
    ['providers.provider_key', 'internal'],
]);
const ROW = {
    provider_key: 'testkanzlei-schmidt', public_ref: 'a1b2c3d4e5f6', name: 'Testkanzlei Schmidt GmbH', website_url: 'https://testkanzlei-schmidt.de',
    region: 'Norddeutschland', rating: 4.8, confirmation_rate: 0.96, pseudonym_label: 'Verifizierte Steuerkanzlei', stripe_customer_id: 'cus_123',
    pricing_table: [{ service: 'x' }],
};

describe('serializeProvider — das Register entscheidet, nicht der Handler', () => {
    it('anonymous traegt nur Klasse anonymous plus public_ref', () => {
        const out = serializeProvider(ROW, REG, 'anonymous');
        expect(Object.keys(out).sort()).toEqual(['public_ref', 'rating', 'region']);
    });
    it('revealed traegt zusaetzlich revealed, nie internal', () => {
        const out = serializeProvider(ROW, REG, 'revealed');
        expect(out.name).toBe('Testkanzlei Schmidt GmbH');
        expect(out.website_url).toBeDefined();
        expect(out.confirmation_rate).toBeUndefined();
    });
    it('ein Feld ohne Eintrag faellt weg — Standard zu', () => {
        const out = serializeProvider(ROW, REG, 'revealed');
        expect(out.stripe_customer_id).toBeUndefined();
        expect(out.pricing_table).toBeUndefined();
    });
    it('provider_key und pseudonym_label kommen nie durch, auch wenn das Register sie freigaebe', () => {
        const offen = reg([['providers.provider_key', 'anonymous'], ['providers.pseudonym_label', 'anonymous']]);
        const out = serializeProvider(ROW, offen, 'anonymous');
        expect(out.provider_key).toBeUndefined();
        expect(out.pseudonym_label).toBeUndefined();
        expect(out.public_ref).toBe('a1b2c3d4e5f6');
    });
});

describe('publicTitle — Buchstabe je Liste, Beschreibung aus Bereichen und Region', () => {
    it('zaehlt A..Z, dann AA', () => {
        expect(letterFor(0)).toBe('A'); expect(letterFor(1)).toBe('B'); expect(letterFor(25)).toBe('Z');
        expect(letterFor(26)).toBe('AA'); expect(letterFor(27)).toBe('AB');
    });
    it('baut Label und Beschreibung', () => {
        const t = publicTitle(1, ['Tax and VAT'], 'Norditalien');
        expect(t.label).toBe('Verified Provider B');
        expect(t.letter).toBe('B');
        expect(t.descriptor).toBe('Tax and VAT · Norditalien');
    });
    it('hoechstens zwei Bereiche, der Rest als +n, sortiert und ohne Dubletten', () => {
        expect(publicTitle(0, ['Legal Support', 'Tax and VAT', 'Tax and VAT', 'Data and Privacy'], null).descriptor)
            .toBe('Data and Privacy, Legal Support +1');
    });
    it('ohne Bereiche und Region bleibt die Beschreibung leer statt erfunden', () => {
        expect(publicTitle(0, [], '').descriptor).toBe('');
        expect(publicTitle(0, [], 'Bayern').descriptor).toBe('Bayern');
    });
});

describe('identityScan — findet Identitaet, laesst Fachwoerter stehen', () => {
    const ctx = { providerName: 'Testkanzlei Schmidt GmbH', website: 'https://www.testkanzlei-schmidt.de' };

    it('Rechtsform mit Firmenwort', () => {
        const r = identityScan('Wir sind die Mustermann GmbH aus Hamburg.', ctx);
        expect(r.ok).toBe(false);
        expect(r.findings.map((f) => f.type)).toContain('legal_form');
        expect(r.findings.find((f) => f.type === 'legal_form')?.match).toBe('Mustermann GmbH');
    });
    it('Rechtsform allein ist kein Treffer', () => {
        expect(identityScan('Wir beraten GmbH-Gruender und kleine AGs.', ctx).ok).toBe(true);
    });
    it('Domain, auch ohne Protokoll', () => {
        const r = identityScan('Mehr unter kanzlei-nord.de oder https://beispiel.it/team', ctx);
        expect(r.findings.filter((f) => f.type === 'domain').map((f) => f.match)).toEqual(['kanzlei-nord.de', 'https://beispiel.it/team']);
    });
    it('ein Punkt am Satzende ist keine Domain', () => {
        expect(identityScan('Wir arbeiten remote. Termine per Video.', ctx).ok).toBe(true);
    });
    it('Social-Handle, aber nicht der Teil einer E-Mail', () => {
        const r = identityScan('Folgen Sie @steuer_nord. Schreiben Sie an info@example.de', ctx);
        const types = r.findings.map((f) => f.type);
        expect(types).toContain('handle');
        expect(types).toContain('email');
        expect(r.findings.filter((f) => f.type === 'handle')).toHaveLength(1);
    });
    it('Registernummern', () => {
        const r = identityScan('Eingetragen unter HRB 12345, P.IVA 01234567890', ctx);
        expect(r.findings.filter((f) => f.type === 'registry').map((f) => f.match)).toEqual(['HRB 12345', 'P.IVA 01234567890']);
    });
    it('der eigene Firmenname — Tokens ab vier Zeichen, ohne Stoppwoerter', () => {
        const r = identityScan('Das Team von Schmidt beraet seit 2010.', ctx);
        expect(r.findings.map((f) => f.type)).toEqual(['own_name']);
        expect(identityScan('Unsere Kanzlei beraet seit 2010.', ctx).ok).toBe(true);
    });
    it('die eigene Domain aus website_url', () => {
        expect(identityScan('Siehe testkanzlei-schmidt.de', ctx).findings.map((f) => f.type)).toEqual(['domain']);
    });
    it('Telefon', () => {
        expect(identityScan('Rufen Sie an: +49 40 123456', ctx).findings.map((f) => f.type)).toContain('phone');
    });
    it('Fachtext ohne Identitaet ist sauber', () => {
        expect(identityScan('USt-Registrierung in Italien und OSS-Meldungen fuer Onlinehaendler. Erstgespraech kostenlos.', ctx).ok).toBe(true);
    });
    it('leer ist sauber', () => {
        expect(identityScan('', ctx).ok).toBe(true);
        expect(identityScan(null, ctx).ok).toBe(true);
    });
});

describe('maskIdentity und scanFields', () => {
    it('ersetzt jeden Fund durch […]', () => {
        expect(maskIdentity('Mustermann GmbH, kanzlei-nord.de, HRB 12345', {})).toBe('[…], […], […]');
        expect(maskIdentity('Nichts zu sehen', {})).toBe('Nichts zu sehen');
    });
    it('geht durch verschachtelte Felder und nennt den Pfad', () => {
        const f = scanFields({ services: ['USt', 'Mustermann GmbH'], pricing_table: [{ service: 'x', note: 'siehe beispiel.de' }] }, {});
        expect(f.map((x) => `${x.field}:${x.type}`)).toEqual(['services[1]:legal_form', 'pricing_table[0].note:domain']);
    });
});

describe('verificationDepth und rankBasis — Verifikation statt partner_status', () => {
    const svc = [{ id: 'a', service_code: 'data-privacy.notices', status: 'approved' }];
    const cov = [{ service_id: 'a', country_code: 'DE', status: 'approved' }];
    const required = requiredEvidence(svc, cov); // 4 Pflichtpunkte, keine Zulassung
    const ev = (type: string, result: string) => ({ id: type, evidence_type: type, source: 'document', result, upload_confirmed: true });

    it('0 ohne Nachweise, 1 wenn alles unabhaengig geprueft, 0.5 bei nur reviewed', () => {
        expect(verificationDepth(required, [])).toBe(0);
        expect(verificationDepth(required, required.map((r) => ev(r.type, 'independently_verified')))).toBe(1);
        expect(verificationDepth(required, required.map((r) => ev(r.type, 'reviewed')))).toBe(0.5);
    });
    it('ein empfangener, ungeprueft er Nachweis zaehlt nicht', () => {
        expect(verificationDepth(required, [ev('incorporation', 'received')])).toBe(0);
        expect(verificationDepth(required, [ev('incorporation', 'independently_verified')])).toBe(0.25);
    });
    it('rankBasis nennt Stufe und Zaehler, keine Gewichte', () => {
        const b = rankBasis({ required, evidence: required.map((r) => ev(r.type, 'independently_verified')), avg_response_hours: 6, confirmation_rate: 0.96, rating: 4.8, reviews_count: 12 });
        expect(b).toEqual({ verification: 'independent', verified_count: 4, required_count: 4, response_hours: 6, confirmation_rate: 0.96, rating: 4.8, reviews_count: 12 });
        expect(rankBasis({ required, evidence: [ev('vat_id', 'reviewed')] }).verification).toBe('partial');
        expect(rankBasis({ required, evidence: required.map((r) => ev(r.type, 'reviewed')) }).verification).toBe('reviewed');
        expect(rankBasis({ required, evidence: [] }).verification).toBe('none');
    });
});
