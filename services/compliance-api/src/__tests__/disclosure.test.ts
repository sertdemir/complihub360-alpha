import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Offenlegung erst nach dem Audit (23.10.2026) ────────────────────────────
// Die Regel: ein Grenzuebertritt braucht seinen Audit-Eintrag. Hier steht fest,
// dass ohne Eintrag nicht freigegeben wird, dass Wiederholungen greifen, dass
// ein schon stehendes Audit (Index) als "steht" gilt und dass die Freigabe nur
// eine nicht stornierte, noch nicht freigegebene Buchung trifft.

const store = vi.hoisted(() => ({
    inserts: [] as Array<{ table: string; data: any; opts?: any }>,
    updates: [] as Array<{ table: string; filters: any; data: any }>,
    failInserts: 0, duplicate: false, rows: [] as any[], events: [] as any[],
}));
vi.mock('../supabase.js', () => ({
    supabaseApi: {
        async insert(table: string, data: any, opts?: any) {
            if (store.failInserts > 0) { store.failInserts--; throw new Error('db hiccup'); }
            if (store.duplicate) throw new Error('Supabase insert failed: duplicate key value violates unique constraint "event_log_lead_revealed_once" (23505)');
            store.inserts.push({ table, data, opts });
            if (table === 'event_log') store.events.push(data);
            return [data];
        },
        async updateWhere(table: string, filters: any, data: any) { store.updates.push({ table, filters, data }); return [data]; },
        async selectWhere() { return store.rows; },
        async select(_t: string, match: any) { return store.events.filter((e) => e.type === match.type && e.payload?.bookingId === match['payload->>bookingId']); },
    },
}));

import { auditDisclosure, revealAfterAudit, runDisclosureAuditTick, disclosurePayload } from '../disclosure.js';

const booking = { id: 'b1', provider_key: 'studio', user_id: 'u1', shared_fields: ['email', 'message'], acknowledgement_version: 'v2', sharing_confirmed_at: '2026-10-23T10:00:00Z' };
const fast = { delaysMs: [0, 0, 0] };

describe('disclosure', () => {
    beforeEach(() => { store.inserts = []; store.updates = []; store.failInserts = 0; store.duplicate = false; store.rows = []; store.events = []; });

    it('Audit mit den bestaetigten Feldern und Timeout, dann bedingte Freigabe', async () => {
        expect(await revealAfterAudit(booking, fast)).toBe(true);
        expect(store.inserts).toEqual([{ table: 'event_log', data: { type: 'lead.revealed', payload: disclosurePayload(booking) }, opts: { timeoutMs: 3000 } }]);
        expect(store.inserts[0].data.payload.sharedFields).toEqual(['email', 'message']);
        expect(store.updates).toEqual([{
            table: 'scheduling',
            filters: { id: 'eq.b1', shared_released_at: 'is.null', status: 'neq.cancelled' },
            data: { shared_released_at: expect.any(String) },
        }]);
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

    it('ein schon stehendes Audit (Index) gilt als "steht" — Freigabe ohne zweiten Eintrag', async () => {
        store.duplicate = true;
        expect(await revealAfterAudit(booking, fast)).toBe(true);
        expect(store.inserts).toEqual([]);
        expect(store.updates).toHaveLength(1);
    });

    it('Tick: fehlendes Audit wird nachgetragen (reconstructed), vorhandenes nicht verdoppelt', async () => {
        store.rows = [booking, { ...booking, id: 'b2' }];
        store.events = [{ type: 'lead.revealed', payload: { bookingId: 'b2' } }];
        const c = await runDisclosureAuditTick();
        expect(c).toEqual({ checked: 2, audited: 1, released: 2, errors: 0 });
        expect(store.inserts.map((i) => i.data.payload)).toEqual([{ ...disclosurePayload(booking), reconstructed: true }]);
    });

    it('Tick: ein paralleler Lauf war schneller (Index) — kein Fehler, trotzdem Freigabe', async () => {
        store.rows = [booking];
        store.duplicate = true;
        const c = await runDisclosureAuditTick();
        expect(c).toEqual({ checked: 1, audited: 0, released: 1, errors: 0 });
    });
});
