import { IncomingMessage, ServerResponse } from "http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";

// ─── VAT assistant (chatbot plan phase ②) ─────────────────────────────────────
// RAG over knowledge_chunks (vector 768, match_knowledge_chunks RPC) plus the
// structured jurisdiction_facts table. Gemini powers both sides: query
// embeddings (text-embedding-004, 768 dims — matches the schema) and answer
// generation. Returns 503 ASSISTANT_NOT_CONFIGURED until GEMINI_API_KEY is set
// (same pattern as the Stripe billing portal). Answers are information, not
// legal/tax advice (RDG/StBerG), and must never reproduce licensed source
// text verbatim — the corpus is internal ground truth only.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// gemini-embedding-001 with outputDimensionality 768 matches the vector(768)
// schema; truncated (non-3072) embeddings must be re-normalized for cosine.
const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIMS = 768;
// 'latest' alias — pinned models age out for new API projects (2.5-flash 404s).
const GEN_MODEL = 'gemini-flash-latest';

const SUPPORTED_COUNTRIES = new Set(['DE', 'UK', 'NL', 'FR', 'IT', 'ES', 'US', 'TR', 'AT']);

// Phase ③ gate: free callers get a small daily taste, Assistant-Pro
// subscribers (12 $/month via Stripe Checkout) get the full allowance.
// Counters are in-memory per identity (resets on deploy — fine for staging).
const FREE_DAILY = 5;
const PRO_DAILY = 200;
const usage = new Map<string, { count: number; resetAt: number }>();

export type CallerIdentity = { userId: string | null; email: string | null };

// Stable subscription key: Supabase user id first, lowercased email second.
function userKeyOf(identity: CallerIdentity): string | null {
    return identity.userId || (identity.email ? identity.email.toLowerCase() : null);
}

function countUse(key: string): number {
    const now = Date.now();
    const entry = usage.get(key) || { count: 0, resetAt: now + 24 * 60 * 60 * 1000 };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 24 * 60 * 60 * 1000; }
    entry.count++;
    usage.set(key, entry);
    return entry.count;
}

async function isSubscriber(userKey: string | null): Promise<boolean> {
    if (!userKey) return false;
    try {
        const rows = (await supabaseApi.select('user_subscriptions', { user_key: userKey }, { limit: 1 })) as
            Array<{ status: string; current_period_end: string | null }>;
        const row = rows[0];
        if (!row || !['active', 'trialing'].includes(row.status)) return false;
        // 24h grace past the period end covers renewal-webhook-less staging.
        return !row.current_period_end || new Date(row.current_period_end).getTime() + 24 * 60 * 60 * 1000 > Date.now();
    } catch { return false; }
}

const stripeForm = async (stripeKey: string, method: 'POST' | 'GET', path: string, params?: Record<string, string>) => {
    const url = `https://api.stripe.com/v1/${path}${method === 'GET' && params ? `?${new URLSearchParams(params)}` : ''}`;
    const resp = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${stripeKey}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        ...(method === 'POST' && params ? { body: new URLSearchParams(params).toString() } : {}),
    });
    const body = await resp.json() as Record<string, unknown> & { error?: { message?: string } };
    if (!resp.ok) throw new Error(`Stripe ${path}: ${body.error?.message || resp.status}`);
    return body;
};

async function embedQuery(apiKey: string, text: string): Promise<number[]> {
    const res = await fetch(`${GEMINI_BASE}/${EMBED_MODEL}:embedContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] }, taskType: 'RETRIEVAL_QUERY', outputDimensionality: EMBED_DIMS }),
    });
    const body = await res.json() as { embedding?: { values?: number[] }; error?: { message?: string } };
    if (!res.ok || !body.embedding?.values) throw new Error(`Gemini embed: ${body.error?.message || res.status}`);
    const v = body.embedding.values;
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norm);
}

async function generate(apiKey: string, system: string, history: Array<{ role: string; content: string }>, user: string): Promise<string> {
    const contents = [
        ...history.slice(-6).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content.slice(0, 2000) }] })),
        { role: 'user', parts: [{ text: user }] },
    ];
    const res = await fetch(`${GEMINI_BASE}/${GEN_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents,
            // Thinking models spend reasoning tokens from the same budget —
            // 1024 truncated answers mid-sentence. The prompt caps prose length.
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
        }),
    });
    const body = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
    };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!res.ok || !text) throw new Error(`Gemini generate: ${body.error?.message || res.status}`);
    return text.trim();
}

const SYSTEM_PROMPT = `You are the CompliHub360 compliance assistant for VAT / indirect-tax questions.

Rules — follow ALL of them:
1. Answer ONLY from the CONTEXT block (structured facts + knowledge excerpts). If the context does not cover the question, say so plainly and suggest sending a request to a verified partner via CompliHub360 — never guess.
2. Write every answer in YOUR OWN words. Never copy sentences from the context verbatim — the excerpts come from licensed research material and must not be quoted to users.
3. You provide general regulatory information, NOT legal or tax advice. Do not tell the user what they personally should do in binding terms; describe what the rules say.
4. Reply in the language of the user's question (English, German, Spanish or Turkish).
5. Be compact: at most ~180 words. Use short bullet points for lists of obligations, rates or deadlines. State amounts and deadlines precisely.
5a. Output PLAIN TEXT only — the chat window renders no Markdown. Never use **, *, # or backticks; bullets are lines starting with "- ".
6. When the question names a country outside the covered set (DE, UK, NL, FR, IT, ES, US, TR, AT), say coverage for it is coming and suggest a partner request.`;

export function handleAssistantChat(req: IncomingMessage, res: ServerResponse, correlationId: string, ip: string, identity: CallerIdentity): void {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); if (raw.length > 32_000) req.destroy(); });
    req.on('end', async () => {
        res.setHeader('x-correlation-id', correlationId);
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'ASSISTANT_NOT_CONFIGURED', message: 'The assistant is not connected yet', correlationId }));
                return;
            }
            // JWT identity when signed in; guests are keyed by IP so a guest
            // upgrade (staging demo) unlocks for the same caller.
            const userKey = userKeyOf(identity) || `ip:${ip}`;
            const pro = await isSubscriber(userKey);
            const used = countUse(userKey);
            if (!pro && used > FREE_DAILY) {
                res.writeHead(402, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'ASSISTANT_UPGRADE_REQUIRED', message: 'Free daily limit reached — Assistant Pro unlocks unlimited questions', correlationId }));
                return;
            }
            if (pro && used > PRO_DAILY) {
                res.writeHead(429, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'ASSISTANT_QUOTA', message: 'Daily assistant limit reached', correlationId }));
                return;
            }
            const d = JSON.parse(raw || '{}') as { message?: unknown; country?: unknown; history?: unknown };
            const message = typeof d.message === 'string' ? d.message.trim() : '';
            if (message.length < 3 || message.length > 2000) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'message must be 3-2000 characters', correlationId }));
                return;
            }
            const country = typeof d.country === 'string' && SUPPORTED_COUNTRIES.has(d.country.toUpperCase())
                ? d.country.toUpperCase() : null;
            const history = Array.isArray(d.history)
                ? (d.history as Array<{ role?: unknown; content?: unknown }>)
                    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
                    .map((m) => ({ role: m.role as string, content: m.content as string }))
                : [];

            // Retrieval: vector search over the corpus + structured facts.
            const embedding = await embedQuery(apiKey, country ? `[${country}] ${message}` : message);
            const chunks = (await supabaseApi.rpc('match_knowledge_chunks', {
                query_embedding: embedding, match_threshold: 0.4, match_count: 6,
            })) as Array<{ content: string; metadata: { country?: string; section?: string } | null; similarity: number }>;

            const factsFor = country || (chunks[0]?.metadata?.country ?? null);
            const facts = factsFor
                ? (await supabaseApi.select('jurisdiction_facts', { country_code: factsFor }, { limit: 40 })) as
                    Array<{ fact_key: string; value_text: string; notes: string | null }>
                : [];

            const contextParts: string[] = [];
            if (facts.length) {
                contextParts.push(`STRUCTURED FACTS · ${factsFor} (verified ground truth — prefer these for numbers):\n` +
                    facts.map((f) => `- ${f.fact_key}: ${f.value_text}${f.notes ? ` (${f.notes})` : ''}`).join('\n'));
            }
            chunks.forEach((c, i) => {
                contextParts.push(`EXCERPT ${i + 1} · ${c.metadata?.country || '?'} · ${c.metadata?.section || 'General'} (paraphrase, never quote):\n${c.content.slice(0, 1600)}`);
            });
            const userTurn = `CONTEXT:\n${contextParts.join('\n\n') || '(no matching context found)'}\n\nQUESTION:\n${message}`;

            const answer = await generate(apiKey, SYSTEM_PROMPT, history, userTurn);

            // Log usage without message content (privacy) — volume + coverage only.
            await supabaseApi.insert('event_log', {
                type: 'assistant_chat',
                payload: { country: factsFor, chunks: chunks.length, message_chars: message.length },
            }).catch(() => { /* non-blocking */ });

            const sources = [
                ...(facts.length ? [{ label: `CompliHub knowledge base · ${factsFor} facts` }] : []),
                ...[...new Set(chunks.map((c) => `${c.metadata?.country || '?'} · ${c.metadata?.section || 'General'}`))]
                    .slice(0, 4).map((label) => ({ label })),
            ];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, answer, sources, correlationId }));
        } catch (err) {
            structuredLog('error', 'Assistant chat failed', { correlationId, errorCode: 'ERR_ASSISTANT', severity: 'error', route: '/api/v1/assistant/chat' });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'ASSISTANT_ERROR', message: 'Assistant request failed', correlationId }));
        }
    });
}

// ─── Phase ③: Stripe Checkout for Assistant Pro (12 $/month) ─────────────────
// Inline price_data — no dashboard product setup required. Staging sits behind
// Basic Auth, so Stripe webhooks can't reach us; entitlement is confirmed via
// verify-on-return (the success_url carries the checkout session id) and a
// 24h grace window past current_period_end covers renewals.

export function handleAssistantCheckout(req: IncomingMessage, res: ServerResponse, correlationId: string, identity: CallerIdentity, ip: string): void {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); if (raw.length > 8_000) req.destroy(); });
    req.on('end', async () => {
        res.setHeader('x-correlation-id', correlationId);
        try {
            const stripeKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeKey) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not connected yet', correlationId }));
                return;
            }
            const d = JSON.parse(raw || '{}') as { email?: unknown; return_path?: unknown };
            // JWT identity first; explicit email as staging/demo fallback.
            const bodyEmail = typeof d.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email) ? d.email.toLowerCase() : null;
            const email = identity.email?.toLowerCase() || bodyEmail;
            // Same keying rule as the chat gate: JWT identity, else the caller
            // IP — so a guest checkout unlocks the same guest's chat.
            const userKey = userKeyOf(identity) || `ip:${ip}`;
            const appUrl = (process.env.PUBLIC_APP_URL || 'https://staging.complihub360.com').replace(/\/$/, '');
            const returnPath = typeof d.return_path === 'string' && d.return_path.startsWith('/') && !d.return_path.startsWith('//')
                ? d.return_path : '/en/dashboard';
            const glue = returnPath.includes('?') ? '&' : '?';
            const session = await stripeForm(stripeKey, 'POST', 'checkout/sessions', {
                mode: 'subscription',
                'line_items[0][price_data][currency]': 'usd',
                'line_items[0][price_data][unit_amount]': '1200',
                'line_items[0][price_data][recurring][interval]': 'month',
                'line_items[0][price_data][product_data][name]': 'CompliHub VAT Assistant Pro',
                'line_items[0][quantity]': '1',
                success_url: `${appUrl}${returnPath}${glue}sub=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${appUrl}${returnPath}${glue}sub=cancel`,
                ...(email ? { customer_email: email } : {}),
                'metadata[user_key]': userKey,
                'subscription_data[metadata][user_key]': userKey,
            });
            await supabaseApi.upsert('user_subscriptions', 'user_key', { user_key: userKey, email, status: 'inactive', updated_at: new Date().toISOString() });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, url: session.url, correlationId }));
        } catch (err) {
            structuredLog('error', 'Assistant checkout failed', { correlationId, errorCode: 'ERR_ASSISTANT_CHECKOUT', severity: 'error', route: '/api/v1/assistant/checkout' });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'STRIPE_ERROR', message: 'Stripe request failed', correlationId }));
        }
    });
}

export function handleAssistantVerify(req: IncomingMessage, res: ServerResponse, correlationId: string, identity: CallerIdentity): void {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); if (raw.length > 8_000) req.destroy(); });
    req.on('end', async () => {
        res.setHeader('x-correlation-id', correlationId);
        try {
            const stripeKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeKey) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not connected yet', correlationId }));
                return;
            }
            const d = JSON.parse(raw || '{}') as { session_id?: unknown };
            const sessionId = typeof d.session_id === 'string' && /^cs_[a-zA-Z0-9_]+$/.test(d.session_id) ? d.session_id : null;
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'session_id required', correlationId }));
                return;
            }
            const session = await stripeForm(stripeKey, 'GET', `checkout/sessions/${sessionId}`, { 'expand[]': 'subscription' }) as {
                metadata?: { user_key?: string }; customer?: string; payment_status?: string;
                subscription?: { id: string; status: string; current_period_end?: number; items?: { data?: Array<{ current_period_end?: number }> } } | null;
            };
            // The session's own metadata names the buyer — never trust the caller.
            const userKey = session.metadata?.user_key;
            const sub = session.subscription;
            if (!userKey || !sub) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, active: false, correlationId }));
                return;
            }
            const periodEndSec = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
            const active = ['active', 'trialing'].includes(sub.status);
            await supabaseApi.upsert('user_subscriptions', 'user_key', {
                user_key: userKey,
                stripe_customer_id: session.customer ?? null,
                stripe_subscription_id: sub.id,
                status: sub.status,
                current_period_end: periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null,
                updated_at: new Date().toISOString(),
            });
            await supabaseApi.insert('event_log', { type: 'assistant_subscription_verified', payload: { status: sub.status } }).catch(() => { /* non-blocking */ });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, active, status: sub.status, correlationId }));
        } catch (err) {
            structuredLog('error', 'Assistant verify failed', { correlationId, errorCode: 'ERR_ASSISTANT_VERIFY', severity: 'error', route: '/api/v1/assistant/verify' });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'STRIPE_ERROR', message: 'Stripe request failed', correlationId }));
        }
    });
}
