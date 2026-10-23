import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    resolveLlm, fitEmbedding, queryInput, sameEmbedModel, toPlainText,
    EMBED_DIMS, LEGACY_EMBED_MODEL, DEFAULT_BASE_URL, DEFAULT_CHAT_MODEL, DEFAULT_EMBED_MODEL,
} from '../llm.js';

// Scaleway und Gemini sind externe Dienste — fetch ist gestubbt, die Suite
// bleibt offline. Geprüft wird der Vertrag, den wir mit dem Anbieter haben.

describe('resolveLlm', () => {
    it('returns null without any key (→ 503 ASSISTANT_NOT_CONFIGURED)', () => {
        expect(resolveLlm({})).toBeNull();
        expect(resolveLlm({ LLM_API_KEY: '   ' })).toBeNull();
    });

    it('defaults to Scaleway with Mistral Small and Qwen3-Embedding', () => {
        const llm = resolveLlm({ LLM_API_KEY: 'scw-secret' })!;
        expect(llm.id).toBe('openai-compatible');
        expect(llm.chatModel).toBe(DEFAULT_CHAT_MODEL);
        expect(llm.embedModel).toBe(DEFAULT_EMBED_MODEL);
    });

    it('prefers LLM_API_KEY over GEMINI_API_KEY — Gemini is only the transition', () => {
        expect(resolveLlm({ LLM_API_KEY: 'scw', GEMINI_API_KEY: 'g' })!.id).toBe('openai-compatible');
        expect(resolveLlm({ GEMINI_API_KEY: 'g' })!.id).toBe('gemini');
        expect(resolveLlm({ GEMINI_API_KEY: 'g' })!.embedModel).toBe(LEGACY_EMBED_MODEL);
    });

    it('takes model and endpoint overrides from the environment', () => {
        const llm = resolveLlm({ LLM_API_KEY: 'k', LLM_CHAT_MODEL: 'qwen3.5-9b', LLM_EMBED_MODEL: 'bge-m3' })!;
        expect(llm.chatModel).toBe('qwen3.5-9b');
        expect(llm.embedModel).toBe('bge-m3');
    });
});

describe('fitEmbedding', () => {
    it('truncates a Matryoshka vector to 768 and re-normalizes it', () => {
        const v = fitEmbedding(Array.from({ length: 4096 }, (_, i) => (i % 7) - 3));
        expect(v).toHaveLength(EMBED_DIMS);
        expect(Math.hypot(...v)).toBeCloseTo(1, 10);
    });

    it('rejects vectors that are too short, broken or zero', () => {
        expect(() => fitEmbedding(new Array(512).fill(0.1))).toThrow(/expected >= 768/);
        expect(() => fitEmbedding([...new Array(767).fill(0.1), Number.NaN])).toThrow();
        expect(() => fitEmbedding(undefined)).toThrow();
        expect(() => fitEmbedding(new Array(768).fill(0))).toThrow(/zero vector/);
    });
});

describe('queryInput', () => {
    it('adds the English task instruction for Qwen3-Embedding queries', () => {
        const q = queryInput('qwen3-embedding-8b', 'Wann muss ich mich in Frankreich registrieren?');
        expect(q.startsWith('Instruct: ')).toBe(true);
        expect(q.endsWith('\nQuery:Wann muss ich mich in Frankreich registrieren?')).toBe(true);
    });
    it('leaves other models untouched', () => {
        expect(queryInput('bge-m3', 'x')).toBe('x');
    });
});

describe('sameEmbedModel', () => {
    it('treats untagged chunks as the legacy Gemini corpus', () => {
        expect(sameEmbedModel(null, LEGACY_EMBED_MODEL)).toBe(true);
        expect(sameEmbedModel({}, 'qwen3-embedding-8b')).toBe(false);
    });
    it('keeps only chunks embedded with the query model', () => {
        expect(sameEmbedModel({ embed_model: 'qwen3-embedding-8b' }, 'qwen3-embedding-8b')).toBe(true);
        expect(sameEmbedModel({ embed_model: 'qwen3-embedding-8b' }, LEGACY_EMBED_MODEL)).toBe(false);
    });
});

describe('toPlainText', () => {
    it('strips Markdown the chat window cannot render, keeps "- " bullets', () => {
        const md = '## Registrierung\n\n**Schwelle:** 10.000 €\n* Frist: `30 Tage`\n- Quelle: Art. 59c\n\n\n\nEnde';
        expect(toPlainText(md)).toBe('Registrierung\n\nSchwelle: 10.000 €\n- Frist: 30 Tage\n- Quelle: Art. 59c\n\nEnde');
    });
    it('leaves plain text alone', () => {
        expect(toPlainText('- a\n- b')).toBe('- a\n- b');
    });
});

describe('OpenAI-compatible provider (Scaleway)', () => {
    const realFetch = globalThis.fetch;
    const fetchMock = vi.fn();
    beforeEach(() => { fetchMock.mockReset(); globalThis.fetch = fetchMock as never; });
    afterEach(() => { globalThis.fetch = realFetch; });

    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    const llm = () => resolveLlm({ LLM_API_KEY: 'scw-secret' })!;

    it('embeds the query via /embeddings with bearer auth and 768 dimensions', async () => {
        fetchMock.mockResolvedValue(ok({ data: [{ embedding: new Array(4096).fill(0.5) }] }));
        const v = await llm().embedQuery('[FR] Schwelle?');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${DEFAULT_BASE_URL}/embeddings`);
        expect(init.headers.Authorization).toBe('Bearer scw-secret');
        const sent = JSON.parse(init.body);
        expect(sent).toMatchObject({ model: DEFAULT_EMBED_MODEL, dimensions: 768 });
        expect(sent.input).toContain('Query:[FR] Schwelle?');
        expect(v).toHaveLength(768);
    });

    it('sends system prompt, trimmed history and the user turn to /chat/completions', async () => {
        fetchMock.mockResolvedValue(ok({ choices: [{ message: { content: '**Antwort**' } }] }));
        const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `t${i}` + 'x'.repeat(3000) }));
        const answer = await llm().generate('SYSTEM', history, 'FRAGE');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${DEFAULT_BASE_URL}/chat/completions`);
        const sent = JSON.parse(init.body);
        expect(sent.model).toBe(DEFAULT_CHAT_MODEL);
        expect(sent.messages[0]).toEqual({ role: 'system', content: 'SYSTEM' });
        expect(sent.messages).toHaveLength(1 + 6 + 1);
        expect(sent.messages[1].content.startsWith('t4')).toBe(true);
        expect(sent.messages[1].content.length).toBe(2000);
        expect(sent.messages.at(-1)).toEqual({ role: 'user', content: 'FRAGE' });
        expect(answer).toBe('Antwort');
    });

    it('fails loudly on a provider error instead of answering empty', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'invalid key' }) });
        await expect(llm().generate('S', [], 'Q')).rejects.toThrow(/invalid key/);
        fetchMock.mockResolvedValue(ok({ choices: [{ message: { content: '   ' } }] }));
        await expect(llm().generate('S', [], 'Q')).rejects.toThrow();
    });

    it('refuses a truncated answer instead of shipping half of it', async () => {
        fetchMock.mockResolvedValue(ok({ choices: [{ message: { content: 'Die Schwelle liegt bei' }, finish_reason: 'length' }] }));
        await expect(llm().generate('S', [], 'Q')).rejects.toThrow(/truncated/);
    });

    it('strips a trailing slash from a custom base URL', async () => {
        fetchMock.mockResolvedValue(ok({ data: [{ embedding: new Array(768).fill(1) }] }));
        await resolveLlm({ LLM_API_KEY: 'k', LLM_BASE_URL: 'https://openai.inference.de-txl.ionos.com/v1/' })!.embedQuery('x');
        expect(fetchMock.mock.calls[0][0]).toBe('https://openai.inference.de-txl.ionos.com/v1/embeddings');
    });
});
