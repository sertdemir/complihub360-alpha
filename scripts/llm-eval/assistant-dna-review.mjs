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
//     --api http://localhost:3005 [--api-key <API_KEY des Servers> | --token <JWT>] [--from 6] [--out bericht.md]
//
// Anmeldung: Die Route verlangt einen Nutzer-JWT oder den Server-Schlüssel.
// Lokal am einfachsten: API_KEY=<beliebig> in services/compliance-api/.env
// und denselben Wert als --api-key.
//
// Das Free-Kontingent erlaubt 5 Fragen pro Tag und Identität. Stößt der Bogen
// darauf (402), hält er an und nennt die Frage, ab der es weitergeht: lokalen
// Server neu starten (der Zähler lebt im Speicher), dann mit --from N weiter.
// Jeder Teil bekommt eine eigene Datei. Mit einem Assistant-Pro-Konto
// (--token) läuft der ganze Bogen in einem Durchgang.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return acc;
}, []));
const api = (args.api || 'http://localhost:3005').replace(/\/+$/, '');
const from = Math.max(1, parseInt(args.from || '1', 10) || 1);
const out = args.out || `assistant-dna-review-${new Date().toISOString().slice(0, 10)}${args.only ? '-auswahl' : from > 1 ? `-ab-${String(from).padStart(2, '0')}` : ''}.md`;
const all = JSON.parse(fs.readFileSync(path.join(here, 'questions.json'), 'utf8'));
// --only id1,id2: nur diese Fragen (z. B. eine Nachprüfung innerhalb des Gratis-Kontingents).
const only = args.only ? new Set(String(args.only).split(',').map((x) => x.trim())) : null;
const questions = only ? all.filter((q) => only.has(q.id)) : all.slice(from - 1);

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
    if (q.lang === 'de' && /\b(du|dich|dir|dein\w*)\b/i.test(answer)) h.push('duzt — Produkt-Copy siezt (Regel S1)');
    if (/\b(you must|Sie müssen|du musst|drohen (dir|Ihnen)|so schnell wie möglich|as soon as possible|unverzüglich|immediately)\b/i.test(answer)) h.push('persönliche Anweisung, Drohung oder Dringlichkeit — prüfen (Regel 3, S2, S5)');
    if (/\b(19|20)\d{2}\b/.test(answer) && !/\b2026\b/.test(answer)) h.push('nennt eine Jahreszahl — erfunden? (S4)');
    if (PROFESSION.test(answer)) h.push(`nennt eine Fachperson ("${answer.match(PROFESSION)[0]}") — prüfen, ob als Verweis oder als Selbstbild`);
    if (PANIC.test(answer)) h.push(`Dringlichkeitswort: "${answer.match(PANIC)[0]}" — prüfen auf Druck`);
    const counts = Object.fromEntries(Object.entries(STOP).map(([l, re]) => [l, (answer.match(re) || []).length]));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 2 && top[0] !== q.lang) h.push(`Sprache wirkt wie "${top[0]}", erwartet "${q.lang}"`);
    return h;
}

const headers = {
    'Content-Type': 'application/json',
    ...(args.token ? { Authorization: `Bearer ${args.token}` } : {}),
    ...(args['api-key'] ? { 'x-api-key': args['api-key'] } : {}),
};
const rows = [];
let next = null;
for (const [i, q] of questions.entries()) {
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
    if (status === 402) { next = from + i; break; }
    if (status === 401 && i === 0) {
        console.log('401 — nicht angemeldet. API_KEY=<wert> in services/compliance-api/.env setzen, Server neu starten, dann --api-key <wert> mitgeben.');
        process.exit(1);
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
if (next) {
    console.log(`\nGratis-Grenze erreicht (402). Lokalen Server neu starten (Ctrl+C, npm run dev:service), dann weiter mit:`);
    console.log(`  node scripts/llm-eval/assistant-dna-review.mjs --api ${api}${args['api-key'] ? ' --api-key <dein API_KEY>' : ''} --from ${next}`);
}
