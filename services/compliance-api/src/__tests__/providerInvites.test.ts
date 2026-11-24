import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import {
    acceptInvite, adminView, applicationRowOf, hashToken, inviteApplication, inviteRateLimited, listApplications, readInvite,
    renderInviteMail, resetInviteLimit, INVITE_DAYS, INVITE_LIMIT, type ApplicationRow, type InviteDeps,
} from '../providerInvites.js';
import { checkContact, type OutgoingMail } from '../contact.js';

// ─── Bewerbung sichten, einladen, einloesen (P01, 24.11.2026) ────────────────
// Drei Stufen: received → invited → onboarding. Eingeladen ist nicht
// verifiziert; der Link gehoert zu genau einer Bewerbung.

const ID = '11111111-2222-3333-4444-555555555555';
const NOW = new Date('2026-11-25T10:00:00Z');

function row(over: Partial<ApplicationRow> = {}): ApplicationRow {
    return {
        id: ID, reference: 'ref-1', created_at: '2026-11-24T09:00:00Z', locale: 'en', first_name: 'Elise', contact_name: 'Elise Example',
        email: 'elise@firm.example', firm: 'Alder Quay VAT Services LLC', website: 'https://firm.example', credentials: 'Chartered tax adviser',
        areas: ['tax-vat'], markets: ['DE'], message: null, status: 'received', invited_at: null, invited_by: null, invite_token_hash: null,
        invite_expires_at: null, invite_send_count: 0, redeemed_at: null, provider_key: null, user_id: null, ...over,
    };
}

function world(start: ApplicationRow[] = [row()], over: Partial<InviteDeps> = {}) {
    const tables: Record<string, Array<Record<string, unknown>>> = { provider_applications: start.map((r) => ({ ...r })), providers: [], provider_members: [], event_log: [] };
    const sent: OutgoingMail[] = [];
    const users: Array<{ email: string; password: string; fullName: string }> = [];
    const matches = (r: Record<string, unknown>, m: Record<string, unknown>) => Object.entries(m).every(([k, v]) => r[k] === v);
    const deps: InviteDeps = {
        db: {
            select: async (t, m, o) => tables[t].filter((r) => matches(r, m)).slice(0, o?.limit ?? 1000),
            insert: async (t, d) => { tables[t].push({ ...d }); return [d]; },
            update: async (t, m, d) => { for (const r of tables[t]) if (matches(r, m)) Object.assign(r, d); return []; },
        },
        send: vi.fn(async (m: OutgoingMail) => { sent.push(m); return { ok: true, status: 200 }; }),
        mailFrom: 'CompliHub360 <noreply@complihub360.test>',
        inbox: 'hallo@complihub360.test',
        appUrl: 'https://app.test/',
        createUser: vi.fn(async (p) => { users.push(p); return { ok: true as const, userId: 'user-1' }; }),
        now: () => NOW,
        ...over,
    };
    const app = () => tables.provider_applications[0] as unknown as ApplicationRow;
    const tokenOf = () => /token=([A-Za-z0-9_-]+)/.exec(sent[sent.length - 1].text)![1];
    return { deps, tables, sent, users, app, tokenOf };
}

beforeEach(() => resetInviteLimit());

describe('Bewerbung ablegen', () => {
    it('uebernimmt alle Angaben des Formulars, den Vornamen getrennt', () => {
        const c = checkContact({ lane: 'application', locale: 'en', name: 'Elise Example', first_name: 'Elise', email: 'elise@firm.example', firm: 'Alder Quay', credentials: 'Tax adviser', areas: ['tax-vat'], markets: ['de'], message: 'Hello' });
        expect(c.ok && 'request' in c).toBe(true);
        if (!c.ok || !('request' in c)) return;
        expect(applicationRowOf(c.request, 'ref-9')).toEqual({
            reference: 'ref-9', locale: 'en', first_name: 'Elise', contact_name: 'Elise Example', email: 'elise@firm.example', firm: 'Alder Quay',
            website: null, credentials: 'Tax adviser', areas: ['tax-vat'], markets: ['DE'], message: 'Hello',
        });
    });
});

describe('Admin-Liste', () => {
    it('zeigt alle Angaben und nie den Hash', async () => {
        const w = world([row({ status: 'invited', invite_token_hash: 'abc', invited_at: NOW.toISOString(), invite_expires_at: '2026-12-09T10:00:00Z', invite_send_count: 1 })]);
        const out = await listApplications(w.deps);
        const list = out.body.applications as Array<Record<string, unknown>>;
        expect(out.body.counts).toEqual({ total: 1, received: 0, invited: 1, onboarding: 0 });
        expect(list[0]).toMatchObject({ firm: 'Alder Quay VAT Services LLC', first_name: 'Elise', email: 'elise@firm.example', credentials: 'Chartered tax adviser', invited_at: NOW.toISOString(), invite_expired: false });
        expect(JSON.stringify(out.body)).not.toContain('invite_token_hash');
    });

    it('nennt eine abgelaufene Einladung abgelaufen', () => {
        expect(adminView(row({ status: 'invited', invite_expires_at: '2026-11-20T00:00:00Z' }), NOW).invite_expired).toBe(true);
    });
});

describe('Einladen', () => {
    it('verschickt die Mail mit eigenem Link und haelt den Zeitpunkt fest', async () => {
        const w = world();
        const out = await inviteApplication(w.deps, ID, 'admin-1');
        expect(out.status).toBe(200);
        expect(w.sent).toHaveLength(1);
        expect(w.sent[0].to).toBe('elise@firm.example');
        expect(w.sent[0].text.startsWith('Hi Elise,')).toBe(true);
        expect(w.sent[0].text).toContain('https://app.test/en/provider-invite?token=');
        expect(w.app()).toMatchObject({ status: 'invited', invited_at: NOW.toISOString(), invited_by: 'admin-1', invite_send_count: 1 });
        // In der Datenbank steht der Hash, nicht der Link.
        expect(w.app().invite_token_hash).toBe(hashToken(w.tokenOf()));
        expect(w.app().invite_token_hash).not.toBe(w.tokenOf());
        expect(new Date(w.app().invite_expires_at!).getTime() - NOW.getTime()).toBe(INVITE_DAYS * 86_400_000);
    });

    it('sagt in der Mail, dass eingeladen nicht verifiziert heisst, und draengt nicht', () => {
        const mail = renderInviteMail(row(), 'https://app.test/en/provider-invite?token=x', new Date('2026-12-09T10:00:00Z'), 'hallo@complihub360.test');
        expect(mail.text).toContain('only after that review');
        expect(mail.text).toContain('valid until 9 December 2026');
        expect(mail.text).not.toMatch(/urgent|hurry|last chance|act now|immediately/i);
        expect(mail.replyTo).toBe('hallo@complihub360.test');
    });

    it('bleibt ohne Vornamen bei der neutralen Anrede', () => {
        expect(renderInviteMail(row({ first_name: null }), 'u', NOW, null).text.startsWith('Hello,')).toBe(true);
    });

    it('aendert nichts, wenn die Mail nicht hinausgeht', async () => {
        const w = world([row()], { send: vi.fn(async () => ({ ok: false, status: 500 })) });
        const out = await inviteApplication(w.deps, ID, 'admin-1');
        expect(out.status).toBe(502);
        expect(w.app()).toMatchObject({ status: 'received', invited_at: null, invite_token_hash: null, invite_send_count: 0 });
    });

    it('meldet fehlenden Mailversand, statt eine Einladung vorzutaeuschen', async () => {
        const w = world([row()], { send: null });
        expect((await inviteApplication(w.deps, ID, null)).status).toBe(503);
        expect(w.app().status).toBe('received');
    });

    it('eine neue Einladung macht den alten Link ungueltig', async () => {
        const w = world();
        await inviteApplication(w.deps, ID, 'admin-1');
        const first = w.tokenOf();
        await inviteApplication(w.deps, ID, 'admin-1');
        expect(w.app().invite_send_count).toBe(2);
        expect((await readInvite(w.deps, first)).status).toBe(404);
        expect((await readInvite(w.deps, w.tokenOf())).status).toBe(200);
    });

    it('laedt nicht erneut ein, wenn das Konto schon besteht', async () => {
        const w = world([row({ status: 'onboarding' })]);
        expect((await inviteApplication(w.deps, ID, null)).status).toBe(409);
        expect(w.sent).toHaveLength(0);
    });

    it('kennt unbekannte Bewerbungen nicht', async () => {
        const w = world();
        expect((await inviteApplication(w.deps, 'nope', null)).status).toBe(400);
        expect((await inviteApplication(w.deps, '99999999-2222-3333-4444-555555555555', null)).status).toBe(404);
    });
});

describe('Link pruefen', () => {
    it('zeigt Vorname, Firma und Adresse, sonst nichts', async () => {
        const w = world();
        await inviteApplication(w.deps, ID, null);
        const out = await readInvite(w.deps, w.tokenOf());
        expect(out.body.invite).toEqual({ first_name: 'Elise', firm: 'Alder Quay VAT Services LLC', email: 'elise@firm.example', expires_at: w.app().invite_expires_at });
    });

    it('lehnt falsche, abgelaufene und benutzte Links ab', async () => {
        const w = world();
        await inviteApplication(w.deps, ID, null);
        const token = w.tokenOf();
        expect((await readInvite(w.deps, 'x')).status).toBe(404);
        expect((await readInvite(w.deps, 'A'.repeat(43))).status).toBe(404);
        expect((await readInvite({ ...w.deps, now: () => new Date('2027-01-01T00:00:00Z') }, token)).status).toBe(410);
        await acceptInvite(w.deps, { token, password: 'correct horse' });
        expect((await readInvite(w.deps, token)).status).toBe(404);
    });
});

describe('Konto einrichten', () => {
    it('legt Anbieter im Entwurf, Login und Verknuepfung an', async () => {
        const w = world();
        await inviteApplication(w.deps, ID, null);
        const out = await acceptInvite(w.deps, { token: w.tokenOf(), password: 'correct horse' });
        expect(out).toMatchObject({ status: 201, body: { provider_key: 'alder-quay-vat-services-llc', email: 'elise@firm.example' } });
        expect(w.tables.providers[0]).toMatchObject({ provider_key: 'alder-quay-vat-services-llc', name: 'Alder Quay VAT Services LLC', partner_status: 'inactive' });
        // Eingeladen ist nicht verifiziert: kein Stand, der die Pruefung vorwegnimmt.
        expect(w.tables.providers[0]).not.toHaveProperty('lifecycle_status');
        expect(w.users).toEqual([{ email: 'elise@firm.example', password: 'correct horse', fullName: 'Elise Example' }]);
        expect(w.tables.provider_members).toEqual([{ provider_key: 'alder-quay-vat-services-llc', user_id: 'user-1', role: 'owner' }]);
        expect(w.app()).toMatchObject({ status: 'onboarding', redeemed_at: NOW.toISOString(), invite_token_hash: null, user_id: 'user-1' });
    });

    it('verlangt ein Passwort mit mindestens acht Zeichen und legt vorher nichts an', async () => {
        const w = world();
        await inviteApplication(w.deps, ID, null);
        const out = await acceptInvite(w.deps, { token: w.tokenOf(), password: 'short' });
        expect(out).toMatchObject({ status: 400, body: { field: 'password' } });
        expect(w.tables.providers).toHaveLength(0);
        expect(w.users).toHaveLength(0);
    });

    it('sagt es, wenn die Adresse schon einen Login hat, und der Link bleibt gueltig', async () => {
        const w = world([row()], { createUser: vi.fn(async () => ({ ok: false as const, reason: 'exists' as const })) });
        await inviteApplication(w.deps, ID, null);
        const token = w.tokenOf();
        expect(await acceptInvite(w.deps, { token, password: 'correct horse' })).toMatchObject({ status: 409, body: { errorCode: 'EMAIL_HAS_LOGIN' } });
        expect(w.app().status).toBe('invited');
        expect((await readInvite(w.deps, token)).status).toBe(200);
    });

    it('setzt nach einem Abbruch fort, statt den Anbieter doppelt anzulegen', async () => {
        let fail = true;
        const w = world([row()], { createUser: vi.fn(async () => (fail ? { ok: false as const, reason: 'failed' as const } : { ok: true as const, userId: 'user-2' })) });
        await inviteApplication(w.deps, ID, null);
        const token = w.tokenOf();
        expect((await acceptInvite(w.deps, { token, password: 'correct horse' })).status).toBe(502);
        fail = false;
        expect((await acceptInvite(w.deps, { token, password: 'correct horse' })).status).toBe(201);
        expect(w.tables.providers).toHaveLength(1);
        expect(w.tables.provider_members).toHaveLength(1);
    });

    it('weicht aus, wenn der Schluessel der Firma schon vergeben ist', async () => {
        const w = world();
        w.tables.providers.push({ provider_key: 'alder-quay-vat-services-llc', name: 'Other' });
        await inviteApplication(w.deps, ID, null);
        const out = await acceptInvite(w.deps, { token: w.tokenOf(), password: 'correct horse' });
        expect(out.body.provider_key).toBe('alder-quay-vat-services-llc-111111');
    });

    it('nimmt denselben Link kein zweites Mal', async () => {
        const w = world();
        await inviteApplication(w.deps, ID, null);
        const token = w.tokenOf();
        await acceptInvite(w.deps, { token, password: 'correct horse' });
        expect((await acceptInvite(w.deps, { token, password: 'correct horse' })).status).toBe(404);
        expect(w.users).toHaveLength(1);
    });
});

describe('Limit der offenen Routen', () => {
    it('laesst 30 Aufrufe je Adresse in 15 Minuten zu', () => {
        for (let i = 0; i < INVITE_LIMIT; i++) expect(inviteRateLimited('1.2.3.4', 1000)).toBe(false);
        expect(inviteRateLimited('1.2.3.4', 1000)).toBe(true);
        expect(inviteRateLimited('5.6.7.8', 1000)).toBe(false);
        expect(inviteRateLimited('1.2.3.4', 1000 + 16 * 60 * 1000)).toBe(false);
    });
});
