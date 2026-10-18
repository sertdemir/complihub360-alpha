// ─── Sprachmodell-Anbieter für den Assistenten ────────────────────────────────
//
// Ein Interface, zwei Implementierungen:
//
//   • OpenAI-kompatibel (Ziel, Festlegung 2026-10-18): Scaleway Generative APIs
//     in Paris mit offenen Modellen — Mistral Small für die Antwort,
//     Qwen3-Embedding für die Korpus-Suche. Jeder andere OpenAI-kompatible
//     Endpunkt (IONOS, OVHcloud, ein eigener vLLM-Server) ist nur eine andere
//     LLM_BASE_URL — kein Codewechsel.
//   • Gemini (Übergang): bleibt nur, solange LLM_API_KEY fehlt, damit Staging
//     bis zur Umstellung weiter antwortet. Wird nach dem Cutover entfernt
//     (docs/runbooks/llm-scaleway-umstellung.md).
//
// Die Wahl hängt allein an der Konfiguration. Es gibt bewusst KEIN
// automatisches Ausweichen zur Laufzeit: Fällt Scaleway aus, scheitert die
// Anfrage sichtbar (502), statt still Daten an einen anderen Anbieter zu geben.
//
// Vektoren verschiedener Modelle sind nicht vergleichbar. Jeder Korpus-Chunk
// trägt deshalb `metadata.embed_model`; der Assistent nimmt nur Treffer, die
// mit DEMSELBEN Modell eingebettet wurden wie die Frage (`sameEmbedModel`).

/** Breite der Spalte knowledge_chunks.embedding (vector(768)). */
export const EMBED_DIMS = 768;

/** Modell, mit dem der Bestand ohne `embed_model`-Feld eingebettet wurde. */
export const LEGACY_EMBED_MODEL = 'gemini-embedding-001';

export const DEFAULT_BASE_URL = 'https://api.scaleway.ai/v1';
export const DEFAULT_CHAT_MODEL = 'mistral-small-3.2-24b-instruct-2506';
export const DEFAULT_EMBED_MODEL = 'qwen3-embedding-8b';

const REQUEST_TIMEOUT_MS = 45_000;
const HISTORY_TURNS = 6;
const HISTORY_CHARS = 2000;

export type ChatTurn = { role: string; content: string };

export interface LlmProvider {
    /** Für Audit und Logs: wer die Frage verarbeitet hat. */
    readonly id: 'openai-compatible' | 'gemini';
    readonly chatModel: string;
    readonly embedModel: string;
    embedQuery(text: string): Promise<number[]>;
    generate(system: string, history: ChatTurn[], user: string): Promise<string>;
}

type Env = Record<string, string | undefined>;

/**
 * Liefert den konfigurierten Anbieter oder null (→ 503 ASSISTANT_NOT_CONFIGURED).
 * LLM_API_KEY gewinnt; GEMINI_API_KEY ist nur der Übergang.
 */
export function resolveLlm(env: Env = process.env): LlmProvider | null {
    const key = env.LLM_API_KEY?.trim();
    if (key) {
        return openAiCompatible({
            apiKey: key,
            baseUrl: (env.LLM_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ''),
            chatModel: env.LLM_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL,
            embedModel: env.LLM_EMBED_MODEL?.trim() || DEFAULT_EMBED_MODEL,
        });
    }
    const gemini = env.GEMINI_API_KEY?.trim();
    return gemini ? geminiLegacy(gemini) : null;
}

/** Kürzt einen Matryoshka-Vektor auf `dims` und normiert ihn wieder auf Länge 1. */
export function fitEmbedding(values: unknown, dims = EMBED_DIMS): number[] {
    if (!Array.isArray(values) || values.length < dims || !values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
        // Ein zu kurzer oder kaputter Vektor würde in pgvector scheitern oder,
        // schlimmer, unbemerkt falsche Treffer liefern.
        throw new Error(`embedding: expected >= ${dims} finite numbers, got ${Array.isArray(values) ? values.length : typeof values}`);
    }
    const v = (values as number[]).slice(0, dims);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    if (!norm) throw new Error('embedding: zero vector');
    return v.map((x) => x / norm);
}

/**
 * Qwen3-Embedding ist instruktionsgesteuert: Fragen bekommen eine
 * Aufgabenbeschreibung (laut Modellkarte auf Englisch), Dokumente nicht.
 * Andere Modelle bekommen die Frage unverändert.
 */
export function queryInput(model: string, text: string): string {
    return /qwen3-embedding/i.test(model)
        ? `Instruct: Given a question about indirect tax or compliance rules, retrieve passages from a VAT reference guide that answer it\nQuery:${text}`
        : text;
}

/** Nur Treffer desselben Embedding-Modells sind vergleichbar. */
export function sameEmbedModel(metadata: { embed_model?: unknown } | null | undefined, model: string): boolean {
    const tagged = typeof metadata?.embed_model === 'string' ? metadata.embed_model : LEGACY_EMBED_MODEL;
    return tagged === model;
}

/**
 * Der Chat rendert kein Markdown (Prompt-Regel 5a). Offene Modelle halten sich
 * nicht immer daran — Fettung, Überschriften und Backticks werden deterministisch
 * entfernt, Inhalt und Aufzählungen ("- ") bleiben.
 */
export function toPlainText(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/gs, '$1')
        .replace(/__(.+?)__/gs, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^(\s*)[*•]\s+/gm, '$1- ')
        .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function trimHistory(history: ChatTurn[]): ChatTurn[] {
    return history.slice(-HISTORY_TURNS).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content.slice(0, HISTORY_CHARS),
    }));
}

/** Was OpenAI-kompatible Anbieter und Gemini zurückgeben — alles optional, weil fremd. */
type ApiBody = {
    error?: { message?: string }; message?: string; detail?: string;
    data?: Array<{ embedding?: unknown }>;
    choices?: Array<{ message?: { content?: unknown }; finish_reason?: string }>;
    embedding?: { values?: unknown };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
};

async function postJson(url: string, headers: Record<string, string>, payload: unknown): Promise<{ ok: boolean; status: number; body: ApiBody }> {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => ({}))) as ApiBody;
    return { ok: res.ok, status: res.status, body };
}

function errorText(body: ApiBody, status: number): string {
    return String(body?.error?.message || body?.message || body?.detail || status);
}

export function openAiCompatible(cfg: { apiKey: string; baseUrl: string; chatModel: string; embedModel: string }): LlmProvider {
    const auth = { Authorization: `Bearer ${cfg.apiKey}` };
    return {
        id: 'openai-compatible',
        chatModel: cfg.chatModel,
        embedModel: cfg.embedModel,
        async embedQuery(text) {
            const { ok, status, body } = await postJson(`${cfg.baseUrl}/embeddings`, auth, {
                model: cfg.embedModel,
                input: queryInput(cfg.embedModel, text),
                // Matryoshka: der Anbieter kürzt; fitEmbedding kürzt und normiert
                // trotzdem, falls er den Parameter ignoriert.
                dimensions: EMBED_DIMS,
            });
            if (!ok) throw new Error(`embed: ${errorText(body, status)}`);
            return fitEmbedding(body?.data?.[0]?.embedding);
        },
        async generate(system, history, user) {
            const { ok, status, body } = await postJson(`${cfg.baseUrl}/chat/completions`, auth, {
                model: cfg.chatModel,
                messages: [{ role: 'system', content: system }, ...trimHistory(history), { role: 'user', content: user }],
                temperature: 0.2,
                // Prompt begrenzt auf ~180 Wörter; 1024 lässt Luft für TR/DE.
                max_tokens: 1024,
            });
            const text = body?.choices?.[0]?.message?.content;
            if (!ok || typeof text !== 'string' || !text.trim()) throw new Error(`generate: ${errorText(body, status)}`);
            // Abgeschnitten fehlt oft genau der Schluss: die Grenze oder der
            // Weg zum Partner. Lieber sichtbar scheitern als halb antworten.
            if (body.choices?.[0]?.finish_reason === 'length') throw new Error('generate: answer truncated (finish_reason=length)');
            return toPlainText(text);
        },
    };
}

// ─── Übergang: Gemini (entfällt nach dem Cutover) ────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_GEN_MODEL = 'gemini-flash-latest';

function geminiLegacy(apiKey: string): LlmProvider {
    return {
        id: 'gemini',
        chatModel: GEMINI_GEN_MODEL,
        embedModel: LEGACY_EMBED_MODEL,
        async embedQuery(text) {
            const { ok, status, body } = await postJson(`${GEMINI_BASE}/${LEGACY_EMBED_MODEL}:embedContent?key=${apiKey}`, {}, {
                content: { parts: [{ text }] }, taskType: 'RETRIEVAL_QUERY', outputDimensionality: EMBED_DIMS,
            });
            if (!ok) throw new Error(`Gemini embed: ${errorText(body, status)}`);
            return fitEmbedding(body?.embedding?.values);
        },
        async generate(system, history, user) {
            const contents = [
                ...trimHistory(history).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
                { role: 'user', parts: [{ text: user }] },
            ];
            const { ok, status, body } = await postJson(`${GEMINI_BASE}/${GEMINI_GEN_MODEL}:generateContent?key=${apiKey}`, {}, {
                system_instruction: { parts: [{ text: system }] },
                contents,
                // Thinking-Modelle zahlen Reasoning aus demselben Budget.
                generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
            });
            const text = (body?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text || '').join('');
            if (!ok || !text) throw new Error(`Gemini generate: ${errorText(body, status)}`);
            if (body.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new Error('Gemini generate: answer truncated (MAX_TOKENS)');
            return toPlainText(text);
        },
    };
}
