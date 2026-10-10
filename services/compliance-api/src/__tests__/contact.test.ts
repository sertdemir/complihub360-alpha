import { describe, it, expect, vi, beforeEach } from 'vitest';
// dashboard.ts (Bereichs-Slugs) zieht den Supabase-Client nach; hier ohne Netz.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import { checkContact, handleContact, renderAckMail, renderInboxMail, contactRateLimited, resetContactLimit, CONTACT_LIMIT, type ContactDeps, type OutgoingMail } from '../contact.js';

// ─── Kontakt und Partner-Bewerbung (Beta-Plan Di 13.10.) ─────────────────────
// Ein Postfach; die Nachricht geht dorthin, nicht in die Datenbank. Die
// Bestaetigung an den Absender wiederholt nichts, was er eingetippt hat.

const MSG = { lane: 'support', locale: 'de', name: 'Jana Beispiel', email: 'jana@example.com', message: 'Die Risk Map zeigt DE doppelt.' };
const APP = {
    lane: 'application', locale: 'en', name: 'Max Muster', email: 'max@kanzlei.example', firm: 'Muster Steuerberatung',
    website: 'https://kanzlei.example', credentials: 'Steuerberater (DE)', areas: ['tax-vat', 'nope'], markets: ['de', 'AT', 'Germany'],
};

function deps(over: Partial<ContactDeps> = {}) {
    const sent: OutgoingMail[] = [];
    const logged: Array<[string, Record<string, unknown>]> = [];
    const d: ContactDeps = {
        inbox: 'hallo@complihub360.test',
        mailFrom: 'CompliHub360 <noreply@complihub360.test>',
        send: vi.fn(async (m: OutgoingMail) => { sent.push(m); return { ok: true, status: 200 }; }),
        log: async (type, payload) => { logged.push([type, payload]); },
        ...over,
    };
    return { d, sent, logged };
}

describe('checkContact', () => {
    it('nimmt eine Nachricht an und bereinigt Steuerzeichen in einzeiligen Feldern', () => {
        const c = checkContact({ ...MSG, name: 'Jana\r\nBcc: x@y.z' });
        expect(c.ok && 'request' in c && c.request.name).toBe('Jana Bcc: x@y.z');
    });

    it('lehnt unbekannte Wege, fehlende Nachricht und kaputte Adressen ab', () => {
        expect(checkContact({ ...MSG, lane: 'press' })).toMatchObject({ ok: false, field: 'lane' });
        expect(checkContact({ ...MSG, message: '   ' })).toMatchObject({ ok: false, field: 'message' });
        expect(checkContact({ ...MSG, email: 'jana@' })).toMatchObject({ ok: false, field: 'email' });
        expect(checkContact({ ...MSG, email: 'a@b.de, c@d.de' })).toMatchObject({ ok: false, field: 'email' });
        expect(checkContact({ ...MSG, message: 'x'.repeat(5001) })).toMatchObject({ ok: false, field: 'message' });
    });

    it('Bewerbung: nur bekannte Bereiche, Maerkte als ISO-Code, Nachricht optional', () => {
        const c = checkContact(APP);
        expect(c.ok && 'request' in c && c.request.application).toEqual({
            firm: 'Muster Steuerberatung', website: 'https://kanzlei.example', credentials: 'Steuerberater (DE)', areas: ['tax-vat'], markets: ['DE', 'AT'],
        });
        expect(checkContact({ ...APP, areas: ['nope'] })).toMatchObject({ ok: false, field: 'areas' });
        expect(checkContact({ ...APP, credentials: '' })).toMatchObject({ ok: false, field: 'credentials' });
    });

    it('unbekannte Sprache faellt auf Englisch', () => {
        const c = checkContact({ ...MSG, locale: 'fr' });
        expect(c.ok && 'request' in c && c.request.locale).toBe('en');
    });
});

describe('handleContact', () => {
    it('schickt die Nachricht ans Postfach (Reply-To Absender) und bestaetigt den Eingang', async () => {
        const { d, sent, logged } = deps();
        const out = await handleContact(MSG, d, 'ref-1');
        expect(out).toEqual({ status: 200, body: { ok: true, acknowledged: true } });
        expect(sent).toHaveLength(2);
        expect(sent[0]).toMatchObject({ to: 'hallo@complihub360.test', subject: '[Assessment] Jana Beispiel', replyTo: 'jana@example.com' });
        expect(sent[0].text).toContain('Die Risk Map zeigt DE doppelt.');
        expect(sent[1]).toMatchObject({ to: 'jana@example.com', subject: 'Ihre Nachricht ist bei uns angekommen', replyTo: 'hallo@complihub360.test' });
        // Protokoll ohne Personendaten.
        expect(logged).toEqual([['contact_sent', { lane: 'support', locale: 'de', acknowledged: true }]]);
        expect(JSON.stringify(logged)).not.toMatch(/jana|Beispiel|doppelt/i);
    });

    it('die Bestaetigung wiederholt weder Name noch Nachricht', () => {
        const c = checkContact({ ...MSG, name: 'Gewinn! klick hier', message: 'http://spam.example' });
        const ack = renderAckMail((c as any).request, 'hallo@complihub360.test', 'ref-2');
        expect(ack.text).not.toContain('Gewinn');
        expect(ack.text).not.toContain('spam.example');
        expect(ack.text).toContain('ref-2');
    });

    it('je Weg die passende Zusage', () => {
        const ack = (lane: string) => renderAckMail((checkContact({ ...MSG, locale: 'en', lane }) as any).request, 'i@x.de', 'r').text;
        expect(ack('support')).toContain('next business day');
        expect(ack('partner')).toContain('within 3 business days');
        expect(ack('privacy')).toContain('Art. 12 GDPR');
        expect(renderAckMail((checkContact(APP) as any).request, 'i@x.de', 'r').subject).toBe('We have received your application');
    });

    it('Bewerbung: strukturierte Felder in der Mail ans Postfach', async () => {
        const { d, sent } = deps();
        await handleContact(APP, d, 'ref-3');
        expect(sent[0].subject).toBe('[Partner-Bewerbung] Muster Steuerberatung · Max Muster');
        expect(sent[0].text).toContain('Maerkte: DE, AT');
        expect(sent[0].text).toContain('Bereiche: tax-vat');
    });

    it('ohne Postfach oder Schluessel: 503, nichts geht hinaus', async () => {
        const a = deps({ inbox: null });
        expect((await handleContact(MSG, a.d, 'r')).status).toBe(503);
        expect(a.sent).toHaveLength(0);
        const b = deps({ send: null });
        expect((await handleContact(MSG, b.d, 'r')).body.errorCode).toBe('CONTACT_UNAVAILABLE');
    });

    it('Postfach nicht erreichbar: 502, keine Bestaetigung — die Nachricht ist nirgends', async () => {
        const { d, sent } = deps();
        d.send = vi.fn(async () => ({ ok: false, status: 422 }));
        const out = await handleContact(MSG, d, 'r');
        expect(out.status).toBe(502);
        expect(d.send).toHaveBeenCalledTimes(1);
        expect(sent).toHaveLength(0);
    });

    it('nur die Bestaetigung scheitert: 200 mit acknowledged false', async () => {
        const { d } = deps();
        let n = 0;
        d.send = vi.fn(async () => (++n === 1 ? { ok: true, status: 200 } : { ok: false, status: 403 }));
        expect(await handleContact(MSG, d, 'r')).toEqual({ status: 200, body: { ok: true, acknowledged: false } });
    });

    it('Honeypot: gleiche Antwort, aber nichts geht hinaus', async () => {
        const { d, sent } = deps();
        const out = await handleContact({ ...MSG, hp: 'https://bot.example' }, d, 'r');
        expect(out.status).toBe(200);
        expect(sent).toHaveLength(0);
    });

    it('Pruefung schlaegt fehl: 400 mit Feld', async () => {
        const { d } = deps();
        expect(await handleContact({ ...MSG, email: 'x' }, d, 'r')).toMatchObject({ status: 400, body: { field: 'email' } });
    });
});

describe('contactRateLimited', () => {
    beforeEach(() => resetContactLimit());
    it(`${CONTACT_LIMIT} Nachrichten je Adresse in 15 Minuten`, () => {
        const t0 = 1_000_000;
        for (let i = 0; i < CONTACT_LIMIT; i++) expect(contactRateLimited('1.2.3.4', t0 + i)).toBe(false);
        expect(contactRateLimited('1.2.3.4', t0 + 10)).toBe(true);
        expect(contactRateLimited('5.6.7.8', t0 + 10)).toBe(false);
        expect(contactRateLimited('1.2.3.4', t0 + 15 * 60 * 1000 + 1)).toBe(false);
    });
});

describe('renderInboxMail', () => {
    it('kein Zeilenumbruch im Betreff', () => {
        const r = (checkContact({ ...MSG, name: 'A\nB' }) as any).request;
        expect(renderInboxMail(r, 'i@x.de', 'r').subject).not.toMatch(/\n/);
    });
});
