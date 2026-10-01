import { describe, it, expect } from 'vitest';
import { classify, changeRow, RULES } from '../changeControl.js';

// ─── Change-Control: welche Aenderung wartet, welche gilt sofort ────────────
// Die Regeln sind rein — hier je Policy einzeln geprueft. Die API-Tests
// pruefen, dass die Routen sie auch anwenden.

const svc = { price_min: 1200, price_max: 2400, currency: 'EUR', completion_days_estimate: 15, exclusions: ['Buchhaltung'], capacity_status: 'open' };

describe('classify — direction (Canvas A V3)', () => {
    it('haelt eine Preiserhoehung zurueck und uebernimmt eine Senkung sofort, mit Pruefvorgang', () => {
        const c = classify({ price_min: 1000, price_max: 2600 }, svc, true, 'direction');
        expect(c.write).toEqual({ price_min: 1000 });
        expect(c.review.map((f) => f.field)).toEqual(['price_min']);
        expect(c.held).toEqual([expect.objectContaining({ field: 'price_max', old: 2400, new: 2600, changeType: 'pricing', deadline: 'before_effective_date' })]);
    });

    it('haelt eine "Senkung" zurueck, wenn sich zugleich die Waehrung aendert', () => {
        const c = classify({ price_min: 1000, currency: 'CHF' }, svc, true, 'direction');
        expect(c.write).toEqual({});
        expect(c.held.map((f) => f.field).sort()).toEqual(['currency', 'price_min']);
    });

    it('haelt einen gestrichenen Preis zurueck — null ist nicht guenstiger', () => {
        expect(classify({ price_max: null }, svc, true, 'direction').held.map((f) => f.field)).toEqual(['price_max']);
    });

    it('uebernimmt eine kuerzere Lieferzeit sofort, eine laengere wartet', () => {
        expect(classify({ completion_days_estimate: 10 }, svc, true, 'direction').write).toEqual({ completion_days_estimate: 10 });
        expect(classify({ completion_days_estimate: 20 }, svc, true, 'direction').held).toHaveLength(1);
    });

    it('laesst Freitext zum Umfang immer warten', () => {
        expect(classify({ exclusions: [] }, svc, true, 'direction').held.map((f) => f.field)).toEqual(['exclusions']);
    });

    it('uebernimmt einen neuen Firmennamen sofort und legt einen Pruefvorgang an', () => {
        const c = classify({ name: 'Schmidt Partner GmbH' }, { name: 'Schmidt & Partner' }, true, 'direction');
        expect(c.write).toEqual({ name: 'Schmidt Partner GmbH' });
        expect(c.review).toEqual([expect.objectContaining({ field: 'name', changeType: 'legal_name', deadline: 'within_3_business_days' })]);
    });

    it('legt fuer Auslastung und Sprachen keinen Vorgang an', () => {
        const c = classify({ capacity_status: 'full' }, svc, true, 'direction');
        expect(c).toEqual({ write: { capacity_status: 'full' }, review: [], held: [] });
    });

    it('ignoriert Felder ohne Aenderung', () => {
        expect(classify({ price_min: 1200, exclusions: ['Buchhaltung'] }, svc, true, 'direction')).toEqual({ write: {}, review: [], held: [] });
    });
});

describe('classify — andere Policies und nicht kontrollierte Partner', () => {
    it('spec: auch eine Preissenkung wartet', () => {
        expect(classify({ price_min: 1000 }, svc, true, 'spec').held.map((f) => f.field)).toEqual(['price_min']);
    });

    it('all_reviewed: auch der Firmenname wartet', () => {
        expect(classify({ name: 'Neu GmbH' }, { name: 'Alt GmbH' }, true, 'all_reviewed').held.map((f) => f.field)).toEqual(['name']);
    });

    it('vor der Aktivierung gilt alles sofort, ohne Vorgang', () => {
        expect(classify({ price_max: 9000, name: 'X' }, svc, false, 'direction')).toEqual({ write: { price_max: 9000, name: 'X' }, review: [], held: [] });
    });

    it('jedes klassifizierte Feld hat eine Regel', () => {
        for (const k of ['price_min', 'name', 'representative_name', 'insurance_valid_until', 'exclusions']) expect(RULES[k]).toBeDefined();
    });
});

describe('changeRow', () => {
    it('fasst eine Preisspanne zu einem Vorgang zusammen und nimmt die strengste Frist', () => {
        const c = classify({ price_min: 1400, price_max: 2600, response_time_hours: 48 }, { ...svc, response_time_hours: 24 }, true, 'direction');
        const row = changeRow('schmidt-partner', 'svc-1', c.held, 'held');
        expect(row).toMatchObject({
            provider_key: 'schmidt-partner', service_id: 'svc-1', effect: 'held', status: 'submitted', applied_at: null,
            deadline_class: 'before_effective_date', field_path: 'price_min,price_max,response_time_hours',
            old_value: { price_min: 1200, price_max: 2400, response_time_hours: 24 }, new_value: { price_min: 1400, price_max: 2600, response_time_hours: 48 },
        });
        expect(row.change_type).toBe('pricing,support');
    });
});
