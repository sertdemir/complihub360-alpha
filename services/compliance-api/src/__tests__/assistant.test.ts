import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PassThrough } from 'node:stream';

// Der Assistent spricht Supabase (Kontext, Audit) und Gemini (fetch). Hier
// gibt es keinen In-Process-Server, also darf globalThis.fetch ersetzt werden.
// Geprueft werden die drei Privacy-Befunde P1, P2, P5 — nicht die Antwortguete.

const store = vi.hoisted(() => ({
    events: [] as Array<Record<string, any>>,
    failEventInsert: false,
    sessionsThrow: false,
}));

vi.mock('../supabase.js', () => ({
    supabaseApi: {
        select: async (t: string) => {
            if (t === 'user_subscriptions') return [];
            if (t === 'jurisdiction_facts') return [];
            return [];
        },
        insert: async (t: string, row: Record<string, any>) => {
            if (t === 'event_log' && store.failEventInsert) throw new Error('event_log unavailable');
            store.events.push({ t, ...row });
            return [row];
        },
        rpc: async () => [],
        update: async () => [],
    },
}));
vi.mock('../stripe.js', () => ({ stripeRequest: async () => ({}) }));
vi.mock('../domain.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../domain.js')>();
    return {
        ...real,
        loadDomainSessions: async () => {
            if (store.sessionsThrow) throw new Error('db down');
            return { active: [{ id: 'sess-1', label: 'Firma Max Mustermann max@firma.example', country: 'DE', markets: ['DE'], categories: ['data-privacy'], updated_at: '2026-10-01', obligations: [] }], archived: 0 };
        },
    };
});

const { handleAssistantChat } = await import('../assistant.js');

type Captured = { status: number; body: any };

async function chat(payload: Record<string, unknown>, identity: { userId: string; email: string } = { userId: 'user-1', email: 'u@example.com' }): Promise<Captured> {
    const req = new PassThrough() as unknown as import('http').IncomingMessage & PassThrough;
    const out: Captured = { status: 0, body: null };
    const res = {
        setHeader: () => undefined,
        writeHead: (status: number) => { out.status = status; },
        end: (chunk: string) => { out.body = chunk ? JSON.parse(chunk) : null; },
    } as unknown as import('http').ServerResponse;
    const done = new Promise<void>((resolve) => {
        const origEnd = res.end.bind(res);
        (res as any).end = (chunk: string) => { origEnd(chunk); resolve(); };
    });
    handleAssistantChat(req as any, res, 'corr-test', '127.0.0.1', identity);
    req.end(JSON.stringify(payload));
    await done;
    return out;
}

describe('Assistant — Privacy-Befunde P1, P2, P5', () => {
    const realFetch = globalThis.fetch;
    let gemini: ReturnType<typeof vi.fn>;
    beforeEach(() => {
        process.env.GEMINI_API_KEY = 'test-key';
        store.events = []; store.failEventInsert = false; store.sessionsThrow = false;
        gemini = vi.fn(async (url: string) => {
            if (String(url).includes(':embedContent')) return new Response(JSON.stringify({ embedding: { values: new Array(768).fill(0.01) } }), { status: 200 });
            return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Antwort.' }] } }] }), { status: 200 });
        });
        globalThis.fetch = gemini as unknown as typeof fetch;
    });
    afterEach(() => { globalThis.fetch = realFetch; delete process.env.GEMINI_API_KEY; });

    it('P1: antwortet die Datenbank nicht, gibt es 502 — keine Antwort, die „keine Pflichten" behauptet', async () => {
        store.sessionsThrow = true;
        const r = await chat({ message: 'Welche Pflichten habe ich beim Datenschutz?', domain: 'data-privacy' });
        expect(r.status).toBe(502);
        expect(r.body.errorCode).toBe('ASSISTANT_CONTEXT_UNAVAILABLE');
        // Kein Modellaufruf, kein Audit eines Aufrufs, der nicht stattfand.
        expect(gemini.mock.calls.filter(([u]) => String(u).includes(':generateContent'))).toHaveLength(0);
        expect(store.events.filter((e) => e.type === 'assistant_chat')).toHaveLength(0);
    });

    it('P2: das Audit steht VOR dem Modellaufruf; kann es nicht geschrieben werden, findet der Aufruf nicht statt', async () => {
        store.failEventInsert = true;
        const r = await chat({ message: 'Was gilt beim Verpackungsgesetz?', domain: 'product-packaging' });
        expect(r.status).toBe(502);
        expect(r.body.errorCode).toBe('ASSISTANT_AUDIT_UNAVAILABLE');
        expect(gemini.mock.calls.filter(([u]) => String(u).includes(':generateContent'))).toHaveLength(0);
    });

    it('P2: im Normalfall liegt das Audit-Ereignis vor dem Aufruf und traegt keinen Nachrichteninhalt', async () => {
        const order: string[] = [];
        gemini.mockImplementation(async (url: string) => {
            if (String(url).includes(':generateContent')) order.push('model');
            if (String(url).includes(':embedContent')) return new Response(JSON.stringify({ embedding: { values: new Array(768).fill(0.01) } }), { status: 200 });
            return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Antwort.' }] } }] }), { status: 200 });
        });
        const realInsertOrder = store.events;
        const r = await chat({ message: 'Welche Fristen gelten fuer die EPR-Registrierung?', domain: 'product-packaging' });
        expect(r.status).toBe(200);
        expect(realInsertOrder.some((e) => e.type === 'assistant_chat')).toBe(true);
        expect(order).toEqual(['model']);
        const audit = store.events.find((e) => e.type === 'assistant_chat')!;
        expect(JSON.stringify(audit)).not.toContain('EPR-Registrierung');
        expect(audit.payload).toMatchObject({ domain: 'product-packaging', sessions: 1 });
    });

    it('P5: Frage, Verlauf und Sitzungs-Labels gehen redigiert an das Modell', async () => {
        const r = await chat({
            message: 'Meine Mail ist max@firma.example, Telefon +49 170 1234567 — welche Pflichten habe ich?',
            domain: 'data-privacy',
            history: [{ role: 'user', content: 'Ich bin Max Mustermann, IBAN DE89370400440532013000' }, { role: 'assistant', content: 'Verstanden.' }],
        });
        expect(r.status).toBe(200);
        const generateCall = gemini.mock.calls.find(([u]) => String(u).includes(':generateContent'))!;
        const sent = String((generateCall[1] as RequestInit).body);
        expect(sent).not.toContain('max@firma.example');
        expect(sent).not.toContain('DE89370400440532013000');
        expect(sent).not.toContain('1234567');
        expect(sent).toContain('welche Pflichten habe ich');
        // Beide Aufrufe tragen eine Zeitgrenze (P14).
        for (const [, init] of gemini.mock.calls) expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
    });

    it('DNA §5: der Systemprompt nennt die AI als AI, trennt klar von auslegungsbeduerftig, benennt Luecken und bleibt ruhig — in beiden Prompts', async () => {
        for (const domain of [undefined, 'data-privacy']) {
            gemini.mockClear();
            // Eigener Nutzer: die fuenf freien Tagesfragen von user-1 sind nach den Tests oben verbraucht.
            const r = await chat({ message: 'Which VAT registration thresholds apply to me?', ...(domain ? { domain } : {}) }, { userId: 'user-dna', email: 'dna@example.com' });
            expect(r.status).toBe(200);
            const generateCall = gemini.mock.calls.find(([u]) => String(u).includes(':generateContent'))!;
            const sent = String((generateCall[1] as RequestInit).body);
            expect(sent).toContain('You are an AI assistant, not a lawyer, tax adviser or customs specialist');
            expect(sent).toContain('what depends on interpretation');
            expect(sent).toContain('name the gap in one sentence');
            expect(sent).toContain('stay calm and factual');
            expect(sent).toContain('NOT legal or tax advice');
            // Keine reflexartige Partner-Empfehlung, Bussgeld nie als Schlagzeile.
            expect(sent).toContain('Do not present a partner request as the only or the required next step');
            expect(sent).toContain('Penalties are context, not the headline');
            expect(sent).not.toContain('coverage for it is coming');
        }
    });
});
