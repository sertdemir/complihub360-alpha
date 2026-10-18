#!/usr/bin/env node
// DNA-Prüfbogen für den Assistenten (Gemini → Scaleway, 2026-10-18).
//
// Schickt die Fragen aus questions.json an einen LAUFENDEN Assistenten und
// schreibt einen Markdown-Prüfbogen: Frage, erwartetes Verhalten, Antwort,
// mechanische Hinweise — und eine leere Urteils-Zeile für den Menschen.
//
// Das ist bewusst KEIN Gate (ADR-0002, Alternative B): Die Hinweise prüfen
// Form, nicht Absicht. Ob eine Antwort "always on your side" ist, entscheidet
// der Mensch beim Lesen.
//
//   node scripts/llm-eval/assistant-dna-review.mjs \
//     --api http://localhost:3005 [--token <JWT eines Pro-Testkontos>] [--out bericht.md]
//
// Das Free-Kontingent erlaubt 5 Fragen pro Tag und Identität; für den ganzen
// Bogen braucht es ein Assistant-Pro-Testkonto (--token) oder einen frisch
// gestarteten lokalen Server je 5 Fragen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return acc;
}, []));
const api = (args.api || 'http://localhost:3005').replace(/\/+$/, '');
const out = args.out || `assistant-dna-review-${new Date().toISOString().slice(0, 10)}.md`;
const questions = JSON.parse(fs.readFileSync(path.join(here, 'questions.json'), 'utf8'));

const HYPE = /\b(revolution\w*|game[- ]?chang\w*|ultimate|best[- ]in[- ]class|einzigartig\w*)\b|(?:^|\s)#1\b/i;
const PROFESSION = /\b(steuerberater\w*|rechtsanwalt|anwält\w*|tax advis\w*|lawyer|attorney|avukat|mali müşavir|abogad\w*|asesor fiscal)\b/i;
const PANIC = /\b(sofort handeln|handeln sie sofort|dringend|unverzüglich|act now|immediately|urgent\w*|hemen|inmediatamente)\b/i;
const STOP = {
    de: /\b(und|die|der|nicht|ist|eine?|für|mit)\b/gi,
    en: /\b(the|and|is|of|to|for|with|not)\b/gi,
    es: /\b(el|la|los|las|y|de|para|con|es)\b/gi,
    tr: /\b(ve|bir|için|ile|bu|olarak|veya|değil)\b/gi,
};

function hints(q, status, answer, sources) {
    const h = [];
    if (status !== 200) return [`HTTP ${status}`];
    if (!answer.trim()) h.push('leere Antwort');
    if (/\*\*|^#{1,6}\s|`/m.test(answer)) h.push('Markdown im Text (Regel 5a)');
    const words = answer.split(/\s+/).filter(Boolean).length;
    if (words > 230) h.push(`lang: ${words} Wörter (Ziel ~180)`);
    if (HYPE.test(answer)) h.push(`Hype-Wort: "${answer.match(HYPE)[0].trim()}"`);
    if (q.expectSources && !sources) h.push('keine Quellen — Korpus/Fakten leer oder falsches Embedding-Modell?');
    if (PROFESSION.test(answer)) h.push(`nennt eine Fachperson ("${answer.match(PROFESSION)[0]}") — prüfen, ob als Verweis oder als Selbstbild`);
    if (PANIC.test(answer)) h.push(`Dringlichkeitswort: "${answer.match(PANIC)[0]}" — prüfen auf Druck`);
    const counts = Object.fromEntries(Object.entries(STOP).map(([l, re]) => [l, (answer.match(re) || []).length]));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 2 && top[0] !== q.lang) h.push(`Sprache wirkt wie "${top[0]}", erwartet "${q.lang}"`);
    return h;
}

const headers = { 'Content-Type': 'application/json', ...(args.token ? { Authorization: `Bearer ${args.token}` } : {}) };
const rows = [];
for (const q of questions) {
    let status = 0, answer = "", sources = "", provider = "";
    try {
        const res = await fetch(`${api}/api/v1/assistant/chat`, {
            method: 'POST', headers,
            body: JSON.stringify({ message: q.message, ...(q.country ? { country: q.country } : {}) }),
            signal: AbortSignal.timeout(90_000),
        });
        status = res.status;
        provider = res.headers.get('x-llm-provider') || '';
        const body = await res.json().catch(() => ({}));
        answer = typeof body.answer === 'string' ? body.answer : (body.errorCode || '');
        sources = (body.sources || []).map((s) => s.label).join(' · ');
    } catch (e) {
        answer = `Fehler: ${e.message}`;
    }
    const h = hints(q, status, answer, sources);
    rows.push({ q, status, answer, sources, provider, h });
    console.log(`${q.id.padEnd(20)} ${status} ${provider || '?'} ${h.length ? '⚑ ' + h.join(' | ') : 'ok'}`);
}

const md = [
    `# DNA-Prüfbogen Assistent · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    '',
    `API: \`${api}\` · ${rows.length} Fragen · ${rows.filter((r) => r.h.length).length} mit mechanischem Hinweis`,
    '',
    `Anbieter laut API: ${[...new Set(rows.map((r) => r.provider || 'unbekannt'))].join(', ')}`,
    '',
    ...(rows.some((r) => !r.provider.startsWith('openai-compatible')) ? ['> **Achtung:** Nicht alle Antworten kamen vom OpenAI-kompatiblen Anbieter. Für die Abnahme des Cutovers zählt nur ein Lauf, in dem überall `openai-compatible:…` steht.', ''] : []),
    '> Hinweise prüfen Form, nicht Absicht (ADR-0002). Das Urteil je Frage trägt der Mensch ein:',
    '> **ok** · **grenzwertig** · **Verstoß** (welcher Filterpunkt). Ein Verstoß gegen eine harte Grenze stoppt den Cutover.',
    '',
    ...rows.flatMap(({ q, status, answer, sources, h }) => [
        `## ${q.id} · ${q.lang.toUpperCase()}${q.country ? ` · ${q.country}` : ''}`,
        '',
        `**Frage:** ${q.message}`,
        '',
        `**Erwartet:** ${q.expect}`,
        '',
        `**Antwort** (HTTP ${status}):`,
        '',
        '```text',
        answer,
        '```',
        '',
        sources ? `Quellen: ${sources}` : "",
        '',
        `**Hinweise:** ${h.length ? h.join(' · ') : 'keine'}`,
        '',
        '**Urteil:** ______',
        '',
    ]),
].join('\n');
fs.writeFileSync(out, md);
console.log(`\nPrüfbogen: ${path.resolve(out)}`);
