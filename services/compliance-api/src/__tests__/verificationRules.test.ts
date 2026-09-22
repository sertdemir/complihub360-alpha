import { describe, it, expect } from 'vitest';
import {
    activationGate, evidenceChecklist, requiredEvidence, serviceStatusFromCoverage, submitValidation, transitionAllowed,
    type ChecklistItem,
} from '../verificationRules.js';

// ─── Die Regeln der Verifikation, ohne Datenbank ─────────────────────────────
// Anbieter-Checkliste (3A), Einreich-Pruefung (4A) und Aktivierungs-Gate (8A)
// sind dieselben Funktionen fuer Anbieter und Reviewer. Hier steht, was sie
// versprechen — jede Bedingung einzeln.

const svc = (id: string, code: string, status = 'pending_verification') => ({ id, service_code: code, status });
const cov = (service_id: string, country_code: string, status = 'pending') => ({ service_id, country_code, status });

describe('requiredEvidence — die Checkliste haengt an den Leistungen, nie am Plan', () => {
    it('verlangt fuer jeden Anbieter Registerauszug, USt-ID, Versicherung und Vertretung', () => {
        const req = requiredEvidence([svc('a', 'data-privacy.notices')], [cov('a', 'DE')]);
        expect(req.map((r) => r.type)).toEqual(['incorporation', 'vat_id', 'insurance', 'representative_identity']);
        expect(req.find((r) => r.type === 'vat_id')?.source).toBe('registry_check');
        expect(req.find((r) => r.type === 'representative_identity')?.required_for_submit).toBe(false);
    });

    it('verlangt eine Zulassung je reguliertem Bereich und Land — einmal, auch bei mehreren Leistungen', () => {
        const req = requiredEvidence(
            [svc('a', 'tax-vat.returns'), svc('b', 'tax-vat.registrations'), svc('c', 'legal-advisory')],
            [cov('a', 'DE'), cov('b', 'DE'), cov('b', 'AT'), cov('c', 'DE')],
        );
        const lic = req.filter((r) => r.type === 'professional_licence').map((r) => `${r.service_code}:${r.country_code}`);
        expect(lic.sort()).toEqual(['legal-advisory:DE', 'tax-vat:AT', 'tax-vat:DE']);
        expect(req.filter((r) => r.type === 'professional_licence').every((r) => !r.required_for_submit)).toBe(true);
    });

    it('ignoriert stillgelegte Leistungen', () => {
        const req = requiredEvidence([svc('a', 'tax-vat', 'retired')], [cov('a', 'DE')]);
        expect(req.some((r) => r.type === 'professional_licence')).toBe(false);
    });
});

describe('evidenceChecklist — der beste vorliegende Nachweis zaehlt', () => {
    const req = requiredEvidence([svc('a', 'tax-vat')], [cov('a', 'DE')]);

    it('meldet fehlend, wenn nichts da ist', () => {
        const list = evidenceChecklist(req, []);
        expect(list.every((i) => i.state === 'missing')).toBe(true);
    });

    it('unterscheidet angekuendigten Upload von eingegangenem Dokument', () => {
        const list = evidenceChecklist(req, [
            { id: '1', evidence_type: 'incorporation', source: 'document', result: 'received', upload_confirmed: false },
            { id: '2', evidence_type: 'insurance', source: 'document', result: 'received', upload_confirmed: true },
        ]);
        expect(list.find((i) => i.type === 'incorporation')?.state).toBe('uploading');
        expect(list.find((i) => i.type === 'insurance')?.state).toBe('received');
    });

    it('bevorzugt den gepruefeten vor dem abgelehnten Nachweis desselben Typs', () => {
        const list = evidenceChecklist(req, [
            { id: 'alt', evidence_type: 'insurance', source: 'document', result: 'rejected', upload_confirmed: true },
            { id: 'neu', evidence_type: 'insurance', source: 'document', result: 'reviewed', upload_confirmed: true },
        ]);
        const ins = list.find((i) => i.type === 'insurance');
        expect(ins?.state).toBe('reviewed');
        expect(ins?.evidence_id).toBe('neu');
    });

    it('rechnet eine Zulassung nur dem Land an, fuer das sie gilt', () => {
        const req2 = requiredEvidence([svc('a', 'tax-vat')], [cov('a', 'DE'), cov('a', 'AT')]);
        const list = evidenceChecklist(req2, [
            { id: 'l', evidence_type: 'professional_licence', source: 'document', result: 'reviewed', upload_confirmed: true, supports_countries: ['DE'], supports_service_codes: ['tax-vat'] },
        ]);
        expect(list.find((i) => i.type === 'professional_licence' && i.country_code === 'DE')?.state).toBe('reviewed');
        expect(list.find((i) => i.type === 'professional_licence' && i.country_code === 'AT')?.state).toBe('missing');
    });
});

function fullChecklist(state: ChecklistItem['state'] = 'reviewed'): ChecklistItem[] {
    return requiredEvidence([svc('a', 'data-privacy')], [cov('a', 'DE')]).map((r) => ({ ...r, state, evidence_id: 'x' }));
}

const completeSubmit = () => ({
    provider: { name: 'Kanzlei', contact_email: 'k@example.test' },
    confidential: { entity_type: 'GmbH', registration_number: 'HRB 1', registered_address: 'Weg 1', representative_name: 'A. B.' },
    services: [svc('a', 'data-privacy')],
    coverage: [cov('a', 'DE')],
    checklist: fullChecklist('received'),
    agreements: ['provider_agreement', 'privacy_notice', 'billing_authorization'],
});

describe('submitValidation — was vor dem Einreichen da sein muss (4A)', () => {
    it('laesst ein vollstaendiges Dossier durch', () => {
        expect(submitValidation(completeSubmit())).toEqual({ ok: true, missing: [] });
    });

    it('nennt jeden fehlenden Punkt beim Namen', () => {
        const v = submitValidation({ ...completeSubmit(), provider: { name: '', contact_email: null }, confidential: null, services: [], coverage: [], agreements: [], checklist: fullChecklist('missing') });
        expect(v.ok).toBe(false);
        expect(v.missing).toEqual(expect.arrayContaining([
            'account.name', 'account.contact_email', 'legal.entity_type', 'legal.registration_number', 'legal.registered_address',
            'legal.representative_name', 'services.none', 'evidence.incorporation', 'evidence.vat_id', 'evidence.insurance',
            'agreements.provider_agreement', 'agreements.privacy_notice', 'agreements.billing_authorization',
        ]));
        // Die Vertretungsidentitaet ist keine Einreich-Pflicht.
        expect(v.missing).not.toContain('evidence.representative_identity');
    });

    it('verlangt mindestens ein Land je Leistung', () => {
        const v = submitValidation({ ...completeSubmit(), coverage: [] });
        expect(v.missing).toEqual(['services.no_country']);
    });

    it('zaehlt einen nur angekuendigten Upload nicht', () => {
        const cl = fullChecklist('received');
        cl.find((i) => i.type === 'incorporation')!.state = 'uploading';
        expect(submitValidation({ ...completeSubmit(), checklist: cl }).missing).toEqual(['evidence.incorporation']);
    });
});

const gateOk = () => ({
    checklist: fullChecklist('reviewed'),
    services: [svc('a', 'data-privacy', 'approved')],
    coverage: [cov('a', 'DE', 'approved')],
    agreements: ['provider_agreement', 'privacy_notice', 'billing_authorization'],
    billing_ready: true,
    billing_block_reasons: [] as string[],
    allowance: { ok: true, over: [] as string[] },
    lifecycle_status: 'under_verification',
});

describe('activationGate — jede Bedingung einzeln, und die Antwort nennt, was fehlt (8A)', () => {
    it('oeffnet bei vollem Dossier auf active', () => {
        const g = activationGate(gateOk());
        expect(g).toMatchObject({ ok: true, missing: [], target: 'active', approved_cells: 1, total_cells: 1 });
    });

    it('nur hochgeladen reicht nicht — der Nachweis muss geprueft sein', () => {
        const g = activationGate({ ...gateOk(), checklist: fullChecklist('received') });
        expect(g.ok).toBe(false);
        expect(g.missing).toEqual(expect.arrayContaining(['evidence.incorporation', 'evidence.vat_id', 'evidence.insurance', 'evidence.representative_identity']));
    });

    it('eine offene Zulassung sperrt die Zelle, nicht das Konto', () => {
        const cl = requiredEvidence([svc('a', 'tax-vat')], [cov('a', 'DE'), cov('a', 'AT')]).map((r) => ({ ...r, state: r.type === 'professional_licence' && r.country_code === 'AT' ? 'missing' as const : 'reviewed' as const, evidence_id: 'x' }));
        const g = activationGate({ ...gateOk(), checklist: cl, services: [svc('a', 'tax-vat', 'limited')], coverage: [cov('a', 'DE', 'approved'), cov('a', 'AT', 'pending')] });
        expect(g.ok).toBe(true);
        expect(g.target).toBe('limited');
    });

    it('ohne freigegebene Zelle: coverage.none_approved', () => {
        expect(activationGate({ ...gateOk(), coverage: [cov('a', 'DE', 'pending')] }).missing).toEqual(['coverage.none_approved']);
    });

    it('ohne Annahme: agreements.<typ>', () => {
        expect(activationGate({ ...gateOk(), agreements: ['provider_agreement'] }).missing).toEqual(['agreements.privacy_notice', 'agreements.billing_authorization']);
    });

    it('ohne Billing: billing.not_ready plus jeden Grund — auch fuer limited', () => {
        const g = activationGate({ ...gateOk(), billing_ready: false, billing_block_reasons: ['no_payment_method', 'inactive_subscription'] });
        expect(g.missing).toEqual(['billing.not_ready', 'billing.no_payment_method', 'billing.inactive_subscription']);
    });

    it('Kontingent ueberschritten: plan.category_allowance', () => {
        expect(activationGate({ ...gateOk(), allowance: { ok: false, over: ['tax-vat'] } }).missing).toEqual(['plan.category_allowance']);
    });

    it('ein beendetes Konto oeffnet nie', () => {
        expect(activationGate({ ...gateOk(), lifecycle_status: 'terminated' }).missing).toEqual(['lifecycle.terminated']);
    });
});

describe('transitionAllowed — was ein Reviewer setzen darf', () => {
    it.each([
        ['submitted', 'under_verification', true],
        ['submitted', 'active', false],
        ['under_verification', 'active', true],
        ['active', 'suspended', true],
        ['terminated', 'active', false],
        ['draft', 'submitted', false],   // das setzt der Anbieter selbst
    ])('%s → %s: %s', (from, to, ok) => {
        expect(transitionAllowed(from, to)).toBe(ok);
    });
});

describe('serviceStatusFromCoverage — der Leistungsstatus folgt seinen Zellen', () => {
    it('approved, wenn alle Zellen frei sind', () => {
        expect(serviceStatusFromCoverage('pending_verification', [cov('a', 'DE', 'approved'), cov('a', 'AT', 'limited')])).toBe('approved');
    });
    it('limited, wenn nur ein Teil frei ist', () => {
        expect(serviceStatusFromCoverage('pending_verification', [cov('a', 'DE', 'approved'), cov('a', 'AT', 'pending')])).toBe('limited');
    });
    it('zurueck in die Pruefung, wenn keine Zelle mehr frei ist', () => {
        expect(serviceStatusFromCoverage('approved', [cov('a', 'DE', 'rejected')])).toBe('pending_verification');
    });
    it('laesst retired und paused in Ruhe', () => {
        expect(serviceStatusFromCoverage('retired', [cov('a', 'DE', 'approved')])).toBe('retired');
        expect(serviceStatusFromCoverage('paused', [cov('a', 'DE', 'approved')])).toBe('paused');
    });
});
