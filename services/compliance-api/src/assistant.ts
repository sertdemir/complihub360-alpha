import { IncomingMessage, ServerResponse } from "http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";
import { stripeRequest } from "./stripe.js";
import { DOMAIN_SLUGS, domainKnowledge, loadDomainSessions } from "./domain.js";
import { jurisdictionChain, resolveFacts } from './jurisdiction.js';
import { resolveLlm, sameEmbedModel, type LlmProvider } from './llm.js';
import { CALM_REWRITE, SHARED_RULES, answerCheck, factLine, figureCheck, leaksPrompt, leakReply, pressureInWorriedReply, ungroundedFigures } from './assistantGuard.js';
import { redactText } from "@complihub360/redaction";

/** P5: was an das Modell geht, ist vorher deterministisch redigiert (Regex-Profile, keine KI). */
const scrub = (text: string): string => redactText(text, { profile: 'strict' }).sanitizedText;

// ─── VAT assistant (chatbot plan phase ②) ─────────────────────────────────────
// RAG over knowledge_chunks (vector 768, match_knowledge_chunks RPC) plus the
// structured jurisdiction_facts table. The model behind both sides comes from
// llm.ts: Scaleway (Mistral Small + Qwen3-Embedding) once LLM_API_KEY is set,
// Gemini only as the transition until then. Returns 503
// ASSISTANT_NOT_CONFIGURED while neither key is set (same pattern as the
// Stripe billing portal). Answers are information, not legal/tax advice
// (RDG/StBerG), and must never reproduce licensed source text verbatim — the
// corpus is internal ground truth only.

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

const SYSTEM_PROMPT = `You are the CompliHub360 compliance assistant for VAT / indirect-tax questions.

Rules — follow ALL of them:
0. You are an AI assistant, not a lawyer, tax adviser or customs specialist. Say so when asked, or when the user treats you as one.
1. Answer ONLY from the CONTEXT block (structured facts + knowledge excerpts). If the context does not cover the question, say so plainly and offer a choice: rephrase or narrow the question, or — where a qualified person is needed — send a request to a verified partner via CompliHub360. Do not present a partner request as the only or the required next step. Never guess.
1b. Separate what the rules clearly require from what depends on interpretation or on the user's facts; for the second kind, say that it depends and on what.
1c. When the context is incomplete or conflicting, give the closest reliable answer and name the gap in one sentence.
1d. If the user is worried or mentions an enforcement letter, a penalty or a missed deadline, stay calm and factual: what applies, what the next step is, where a qualified person helps.
2. Write every answer in YOUR OWN words. Never copy sentences from the context verbatim — the excerpts come from licensed research material and must not be quoted to users.
3. You provide general regulatory information, NOT legal or tax advice. Do not tell the user what they personally should do in binding terms; describe what the rules say.
4. Reply in the language of the user's question (English, German, Spanish or Turkish).
5. Be compact: at most ~180 words. Use short bullet points for lists of obligations, rates or deadlines. State amounts and deadlines precisely.
5a. Output PLAIN TEXT only — the chat window renders no Markdown. Never use **, *, # or backticks; bullets are lines starting with "- ".
6. When the question names a country outside the covered set (DE, UK, NL, FR, IT, ES, US, TR, AT), say that CompliHub360 does not yet cover that country, so you cannot answer for it, and that the user can ask to be notified when it is covered.
7. Penalties are context, not the headline: lead with what applies and by when; mention a penalty only when the user asks or when it changes the priority, and then as one factual sentence.${SHARED_RULES}`;

// Bereichsseite (Canvas 3B, 2026-09-13): die Frage antwortet NUR ueber diesen
// Bereich und die Sitzungen des Nutzers. Der Kontext besteht dann aus dem
// Bereichswissen der Engine und den eigenen Pflichten; der USt-Korpus kommt
// nur beim Bereich Steuern dazu, sonst wuerde er EPR-Fragen mit
// Umsatzsteuer-Auszuegen fuellen.
const DOMAIN_LABEL: Record<string, string> = {
    'tax-vat': 'Tax & VAT', 'product-packaging': 'EPR & Packaging', 'data-privacy': 'Data & Privacy',
    'marketing-seo': 'Marketing Compliance', 'corporate-structure': 'Corporate & Structure',
    'product-compliance': 'Product Compliance', 'logistics-customs': 'Logistics & Customs', 'legal-advisory': 'Legal Advisory', 'environment': 'Environmental Compliance',
};
function domainPrompt(slug: string): string {
    return `You are the CompliHub360 compliance assistant for the area "${DOMAIN_LABEL[slug] ?? slug}".

Rules — follow ALL of them:
0. You are an AI assistant, not a lawyer, tax adviser or customs specialist. Say so when asked, or when the user treats you as one.
1. Answer ONLY from the CONTEXT block: the AREA KNOWLEDGE (the duties this area carries, with statute, penalty and cadence per market), the user's OWN OBLIGATIONS from their saved sessions, and — where present — structured facts and knowledge excerpts. If the context does not cover the question, say so plainly and offer a choice: rephrase or narrow the question, or — where a qualified person is needed — send a request to a verified partner via CompliHub360. Do not present a partner request as the only or the required next step. Never guess and never bring in other areas.
1b. Separate what the rules clearly require from what depends on interpretation or on the user's facts; for the second kind, say that it depends and on what.
1c. When the context is incomplete or conflicting, give the closest reliable answer and name the gap in one sentence.
1d. If the user is worried or mentions an enforcement letter, a penalty or a missed deadline, stay calm and factual: what applies, what the next step is, where a qualified person helps.
2. Relate the answer to the user's own obligations and sessions when they are relevant: name the session and the duty, and its status or deadline as given.
3. Write every answer in YOUR OWN words. Never copy sentences from the context verbatim.
4. You provide general regulatory information, NOT legal or tax advice. Describe what the rules say; do not issue binding personal instructions.
5. Reply in the language of the user's question (English, German, Spanish or Turkish).
6. Be compact: at most ~180 words. Short bullet points for lists. State amounts and deadlines precisely.
6a. Output PLAIN TEXT only — no Markdown; bullets are lines starting with "- ".
7. Where the AREA KNOWLEDGE marks an entry as EU-level without a national source, say that the national text is not on file.
8. Penalties are context, not the headline: lead with what applies and by when; mention a penalty only when the user asks or when it changes the priority, and then as one factual sentence.${SHARED_RULES}`;
}

// Kalibriert am 23.10.2026 mit Qwen3-Embedding-8B auf Staging (12 Prüffragen):
// passende Treffer 0,656–0,761, unpassende 0,567–0,646. 0,6 ist vorläufig.
const MATCH_THRESHOLD = 0.6;
const MATCH_COUNT = 6;

// Ergebnis-Ereignis nach dem Aufruf (Ausgang, Abdeckung, Kalibrierung), ohne
// Frageinhalt. Der Grenzuebertritt selbst ist da schon fail-closed auditiert
// (P2, `assistant_chat` VOR dem ersten Anbieter-Aufruf). Dieses hier bleibt
// nicht-blockierend, aber nie still.
async function logAssistantEvent(payload: Record<string, unknown>, correlationId: string): Promise<void> {
    await supabaseApi.insert('event_log', { type: 'assistant_chat_result', payload }).catch((err: unknown) => {
        structuredLog('warn', 'Assistant result event not written', { correlationId, errorCode: 'ERR_ASSISTANT_AUDIT_RESULT', severity: 'warn', detail: String(err).slice(0, 200) });
    });
}

// Hat der Korpus ueberhaupt Chunks dieses Modells? Nur gefragt, wenn eine
// Suche leer bleibt — dann ist "nichts Passendes" von "falsch oder gar nicht
// eingebettet" zu unterscheiden (z. B. LLM_EMBED_MODEL auf dem Server weicht
// von der Kennung im Ingest ab). Ergebnis je Modell 10 Minuten gemerkt.
const corpusCheck = new Map<string, { has: boolean; at: number }>();
async function corpusHasModel(model: string, vector: number[]): Promise<boolean> {
    const hit = corpusCheck.get(model);
    if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.has;
    const rows = (await supabaseApi.rpc('match_knowledge_chunks', {
        query_embedding: vector, match_threshold: -1, match_count: 1, embed_model: model,
    })) as unknown[];
    const has = Array.isArray(rows) && rows.length > 0;
    corpusCheck.set(model, { has, at: Date.now() });
    return has;
}

export function handleAssistantChat(req: IncomingMessage, res: ServerResponse, correlationId: string, ip: string, identity: CallerIdentity): void {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); if (raw.length > 32_000) req.destroy(); });
    req.on('end', async () => {
        res.setHeader('x-correlation-id', correlationId);
        // Fuer den Fehlerfall: was schon an den Anbieter ging, wird auch dann auditiert.
        let llm: LlmProvider | null = null;
        let audit: Record<string, unknown> | null = null;
        let stage = 'init';
        try {
            llm = resolveLlm();
            if (!llm) {
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
                res.end(JSON.stringify({ errorCode: 'ASSISTANT_UPGRADE_REQUIRED', message: 'You have used today\'s free questions. Assistant Pro raises the daily allowance to 200; the free limit resets tomorrow.', correlationId }));
                return;
            }
            if (pro && used > PRO_DAILY) {
                res.writeHead(429, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'ASSISTANT_QUOTA', message: 'Daily assistant limit reached', correlationId }));
                return;
            }
            const d = JSON.parse(raw || '{}') as { message?: unknown; country?: unknown; history?: unknown; domain?: unknown; session_ids?: unknown };
            const rawMessage = typeof d.message === 'string' ? d.message.trim() : '';
            if (rawMessage.length < 3 || rawMessage.length > 2000) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'message must be 3-2000 characters', correlationId }));
                return;
            }
            const country = typeof d.country === 'string' && SUPPORTED_COUNTRIES.has(d.country.toUpperCase())
                ? d.country.toUpperCase() : null;
            // P5: Frage und Verlauf gehen nur redigiert an das Modell. Die
            // Redaction ist deterministisch (packages/redaction) und derselbe
            // Filter, den Mailer und Nachrichten-Route benutzen.
            const message = scrub(rawMessage);
            const history = Array.isArray(d.history)
                ? (d.history as Array<{ role?: unknown; content?: unknown }>)
                    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
                    .map((m) => ({ role: m.role as string, content: scrub(m.content as string) }))
                : [];

            // Bereichs-Kontext (Bereichsseite): nur fuer angemeldete Nutzer, nur
            // fuer bekannte Slugs. session_ids grenzen weiter ein.
            const domain = typeof d.domain === 'string' && DOMAIN_SLUGS.has(d.domain) ? d.domain : null;
            const sessionIds = Array.isArray(d.session_ids) ? d.session_ids.filter((x): x is string => typeof x === 'string').slice(0, 20) : undefined;
            // P1: antwortet die Datenbank nicht, gibt es KEINEN Kontext — und
            // keine Antwort. Vorher wurde der Fehler zu „keine Sitzungen", und
            // das Modell sagte dem Nutzer selbstsicher, er habe keine Pflichten.
            // DNA: Unsicherheit wird nie hinter sicherer Sprache versteckt.
            let scoped: Awaited<ReturnType<typeof loadDomainSessions>> | null = null;
            if (domain) {
                try {
                    scoped = await loadDomainSessions(identity.userId ?? '', domain, sessionIds);
                } catch (err) {
                    structuredLog('error', 'Assistant: session context unavailable', { correlationId, errorCode: 'ERR_ASSISTANT_CONTEXT', severity: 'error', domain, detail: String(err).slice(0, 200) });
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'ASSISTANT_CONTEXT_UNAVAILABLE', message: 'Your saved sessions could not be loaded right now, so the assistant cannot answer about your obligations. Please try again in a moment.', correlationId }));
                    return;
                }
            }
            const scopedMarkets = scoped
                ? [...new Set(scoped.active.flatMap((s) => [s.country, ...s.markets].filter((m): m is string => !!m)))]
                : [];
            const vatScope = !domain || domain === 'tax-vat';

            // Retrieval: vector search over the corpus + structured facts —
            // der Korpus ist Umsatzsteuer, also nur im USt-Bereich.
            // P2: der Grenzuebertritt zur AI wird VOR dem ersten Anbieter-Aufruf
            // auditiert — schon das Embedding schickt die (redigierte) Frage
            // hinaus. Ohne Nachrichteninhalt; provider/modelle nennen den
            // Unterauftragsverarbeiter. Kann das Audit nicht geschrieben werden,
            // findet kein Aufruf statt: ein Grenzuebertritt ohne Spur ist keiner,
            // den wir machen.
            const requestAudit = {
                domain, message_chars: rawMessage.length, redacted: message !== rawMessage, sessions: scoped?.active.length ?? 0,
                provider: llm.id, model: llm.chatModel, embed_model: llm.embedModel,
            };
            try {
                await supabaseApi.insert('event_log', { type: 'assistant_chat', payload: requestAudit });
            } catch (err) {
                structuredLog('error', 'Assistant: audit write failed — model call refused', { correlationId, errorCode: 'ERR_ASSISTANT_AUDIT', severity: 'error', detail: String(err).slice(0, 200) });
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'ASSISTANT_AUDIT_UNAVAILABLE', message: 'The assistant is briefly unavailable. Please try again in a moment.', correlationId }));
                return;
            }
            audit = requestAudit;
            res.setHeader('x-llm-provider', `${llm.id}:${llm.chatModel}`);

            // Nur Treffer desselben Embedding-Modells wie die Frage — die RPC
            // filtert VOR dem LIMIT (20261018090000). Waehrend der
            // Neu-Einbettung liegen alte und neue Vektoren nebeneinander, und
            // ein Fremdvektor ergibt Zufallsaehnlichkeit. sameEmbedModel bleibt
            // als zweite Sicherung, falls die Migration fehlt.
            let chunks: Array<{ content: string; metadata: { country?: string; section?: string; embed_model?: string } | null; similarity: number }> = [];
            let corpusMissing = false;
            const embedModel = llm.embedModel;
            if (vatScope) {
                stage = 'embed';
                const vector = await llm.embedQuery(country ? `[${country}] ${message}` : message);
                stage = 'retrieve';
                chunks = ((await supabaseApi.rpc('match_knowledge_chunks', {
                    query_embedding: vector, match_threshold: MATCH_THRESHOLD, match_count: MATCH_COUNT, embed_model: llm.embedModel,
                })) as typeof chunks).filter((c) => sameEmbedModel(c.metadata, embedModel));
                if (!chunks.length && !(await corpusHasModel(llm.embedModel, vector))) {
                    corpusMissing = true;
                    structuredLog('warn', 'Assistant corpus has no chunks for the embed model', { correlationId, errorCode: 'ERR_ASSISTANT_CORPUS', severity: 'warn', detail: llm.embedModel });
                }
            }

            // `factsFor` kann seit 20260917000000 eine Region tragen ('US-CA'),
            // nicht nur ein Land. Abgefragt wird weiter ueber `country_code` —
            // die Wurzel der Kette —, damit eine Abfrage alle Ebenen holt;
            // resolveFacts entscheidet dann, welche Zeile je fact_key gilt.
            //
            // Ohne bekannte Region bleiben NUR die Landeszeilen uebrig. Das ist
            // der Punkt: die Zeilen gehen unten als "verified ground truth —
            // prefer these for numbers" in den Kontext, und zwei sich
            // widersprechende Schwellen nebeneinander waeren dort schlimmer als
            // der allgemeine Wert mit seiner Anmerkung.
            const factsFor = vatScope ? (country || scopedMarkets[0] || (chunks[0]?.metadata?.country ?? null)) : null;
            const factsRoot = factsFor ? jurisdictionChain(factsFor)[0] : null;
            const facts = factsRoot
                ? resolveFacts(
                    (await supabaseApi.select('jurisdiction_facts', { country_code: factsRoot }, { limit: 200 })) as
                        Array<{ fact_key: string; value_text: string; notes: string | null; jurisdiction_code?: string | null }>,
                    factsFor as string,
                  )
                : [];

            const contextParts: string[] = [];
            if (domain) {
                const wissen = domainKnowledge(domain, scopedMarkets);
                if (wissen.length) contextParts.push(`AREA KNOWLEDGE · ${DOMAIN_LABEL[domain]} (engine entries; EU-level where marked):\n${wissen.join('\n')}`);
                const eigene = (scoped?.active ?? []).flatMap((s) =>
                    s.obligations.map((o) =>
                        `- [session "${scrub(String(s.label || s.id.slice(0, 8))).slice(0, 60)}" · markets ${[s.country, ...s.markets].filter(Boolean).join(', ') || '—'}] ${o.label}: severity ${o.severity}; status ${o.status}${o.due ? `; cadence/due ${o.due}` : ''}${typeof o.dueDays === 'number' ? ` (in ${o.dueDays} days)` : ''}; markets ${o.markets.length ? o.markets.join(', ') : 'EU-wide'}${o.source ? `; source ${o.source}` : o.sourceScope === 'placeholder' ? '; source: no named statute on file (coverage gap — do not name one)' : ''}`));
                contextParts.push(eigene.length
                    ? `OWN OBLIGATIONS (from the user's saved sessions, this area only):\n${eigene.join('\n')}`
                    : 'OWN OBLIGATIONS: the user has no saved session covering this area yet.');
            }
            if (facts.length) {
                contextParts.push(`STRUCTURED FACTS · ${factsFor} (verified ground truth — prefer these for numbers):\n` +
                    facts.map((f) => factLine(factsFor as string, f.fact_key, f.value_text, f.notes)).join('\n'));
            }
            chunks.forEach((c, i) => {
                contextParts.push(`EXCERPT ${i + 1} · ${c.metadata?.country || '?'} · ${c.metadata?.section || 'General'} (paraphrase, never quote):\n${c.content.slice(0, 1600)}`);
            });
            // Heutiges Datum (S4): sonst erfindet das Modell Fristen aus seinen Trainingsjahren.
            if (contextParts.length === 0) contextParts.push('(no matching context found)');
            contextParts.unshift(`TODAY: ${new Date().toISOString().slice(0, 10)}`);
            const userTurn = `CONTEXT:\n${contextParts.join('\n\n')}\n\nQUESTION:\n${message}\n\n${answerCheck(message)}`;

            stage = 'generate';
            const systemPrompt = domain ? domainPrompt(domain) : SYSTEM_PROMPT;
            let generated = await llm.generate(systemPrompt, history, userTurn);
            // Zwei deterministische Wächter, höchstens EIN zweiter Aufruf:
            // - Druck (DNA: Angst und Dringlichkeit nie als Hebel): besorgter
            //   Nutzer und Dringlichkeit, Drohung oder Strafenliste in der Antwort.
            // - Zahlen: ein Betrag oder Prozentsatz, der nicht im Kontext steht.
            // Bleibt ein Befund, geht die zweite Fassung raus und das Log zeigt es.
            const groundText = [userTurn, ...history.map((h) => h.content)].join('\n');
            const pressure = pressureInWorriedReply(message, generated);
            const figures = ungroundedFigures(generated, groundText);
            let urgencyRewrite: 'none' | 'rewritten' | 'kept' = 'none';
            let figureRewrite: 'none' | 'rewritten' | 'kept' = 'none';
            if (pressure || figures.length) {
                stage = 'generate_rewrite';
                const notes = [pressure ? CALM_REWRITE : '', figures.length ? figureCheck(figures) : ''].filter(Boolean).join('\n\n');
                generated = await llm.generate(systemPrompt, history, `${userTurn}\n\n${notes}`);
                if (pressure) {
                    const still = pressureInWorriedReply(message, generated);
                    urgencyRewrite = still ? 'kept' : 'rewritten';
                    structuredLog('warn', 'Assistant: pressure in a reply to a worried user', {
                        correlationId, errorCode: 'ERR_ASSISTANT_URGENCY', severity: 'warn', detail: `${pressure} → ${still ?? 'rewritten'}`,
                    });
                }
                if (figures.length) {
                    const still = ungroundedFigures(generated, groundText);
                    figureRewrite = still.length ? 'kept' : 'rewritten';
                    structuredLog('warn', 'Assistant: figures not found in the context', {
                        correlationId, errorCode: 'ERR_ASSISTANT_UNGROUNDED', severity: 'warn', detail: `${figures.length} → ${still.length}`,
                    });
                }
            }
            // Deterministischer Leck-Schutz: gibt das Modell seine Anweisungen
            // aus, geht stattdessen eine feste Antwort in der Sprache der Frage.
            const promptLeak = leaksPrompt(generated);
            if (promptLeak) structuredLog('warn', 'Assistant: prompt leak blocked', { correlationId, errorCode: 'ERR_ASSISTANT_PROMPT_LEAK', severity: 'warn' });
            const answer = promptLeak ? leakReply(rawMessage) : generated;

            // Ohne Frageinhalt — Volumen, Abdeckung und Kalibrierung der Schwelle.
            await logAssistantEvent({
                ...audit, outcome: 'ok', prompt_leak_blocked: promptLeak, urgency_rewrite: urgencyRewrite, figure_rewrite: figureRewrite, country: factsFor, chunks: chunks.length, corpus_missing: corpusMissing,
                top_similarity: chunks[0] ? Math.round(chunks[0].similarity * 1000) / 1000 : null,
            }, correlationId);

            const sources = [
                ...(domain ? [{ label: `CompliHub area knowledge · ${DOMAIN_LABEL[domain]}`, kind: 'area', name: DOMAIN_LABEL[domain] }] : []),
                ...(scoped?.active ?? []).slice(0, 3).map((s) => ({ label: `Your session · ${s.label || s.id.slice(0, 8)}`, kind: 'session', name: s.label || s.id.slice(0, 8) })),
                ...(facts.length ? [{ label: `CompliHub knowledge base · ${factsFor} facts` }] : []),
                ...[...new Set(chunks.map((c) => `${c.metadata?.country || '?'} · ${c.metadata?.section || 'General'}`))]
                    .slice(0, 4).map((label) => ({ label })),
            ];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, answer, sources, correlationId }));
        } catch (err) {
            // Ursache ins Log (gekappt, ohne Frage), nach aussen nur die ID.
            structuredLog('error', 'Assistant chat failed', {
                correlationId, errorCode: 'ERR_ASSISTANT', severity: 'error', route: '/api/v1/assistant/chat',
                detail: `${stage}${llm ? ` · ${llm.id}` : ''} · ${String(err).slice(0, 300)}`,
            });
            if (audit) await logAssistantEvent({ ...audit, outcome: 'error', stage }, correlationId);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'ASSISTANT_ERROR', message: 'The assistant could not answer right now. Please try again in a moment.', correlationId }));
        }
    });
}

// ─── Phase ③: Stripe Checkout for Assistant Pro (12 €/month) ─────────────────
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
            const session = await stripeRequest('POST', 'checkout/sessions', {
                mode: 'subscription',
                // EUR to match the rest of the platform (provider billing is EUR).
                'line_items[0][price_data][currency]': 'eur',
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
        } catch {
            structuredLog('error', 'Assistant checkout failed', { correlationId, errorCode: 'ERR_ASSISTANT_CHECKOUT', severity: 'error', route: '/api/v1/assistant/checkout' });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'STRIPE_ERROR', message: 'The payment service did not respond right now. Please try again in a moment.', correlationId }));
        }
    });
}

export function handleAssistantVerify(req: IncomingMessage, res: ServerResponse, correlationId: string, _identity: CallerIdentity): void {
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
            const session = await stripeRequest('GET', `checkout/sessions/${sessionId}`, { 'expand[]': 'subscription' }) as {
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
        } catch {
            structuredLog('error', 'Assistant verify failed', { correlationId, errorCode: 'ERR_ASSISTANT_VERIFY', severity: 'error', route: '/api/v1/assistant/verify' });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'STRIPE_ERROR', message: 'The payment service did not respond right now. Please try again in a moment.', correlationId }));
        }
    });
}
