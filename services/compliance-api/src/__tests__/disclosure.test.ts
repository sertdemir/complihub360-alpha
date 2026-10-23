import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Offenlegung erst nach dem Audit (23.10.2026) ────────────────────────────
// Die Regel: ein Grenzuebertritt braucht seinen Audit-Eintrag. Hier steht fest,
// dass ohne Eintrag nicht freigegeben wird, dass Wiederholungen greifen und
// dass der Shadow-Modus nur einen Marker je Buchung schreibt.

const store = vi.hoisted(() => ({ inserts: [] as Array<{ table: string; data: any }>, updates: [] as Array<{ table: string; match: any; data: any }>, failInserts: 0, rows: [] as any[], events: [] as any[] }));
vi.mock('../supabase.js', () => ({
    supabaseApi: {
        async insert(table: string, data: any) {
            if (store.failInserts > 0) { store.failInserts--; throw new Error('db hiccup'); }
            store.inserts.push({ table, data });
            if (table === 'event_log') store.events.push(data);
            return [data];
        },
        async update(table: string, match: any, data: any) { store.updates.push({ table, match, data }); return [data]; },
        async selectWhere() { return store.rows; },
        async select(_t: string, match: any) { return store.events.filter((e) => e.type === match.type && e.payload?.bookingId === match['payload->>bookingId']); },
    },
}));

import { auditDisclosure, revealAfterAudit, runDisclosureAuditTick, disclosurePayload } from '../disclosure.js';

const booking = { id: 'b1', provider_key: 'studio', user_id: 'u1', shared_fields: ['email', 'message'], acknowledgement_version: 'v2', sharing_confirmed_at: '2026-10-23T10:00:00Z' };
const fast = { delaysMs: [0, 0, 0] };

describe('disclosure', () => {
    beforeEach(() => { store.inserts = []; store.updates = []; store.failInserts = 0; store.rows = []; store.events = []; });

    it('Audit mit den bestaetigten Feldern, dann Freigabe', async () => {
        expect(await revealAfterAudit(booking, fast)).toBe(true);
        expect(store.inserts).toEqual([{ table: 'event_log', data: { type: 'lead.revealed', payload: disclosurePayload(booking) } }]);
        expect(store.inserts[0].data.payload.sharedFields).toEqual(['email', 'message']);
        expect(store.updates).toEqual([{ table: 'scheduling', match: { id: 'b1' }, data: { identity_revealed: true } }]);
    });

    it('Wiederholung: zwei Fehlversuche, der dritte steht', async () => {
        store.failInserts = 2;
        expect(await auditDisclosure(disclosurePayload(booking), fast)).toBe(true);
        expect(store.inserts).toHaveLength(1);
    });

    it('ohne Audit keine Freigabe', async () => {
        store.failInserts = 3;
        expect(await revealAfterAudit(booking, fast)).toBe(false);
        expect(store.updates).toEqual([]);
    });

    it('Tick: fehlendes Audit wird nachgetragen (reconstructed), vorhandenes nicht verdoppelt', async () => {
        store.rows = [booking, { ...booking, id: 'b2' }];
        store.events = [{ type: 'lead.revealed', payload: { bookingId: 'b2' } }];
        const c = await runDisclosureAuditTick(false);
        expect(c).toEqual({ checked: 2, audited: 1, revealed: 2, errors: 0 });
        expect(store.inserts.map((i) => i.data.payload)).toEqual([{ ...disclosurePayload(booking), reconstructed: true }]);
    });

    it('Shadow: kein Audit, keine Freigabe — ein Marker je Buchung, nicht je Tick', async () => {
        store.rows = [booking];
        await runDisclosureAuditTick(true);
        await runDisclosureAuditTick(true);
        expect(store.updates).toEqual([]);
        expect(store.inserts.map((i) => i.data.type)).toEqual(['lead.revealed_shadow']);
    });
});
