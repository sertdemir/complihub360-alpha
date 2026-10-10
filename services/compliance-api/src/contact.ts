import { structuredLog } from '@complihub360/types';
import { SLUG_TO_ENGINE } from './dashboard.js';

// ─── Kontakt und Partner-Bewerbung (Beta-Plan Di 13.10.) ─────────────────────
// Entscheidung 2026-10-09: EIN Postfach fuer alle vier Wege der Kontaktseite
// und fuer die Bewerbung von /partner-apply; das Anliegen steht im Betreff.
// Die Zusagen der Seite bleiben stehen — deshalb geht nach dem Eingang eine
// Bestaetigung an den Absender.
//
// Privacy: Die Nachricht ist personenbezogen und gehoert dem Postfach, nicht
// der Datenbank. Kein email_outbox-Protokoll wie bei den anderen Mails; das
// event_log traegt nur Weg, Sprache und Ausgang. Fehlt die Konfiguration,
// antwortet die API 503 — die Seite sagt dann, dass nichts abging, statt
// einen Versand vorzutaeuschen.
//
// Missbrauch: Die Bestaetigung geht an eine Adresse, die jeder eintippen
// kann. Sie wiederholt deshalb weder Name noch Nachricht — sonst waere das
// Formular ein Weg, beliebigen Text an fremde Postfaecher zu schicken.

export const CONTACT_LANES = ['support', 'sales', 'partner', 'privacy', 'application'] as const;
export type ContactLane = (typeof CONTACT_LANES)[number];
type Locale = 'en' | 'de' | 'es' | 'tr';
const LOCALES: readonly Locale[] = ['en', 'de', 'es', 'tr'];

const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const MARKET = /^[A-Z]{2}$/;
const MAX = { name: 120, email: 254, message: 5000, firm: 160, website: 300, credentials: 500, list: 40 } as const;

export type ContactInput = Record<string, unknown>;

export type ContactRequest = {
    lane: ContactLane;
    locale: Locale;
    name: string;
    email: string;
    message: string;
    /** Nur bei lane 'application'. */
    application?: { firm: string; website: string | null; credentials: string; areas: string[]; markets: string[] };
};

export type ContactCheck =
    | { ok: true; request: ContactRequest }
    | { ok: true; trap: true }
    | { ok: false; field: string; message: string };

// Steuerzeichen bewusst als Muster: Name und Firma landen im Betreff.
/* eslint-disable no-control-regex */
const CTRL_LINE = /[\u0000-\u001f\u007f]+/g;
const CTRL_BLOCK = /[\u0000-\u0008\u000b-\u001f\u007f]/g;
/* eslint-enable no-control-regex */

/** Eine Zeile Text ohne Steuerzeichen. */
function line(v: unknown, max: number): string {
    return typeof v === 'string' ? v.replace(CTRL_LINE, ' ').replace(/\s+/g, ' ').trim().slice(0, max + 1) : '';
}
function block(v: unknown, max: number): string {
    return typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(CTRL_BLOCK, '').trim().slice(0, max + 1) : '';
}

/** Rein, ohne I/O. */
export function checkContact(input: ContactInput): ContactCheck {
    // Honeypot: ein Feld, das Menschen nicht sehen. Wer es fuellt, bekommt
    // dieselbe Antwort wie ein Mensch — aber es geht nichts hinaus.
    if (typeof input.hp === 'string' && input.hp.trim() !== '') return { ok: true, trap: true };

    const lane = CONTACT_LANES.includes(input.lane as ContactLane) ? (input.lane as ContactLane) : null;
    if (!lane) return { ok: false, field: 'lane', message: 'unknown lane' };
    const rawLocale = typeof input.locale === 'string' ? input.locale.toLowerCase().slice(0, 2) : '';
    const locale = (LOCALES as readonly string[]).includes(rawLocale) ? (rawLocale as Locale) : 'en';

    const name = line(input.name, MAX.name);
    if (!name || name.length > MAX.name) return { ok: false, field: 'name', message: 'name required (max 120)' };
    const email = line(input.email, MAX.email);
    if (email.length > MAX.email || !EMAIL.test(email)) return { ok: false, field: 'email', message: 'valid email required' };
    const message = block(input.message, MAX.message);
    if (message.length > MAX.message) return { ok: false, field: 'message', message: 'message too long (max 5000)' };

    if (lane !== 'application') {
        if (!message) return { ok: false, field: 'message', message: 'message required' };
        return { ok: true, request: { lane, locale, name, email, message } };
    }

    const firm = line(input.firm, MAX.firm);
    if (!firm || firm.length > MAX.firm) return { ok: false, field: 'firm', message: 'firm required (max 160)' };
    const credentials = block(input.credentials, MAX.credentials);
    if (!credentials || credentials.length > MAX.credentials) return { ok: false, field: 'credentials', message: 'credentials required (max 500)' };
    const websiteRaw = line(input.website, MAX.website);
    if (websiteRaw.length > MAX.website) return { ok: false, field: 'website', message: 'website too long' };
    const areas = Array.isArray(input.areas)
        ? [...new Set(input.areas.filter((a): a is string => typeof a === 'string' && a in SLUG_TO_ENGINE))].slice(0, MAX.list)
        : [];
    if (!areas.length) return { ok: false, field: 'areas', message: 'at least one known area' };
    const markets = Array.isArray(input.markets)
        ? [...new Set(input.markets.filter((m): m is string => typeof m === 'string').map((m) => m.trim().toUpperCase()).filter((m) => MARKET.test(m)))].slice(0, MAX.list)
        : [];
    if (!markets.length) return { ok: false, field: 'markets', message: 'at least one market (ISO code)' };

    return {
        ok: true,
        request: { lane, locale, name, email, message, application: { firm, website: websiteRaw || null, credentials, areas, markets } },
    };
}

// ─── Mails ───────────────────────────────────────────────────────────────────

export type OutgoingMail = { to: string; subject: string; text: string; replyTo?: string };

const INBOX_LABEL: Record<ContactLane, string> = {
    support: 'Assessment',
    sales: 'Preise',
    partner: 'Anbieter',
    privacy: 'Datenschutz',
    application: 'Partner-Bewerbung',
};

/** An das eigene Postfach. Intern, deshalb deutsch und ohne Gestaltung;
 *  Antworten gehen per Reply-To direkt an den Absender. */
export function renderInboxMail(r: ContactRequest, inbox: string, reference: string): OutgoingMail {
    const who = r.application ? `${r.application.firm} · ${r.name}` : r.name;
    const lines = [
        `Anliegen: ${INBOX_LABEL[r.lane]}`,
        `Von: ${r.name} <${r.email}>`,
        `Sprache: ${r.locale}`,
        `Referenz: ${reference}`,
    ];
    if (r.application) {
        const a = r.application;
        lines.push('', `Firma: ${a.firm}`, `Website: ${a.website ?? '—'}`, `Bereiche: ${a.areas.join(', ')}`, `Maerkte: ${a.markets.join(', ')}`, '', 'Zulassung / Qualifikation:', a.credentials);
    }
    if (r.message) lines.push('', 'Nachricht:', r.message);
    lines.push('', '—', 'Antworten geht direkt an den Absender (Reply-To).');
    return { to: inbox, subject: `[${INBOX_LABEL[r.lane]}] ${who}`.slice(0, 200), text: lines.join('\n'), replyTo: r.email };
}

type AckStrings = {
    subject: string;
    subjectApplication: string;
    hello: string;
    intro: string;
    introApplication: string;
    topic: string;
    reference: string;
    lanes: Record<ContactLane, string>;
    next: { quick: string; partner: string; privacy: string; application: string };
    reply: string;
};

// Copy abgenommen 10.10.2026 (Canvas „Kontakt und Bewerbung senden", Board E V1).
// Ansprache wie in allen Produkt-Mails: DE Sie, ES usted, TR siz.
const ACK: Record<Locale, AckStrings> = {
    en: {
        subject: 'We have received your message',
        subjectApplication: 'We have received your application',
        hello: 'Hello,',
        intro: 'thank you — your message has reached us.',
        introApplication: 'thank you — your application has reached us.',
        topic: 'Topic',
        reference: 'Reference',
        lanes: { support: 'Help with the assessment', sales: 'Pricing and plans', partner: 'Getting listed as a provider', privacy: 'Privacy and security', application: 'Partner application' },
        next: {
            quick: 'A person reads and sorts it on the same business day. You get a substantive reply by the next business day. If it takes longer, we send you an interim note.',
            partner: 'A person reads it on the same business day. You get a reply within 3 business days.',
            privacy: 'We answer your request within the deadline under Art. 12 GDPR.',
            application: 'We review every application by hand — credentials, website, coverage. You get a reasoned reply within 3 business days.',
        },
        reply: 'If you want to add something, simply reply to this email.',
    },
    de: {
        subject: 'Ihre Nachricht ist bei uns angekommen',
        subjectApplication: 'Ihre Bewerbung ist bei uns angekommen',
        hello: 'Guten Tag,',
        intro: 'vielen Dank — Ihre Nachricht ist bei uns angekommen.',
        introApplication: 'vielen Dank — Ihre Bewerbung ist bei uns angekommen.',
        topic: 'Anliegen',
        reference: 'Referenz',
        lanes: { support: 'Hilfe beim Assessment', sales: 'Preise und Tarife', partner: 'Als Anbieter gelistet werden', privacy: 'Datenschutz und Sicherheit', application: 'Partner-Bewerbung' },
        next: {
            quick: 'Ein Mensch liest und sortiert sie am selben Werktag. Eine fachliche Antwort erhalten Sie bis zum nächsten Werktag. Dauert es länger, schicken wir Ihnen eine Zwischennachricht.',
            partner: 'Ein Mensch liest sie am selben Werktag. Eine Antwort erhalten Sie innerhalb von 3 Werktagen.',
            privacy: 'Wir beantworten Ihr Anliegen innerhalb der Frist nach Art. 12 DSGVO.',
            application: 'Wir prüfen jede Bewerbung von Hand — Zulassung, Website, Abdeckung. Eine begründete Rückmeldung erhalten Sie innerhalb von 3 Werktagen.',
        },
        reply: 'Möchten Sie etwas ergänzen, antworten Sie einfach auf diese E-Mail.',
    },
    es: {
        subject: 'Hemos recibido su mensaje',
        subjectApplication: 'Hemos recibido su solicitud',
        hello: 'Hola:',
        intro: 'gracias, su mensaje nos ha llegado.',
        introApplication: 'gracias, su solicitud nos ha llegado.',
        topic: 'Asunto',
        reference: 'Referencia',
        lanes: { support: 'Ayuda con la evaluación', sales: 'Precios y planes', partner: 'Aparecer como proveedor', privacy: 'Privacidad y seguridad', application: 'Solicitud de socio' },
        next: {
            quick: 'Una persona lo lee y lo clasifica el mismo día hábil. Recibirá una respuesta de fondo a más tardar el siguiente día hábil. Si tardamos más, le enviaremos un mensaje intermedio.',
            partner: 'Una persona lo lee el mismo día hábil. Recibirá una respuesta en un plazo de 3 días hábiles.',
            privacy: 'Respondemos a su solicitud dentro del plazo del art. 12 del RGPD.',
            application: 'Revisamos cada solicitud a mano: titulación, sitio web, cobertura. Recibirá una respuesta motivada en un plazo de 3 días hábiles.',
        },
        reply: 'Si desea añadir algo, simplemente responda a este correo.',
    },
    tr: {
        subject: 'Mesajınız bize ulaştı',
        subjectApplication: 'Başvurunuz bize ulaştı',
        hello: 'Merhaba,',
        intro: 'teşekkür ederiz, mesajınız bize ulaştı.',
        introApplication: 'teşekkür ederiz, başvurunuz bize ulaştı.',
        topic: 'Konu',
        reference: 'Referans',
        lanes: { support: 'Değerlendirmede yardım', sales: 'Fiyatlar ve planlar', partner: 'Sağlayıcı olarak listelenmek', privacy: 'Gizlilik ve güvenlik', application: 'Partner başvurusu' },
        next: {
            quick: 'Mesajınızı aynı iş günü içinde bir kişi okur ve sınıflandırır. En geç bir sonraki iş günü içerikli bir yanıt alırsınız. Daha uzun sürerse size bir ara bilgi göndeririz.',
            partner: 'Mesajınızı aynı iş günü içinde bir kişi okur. 3 iş günü içinde yanıt alırsınız.',
            privacy: 'Talebinizi GDPR madde 12’de öngörülen süre içinde yanıtlarız.',
            application: 'Her başvuruyu tek tek elle inceliyoruz: yetki belgesi, web sitesi, kapsam. 3 iş günü içinde gerekçeli bir geri bildirim alırsınız.',
        },
        reply: 'Eklemek istediğiniz bir şey varsa bu e-postayı yanıtlamanız yeterli.',
    },
};

/** Eingangsbestaetigung an den Absender. Absichtlich ohne Name und ohne
 *  Nachricht (siehe oben); Antworten landen im Postfach. */
export function renderAckMail(r: ContactRequest, inbox: string, reference: string): OutgoingMail {
    const t = ACK[r.locale];
    const app = r.lane === 'application';
    const next = app ? t.next.application
        : r.lane === 'partner' ? t.next.partner
        : r.lane === 'privacy' ? t.next.privacy
        : t.next.quick;
    const text = [
        t.hello,
        app ? t.introApplication : t.intro,
        '',
        `${t.topic}: ${t.lanes[r.lane]}`,
        `${t.reference}: ${reference}`,
        '',
        next,
        '',
        t.reply,
        '',
        'CompliHub360',
    ].join('\n');
    return { to: r.email, subject: app ? t.subjectApplication : t.subject, text, replyTo: inbox };
}

// ─── Versand ─────────────────────────────────────────────────────────────────

export type SendResult = { ok: boolean; status: number };
export type ContactDeps = {
    inbox: string | null;
    mailFrom: string;
    send: ((mail: OutgoingMail, from: string) => Promise<SendResult>) | null;
    log: (type: string, payload: Record<string, unknown>) => Promise<void>;
};

export type ContactOutcome = { status: number; body: Record<string, unknown> };

/** Resend, wie der uebrige Mailer. `null`, wenn kein Schluessel da ist. */
export function resendSender(apiKey: string | undefined): ContactDeps['send'] {
    if (!apiKey) return null;
    return async (mail, from) => {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, ...(mail.replyTo ? { reply_to: mail.replyTo } : {}) }),
        });
        await res.text().catch(() => '');
        return { ok: res.ok, status: res.status };
    };
}

/** Der ganze Ablauf ohne HTTP: pruefen, ans Postfach, dann die Bestaetigung.
 *  Geht die Nachricht nicht ans Postfach, ist das ein Fehler (502) — sie ist
 *  dann nirgends. Scheitert nur die Bestaetigung, ist die Nachricht trotzdem
 *  da; die Antwort sagt es mit `acknowledged: false`. */
export async function handleContact(input: ContactInput, deps: ContactDeps, reference: string): Promise<ContactOutcome> {
    const check = checkContact(input);
    if (!check.ok) {
        return { status: 400, body: { errorCode: 'VALIDATION_ERROR', field: check.field, message: check.message } };
    }
    if ('trap' in check) {
        await deps.log('contact_trapped', {}).catch(() => {});
        return { status: 200, body: { ok: true, acknowledged: true } };
    }
    const r = check.request;
    if (!deps.inbox || !deps.send) {
        await deps.log('contact_unavailable', { lane: r.lane, inbox: !!deps.inbox, sender: !!deps.send }).catch(() => {});
        return { status: 503, body: { errorCode: 'CONTACT_UNAVAILABLE', message: 'Contact delivery is not configured' } };
    }

    let delivered: SendResult;
    try {
        delivered = await deps.send(renderInboxMail(r, deps.inbox, reference), deps.mailFrom);
    } catch {
        delivered = { ok: false, status: 0 };
    }
    if (!delivered.ok) {
        structuredLog('error', 'Contact delivery failed', { correlationId: reference, route: '/api/v1/contact', severity: 'error', errorCode: 'ERR_CONTACT_SEND' });
        await deps.log('contact_failed', { lane: r.lane, locale: r.locale, status: delivered.status }).catch(() => {});
        return { status: 502, body: { errorCode: 'CONTACT_SEND_FAILED', message: 'The message could not be delivered' } };
    }

    let acknowledged = false;
    try {
        acknowledged = (await deps.send(renderAckMail(r, deps.inbox, reference), deps.mailFrom)).ok;
    } catch {
        acknowledged = false;
    }
    await deps.log('contact_sent', { lane: r.lane, locale: r.locale, acknowledged }).catch(() => {});
    return { status: 200, body: { ok: true, acknowledged } };
}

// ─── Eigenes Limit ───────────────────────────────────────────────────────────
// Das allgemeine IP-Limit (100/min) haelt keinen Formular-Spam auf. Hier:
// fuenf Nachrichten je Adresse in 15 Minuten. Im Speicher, wie das allgemeine.

const WINDOW_MS = 15 * 60 * 1000;
export const CONTACT_LIMIT = 5;
const hits = new Map<string, number[]>();

export function contactRateLimited(ip: string, now = Date.now()): boolean {
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= CONTACT_LIMIT) {
        hits.set(ip, recent);
        return true;
    }
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 10_000) {
        for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
    return false;
}

export function resetContactLimit(): void {
    hits.clear();
}
