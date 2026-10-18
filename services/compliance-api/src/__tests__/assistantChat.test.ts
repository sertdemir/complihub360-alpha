import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Handler-Vertrag nach der Umstellung auf Scaleway (ADR-0011): die Suche
// bleibt in einem Embedding-Modell, ein leerer Korpus fällt auf, und was an
// den Anbieter ging, wird auch im Fehlerfall auditiert. Supabase und der
// Anbieter sind gestubbt.

const rpc = vi.fn();
const insert = vi.fn();
const select = vi.fn();
vi.mock('../supabase.js', () => ({ supabaseApi: { rpc: (...a: unknown[]) => rpc(...a), insert: (...a: unknown[]) => insert(...a), select: (...a: unknown[]) => select(...a) } }));
vi.mock('../stripe.js', () => ({ stripeRequest: vi.fn() }));

const { handleAssistantChat } = await import('../assistant.js');

function call(body: unknown, ip: string) {
    const req = new PassThrough() as unknown as IncomingMessage;
    const out: { status?: number; headers: Record<string, string>; body?: { errorCode?: string; [k: string]: unknown } } = { headers: {} };
    const done = new Promise<typeof out>((resolve) => {
        const res = {
            setHeader: (k: string, v: string) => { out.headers[k] = v; },
            writeHead: (s: number) => { out.status = s; },
            end: (b: string) => { out.body = JSON.parse(b); resolve(out); },
        } as unknown as ServerResponse;
        handleAssistantChat(req, res, 'corr-1', ip, { userId: null, email: null });
    });
    (req as unknown as PassThrough).end(JSON.stringify(body));
    return done;
}

const ok = (b: unknown) => ({ ok: true, status: 200, json: async () => b });
const realFetch = globalThis.fetch;
const fetchMock = vi.fn();
let ipSeq = 0;

beforeEach(() => {
    [rpc, insert, select, fetchMock].forEach((m) => m.mockReset());
    insert.mockResolvedValue(undefined);
    select.mockResolvedValue([]);
    globalThis.fetch = fetchMock as never;
    process.env.LLM_API_KEY = 'scw-test';
    delete process.env.GEMINI_API_KEY;
});
afterEach(() => { globalThis.fetch = realFetch; delete process.env.LLM_API_KEY; });

// fetch: 1. Embeddings, 2. Chat — in dieser Reihenfolge ruft der Handler.
function provider(answer: unknown) {
    fetchMock
        .mockResolvedValueOnce(ok({ data: [{ embedding: new Array(4096).fill(0.5) }] }))
        .mockResolvedValueOnce(answer as never);
}

describe('assistant chat with the Scaleway provider', () => {
    it('asks the RPC for the query model and audits provider and models', async () => {
        provider(ok({ choices: [{ message: { content: 'Antwort' }, finish_reason: 'stop' }] }));
        rpc.mockResolvedValueOnce([{ content: 'x', metadata: { country: 'FR', embed_model: 'qwen3-embedding-8b' }, similarity: 0.71234 }]);

        const r = await call({ message: 'Schwelle in Frankreich?', country: 'FR' }, `10.0.0.${++ipSeq}`);

        expect(r.status).toBe(200);
        expect(r.headers['x-llm-provider']).toBe('openai-compatible:mistral-small-3.2-24b-instruct-2506');
        expect(rpc).toHaveBeenCalledWith('match_knowledge_chunks', expect.objectContaining({ embed_model: 'qwen3-embedding-8b', match_count: 6 }));
        const [, audit] = (insert.mock.calls as Array<[string, { payload: Record<string, unknown> }]>).find(([t]) => t === 'event_log')!;
        expect(audit.payload).toMatchObject({ outcome: 'ok', provider: 'openai-compatible', embed_model: 'qwen3-embedding-8b', chunks: 1, top_similarity: 0.712, corpus_missing: false });
        expect(JSON.stringify(audit.payload)).not.toContain('Frankreich');
    });

    it('flags a corpus without chunks for the embed model instead of looking like "no match"', async () => {
        provider(ok({ choices: [{ message: { content: 'Nicht abgedeckt.' } }] }));
        rpc.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

        const r = await call({ message: 'Schwelle in Frankreich?', country: 'FR' }, `10.0.1.${++ipSeq}`);

        expect(r.status).toBe(200);
        expect(rpc.mock.calls[1][1]).toMatchObject({ match_threshold: -1, match_count: 1, embed_model: 'qwen3-embedding-8b' });
        const [, audit] = (insert.mock.calls as Array<[string, { payload: Record<string, unknown> }]>).find(([t]) => t === 'event_log')!;
        expect(audit.payload).toMatchObject({ chunks: 0, corpus_missing: true });
    });

    it('still audits when the provider fails after it saw the question', async () => {
        provider({ ok: false, status: 503, json: async () => ({ message: 'overloaded' }) });
        rpc.mockResolvedValueOnce([{ content: 'x', metadata: { embed_model: 'qwen3-embedding-8b' }, similarity: 0.6 }]);

        const r = await call({ message: 'Schwelle in Frankreich?', country: 'FR' }, `10.0.2.${++ipSeq}`);

        expect(r.status).toBe(502);
        expect(r.body.errorCode).toBe('ASSISTANT_ERROR');
        expect(JSON.stringify(r.body)).not.toContain('overloaded');
        const [, audit] = (insert.mock.calls as Array<[string, { payload: Record<string, unknown> }]>).find(([t]) => t === 'event_log')!;
        expect(audit.payload).toMatchObject({ outcome: 'error', stage: 'generate', provider: 'openai-compatible' });
    });

    it('answers 503 without any key and sends nothing anywhere', async () => {
        delete process.env.LLM_API_KEY;
        const r = await call({ message: 'Schwelle in Frankreich?' }, `10.0.3.${++ipSeq}`);
        expect(r.status).toBe(503);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(insert).not.toHaveBeenCalled();
    });
});
