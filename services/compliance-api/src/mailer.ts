import { supabaseApi } from './supabase.js';
import { structuredLog } from '@complihub360/types';
import { redactText } from '@complihub360/redaction';

// ─── Magic-link mailer ────────────────────────────────────────────────────────
// Two modes, decided by env at send time:
//  · RESEND_API_KEY set   → real delivery via Resend's HTTP API
//  · RESEND_API_KEY unset → "outbox log": the fully rendered mail is written to
//    event_log (type email_outbox) so the funnel is demonstrable end-to-end
//    and nothing silently disappears. The admin events feed surfaces it.
// Failures never break engagement creation — the engagement exists either way;
// delivery problems are events, not errors.

const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || 'https://staging.complihub360.com').replace(/\/$/, '');
const MAIL_FROM = process.env.MAIL_FROM || 'CompliHub360 <onboarding@resend.dev>';

// ─── i18n ─────────────────────────────────────────────────────────────────────
// Transactional-mail copy in the four product languages (EN/DE/ES/TR), mirroring
// the app's i18next locales. Conventions: DE = Sie, ES = usted, TR = siz;
// product terms (CompliHub360, Verified Provider, Magic-Link) stay untranslated.
// Unknown / missing locales fall back to 'en'.

type MailLocale = 'en' | 'de' | 'es' | 'tr';

const SUPPORTED_LOCALES: readonly MailLocale[] = ['en', 'de', 'es', 'tr'];

function resolveLocale(locale?: string): MailLocale {
    const base = (locale || 'en').toLowerCase().slice(0, 2) as MailLocale;
    return SUPPORTED_LOCALES.includes(base) ? base : 'en';
}

interface MailStrings {
    magic: {
        // Subjects — "<label> · <country> <category> — <tail>". The reminder
        // variant keeps the "<Reminder> ·" prefix mechanism, localized.
        subjectNewLabel: string;
        subjectNewTail: string;
        reminderLabel: string;
        subjectReminderTail: string;
        // Plain-text body
        textTitle: string;
        textProviderLabel: string;
        textScopeLabel: string;
        textMessageLabel: string;
        textIdentityLine: string;
        textConfirmLabel: string;
        textReplyLabel: string;
        textDeclineLabel: string;
        textOnce: string;
        // HTML body (headline = exactly ONE gold word)
        headlinePre: string;
        headlineGold: string;
        headlinePost: string;
        introPre: string;
        introStrong: string;
        introPost: string;
        dossierLabel: string;
        scopeLabel: string;
        messageLabel: string;
        identityNote: string;
        ctaConfirm: string;
        ctaReply: string;
        ctaDecline: string;
        footOncePre: string;
        footOnceStrong: string;
        footOncePost: string;
        footRanking: string;
        footerTagline: string;
        footerReason: string;
    };
    emailChange: {
        subject: string;
        textIntro: string; // {name} placeholder
        textConfirmLabel: string;
        textOnce: string;
        headlinePre: string;
        headlineGold: string;
        headlinePost: string;
        bodyPre: string; // …<strong>{name}</strong>…
        bodyPost: string;
        cta: string;
        footOncePre: string;
        footOnceStrong: string;
        footOncePost: string;
        footNotYou: string;
    };
}

const STRINGS: Record<MailLocale, MailStrings> = {
    en: {
        magic: {
            subjectNewLabel: 'New request',
            subjectNewTail: 'please confirm within 24h',
            reminderLabel: 'Reminder',
            subjectReminderTail: 'the client is waiting for your confirmation',
            textTitle: 'New engagement request on CompliHub360',
            textProviderLabel: 'Provider',
            textScopeLabel: 'Scope',
            textMessageLabel: 'Message (anonymized)',
            textIdentityLine: 'Requester identity: unlocked after you confirm.',
            textConfirmLabel: 'Confirm (24h SLA)',
            textReplyLabel: 'Reply',
            textDeclineLabel: 'Decline',
            textOnce: 'Each link works exactly once and expires after 24 hours.',
            headlinePre: 'New ',
            headlineGold: 'engagement',
            headlinePost: ' request.',
            introPre: 'A matched client requests your services. Please confirm within ',
            introStrong: '24 hours',
            introPost: '.',
            dossierLabel: 'Anonymized dossier',
            scopeLabel: 'Scope',
            messageLabel: 'Message',
            identityNote: 'Requester identity unlocks after you confirm.',
            ctaConfirm: 'Confirm engagement',
            ctaReply: 'Reply to client',
            ctaDecline: 'Decline',
            footOncePre: 'Each link works ',
            footOnceStrong: 'once',
            footOncePost: ' and expires after 24 hours.',
            footRanking: 'Fast confirmations improve your partner ranking.',
            footerTagline: 'CompliHub360 — the orchestration layer between compliance complexity and operational reality.',
            footerReason: 'You received this e-mail because your firm is a listed provider on complihub360.com.',
        },
        emailChange: {
            subject: 'Confirm your new CompliHub360 contact address',
            textIntro: 'You (or someone in your firm) asked to change the contact address for {name} on CompliHub360 to this e-mail.',
            textConfirmLabel: 'Confirm the change',
            textOnce: "The link works once and expires after 1 hour. If you didn't request this, ignore this e-mail — the current address stays active.",
            headlinePre: 'Confirm your new ',
            headlineGold: 'address',
            headlinePost: '.',
            bodyPre: 'This e-mail becomes the contact address for ',
            bodyPost: ' once you confirm. Until then the current address stays active.',
            cta: 'Confirm new address',
            footOncePre: 'The link works ',
            footOnceStrong: 'once',
            footOncePost: ' and expires after 1 hour.',
            footNotYou: "Didn't request this? Ignore this e-mail.",
        },
    },
    de: {
        magic: {
            subjectNewLabel: 'Neue Anfrage',
            subjectNewTail: 'bitte innerhalb von 24h bestätigen',
            reminderLabel: 'Erinnerung',
            subjectReminderTail: 'der Mandant wartet auf Ihre Bestätigung',
            textTitle: 'Neue Mandatsanfrage auf CompliHub360',
            textProviderLabel: 'Anbieter',
            textScopeLabel: 'Umfang',
            textMessageLabel: 'Nachricht (anonymisiert)',
            textIdentityLine: 'Identität des Anfragenden: wird nach Ihrer Bestätigung freigeschaltet.',
            textConfirmLabel: 'Bestätigen (24h-SLA)',
            textReplyLabel: 'Antworten',
            textDeclineLabel: 'Ablehnen',
            textOnce: 'Jeder Link funktioniert genau einmal und läuft nach 24 Stunden ab.',
            headlinePre: 'Neue ',
            headlineGold: 'Mandatsanfrage',
            headlinePost: '.',
            introPre: 'Ein passender Mandant fragt Ihre Leistungen an. Bitte bestätigen Sie innerhalb von ',
            introStrong: '24 Stunden',
            introPost: '.',
            dossierLabel: 'Anonymisiertes Dossier',
            scopeLabel: 'Umfang',
            messageLabel: 'Nachricht',
            identityNote: 'Die Identität des Anfragenden wird nach Ihrer Bestätigung freigeschaltet.',
            ctaConfirm: 'Anfrage bestätigen',
            ctaReply: 'Dem Mandanten antworten',
            ctaDecline: 'Ablehnen',
            footOncePre: 'Jeder Link funktioniert ',
            footOnceStrong: 'einmal',
            footOncePost: ' und läuft nach 24 Stunden ab.',
            footRanking: 'Schnelle Bestätigungen verbessern Ihr Partner-Ranking.',
            footerTagline: 'CompliHub360 — die Orchestrierungsschicht zwischen Compliance-Komplexität und operativer Realität.',
            footerReason: 'Sie erhalten diese E-Mail, weil Ihre Kanzlei als Anbieter auf complihub360.com gelistet ist.',
        },
        emailChange: {
            subject: 'Bestätigen Sie Ihre neue CompliHub360-Kontaktadresse',
            textIntro: 'Sie (oder jemand aus Ihrer Kanzlei) haben darum gebeten, die Kontaktadresse für {name} auf CompliHub360 auf diese E-Mail-Adresse zu ändern.',
            textConfirmLabel: 'Änderung bestätigen',
            textOnce: 'Der Link funktioniert einmal und läuft nach 1 Stunde ab. Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail — die aktuelle Adresse bleibt aktiv.',
            headlinePre: 'Bestätigen Sie Ihre neue ',
            headlineGold: 'Adresse',
            headlinePost: '.',
            bodyPre: 'Diese E-Mail-Adresse wird nach Ihrer Bestätigung zur Kontaktadresse für ',
            bodyPost: '. Bis dahin bleibt die aktuelle Adresse aktiv.',
            cta: 'Neue Adresse bestätigen',
            footOncePre: 'Der Link funktioniert ',
            footOnceStrong: 'einmal',
            footOncePost: ' und läuft nach 1 Stunde ab.',
            footNotYou: 'Nicht von Ihnen angefordert? Ignorieren Sie diese E-Mail.',
        },
    },
    es: {
        magic: {
            subjectNewLabel: 'Nueva solicitud',
            subjectNewTail: 'le rogamos confirmar en 24h',
            reminderLabel: 'Recordatorio',
            subjectReminderTail: 'el cliente espera su confirmación',
            textTitle: 'Nueva solicitud de mandato en CompliHub360',
            textProviderLabel: 'Proveedor',
            textScopeLabel: 'Alcance',
            textMessageLabel: 'Mensaje (anonimizado)',
            textIdentityLine: 'Identidad del solicitante: se desbloquea después de que usted confirme.',
            textConfirmLabel: 'Confirmar (SLA de 24h)',
            textReplyLabel: 'Responder',
            textDeclineLabel: 'Rechazar',
            textOnce: 'Cada enlace funciona exactamente una vez y caduca a las 24 horas.',
            headlinePre: 'Nueva ',
            headlineGold: 'solicitud',
            headlinePost: ' de mandato.',
            introPre: 'Un cliente compatible solicita sus servicios. Le rogamos confirmar en un plazo de ',
            introStrong: '24 horas',
            introPost: '.',
            dossierLabel: 'Dossier anonimizado',
            scopeLabel: 'Alcance',
            messageLabel: 'Mensaje',
            identityNote: 'La identidad del solicitante se desbloquea después de que usted confirme.',
            ctaConfirm: 'Confirmar la solicitud',
            ctaReply: 'Responder al cliente',
            ctaDecline: 'Rechazar',
            footOncePre: 'Cada enlace funciona ',
            footOnceStrong: 'una sola vez',
            footOncePost: ' y caduca a las 24 horas.',
            footRanking: 'Las confirmaciones rápidas mejoran su posición como partner.',
            footerTagline: 'CompliHub360 — la capa de orquestación entre la complejidad del compliance y la realidad operativa.',
            footerReason: 'Usted recibe este correo porque su firma figura como proveedor en complihub360.com.',
        },
        emailChange: {
            subject: 'Confirme su nueva dirección de contacto de CompliHub360',
            textIntro: 'Usted (o alguien de su firma) solicitó cambiar la dirección de contacto de {name} en CompliHub360 a este correo electrónico.',
            textConfirmLabel: 'Confirmar el cambio',
            textOnce: 'El enlace funciona una sola vez y caduca en 1 hora. Si usted no solicitó este cambio, ignore este correo — la dirección actual permanece activa.',
            headlinePre: 'Confirme su nueva ',
            headlineGold: 'dirección',
            headlinePost: '.',
            bodyPre: 'Este correo se convertirá en la dirección de contacto de ',
            bodyPost: ' una vez que usted confirme. Hasta entonces, la dirección actual permanece activa.',
            cta: 'Confirmar la nueva dirección',
            footOncePre: 'El enlace funciona ',
            footOnceStrong: 'una sola vez',
            footOncePost: ' y caduca en 1 hora.',
            footNotYou: '¿No solicitó este cambio? Ignore este correo.',
        },
    },
    tr: {
        magic: {
            subjectNewLabel: 'Yeni talep',
            subjectNewTail: 'lütfen 24 saat içinde onaylayın',
            reminderLabel: 'Hatırlatma',
            subjectReminderTail: 'müşteri onayınızı bekliyor',
            textTitle: 'CompliHub360 üzerinde yeni müşteri talebi',
            textProviderLabel: 'Sağlayıcı',
            textScopeLabel: 'Kapsam',
            textMessageLabel: 'Mesaj (anonimleştirilmiş)',
            textIdentityLine: 'Talep sahibinin kimliği: onayınızın ardından görünür olur.',
            textConfirmLabel: 'Onayla (24 saat SLA)',
            textReplyLabel: 'Yanıtla',
            textDeclineLabel: 'Reddet',
            textOnce: 'Her bağlantı tam olarak bir kez çalışır ve 24 saat sonra geçerliliğini yitirir.',
            headlinePre: 'Yeni ',
            headlineGold: 'talep',
            headlinePost: ' aldınız.',
            introPre: 'Size uygun bir müşteri hizmetlerinizi talep ediyor. Lütfen ',
            introStrong: '24 saat',
            introPost: ' içinde onaylayın.',
            dossierLabel: 'Anonimleştirilmiş dosya',
            scopeLabel: 'Kapsam',
            messageLabel: 'Mesaj',
            identityNote: 'Talep sahibinin kimliği onayınızın ardından görünür olur.',
            ctaConfirm: 'Talebi onayla',
            ctaReply: 'Müşteriye yanıt ver',
            ctaDecline: 'Reddet',
            footOncePre: 'Her bağlantı yalnızca ',
            footOnceStrong: 'bir kez',
            footOncePost: ' çalışır ve 24 saat sonra geçerliliğini yitirir.',
            footRanking: 'Hızlı onaylar partner sıralamanızı iyileştirir.',
            footerTagline: 'CompliHub360 — uyum karmaşıklığı ile operasyonel gerçeklik arasındaki orkestrasyon katmanı.',
            footerReason: 'Bu e-postayı, firmanız complihub360.com üzerinde listelenmiş bir sağlayıcı olduğu için alıyorsunuz.',
        },
        emailChange: {
            subject: 'Yeni CompliHub360 iletişim adresinizi onaylayın',
            textIntro: 'Siz (veya firmanızdan biri), CompliHub360 üzerindeki {name} iletişim adresinin bu e-posta adresiyle değiştirilmesini talep ettiniz.',
            textConfirmLabel: 'Değişikliği onaylayın',
            textOnce: 'Bağlantı bir kez çalışır ve 1 saat sonra geçerliliğini yitirir. Bu talebi siz oluşturmadıysanız bu e-postayı dikkate almayın — mevcut adres aktif kalır.',
            headlinePre: 'Yeni ',
            headlineGold: 'adresinizi',
            headlinePost: ' onaylayın.',
            bodyPre: 'Onayınızın ardından bu e-posta, ',
            bodyPost: ' için iletişim adresi olur. O zamana kadar mevcut adres aktif kalır.',
            cta: 'Yeni adresi onayla',
            footOncePre: 'Bağlantı yalnızca ',
            footOnceStrong: 'bir kez',
            footOncePost: ' çalışır ve 1 saat sonra geçerliliğini yitirir.',
            footNotYou: 'Bu talebi siz oluşturmadıysanız bu e-postayı dikkate almayın.',
        },
    },
};

export interface MagicLinkMail {
    engagementId: string;
    providerKey: string;
    providerName: string;
    contactEmail: string | null;
    country: string;
    category: string;
    message: string;
    magicLinks: Record<string, string>; // action → "?id=…&token=…"
    correlationId: string;
    /** B14: manual reminder re-send — same mail with fresh links, urgent subject. */
    reminder?: boolean;
    /** Mail language (en/de/es/tr). Unknown or missing → 'en'. */
    locale?: string;
}

function actionUrl(action: string, query: string): string {
    return `${PUBLIC_APP_URL}/en/provider/action${query}&action=${action}`;
}

function renderText(m: MagicLinkMail, t: MailStrings['magic']): string {
    // Anonymized dossier stage (Addendum 2026-07-10): the e-mail carries the
    // REDACTED message only — requester identity never travels via e-mail.
    const redacted = m.message ? redactText(m.message, { profile: 'strict' }).sanitizedText : '—';
    return [
        t.textTitle,
        ``,
        `${t.textProviderLabel}: ${m.providerName}`,
        `${t.textScopeLabel}: ${m.country} · ${m.category}`,
        `${t.textMessageLabel}: ${redacted}`,
        t.textIdentityLine,
        ``,
        `${t.textConfirmLabel}: ${actionUrl('confirm', m.magicLinks.confirm)}`,
        `${t.textReplyLabel}: ${actionUrl('reply', m.magicLinks.reply)}`,
        `${t.textDeclineLabel}: ${actionUrl('decline', m.magicLinks.decline)}`,
        ``,
        t.textOnce,
    ].join('\n');
}

// Branded HTML (same shell as the Supabase auth templates: dark slate card,
// serif headline with ONE gold word, gold primary CTA). Table-based + inline
// styles, no external images — see docs/email-templates/.
//
// EIN Goldwert, #C5913B — der Ton, den die Wortmarke in der "360" traegt.
// Wort UND Knopf. Nutzer-Festlegung 2026-09-20: in der Mail steht die Marke
// fuer sich, und zwei Gelbtoene 200 px auseinander liest man als Fehler, nicht
// als System. Die App trennt weiter (Text Messing, Flaechen gold-500), weil
// dort die goldenen Flaechen in Menge auftreten und eine eigene Sprache haben.
// Gemessen: Knopflabel #101411 auf #C5913B 6,62:1, die Flaeche gegen die
// Karte (#1f2937) 5,23:1 — beides mit Reserve ueber den Schwellen.
function renderHtml(m: MagicLinkMail, t: MailStrings['magic']): string {
    const redacted = m.message ? redactText(m.message, { profile: 'strict' }).sanitizedText : '—';
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const btn = (label: string, url: string, primary: boolean) => primary
        ? `<a href="${url}" style="display:block;background-color:#C5913B;border-radius:12px;padding:14px 24px;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#101411;text-decoration:none;">${label} &rarr;</a>`
        : `<a href="${url}" style="display:inline-block;border:1px solid rgba(255,255,255,0.25);border-radius:10px;padding:10px 18px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;color:#e5e7eb;text-decoration:none;">${label}</a>`;
    // NOTE: Die neue Bildmarke liegt als docs/email-templates/assets/
    // logo-lockup-email.png im Repo (dark-Variante, 390x108 fuer 195x54 @2x,
    // transparenter Grund). Sie muss noch in den Supabase-Bucket unter
    // assets/logo-lockup-email.png hochgeladen werden — bis dahin liefert die
    // URL das alte Logo aus. Danach sind hier keine Aenderungen noetig.
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1620;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="padding:0 8px 24px 8px;"><img src="https://kqylqwogxbiwpnomkzsn.supabase.co/storage/v1/object/public/assets/logo-lockup-email.png" width="207" height="54" alt="CompliHub360 — Always on your side" style="display:block;border:0;"/></td></tr>
<tr><td style="background-color:#1f2937;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px;">
<div style="font-family:Georgia,serif;font-size:26px;line-height:1.25;font-weight:bold;color:#ffffff;">${esc(t.headlinePre)}<span style="color:#C5913B;">${esc(t.headlineGold)}</span>${esc(t.headlinePost)}</div>
<div style="padding-top:12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#aeb8c4;">${esc(t.introPre)}<strong style="color:#ffffff;">${esc(t.introStrong)}</strong>${esc(t.introPost)}</div>
<div style="margin-top:22px;background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px 20px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.8;color:#aeb8c4;">
<span style="font-size:10px;letter-spacing:1.2px;color:#77828f;text-transform:uppercase;">${esc(t.dossierLabel)}</span><br/>
<strong style="color:#e5e7eb;">${esc(t.scopeLabel)}:</strong> ${esc(m.country)} &middot; ${esc(m.category)}<br/>
<strong style="color:#e5e7eb;">${esc(t.messageLabel)}:</strong> <em>&ldquo;${esc(redacted)}&rdquo;</em><br/>
<span style="color:#77828f;">&#128274; ${esc(t.identityNote)}</span>
</div>
<div style="padding-top:24px;">${btn(esc(t.ctaConfirm), actionUrl('confirm', m.magicLinks.confirm), true)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding-top:12px;" align="left">${btn(esc(t.ctaReply), actionUrl('reply', m.magicLinks.reply), false)}</td>
<td style="padding-top:12px;" align="right">${btn(esc(t.ctaDecline), actionUrl('decline', m.magicLinks.decline), false)}</td>
</tr></table>
<div style="margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.08);font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#77828f;">&#128274;&nbsp; ${esc(t.footOncePre)}<strong style="color:#aeb8c4;">${esc(t.footOnceStrong)}</strong>${esc(t.footOncePost)}<br/>&#9200;&nbsp; ${esc(t.footRanking)}</div>
</td></tr>
<tr><td style="padding:24px 8px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#5b6673;">${esc(t.footerTagline)}<br/>${esc(t.footerReason)}</td></tr>
</table></td></tr></table>`;
}

export async function sendMagicLinkMail(m: MagicLinkMail): Promise<void> {
    const t = STRINGS[resolveLocale(m.locale)].magic;
    const subject = m.reminder
        ? `${t.reminderLabel} · ${m.country} ${m.category} — ${t.subjectReminderTail}`
        : `${t.subjectNewLabel} · ${m.country} ${m.category} — ${t.subjectNewTail}`;
    const text = renderText(m, t);
    const apiKey = process.env.RESEND_API_KEY;

    try {
        if (!m.contactEmail) {
            await supabaseApi.insert('event_log', {
                type: 'email_skipped_no_address',
                payload: { engagementId: m.engagementId, providerKey: m.providerKey },
            });
            return;
        }
        if (!apiKey) {
            await supabaseApi.insert('event_log', {
                type: 'email_outbox',
                payload: { engagementId: m.engagementId, to: m.contactEmail, subject, text, mode: 'log-only' },
            });
            structuredLog('info', 'Magic-link mail logged (no RESEND_API_KEY)', {
                correlationId: m.correlationId, route: 'mailer', severity: 'info', errorCode: 'NONE',
            });
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: MAIL_FROM, to: [m.contactEmail], subject, text, html: renderHtml(m, t) }),
        });
        const body = await res.json().catch(() => ({}));
        await supabaseApi.insert('event_log', {
            type: res.ok ? 'email_sent' : 'email_failed',
            payload: { engagementId: m.engagementId, to: m.contactEmail, subject, providerId: (body as { id?: string }).id, status: res.status },
        });
    } catch (err) {
        // Delivery is best-effort; the engagement + tokens already exist.
        structuredLog('error', 'Magic-link mail failed', {
            correlationId: m.correlationId, route: 'mailer', severity: 'error', errorCode: 'ERR_MAIL',
        });
        try {
            await supabaseApi.insert('event_log', {
                type: 'email_failed',
                payload: { engagementId: m.engagementId, to: m.contactEmail, error: String(err) },
            });
        } catch { /* double fault — logged above */ }
    }
}

// ─── B8: e-mail-change verification mail ─────────────────────────────────────
// Sent to the NEW address; the change applies only after the link is clicked.
export async function sendEmailChangeMail(p: {
    providerKey: string;
    providerName: string;
    newEmail: string;
    confirmQuery: string; // "?token=…"
    correlationId: string;
    /** Mail language (en/de/es/tr). Unknown or missing → 'en'. */
    locale?: string;
}): Promise<void> {
    const t = STRINGS[resolveLocale(p.locale)].emailChange;
    const url = `${PUBLIC_APP_URL}/en/provider/confirm-email${p.confirmQuery}`;
    const subject = t.subject;
    const text = [
        t.textIntro.replace('{name}', p.providerName),
        ``,
        `${t.textConfirmLabel}: ${url}`,
        ``,
        t.textOnce,
    ].join('\n');
    const escE = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1620;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="padding:0 8px 24px 8px;"><img src="https://kqylqwogxbiwpnomkzsn.supabase.co/storage/v1/object/public/assets/logo-lockup-email.png" width="207" height="54" alt="CompliHub360" style="display:block;border:0;"/></td></tr>
<tr><td style="background-color:#1f2937;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px;">
<div style="font-family:Georgia,serif;font-size:26px;line-height:1.25;font-weight:bold;color:#ffffff;">${escE(t.headlinePre)}<span style="color:#C5913B;">${escE(t.headlineGold)}</span>${escE(t.headlinePost)}</div>
<div style="padding-top:12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#aeb8c4;">${escE(t.bodyPre)}<strong style="color:#ffffff;">${escE(p.providerName)}</strong>${escE(t.bodyPost)}</div>
<div style="padding-top:24px;"><a href="${url}" style="display:block;background-color:#C5913B;border-radius:12px;padding:14px 24px;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#101411;text-decoration:none;">${escE(t.cta)} &rarr;</a></div>
<div style="margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.08);font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#77828f;">&#128274;&nbsp; ${escE(t.footOncePre)}<strong style="color:#aeb8c4;">${escE(t.footOnceStrong)}</strong>${escE(t.footOncePost)}<br/>${escE(t.footNotYou)}</div>
</td></tr>
</table></td></tr></table>`;
    const apiKey = process.env.RESEND_API_KEY;
    try {
        if (!apiKey) {
            await supabaseApi.insert('event_log', {
                type: 'email_outbox',
                payload: { providerKey: p.providerKey, to: p.newEmail, subject, text, mode: 'log-only' },
            });
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: MAIL_FROM, to: [p.newEmail], subject, text, html }),
        });
        const body = await res.json().catch(() => ({}));
        await supabaseApi.insert('event_log', {
            type: res.ok ? 'email_sent' : 'email_failed',
            payload: { providerKey: p.providerKey, to: p.newEmail, subject, providerId: (body as { id?: string }).id, status: res.status },
        });
    } catch {
        structuredLog('error', 'Email-change mail failed', {
            correlationId: p.correlationId, route: 'mailer', severity: 'error', errorCode: 'ERR_MAIL',
        });
    }
}

// ─── Review-watchdog mails (decision 2026-08-06) ─────────────────────────────
// After a completed meeting both sides are asked to review within 2 days.
// Provider reviews are required (ranking depends on them): no review after
// 2 days → one reminder → after 2 more days partner status "downgraded" +
// reduced visibility. User reviews are incentivized, never enforced.
// Voice (DNA, KN-BRAND-001): state the rule and the consequence, no threat
// tone, no capitals; formal address (Sie/usted/siz) like the other mails.

export type ReviewMailKind = 'request_user' | 'request_provider' | 'warning_provider' | 'downgraded_provider';

const REVIEW_STRINGS: Record<MailLocale, Record<ReviewMailKind, { subject: string; body: string }>> = {
    en: {
        request_user: {
            subject: 'How was your appointment? 2 minutes for your review',
            body: 'Your intro call has taken place. Rate your specialist within the next 2 days — your feedback personalises your matching, helps us react faster to problems and improves your service. Reviews are verified and appear anonymised.\n\n→ Dashboard → Appointments → "Rate provider"',
        },
        request_provider: {
            subject: 'Please review your lead within 2 days',
            body: 'Your booked appointment has taken place. Please rate this lead within the next 2 days. Lead reviews are part of the CompliHub360 partnership: they feed the ranking that brings users and providers together. If no review has been submitted after 2 days, we send one reminder; if it is still missing after another 2 days, the partner status is set to "downgraded" and visibility in matchings is reduced.\n\n→ Partner dashboard → Appointments → open dossier → "Rate this lead"',
        },
        warning_provider: {
            subject: 'Reminder: lead review still outstanding',
            body: 'The review for your lead has not been submitted yet; the 2-day window after the appointment has passed. Under the partnership rules, the partner status is set to "downgraded" if the review is still missing after 2 more days, and visibility in user matchings is then reduced. Submitting the review closes the matter.\n\n→ Partner dashboard → Appointments → open dossier → "Rate this lead"',
        },
        downgraded_provider: {
            subject: 'Partner status changed: lead review outstanding',
            body: 'The review for your lead was not submitted within the 4-day window. As set out in the partnership rules, your partner status is now "downgraded" and your visibility in user matchings is reduced. To restore your status, submit the outstanding review and write to partners@complihub360.com — we take care of the rest.',
        },
    },
    de: {
        request_user: {
            subject: 'Wie war Ihr Termin? 2 Minuten für Ihre Bewertung',
            body: 'Ihr Erstgespräch hat stattgefunden. Bewerten Sie Ihren Spezialisten innerhalb der nächsten 2 Tage — Ihr Feedback personalisiert Ihr Matching, hilft uns, schneller auf Probleme zu reagieren, und verbessert Ihren Service. Bewertungen sind verifiziert und erscheinen anonymisiert.\n\n→ Dashboard → Termine → „Provider bewerten"',
        },
        request_provider: {
            subject: 'Bitte bewerten Sie Ihren Lead innerhalb von 2 Tagen',
            body: 'Ihr gebuchter Termin hat stattgefunden. Bitte bewerten Sie diesen Lead innerhalb der nächsten 2 Tage. Lead-Bewertungen sind Teil der CompliHub360-Partnerschaft: Sie fließen in das Ranking ein, über das User und Provider zusammenfinden. Liegt nach 2 Tagen keine Bewertung vor, erinnern wir Sie einmal; fehlt sie nach weiteren 2 Tagen weiterhin, wird der Partner-Status auf „herabgestuft" gesetzt und die Sichtbarkeit in Matchings reduziert.\n\n→ Partner-Dashboard → Termine → Dossier öffnen → „Lead bewerten"',
        },
        warning_provider: {
            subject: 'Erinnerung: Lead-Bewertung steht noch aus',
            body: 'Die Bewertung für Ihren Lead liegt noch nicht vor; die Frist von 2 Tagen nach dem Termin ist abgelaufen. Nach den Partnerschaftsregeln wird der Partner-Status auf „herabgestuft" gesetzt, wenn die Bewertung nach weiteren 2 Tagen noch fehlt; die Sichtbarkeit in User-Matchings ist dann reduziert. Mit der Bewertung ist die Sache erledigt.\n\n→ Partner-Dashboard → Termine → Dossier öffnen → „Lead bewerten"',
        },
        downgraded_provider: {
            subject: 'Partner-Status geändert: Lead-Bewertung ausstehend',
            body: 'Die Bewertung für Ihren Lead wurde innerhalb der 4-Tage-Frist nicht abgegeben. Wie in den Partnerschaftsregeln festgelegt, ist Ihr Partner-Status jetzt „herabgestuft" und Ihre Sichtbarkeit in User-Matchings reduziert. Um den Status wiederherzustellen, reichen Sie die ausstehende Bewertung nach und schreiben Sie an partners@complihub360.com — wir kümmern uns um den Rest.',
        },
    },
    es: {
        request_user: {
            subject: '¿Qué tal su cita? 2 minutos para su valoración',
            body: 'Su llamada inicial ha tenido lugar. Valore a su especialista en los próximos 2 días — su feedback personaliza su matching, nos ayuda a reaccionar más rápido ante problemas y mejora su servicio. Las valoraciones son verificadas y aparecen anonimizadas.\n\n→ Dashboard → Citas → «Valorar proveedor»',
        },
        request_provider: {
            subject: 'Valore su lead en un plazo de 2 días',
            body: 'Su cita reservada ha tenido lugar. Valore este lead en los próximos 2 días. Las valoraciones de leads forman parte de la colaboración con CompliHub360: alimentan el ranking que conecta a usuarios y proveedores. Si tras 2 días no hay valoración, le enviamos un recordatorio; si sigue faltando tras otros 2 días, el estado de partner pasa a «degradado» y la visibilidad en los matchings se reduce.\n\n→ Panel de partner → Citas → abrir dossier → «Valorar este lead»',
        },
        warning_provider: {
            subject: 'Recordatorio: valoración del lead pendiente',
            body: 'La valoración de su lead aún no se ha enviado; el plazo de 2 días tras la cita ha vencido. Según las reglas de la colaboración, el estado de partner pasa a «degradado» si la valoración sigue faltando tras otros 2 días, y la visibilidad en los matchings queda entonces reducida. Con la valoración el asunto queda cerrado.\n\n→ Panel de partner → Citas → abrir dossier → «Valorar este lead»',
        },
        downgraded_provider: {
            subject: 'Estado de partner modificado: valoración del lead pendiente',
            body: 'La valoración de su lead no se envió dentro del plazo de 4 días. Tal como establecen las reglas de la colaboración, su estado de partner es ahora «degradado» y su visibilidad en los matchings está reducida. Para restaurar su estado, envíe la valoración pendiente y escriba a partners@complihub360.com — nosotros nos ocupamos del resto.',
        },
    },
    tr: {
        request_user: {
            subject: 'Randevunuz nasıldı? Değerlendirmeniz için 2 dakika',
            body: 'İlk görüşmeniz gerçekleşti. Uzmanınızı önümüzdeki 2 gün içinde değerlendirin — geri bildiriminiz eşleştirmenizi kişiselleştirir, sorunlara daha hızlı tepki vermemize yardımcı olur ve hizmetinizi iyileştirir. Değerlendirmeler doğrulanır ve anonim görünür.\n\n→ Panel → Randevular → «Sağlayıcıyı değerlendir»',
        },
        request_provider: {
            subject: 'Lütfen lead\'inizi 2 gün içinde değerlendirin',
            body: 'Rezerve ettiğiniz randevu gerçekleşti. Lütfen bu lead\'i önümüzdeki 2 gün içinde değerlendirin. Lead değerlendirmeleri CompliHub360 partnerliğinin bir parçasıdır: kullanıcılarla sağlayıcıları bir araya getiren sıralamaya katkı sağlar. 2 gün sonra değerlendirme yoksa size bir hatırlatma göndeririz; 2 gün daha geçtikten sonra hâlâ eksikse partner statüsü «düşürüldü» olarak ayarlanır ve eşleştirmelerdeki görünürlük azaltılır.\n\n→ Partner paneli → Randevular → dosyayı aç → «Bu lead\'i değerlendir»',
        },
        warning_provider: {
            subject: 'Hatırlatma: lead değerlendirmesi bekliyor',
            body: 'Lead\'inizin değerlendirmesi henüz gönderilmedi; randevudan sonraki 2 günlük süre doldu. Partnerlik kurallarına göre, değerlendirme 2 gün daha eksik kalırsa partner statüsü «düşürüldü» olarak ayarlanır ve eşleştirmelerdeki görünürlük o zaman azaltılır. Değerlendirmeyi gönderdiğinizde konu kapanır.\n\n→ Partner paneli → Randevular → dosyayı aç → «Bu lead\'i değerlendir»',
        },
        downgraded_provider: {
            subject: 'Partner statüsü değişti: lead değerlendirmesi bekliyor',
            body: 'Lead\'inizin değerlendirmesi 4 günlük süre içinde gönderilmedi. Partnerlik kurallarında belirtildiği gibi partner statünüz artık «düşürüldü» ve eşleştirmelerdeki görünürlüğünüz azaltıldı. Statünüzü geri almak için bekleyen değerlendirmeyi gönderin ve partners@complihub360.com adresine yazın — gerisini biz hallederiz.',
        },
    },
};

// ─── Reschedule notification (user moved a confirmed booking) ────────────────
// Text-only transactional mail to the provider: same lead, new slot. The user
// acted in the dashboard; the provider's calendar must not silently drift.

const RESCHEDULE_STRINGS: Record<MailLocale, { subject: string; intro: string; fromLabel: string; toLabel: string; note: string }> = {
    en: {
        subject: 'Appointment moved: your CompliHub360 booking has a new time',
        intro: 'The client has moved the booked intro call to a new slot. The booking and the shared dossier stay unchanged.',
        fromLabel: 'Previous time',
        toLabel: 'New time',
        note: 'No action needed — the appointment is confirmed for the new time. You can see all bookings in your partner dashboard under Appointments.',
    },
    de: {
        subject: 'Termin verschoben: Ihre CompliHub360-Buchung hat eine neue Zeit',
        intro: 'Der Mandant hat das gebuchte Erstgespräch auf einen neuen Slot verschoben. Buchung und geteiltes Dossier bleiben unverändert.',
        fromLabel: 'Bisherige Zeit',
        toLabel: 'Neue Zeit',
        note: 'Keine Aktion nötig — der Termin ist für die neue Zeit bestätigt. Alle Buchungen finden Sie im Partner-Dashboard unter Termine.',
    },
    es: {
        subject: 'Cita movida: su reserva de CompliHub360 tiene una nueva hora',
        intro: 'El cliente ha movido la llamada inicial reservada a un nuevo horario. La reserva y el dossier compartido permanecen sin cambios.',
        fromLabel: 'Hora anterior',
        toLabel: 'Nueva hora',
        note: 'No se requiere ninguna acción — la cita está confirmada para la nueva hora. Puede ver todas las reservas en su panel de partner, en Citas.',
    },
    tr: {
        subject: 'Randevu taşındı: CompliHub360 rezervasyonunuzun yeni bir saati var',
        intro: 'Müşteri, rezerve edilen ilk görüşmeyi yeni bir zamana taşıdı. Rezervasyon ve paylaşılan dosya değişmeden kalır.',
        fromLabel: 'Önceki saat',
        toLabel: 'Yeni saat',
        note: 'İşlem gerekmez — randevu yeni saat için onaylandı. Tüm rezervasyonları partner panelindeki Randevular bölümünde görebilirsiniz.',
    },
};

const CANCELLATION_STRINGS: Record<MailLocale, { subject: string; intro: string; whenLabel: string; note: string }> = {
    en: {
        subject: 'Appointment cancelled: your CompliHub360 booking will not take place',
        intro: 'The client has cancelled the booked intro call. The slot is free again — please remove it from your calendar.',
        whenLabel: 'Cancelled slot',
        note: 'The lead fee was charged at booking and is not affected. You can see all bookings in your partner dashboard under Appointments.',
    },
    de: {
        subject: 'Termin abgesagt: Ihre CompliHub360-Buchung findet nicht statt',
        intro: 'Der Mandant hat das gebuchte Erstgespräch abgesagt. Der Slot ist wieder frei — bitte streichen Sie ihn aus Ihrem Kalender.',
        whenLabel: 'Abgesagter Termin',
        note: 'Die Lead-Gebühr fiel bei der Buchung an und ist davon nicht berührt. Alle Buchungen finden Sie im Partner-Dashboard unter Termine.',
    },
    es: {
        subject: 'Cita cancelada: su reserva de CompliHub360 no se celebrará',
        intro: 'El cliente ha cancelado la llamada inicial reservada. El horario vuelve a estar libre — elimínelo de su calendario.',
        whenLabel: 'Cita cancelada',
        note: 'La tarifa de lead se cobró en el momento de la reserva y no se ve afectada. Puede ver todas las reservas en su panel de partner, en Citas.',
    },
    tr: {
        subject: 'Randevu iptal edildi: CompliHub360 rezervasyonunuz gerçekleşmeyecek',
        intro: 'Müşteri, rezerve edilen ilk görüşmeyi iptal etti. Zaman dilimi yeniden boşta — lütfen takviminizden kaldırın.',
        whenLabel: 'İptal edilen randevu',
        note: 'Lead ücreti rezervasyon sırasında tahsil edildi ve bundan etkilenmez. Tüm rezervasyonları partner panelindeki Randevular bölümünde görebilirsiniz.',
    },
};

/**
 * Absage an den Anbieter.
 *
 * Warum es sie gibt: der Verschieben-Pfad mailte, der Storno-Pfad nicht. Ein
 * Anbieter behielt den Termin im Kalender und erfuhr nichts — bis er zum
 * Video-Call erschien. Gleiche Bauweise wie sendRescheduleMail: ohne Adresse
 * ein `email_skipped_no_address`, ohne Resend-Schluessel ein `email_outbox`,
 * sonst der Versand samt Quittung im Protokoll.
 */
export async function sendCancellationMail(p: {
    to: string | null;
    bookingId: string;
    providerKey: string;
    slotIso: string;
    locale?: string;
    correlationId?: string;
}): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = CANCELLATION_STRINGS[loc];
    const fmt = new Intl.DateTimeFormat(loc, {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin', timeZoneName: 'short',
    });
    const text = [t.intro, ``, `${t.whenLabel}: ${fmt.format(new Date(p.slotIso))}`, ``, t.note].join('\n');
    const apiKey = process.env.RESEND_API_KEY;
    try {
        if (!p.to) {
            await supabaseApi.insert('event_log', {
                type: 'email_skipped_no_address',
                payload: { bookingId: p.bookingId, providerKey: p.providerKey, kind: 'cancellation_provider' },
            });
            return;
        }
        if (!apiKey) {
            await supabaseApi.insert('event_log', {
                type: 'email_outbox',
                payload: { bookingId: p.bookingId, to: p.to, subject: t.subject, text, mode: 'log-only', kind: 'cancellation_provider' },
            });
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: MAIL_FROM, to: [p.to], subject: t.subject, text }),
        });
        const body = await res.json().catch(() => ({}));
        await supabaseApi.insert('event_log', {
            type: res.ok ? 'email_sent' : 'email_failed',
            payload: { bookingId: p.bookingId, to: p.to, subject: t.subject, providerId: (body as { id?: string }).id, status: res.status, kind: 'cancellation_provider' },
        });
    } catch (err) {
        structuredLog('error', 'Cancellation mail failed', {
            correlationId: p.correlationId ?? 'scheduling', route: 'mailer', severity: 'error', errorCode: 'ERR_MAIL',
        });
        try {
            await supabaseApi.insert('event_log', { type: 'email_failed', payload: { bookingId: p.bookingId, to: p.to, error: String(err), kind: 'cancellation_provider' } });
        } catch { /* double fault */ }
    }
}

export async function sendRescheduleMail(p: {
    to: string | null;
    bookingId: string;
    providerKey: string;
    fromIso: string;
    toIso: string;
    locale?: string;
    correlationId?: string;
}): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = RESCHEDULE_STRINGS[loc];
    // Slots are stored as UTC instants; render them in the product's home
    // timezone with an explicit zone label so nothing is ambiguous.
    const fmt = new Intl.DateTimeFormat(loc, {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin', timeZoneName: 'short',
    });
    const text = [
        t.intro,
        ``,
        `${t.fromLabel}: ${fmt.format(new Date(p.fromIso))}`,
        `${t.toLabel}:   ${fmt.format(new Date(p.toIso))}`,
        ``,
        t.note,
    ].join('\n');
    const apiKey = process.env.RESEND_API_KEY;
    try {
        if (!p.to) {
            await supabaseApi.insert('event_log', {
                type: 'email_skipped_no_address',
                payload: { bookingId: p.bookingId, providerKey: p.providerKey, kind: 'reschedule_provider' },
            });
            return;
        }
        if (!apiKey) {
            await supabaseApi.insert('event_log', {
                type: 'email_outbox',
                payload: { bookingId: p.bookingId, to: p.to, subject: t.subject, text, mode: 'log-only', kind: 'reschedule_provider' },
            });
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: MAIL_FROM, to: [p.to], subject: t.subject, text }),
        });
        const body = await res.json().catch(() => ({}));
        await supabaseApi.insert('event_log', {
            type: res.ok ? 'email_sent' : 'email_failed',
            payload: { bookingId: p.bookingId, to: p.to, subject: t.subject, providerId: (body as { id?: string }).id, status: res.status, kind: 'reschedule_provider' },
        });
    } catch (err) {
        structuredLog('error', 'Reschedule mail failed', {
            correlationId: p.correlationId ?? 'scheduling', route: 'mailer', severity: 'error', errorCode: 'ERR_MAIL',
        });
        try {
            await supabaseApi.insert('event_log', { type: 'email_failed', payload: { bookingId: p.bookingId, to: p.to, error: String(err), kind: 'reschedule_provider' } });
        } catch { /* double fault */ }
    }
}

export async function sendReviewMail(p: {
    kind: ReviewMailKind;
    to: string | null;
    bookingId: string;
    providerKey: string;
    locale?: string;
    correlationId?: string;
}): Promise<void> {
    const t = REVIEW_STRINGS[resolveLocale(p.locale)][p.kind];
    const apiKey = process.env.RESEND_API_KEY;
    try {
        if (!p.to) {
            await supabaseApi.insert('event_log', {
                type: 'email_skipped_no_address',
                payload: { bookingId: p.bookingId, providerKey: p.providerKey, kind: p.kind },
            });
            return;
        }
        if (!apiKey) {
            await supabaseApi.insert('event_log', {
                type: 'email_outbox',
                payload: { bookingId: p.bookingId, to: p.to, subject: t.subject, text: t.body, mode: 'log-only', kind: p.kind },
            });
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: MAIL_FROM, to: [p.to], subject: t.subject, text: t.body }),
        });
        const body = await res.json().catch(() => ({}));
        await supabaseApi.insert('event_log', {
            type: res.ok ? 'email_sent' : 'email_failed',
            payload: { bookingId: p.bookingId, to: p.to, subject: t.subject, providerId: (body as { id?: string }).id, status: res.status, kind: p.kind },
        });
    } catch (err) {
        structuredLog('error', 'Review mail failed', {
            correlationId: p.correlationId ?? 'watchers', route: 'mailer', severity: 'error', errorCode: 'ERR_MAIL',
        });
        try {
            await supabaseApi.insert('event_log', { type: 'email_failed', payload: { bookingId: p.bookingId, to: p.to, error: String(err), kind: p.kind } });
        } catch { /* double fault */ }
    }
}

// ─── Verifikation (Phase 2 Onboarding) ───────────────────────────────────────
// Zwei Anlaesse, an denen ein Anbieter eine Mail bekommt: der Reviewer braucht
// einen weiteren Nachweis, und das Konto ist aktiv. Beides sachlich, ohne
// Frist im Betreff, ohne Drohung: was fehlt, steht im Dashboard, und ein
// Mensch antwortet auf die Mail. Produkt-Copy siezt (DE), usted (ES), siz (TR).

export type VerificationMailKind = 'info_requested' | 'activated';

const VERIFICATION_STRINGS: Record<MailLocale, Record<VerificationMailKind, { subject: string; body: string }>> = {
    en: {
        info_requested: {
            subject: 'One more document for your CompliHub360 verification',
            body: 'Thank you for your application. To complete the verification, our review team has asked for one more piece of evidence.\n\nYou can see exactly what is needed, and upload it, in your dashboard under Verification. Your application keeps its place in the queue while you do.\n\nIf anything is unclear, reply to this email — a person will answer.\n\n→ Partner dashboard → Verification',
        },
        activated: {
            subject: 'Your CompliHub360 provider account is active',
            body: 'Your verification is complete. Your approved services are now visible to businesses in the markets you were approved for.\n\nWhich services and countries are approved, and any that are still open, you can see in your dashboard under Verification.\n\nThank you for your trust.\n\n→ Partner dashboard → Verification',
        },
    },
    de: {
        info_requested: {
            subject: 'Ein weiterer Nachweis für Ihre CompliHub360-Verifizierung',
            body: 'Vielen Dank für Ihre Bewerbung. Um die Verifizierung abzuschließen, hat unser Prüfteam einen weiteren Nachweis angefordert.\n\nWas genau benötigt wird, sehen Sie in Ihrem Dashboard unter Verifizierung — dort können Sie den Nachweis auch direkt hochladen. Ihre Bewerbung behält währenddessen ihren Platz in der Prüfung.\n\nWenn etwas unklar ist, antworten Sie einfach auf diese E-Mail — ein Mensch antwortet Ihnen.\n\n→ Partner-Dashboard → Verifizierung',
        },
        activated: {
            subject: 'Ihr CompliHub360-Anbieterkonto ist aktiv',
            body: 'Ihre Verifizierung ist abgeschlossen. Ihre freigegebenen Leistungen sind ab jetzt für Unternehmen in den freigegebenen Märkten sichtbar.\n\nWelche Leistungen und Länder freigegeben sind und welche noch offen sind, sehen Sie in Ihrem Dashboard unter Verifizierung.\n\nVielen Dank für Ihr Vertrauen.\n\n→ Partner-Dashboard → Verifizierung',
        },
    },
    es: {
        info_requested: {
            subject: 'Un documento más para su verificación en CompliHub360',
            body: 'Gracias por su solicitud. Para completar la verificación, nuestro equipo de revisión ha pedido un justificante adicional.\n\nPuede ver exactamente qué se necesita, y subirlo, en su panel en Verificación. Su solicitud mantiene su lugar en la cola mientras tanto.\n\nSi algo no está claro, responda a este correo — le contestará una persona.\n\n→ Panel de socio → Verificación',
        },
        activated: {
            subject: 'Su cuenta de proveedor en CompliHub360 está activa',
            body: 'Su verificación se ha completado. Sus servicios aprobados ya son visibles para las empresas en los mercados aprobados.\n\nQué servicios y países están aprobados, y cuáles siguen abiertos, lo puede ver en su panel en Verificación.\n\nGracias por su confianza.\n\n→ Panel de socio → Verificación',
        },
    },
    tr: {
        info_requested: {
            subject: 'CompliHub360 doğrulamanız için bir belge daha',
            body: 'Başvurunuz için teşekkür ederiz. Doğrulamayı tamamlamak için inceleme ekibimiz bir belge daha talep etti.\n\nTam olarak neyin gerekli olduğunu panelinizde Doğrulama bölümünde görebilir ve belgeyi oradan yükleyebilirsiniz. Bu sırada başvurunuz sıradaki yerini korur.\n\nBir şey net değilse bu e-postayı yanıtlayın — size bir insan cevap verir.\n\n→ Partner paneli → Doğrulama',
        },
        activated: {
            subject: 'CompliHub360 sağlayıcı hesabınız aktif',
            body: 'Doğrulamanız tamamlandı. Onaylanan hizmetleriniz artık onaylandığınız pazarlardaki işletmeler tarafından görülebilir.\n\nHangi hizmet ve ülkelerin onaylandığını ve hangilerinin hâlâ açık olduğunu panelinizde Doğrulama bölümünde görebilirsiniz.\n\nGüveniniz için teşekkür ederiz.\n\n→ Partner paneli → Doğrulama',
        },
    },
};

export async function sendVerificationMail(p: {
    kind: VerificationMailKind;
    to: string | null;
    providerKey: string;
    locale?: string;
    correlationId?: string;
}): Promise<void> {
    const t = VERIFICATION_STRINGS[resolveLocale(p.locale)][p.kind];
    const apiKey = process.env.RESEND_API_KEY;
    try {
        if (!p.to) {
            await supabaseApi.insert('event_log', { type: 'email_skipped_no_address', payload: { providerKey: p.providerKey, kind: `verification_${p.kind}` } });
            return;
        }
        if (!apiKey) {
            await supabaseApi.insert('event_log', {
                type: 'email_outbox',
                payload: { providerKey: p.providerKey, to: p.to, subject: t.subject, text: t.body, mode: 'log-only', kind: `verification_${p.kind}` },
            });
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: MAIL_FROM, to: [p.to], subject: t.subject, text: t.body }),
        });
        const body = await res.json().catch(() => ({}));
        await supabaseApi.insert('event_log', {
            type: res.ok ? 'email_sent' : 'email_failed',
            payload: { providerKey: p.providerKey, to: p.to, subject: t.subject, providerId: (body as { id?: string }).id, status: res.status, kind: `verification_${p.kind}` },
        });
    } catch (err) {
        structuredLog('error', 'Verification mail failed', {
            correlationId: p.correlationId ?? 'review', route: 'mailer', severity: 'error', errorCode: 'ERR_MAIL',
        });
        try {
            await supabaseApi.insert('event_log', { type: 'email_failed', payload: { providerKey: p.providerKey, to: p.to, error: String(err), kind: `verification_${p.kind}` } });
        } catch { /* double fault */ }
    }
}

// ─── Phase 4: Buchung und gescheiterte Belastung — an den Anbieter ──────────

const BOOKING_STRINGS: Record<MailLocale, { subject: string; intro: string; whenLabel: string; note: string }> = {
    en: {
        subject: 'New booking: a client has booked an intro call with you',
        intro: 'A client has booked an intro call through CompliHub360. Company, contact and message are in your partner dashboard under Appointments.',
        whenLabel: 'Booked slot',
        note: 'The lead fee for this booking was charged to your card on file; the receipt comes from Stripe. Please remember the 10 % CompliHub360 discount on your fees for this request.',
    },
    de: {
        subject: 'Neue Buchung: ein Mandant hat ein Erstgespräch mit Ihnen gebucht',
        intro: 'Ein Mandant hat über CompliHub360 ein Erstgespräch gebucht. Firma, Kontakt und Nachricht finden Sie im Partner-Dashboard unter Termine.',
        whenLabel: 'Gebuchter Termin',
        note: 'Die Lead-Gebühr für diese Buchung wurde Ihrer hinterlegten Karte belastet; der Beleg kommt von Stripe. Bitte denken Sie an die 10 % CompliHub360-Rabatt auf Ihr Honorar für dieses Anliegen.',
    },
    es: {
        subject: 'Nueva reserva: un cliente ha reservado una llamada inicial con usted',
        intro: 'Un cliente ha reservado una llamada inicial a través de CompliHub360. Empresa, contacto y mensaje están en su panel de partner, en Citas.',
        whenLabel: 'Horario reservado',
        note: 'La tarifa de lead de esta reserva se ha cargado a su tarjeta registrada; el recibo lo envía Stripe. Recuerde el 10 % de descuento CompliHub360 sobre sus honorarios para esta solicitud.',
    },
    tr: {
        subject: 'Yeni rezervasyon: bir müşteri sizinle ilk görüşme rezerve etti',
        intro: 'Bir müşteri CompliHub360 üzerinden ilk görüşme rezerve etti. Şirket, iletişim ve mesaj partner panelinizde Randevular bölümünde.',
        whenLabel: 'Rezerve edilen zaman',
        note: 'Bu rezervasyonun lead ücreti kayıtlı kartınızdan tahsil edildi; makbuz Stripe tarafından gönderilir. Bu talep için ücretlerinizde % 10 CompliHub360 indirimini lütfen unutmayın.',
    },
};

const PAYMENT_FAILED_STRINGS: Record<MailLocale, { subject: string; intro: string; note: string }> = {
    en: {
        subject: 'Action needed: a lead charge did not go through',
        intro: 'A client wanted to book an intro call with you, but the lead fee could not be charged to your card on file. The booking did not take place and no data was shared.',
        note: 'Bookings stay paused until a different payment method is on file, or until the same card has been checked again. Both are under Billing in your partner dashboard; nothing is charged by the check. You remain visible in search results.',
    },
    de: {
        subject: 'Handlung nötig: eine Lead-Belastung ist nicht durchgegangen',
        intro: 'Ein Mandant wollte ein Erstgespräch mit Ihnen buchen, aber die Lead-Gebühr konnte Ihrer hinterlegten Karte nicht belastet werden. Die Buchung ist nicht zustande gekommen, es wurden keine Daten geteilt.',
        note: 'Buchungen bleiben ausgesetzt, bis ein anderes Zahlungsmittel hinterlegt oder dieselbe Karte erneut geprüft ist. Beides finden Sie im Partner-Dashboard unter Abrechnung; die Prüfung belastet nichts. In den Suchergebnissen bleiben Sie sichtbar.',
    },
    es: {
        subject: 'Acción necesaria: un cargo de lead no se ha realizado',
        intro: 'Un cliente quería reservar una llamada inicial con usted, pero la tarifa de lead no se pudo cargar a su tarjeta registrada. La reserva no se realizó y no se compartió ningún dato.',
        note: 'Las reservas quedan en pausa hasta que haya otro método de pago registrado o se haya vuelto a comprobar la misma tarjeta. Ambas opciones están en Facturación de su panel de partner; la comprobación no cobra nada. Sigue siendo visible en los resultados de búsqueda.',
    },
    tr: {
        subject: 'İşlem gerekli: bir lead ücreti tahsil edilemedi',
        intro: 'Bir müşteri sizinle ilk görüşme rezerve etmek istedi, ancak lead ücreti kayıtlı kartınızdan tahsil edilemedi. Rezervasyon gerçekleşmedi ve hiçbir veri paylaşılmadı.',
        note: 'Farklı bir ödeme yöntemi kaydedilene veya aynı kart yeniden kontrol edilene kadar rezervasyonlar duraklatılır. İkisi de partner panelinde Faturalandırma bölümünde; kontrol hiçbir ücret almaz. Arama sonuçlarında görünür kalırsınız.',
    },
};

async function deliverProviderMail(p: { to: string | null; kind: string; ref: Record<string, unknown>; subject: string; text: string; correlationId?: string }): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    try {
        if (!p.to) {
            await supabaseApi.insert('event_log', { type: 'email_skipped_no_address', payload: { ...p.ref, kind: p.kind } });
            return;
        }
        if (!apiKey) {
            await supabaseApi.insert('event_log', { type: 'email_outbox', payload: { ...p.ref, to: p.to, subject: p.subject, text: p.text, mode: 'log-only', kind: p.kind } });
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: MAIL_FROM, to: [p.to], subject: p.subject, text: p.text }),
        });
        const body = await res.json().catch(() => ({}));
        await supabaseApi.insert('event_log', {
            type: res.ok ? 'email_sent' : 'email_failed',
            payload: { ...p.ref, to: p.to, subject: p.subject, providerId: (body as { id?: string }).id, status: res.status, kind: p.kind },
        });
    } catch (err) {
        structuredLog('error', 'Provider mail failed', { correlationId: p.correlationId ?? 'scheduling', route: 'mailer', severity: 'error', errorCode: 'ERR_MAIL' });
        try {
            await supabaseApi.insert('event_log', { type: 'email_failed', payload: { ...p.ref, to: p.to, error: String(err), kind: p.kind } });
        } catch { /* double fault */ }
    }
}

/** Neue Buchung an den Anbieter. Ohne Nutzeridentitaet im Text — die steht im Dashboard, nicht in einer Mail. */
export async function sendBookingMail(p: { to: string | null; bookingId: string; providerKey: string; slotIso: string; locale?: string; correlationId?: string }): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = BOOKING_STRINGS[loc];
    const fmt = new Intl.DateTimeFormat(loc, {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin', timeZoneName: 'short',
    });
    const text = [t.intro, ``, `${t.whenLabel}: ${fmt.format(new Date(p.slotIso))}`, ``, t.note].join('\n');
    await deliverProviderMail({ to: p.to, kind: 'booking_provider', ref: { bookingId: p.bookingId, providerKey: p.providerKey }, subject: t.subject, text, correlationId: p.correlationId });
}

/** Gescheiterte Belastung an den Anbieter. Nennt weder den Nutzer noch den Decline-Code — nur den Weg zur Behebung. */
export async function sendPaymentFailedMail(p: { to: string | null; providerKey: string; locale?: string; correlationId?: string }): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = PAYMENT_FAILED_STRINGS[loc];
    const text = [t.intro, ``, t.note].join('\n');
    await deliverProviderMail({ to: p.to, kind: 'payment_failed_provider', ref: { providerKey: p.providerKey }, subject: t.subject, text, correlationId: p.correlationId });
}


// ─── ADR-0008 B2a: Abo-Rechnung faellig, Einzug in der Kulanzfrist ────────────
// Eine Information, keine Mahnung: wann wir die Karte versuchen, dass die
// Frist bleibt, dass die Sichtbarkeit bleibt, und dass man selbst zahlen kann.
// Kein „dringend", keine Drohung — es steht nur, was passiert.

const INVOICE_RETRY_STRINGS: Record<MailLocale, { subject: string; intro: string; tries: string; frist: string; self: string }> = {
    en: {
        subject: 'Invoice {invoice} is due',
        intro: 'Invoice {invoice} for {amount} is due today and still open.',
        tries: 'If it is still open tomorrow, we will try to collect it from your card on file on {dates}. Once the invoice is paid, we stop.',
        frist: 'The deadline stays the same: if the invoice is still open on {block}, new bookings pause from then until it is paid. You remain visible in search results.',
        self: 'You can pay the invoice yourself at any time under Billing in your partner dashboard.',
    },
    de: {
        subject: 'Ihre Rechnung {invoice} ist fällig',
        intro: 'Die Rechnung {invoice} über {amount} ist heute fällig und noch offen.',
        tries: 'Ist sie morgen noch offen, versuchen wir, den Betrag am {dates} von Ihrer hinterlegten Karte einzuziehen. Sobald die Rechnung bezahlt ist, versuchen wir nichts mehr.',
        frist: 'Die Frist bleibt dabei unverändert: Ist die Rechnung am {block} noch offen, pausieren ab dann neue Buchungen, bis sie bezahlt ist. In den Suchergebnissen bleiben Sie sichtbar.',
        self: 'Sie können die Rechnung jederzeit selbst im Partner-Dashboard unter Abrechnung bezahlen.',
    },
    es: {
        subject: 'La factura {invoice} vence hoy',
        intro: 'La factura {invoice} por {amount} vence hoy y sigue abierta.',
        tries: 'Si mañana sigue abierta, intentaremos cobrarla de su tarjeta registrada el {dates}. En cuanto la factura esté pagada, dejamos de intentarlo.',
        frist: 'El plazo no cambia: si la factura sigue abierta el {block}, las nuevas reservas se pausan desde entonces hasta que esté pagada. Sigue siendo visible en los resultados de búsqueda.',
        self: 'Puede pagar la factura usted mismo en cualquier momento en Facturación de su panel de partner.',
    },
    tr: {
        subject: '{invoice} faturasının vadesi geldi',
        intro: '{amount} tutarındaki {invoice} faturasının vadesi bugün ve fatura hâlâ açık.',
        tries: 'Yarın hâlâ açıksa, tutarı {dates} tarihlerinde kayıtlı kartınızdan tahsil etmeyi deneyeceğiz. Fatura ödendiği anda denemeyi bırakırız.',
        frist: 'Süre değişmez: fatura {block} tarihinde hâlâ açıksa, ödenene kadar o tarihten itibaren yeni rezervasyonlar duraklatılır. Arama sonuçlarında görünür kalırsınız.',
        self: 'Faturayı istediğiniz zaman partner panelinde Faturalandırma bölümünden kendiniz ödeyebilirsiniz.',
    },
};

export async function sendInvoiceRetryNoticeMail(p: {
    to: string | null; providerKey: string; invoice: string; amountCents: number | null; currency: string;
    dates: string[]; blocksAt: string; locale?: string; correlationId?: string;
}): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = INVOICE_RETRY_STRINGS[loc];
    const tag = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(loc, { day: 'numeric', month: 'long', timeZone: 'UTC' });
    const list = new Intl.ListFormat(loc, { style: 'long', type: 'conjunction' }).format(p.dates.map(tag));
    const amount = p.amountCents === null ? '—' : (p.amountCents / 100).toLocaleString(loc, { style: 'currency', currency: p.currency });
    const fill = (x: string) => x.replace('{invoice}', p.invoice).replace('{amount}', amount).replace('{dates}', list).replace('{block}', tag(p.blocksAt));
    const text = [fill(t.intro), '', fill(t.tries), '', fill(t.frist), '', t.self].join('\n');
    await deliverProviderMail({ to: p.to, kind: 'invoice_retry_notice', ref: { providerKey: p.providerKey, invoice: p.invoice }, subject: fill(t.subject), text, correlationId: p.correlationId });
}

// ─── Markt-Update (market_requests.notify) ────────────────────────────────────
// "Email me when <market> is covered" (Risk Map F3). Genau eine Mail je
// Anfrage; der Watcher (runMarketCoverageTick) setzt vorher notified_at.
//
// DNA: Information, kein Verkauf. Kein "jetzt schnell", kein Upsell, keine
// Behauptung ueber Pflichten ("may apply"). Der Schlusssatz sagt, dass es bei
// dieser einen Mail bleibt — ein Abschalten gibt es nicht und braucht es
// nicht. Copy abgenommen am 01.10.2026 nach dem Staging-Durchlauf (echte
// Mail, DE); der Test in api.test.ts haelt den EN- und DE-Text wortgleich.

const MARKET_COVERED_STRINGS: Record<MailLocale, { subject: string; body: string; cta: string; once: string }> = {
    en: {
        subject: '{market} is now covered on CompliHub360',
        body: 'You asked us to let you know when we cover {market}. We do now.\n\nYou can create a Risk Map for {market} and see which requirements may apply to your business.',
        cta: 'Create a Risk Map',
        once: 'This is the only email we send about this request.',
    },
    de: {
        subject: '{market} ist jetzt auf CompliHub360 abgedeckt',
        body: 'Sie hatten uns gebeten, Ihnen Bescheid zu geben, sobald wir {market} abdecken. Das ist jetzt der Fall.\n\nSie können eine Risk Map für {market} erstellen und sehen, welche Anforderungen für Ihr Unternehmen gelten können.',
        cta: 'Risk Map erstellen',
        once: 'Dies ist die einzige E-Mail, die wir zu dieser Anfrage senden.',
    },
    es: {
        subject: '{market} ya tiene cobertura en CompliHub360',
        body: 'Nos pidió que le avisáramos cuando cubriéramos {market}. Ya es así.\n\nPuede crear un Risk Map para {market} y ver qué requisitos pueden aplicarse a su empresa.',
        cta: 'Crear un Risk Map',
        once: 'Este es el único correo que le enviaremos sobre esta solicitud.',
    },
    tr: {
        subject: '{market} artık CompliHub360\'ta kapsanıyor',
        body: '{market} kapsandığında size haber vermemizi istemiştiniz. Artık kapsıyoruz.\n\n{market} için bir Risk Map oluşturabilir ve işletmeniz için hangi gerekliliklerin geçerli olabileceğini görebilirsiniz.',
        cta: 'Risk Map oluşturun',
        once: 'Bu talep hakkında göndereceğimiz tek e-posta budur.',
    },
};

/** Betreff und Text des Markt-Updates, in der Sprache der Anfrage. Exportiert
 *  fuer die Tests — sie pruefen, was tatsaechlich im Postfach landet. */
export function renderMarketCoveredMail(market: string, locale?: string | null): { subject: string; text: string } {
    const loc = resolveLocale(locale ?? undefined);
    const t = MARKET_COVERED_STRINGS[loc];
    let name = market;
    try { name = new Intl.DisplayNames([loc], { type: 'region' }).of(market) ?? market; } catch { /* Code statt Name */ }
    const fill = (s: string) => s.split('{market}').join(name);
    const url = `${PUBLIC_APP_URL}/${loc}/wizard`;
    return { subject: fill(t.subject), text: [fill(t.body), ``, `→ ${t.cta}: ${url}`, ``, t.once].join('\n') };
}

export async function sendMarketCoveredMail(p: {
    to: string | null;
    requestId: string;
    market: string;
    locale?: string | null;
}): Promise<void> {
    const { subject, text } = renderMarketCoveredMail(p.market, p.locale);
    const kind = 'market_covered';
    const apiKey = process.env.RESEND_API_KEY;
    try {
        if (!p.to) {
            await supabaseApi.insert('event_log', { type: 'email_skipped_no_address', payload: { requestId: p.requestId, market: p.market, kind } });
            return;
        }
        if (!apiKey) {
            await supabaseApi.insert('event_log', {
                type: 'email_outbox',
                payload: { requestId: p.requestId, market: p.market, to: p.to, subject, text, mode: 'log-only', kind },
            });
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: MAIL_FROM, to: [p.to], subject, text }),
        });
        const body = await res.json().catch(() => ({}));
        await supabaseApi.insert('event_log', {
            type: res.ok ? 'email_sent' : 'email_failed',
            payload: { requestId: p.requestId, market: p.market, to: p.to, subject, providerId: (body as { id?: string }).id, status: res.status, kind },
        });
    } catch (err) {
        structuredLog('error', 'Market covered mail failed', {
            correlationId: 'watchers', route: 'mailer', severity: 'error', errorCode: 'ERR_MAIL',
        });
        try {
            await supabaseApi.insert('event_log', { type: 'email_failed', payload: { requestId: p.requestId, market: p.market, to: p.to, error: String(err), kind } });
        } catch { /* double fault */ }
    }
}

// ─── Change-Control (Spec A §18, §26) ────────────────────────────────────────
// Zwei Anlaesse: das Pruefteam hat ueber eine Aenderung entschieden (an den
// Partner), und eine Leistung pausiert, fuer die ein Nutzer einen Termin hat
// (an den Nutzer, Canvas F V1). Beides ohne Drohung und ohne Grund fuer den
// Nutzer — der Grund gehoert dem Partner und dem Pruefteam. Ein Mensch ist
// immer erreichbar.

export type ChangeDecisionMailKind = 'approved' | 'approved_scheduled' | 'rejected' | 'reverification' | 'resumed' | 'kept_paused';

const CHANGE_DECISION_STRINGS: Record<MailLocale, Record<ChangeDecisionMailKind, { subject: string; body: string }> & { noteLabel: string; human: string }> = {
    en: {
        noteLabel: 'Note from our review team',
        human: 'If anything is unclear, reply to this email — a person will answer.',
        approved: { subject: 'Your change is live', body: 'Our review team has approved your change from {date}. It is now visible to businesses.\n\n→ Partner dashboard → Application' },
        approved_scheduled: { subject: 'Your change takes effect on {from}', body: 'Our review team has approved your change from {date}. It takes effect on {from}; until then businesses see your current details.\n\nYou can withdraw it in your partner dashboard until that date.\n\n→ Partner dashboard → Application' },
        rejected: { subject: 'Your change was not applied', body: 'Our review team did not apply your change from {date}. Your previous details stay in place.\n\nYou can adjust the details and send them again.' },
        reverification: { subject: 'One document for your change', body: 'For your change from {date}, our review team needs a current document.\n\nYou can upload it in your partner dashboard under Application → Evidence.' },
        resumed: { subject: 'Your services can be booked again', body: 'We have reviewed your report. The paused services are visible and bookable again.\n\nThank you for reporting the change right away.' },
        kept_paused: { subject: 'Your report: the services stay paused for now', body: 'We have reviewed your report. The affected services stay paused for now.' },
    },
    de: {
        noteLabel: 'Hinweis unseres Prüfteams',
        human: 'Wenn etwas unklar ist, antworten Sie einfach auf diese E-Mail — ein Mensch antwortet Ihnen.',
        approved: { subject: 'Ihre Änderung ist übernommen', body: 'Unser Prüfteam hat Ihre Änderung vom {date} freigegeben. Sie ist ab jetzt für Unternehmen sichtbar.\n\n→ Partner-Dashboard → Bewerbung' },
        approved_scheduled: { subject: 'Ihre Änderung gilt ab {from}', body: 'Unser Prüfteam hat Ihre Änderung vom {date} freigegeben. Sie wird am {from} wirksam; bis dahin sehen Unternehmen die bisherigen Angaben.\n\nBis zu diesem Datum können Sie die Änderung im Partner-Dashboard zurückziehen.\n\n→ Partner-Dashboard → Bewerbung' },
        rejected: { subject: 'Ihre Änderung wurde nicht übernommen', body: 'Unser Prüfteam hat Ihre Änderung vom {date} nicht übernommen. Es gilt weiter der bisherige Stand.\n\nSie können die Angaben anpassen und erneut senden.' },
        reverification: { subject: 'Ein Nachweis zu Ihrer Änderung', body: 'Zu Ihrer Änderung vom {date} braucht unser Prüfteam einen aktuellen Nachweis.\n\nSie laden ihn im Partner-Dashboard unter Bewerbung → Nachweise hoch.' },
        resumed: { subject: 'Ihre Leistungen sind wieder buchbar', body: 'Wir haben Ihre Meldung geprüft. Die pausierten Leistungen sind wieder sichtbar und buchbar.\n\nDanke, dass Sie die Änderung gleich gemeldet haben.' },
        kept_paused: { subject: 'Ihre Meldung: die Leistungen bleiben vorerst pausiert', body: 'Wir haben Ihre Meldung geprüft. Die betroffenen Leistungen bleiben vorerst pausiert.' },
    },
    es: {
        noteLabel: 'Nota de nuestro equipo de revisión',
        human: 'Si algo no está claro, responda a este correo — le contestará una persona.',
        approved: { subject: 'Su cambio ya está publicado', body: 'Nuestro equipo de revisión ha aprobado su cambio del {date}. Ya es visible para las empresas.\n\n→ Panel de socio → Solicitud' },
        approved_scheduled: { subject: 'Su cambio se aplica a partir del {from}', body: 'Nuestro equipo de revisión ha aprobado su cambio del {date}. Se aplica a partir del {from}; hasta entonces, las empresas ven sus datos actuales.\n\nPuede retirarlo en su panel de socio hasta esa fecha.\n\n→ Panel de socio → Solicitud' },
        rejected: { subject: 'Su cambio no se ha aplicado', body: 'Nuestro equipo de revisión no ha aplicado su cambio del {date}. Siguen vigentes sus datos anteriores.\n\nPuede ajustar los datos y enviarlos de nuevo.' },
        reverification: { subject: 'Un documento para su cambio', body: 'Para su cambio del {date}, nuestro equipo de revisión necesita un documento actual.\n\nPuede subirlo en su panel de socio en Solicitud → Justificantes.' },
        resumed: { subject: 'Sus servicios vuelven a poder reservarse', body: 'Hemos revisado su aviso. Los servicios en pausa vuelven a ser visibles y reservables.\n\nGracias por avisar del cambio enseguida.' },
        kept_paused: { subject: 'Su aviso: los servicios siguen en pausa por ahora', body: 'Hemos revisado su aviso. Los servicios afectados siguen en pausa por ahora.' },
    },
    tr: {
        noteLabel: 'İnceleme ekibimizin notu',
        human: 'Bir şey net değilse bu e-postayı yanıtlayın — size bir insan cevap verir.',
        approved: { subject: 'Değişikliğiniz yayında', body: 'İnceleme ekibimiz {date} tarihli değişikliğinizi onayladı. Artık işletmeler tarafından görülebilir.\n\n→ Partner paneli → Başvuru' },
        approved_scheduled: { subject: 'Değişikliğiniz {from} tarihinde geçerli olacak', body: 'İnceleme ekibimiz {date} tarihli değişikliğinizi onayladı. Değişiklik {from} tarihinde geçerli olacak; o zamana kadar işletmeler mevcut bilgilerinizi görür.\n\nBu tarihe kadar değişikliği partner panelinden geri çekebilirsiniz.\n\n→ Partner paneli → Başvuru' },
        rejected: { subject: 'Değişikliğiniz uygulanmadı', body: 'İnceleme ekibimiz {date} tarihli değişikliğinizi uygulamadı. Önceki bilgileriniz geçerli kalır.\n\nBilgileri düzenleyip yeniden gönderebilirsiniz.' },
        reverification: { subject: 'Değişikliğiniz için bir belge', body: '{date} tarihli değişikliğiniz için inceleme ekibimizin güncel bir belgeye ihtiyacı var.\n\nBelgeyi partner panelinde Başvuru → Belgeler bölümünden yükleyebilirsiniz.' },
        resumed: { subject: 'Hizmetleriniz yeniden rezerve edilebilir', body: 'Bildiriminizi inceledik. Duraklatılan hizmetler yeniden görünür ve rezerve edilebilir.\n\nDeğişikliği hemen bildirdiğiniz için teşekkür ederiz.' },
        kept_paused: { subject: 'Bildiriminiz: hizmetler şimdilik duraklatılmış kalıyor', body: 'Bildiriminizi inceledik. İlgili hizmetler şimdilik duraklatılmış kalıyor.' },
    },
};

/** Betreff und Text der Entscheidungs-Mail. Exportiert fuer die Tests. */
export function renderChangeDecisionMail(kind: ChangeDecisionMailKind, submittedAt: string, note: string | null, locale?: string | null, effectiveAt?: string | null): { subject: string; text: string } {
    const loc = resolveLocale(locale ?? undefined);
    const s = CHANGE_DECISION_STRINGS[loc];
    const fmt = (iso: string) => {
        try { return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso)); } catch { return iso.slice(0, 10); }
    };
    // {from}: das "gilt ab"-Datum — ein Tagesbeginn in UTC, deshalb auch in UTC formatiert.
    const fill = (x: string) => x.split('{date}').join(fmt(submittedAt)).split('{from}').join(effectiveAt ? fmt(effectiveAt) : '');
    const parts = [fill(s[kind].body)];
    if (note) parts.push(`${s.noteLabel}: ${note}`);
    parts.push(s.human);
    return { subject: fill(s[kind].subject), text: parts.join('\n\n') };
}

export async function sendChangeDecisionMail(p: { to: string | null; providerKey: string; changeId: string; kind: ChangeDecisionMailKind; submittedAt: string; effectiveAt?: string | null; note: string | null; locale?: string | null; correlationId?: string }): Promise<void> {
    const { subject, text } = renderChangeDecisionMail(p.kind, p.submittedAt, p.note, p.locale, p.effectiveAt);
    await deliverProviderMail({ to: p.to, kind: `change_${p.kind}`, ref: { providerKey: p.providerKey, changeId: p.changeId }, subject, text, correlationId: p.correlationId });
}

const SERVICE_PAUSED_STRINGS: Record<MailLocale, { subject: string; body: string }> = {
    en: { subject: 'Your appointment on {date}', body: 'The provider of your appointment on {date} cannot offer the booked service at the moment. Your appointment is still in place.\n\nWe will get back to you as soon as it is clear how things continue. If you would rather not wait, you can cancel the appointment free of charge in your dashboard under Appointments.\n\nQuestions? Reply to this email — a person will answer.\n\n→ Dashboard → Appointments' },
    de: { subject: 'Ihr Termin am {date}', body: 'Der Anbieter Ihres Termins am {date} kann die gebuchte Leistung gerade nicht anbieten. Ihr Termin ist weiter eingetragen.\n\nWir melden uns, sobald klar ist, wie es weitergeht. Wenn Sie nicht warten möchten, können Sie den Termin in Ihrem Dashboard unter Termine kostenfrei absagen.\n\nFragen? Antworten Sie einfach auf diese E-Mail — ein Mensch antwortet Ihnen.\n\n→ Dashboard → Termine' },
    es: { subject: 'Su cita del {date}', body: 'El proveedor de su cita del {date} no puede ofrecer el servicio reservado en este momento. Su cita sigue registrada.\n\nLe escribiremos en cuanto esté claro cómo sigue. Si prefiere no esperar, puede cancelar la cita sin coste en su panel, en Citas.\n\n¿Preguntas? Responda a este correo — le contestará una persona.\n\n→ Panel → Citas' },
    tr: { subject: '{date} tarihli randevunuz', body: '{date} tarihli randevunuzun sağlayıcısı rezerve edilen hizmeti şu anda sunamıyor. Randevunuz kayıtlı kalmaya devam ediyor.\n\nNasıl devam edileceği netleşir netleşmez size döneceğiz. Beklemek istemezseniz randevuyu panelinizde Randevular bölümünden ücretsiz iptal edebilirsiniz.\n\nSorularınız mı var? Bu e-postayı yanıtlayın — size bir insan cevap verir.\n\n→ Panel → Randevular' },
};

/** Betreff und Text der Nutzer-Mail bei einer Pause. Exportiert fuer die Tests. */
export function renderServicePausedMail(slotIso: string, locale?: string | null): { subject: string; text: string } {
    const loc = resolveLocale(locale ?? undefined);
    const s = SERVICE_PAUSED_STRINGS[loc];
    let date = slotIso.slice(0, 10);
    try { date = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(new Date(slotIso)); } catch { /* ISO-Datum */ }
    const fill = (x: string) => x.split('{date}').join(date);
    return { subject: fill(s.subject), text: fill(s.body) };
}

export async function sendServicePausedMail(p: { to: string | null; bookingId: string; slotIso: string; locale?: string | null; correlationId?: string }): Promise<void> {
    const { subject, text } = renderServicePausedMail(p.slotIso, p.locale);
    await deliverProviderMail({ to: p.to, kind: 'booking_provider_paused', ref: { bookingId: p.bookingId }, subject, text, correlationId: p.correlationId });
}

// ─── Phase 5: Anwesenheit, Neubuchung, Guthaben (Spec B, ADR-0007) ───────────
//
// Vier Mails, alle nach dem Outbox-Muster von deliverProviderMail. Ton nach
// KN-BRAND-001: kein Vorwurf, keine Dringlichkeit als Druckmittel, die Frist
// als Angebot. In der Mail an den Nutzer steht nie, was der Anbieter zahlt.

const APPOINTMENT_REMINDER_STRINGS: Record<MailLocale, { subject24: string; subject1: string; intro: string; whenLabel: string; note: string }> = {
    en: { subject24: 'Reminder: your consultation is tomorrow', subject1: 'Reminder: your consultation starts in an hour', intro: 'A short reminder of your consultation booked through CompliHub360.', whenLabel: 'When', note: 'If the time no longer works, you can move or cancel the appointment in your dashboard. The other side is informed automatically.' },
    de: { subject24: 'Erinnerung: Ihr Beratungstermin ist morgen', subject1: 'Erinnerung: Ihr Beratungstermin beginnt in einer Stunde', intro: 'Eine kurze Erinnerung an Ihren über CompliHub360 gebuchten Beratungstermin.', whenLabel: 'Wann', note: 'Passt der Termin nicht mehr, können Sie ihn in Ihrem Dashboard verschieben oder absagen. Die andere Seite wird automatisch informiert.' },
    es: { subject24: 'Recordatorio: su consulta es mañana', subject1: 'Recordatorio: su consulta empieza en una hora', intro: 'Un breve recordatorio de su consulta reservada a través de CompliHub360.', whenLabel: 'Cuándo', note: 'Si la hora ya no le conviene, puede mover o cancelar la cita en su panel. La otra parte recibe aviso automáticamente.' },
    tr: { subject24: 'Hatırlatma: danışmanlık görüşmeniz yarın', subject1: 'Hatırlatma: danışmanlık görüşmeniz bir saat içinde başlıyor', intro: 'CompliHub360 üzerinden rezerve ettiğiniz danışmanlık görüşmesi için kısa bir hatırlatma.', whenLabel: 'Ne zaman', note: 'Saat artık uygun değilse randevuyu panelinizden taşıyabilir veya iptal edebilirsiniz. Karşı taraf otomatik olarak bilgilendirilir.' },
};

/** Terminerinnerung — an Nutzer oder Anbieter, gleicher Text, nur die Stufe entscheidet den Betreff. */
export async function sendAppointmentReminderMail(p: { to: string | null; side: 'user' | 'provider'; bookingId: string; providerKey: string; slotIso: string; offsetMin: number; locale?: string; correlationId?: string }): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = APPOINTMENT_REMINDER_STRINGS[loc];
    const fmt = new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin', timeZoneName: 'short' });
    const subject = p.offsetMin <= 60 ? t.subject1 : t.subject24;
    const text = [t.intro, ``, `${t.whenLabel}: ${fmt.format(new Date(p.slotIso))}`, ``, t.note].join('\n');
    await deliverProviderMail({ to: p.to, kind: `appointment_reminder_${p.side}`, ref: { bookingId: p.bookingId, providerKey: p.providerKey, offsetMin: p.offsetMin }, subject, text, correlationId: p.correlationId });
}

const NO_SHOW_USER_STRINGS: Record<MailLocale, { subject: string; intro: string; rebook: string; dispute: string; note: string }> = {
    en: { subject: 'Your consultation did not take place — you can rebook', intro: 'The provider has reported that your consultation booked through CompliHub360 did not take place.', rebook: 'You can book a new slot with the same provider at no cost until {deadline}. Your request stays open with them.', dispute: 'If this does not match what happened, you can object in your dashboard within {hours} hours; we will look at it.', note: 'Nothing is charged to you. If you would rather talk to another provider, your results page is still there.' },
    de: { subject: 'Ihr Beratungstermin hat nicht stattgefunden — Sie können neu buchen', intro: 'Der Anbieter hat gemeldet, dass Ihr über CompliHub360 gebuchter Beratungstermin nicht stattgefunden hat.', rebook: 'Bis {deadline} können Sie beim selben Anbieter kostenlos einen neuen Termin buchen. Ihre Anfrage bleibt dort offen.', dispute: 'Stimmt das nicht mit Ihrem Eindruck überein, können Sie innerhalb von {hours} Stunden in Ihrem Dashboard widersprechen; wir sehen uns den Fall an.', note: 'Ihnen wird nichts berechnet. Möchten Sie lieber mit einem anderen Anbieter sprechen, finden Sie Ihre Ergebnisseite weiterhin vor.' },
    es: { subject: 'Su consulta no tuvo lugar — puede reservar de nuevo', intro: 'El proveedor ha informado de que su consulta reservada a través de CompliHub360 no tuvo lugar.', rebook: 'Hasta el {deadline} puede reservar una nueva cita con el mismo proveedor sin coste. Su solicitud sigue abierta con él.', dispute: 'Si esto no coincide con lo ocurrido, puede objetar en su panel en un plazo de {hours} horas; lo revisaremos.', note: 'No se le cobra nada. Si prefiere hablar con otro proveedor, su página de resultados sigue disponible.' },
    tr: { subject: 'Danışmanlık görüşmeniz gerçekleşmedi — yeniden rezervasyon yapabilirsiniz', intro: 'Sağlayıcı, CompliHub360 üzerinden rezerve ettiğiniz danışmanlık görüşmesinin gerçekleşmediğini bildirdi.', rebook: '{deadline} tarihine kadar aynı sağlayıcıyla ücretsiz yeni bir randevu alabilirsiniz. Talebiniz orada açık kalır.', dispute: 'Bu durum yaşadıklarınızla örtüşmüyorsa {hours} saat içinde panelinizden itiraz edebilirsiniz; inceleyeceğiz.', note: 'Sizden hiçbir ücret alınmaz. Başka bir sağlayıcıyla görüşmeyi tercih ederseniz sonuç sayfanız hâlâ yerinde.' },
};

/** An den Nutzer, wenn der Anbieter einen No-Show gemeldet hat. Neutral: Frist als Angebot, Widerspruch sichtbar, keine Gebuehr erwaehnt. */
export async function sendNoShowMail(p: { to: string | null; bookingId: string; providerKey: string; deadline: string; disputeHours: number; locale?: string; correlationId?: string }): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = NO_SHOW_USER_STRINGS[loc];
    const deadline = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${p.deadline}T00:00:00Z`));
    const text = [t.intro, ``, t.rebook.replace('{deadline}', deadline), ``, t.dispute.replace('{hours}', String(p.disputeHours)), ``, t.note].join('\n');
    await deliverProviderMail({ to: p.to, kind: 'no_show_user', ref: { bookingId: p.bookingId, providerKey: p.providerKey }, subject: t.subject, text, correlationId: p.correlationId });
}

const REBOOK_REMINDER_STRINGS: Record<MailLocale, { subject: string; intro: string; note: string }> = {
    en: { subject: 'You can still rebook your consultation', intro: 'Your consultation booked through CompliHub360 did not take place. A new slot with the same provider is still available to you at no cost until {deadline}.', note: 'If you no longer need the consultation, you can simply let this pass. Nothing is charged to you either way.' },
    de: { subject: 'Sie können Ihren Beratungstermin noch neu buchen', intro: 'Ihr über CompliHub360 gebuchter Beratungstermin hat nicht stattgefunden. Bis {deadline} können Sie beim selben Anbieter kostenlos einen neuen Termin buchen.', note: 'Brauchen Sie die Beratung nicht mehr, können Sie die Frist einfach verstreichen lassen. Ihnen wird in keinem Fall etwas berechnet.' },
    es: { subject: 'Todavía puede reservar de nuevo su consulta', intro: 'Su consulta reservada a través de CompliHub360 no tuvo lugar. Hasta el {deadline} puede reservar una nueva cita con el mismo proveedor sin coste.', note: 'Si ya no necesita la consulta, puede dejar pasar el plazo. En ningún caso se le cobra nada.' },
    tr: { subject: 'Danışmanlık görüşmenizi hâlâ yeniden rezerve edebilirsiniz', intro: 'CompliHub360 üzerinden rezerve ettiğiniz danışmanlık görüşmesi gerçekleşmedi. {deadline} tarihine kadar aynı sağlayıcıyla ücretsiz yeni bir randevu alabilirsiniz.', note: 'Danışmanlığa artık ihtiyacınız yoksa süreyi geçmesine bırakabilirsiniz. Her durumda sizden ücret alınmaz.' },
};

/** Neubuchungs-Erinnerung an den Nutzer (Tag 1, 5, 10 der Frist). */
export async function sendRebookReminderMail(p: { to: string | null; bookingId: string; providerKey: string; deadline: string; day: number; locale?: string; correlationId?: string }): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = REBOOK_REMINDER_STRINGS[loc];
    const deadline = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${p.deadline}T00:00:00Z`));
    const text = [t.intro.replace('{deadline}', deadline), ``, t.note].join('\n');
    await deliverProviderMail({ to: p.to, kind: 'rebook_reminder_user', ref: { bookingId: p.bookingId, providerKey: p.providerKey, day: p.day }, subject: t.subject, text, correlationId: p.correlationId });
}

const CREDIT_ISSUED_STRINGS: Record<MailLocale, { subject: string; intro: string; note: string }> = {
    en: { subject: 'A platform credit has been added to your account', intro: 'The user of a booked lead did not attend and did not rebook within the rebooking period. As set out in the lead fee policy, {amount} ({pct} % of the lead fee paid) has been credited to your CompliHub360 account.', note: 'The credit is applied to your next invoice automatically; it is not paid out. Your lead information and the service-related follow-up right remain with you.' },
    de: { subject: 'Ihrem Konto wurde ein Plattform-Guthaben gutgeschrieben', intro: 'Der Nutzer eines gebuchten Leads ist nicht erschienen und hat innerhalb der Neubuchungsfrist nicht neu gebucht. Wie in der Lead-Gebührenregelung vorgesehen, wurden Ihrem CompliHub360-Konto {amount} ({pct} % der gezahlten Lead-Gebühr) gutgeschrieben.', note: 'Das Guthaben wird automatisch mit Ihrer nächsten Rechnung verrechnet; eine Auszahlung erfolgt nicht. Die Lead-Informationen und das Nachfassrecht zur angefragten Leistung bleiben bei Ihnen.' },
    es: { subject: 'Se ha añadido un crédito de plataforma a su cuenta', intro: 'El usuario de un lead reservado no asistió y no reservó de nuevo dentro del plazo. Según la política de tarifas de lead, se han abonado {amount} ({pct} % de la tarifa pagada) a su cuenta de CompliHub360.', note: 'El crédito se aplica automáticamente a su próxima factura; no se paga en efectivo. La información del lead y el derecho de seguimiento sobre el servicio solicitado siguen siendo suyos.' },
    tr: { subject: 'Hesabınıza bir platform kredisi eklendi', intro: 'Rezerve edilen bir lead\'in kullanıcısı görüşmeye katılmadı ve yeniden rezervasyon süresi içinde yeni randevu almadı. Lead ücreti politikası gereği CompliHub360 hesabınıza {amount} ({pct} % ödenen lead ücreti) kredi olarak eklendi.', note: 'Kredi bir sonraki faturanıza otomatik olarak uygulanır; nakit ödeme yapılmaz. Lead bilgileri ve talep edilen hizmetle ilgili takip hakkı sizde kalır.' },
};

/** Guthaben an den Anbieter: offen genannt, nie als Gewinn verkauft. */
export async function sendCreditIssuedMail(p: { to: string | null; providerKey: string; bookingId: string; amountCents: number; currency: string; pct: number; locale?: string; correlationId?: string }): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = CREDIT_ISSUED_STRINGS[loc];
    const amount = new Intl.NumberFormat(loc, { style: 'currency', currency: p.currency }).format(p.amountCents / 100);
    const text = [t.intro.replace('{amount}', amount).replace('{pct}', String(p.pct)), ``, t.note].join('\n');
    await deliverProviderMail({ to: p.to, kind: 'credit_issued_provider', ref: { bookingId: p.bookingId, providerKey: p.providerKey, amountCents: p.amountCents }, subject: t.subject, text, correlationId: p.correlationId });
}

// ─── Phase 6: Serien-No-Shows (ADR-0009) ─────────────────────────────────────
//
// Zwei Stufen, derselbe Ton: Hinweis bei zwei Vorfaellen, Buchungspause bei
// drei. Kein Vorwurf, der Weg zum Einspruch steht im Text, und die
// Sichtbarkeit bleibt — das sagt die Mail ausdruecklich.

const SERIAL_NO_SHOW_STRINGS: Record<MailLocale, { alertSubject: string; alertBody: string; pauseSubject: string; pauseBody: string; foot: string }> = {
    en: {
        alertSubject: 'Two missed consultations have been recorded for your account',
        alertBody: 'Within the last {days} days, users reported {count} consultations booked through CompliHub360 at which you did not appear. Each report is recorded as a performance incident; one more within the same period pauses new bookings until the matter is clarified.',
        pauseSubject: 'New bookings are paused for your account',
        pauseBody: 'Within the last {days} days, {count} consultations booked through CompliHub360 were reported as missed by you. New bookings are paused for now; your profile stays visible and existing appointments remain in place.',
        foot: 'If a report is wrong, you can file an objection in your dashboard under Performance; we will look at the case. Incidents count towards performance, never towards your invoice.',
    },
    de: {
        alertSubject: 'Zwei versäumte Beratungstermine sind für Ihr Konto vermerkt',
        alertBody: 'In den letzten {days} Tagen haben Nutzer {count} über CompliHub360 gebuchte Beratungstermine gemeldet, zu denen Sie nicht erschienen sind. Jede Meldung ist als Leistungsvorfall vermerkt; ein weiterer im selben Zeitraum pausiert neue Buchungen, bis der Fall geklärt ist.',
        pauseSubject: 'Neue Buchungen sind für Ihr Konto pausiert',
        pauseBody: 'In den letzten {days} Tagen wurden {count} über CompliHub360 gebuchte Beratungstermine als von Ihnen versäumt gemeldet. Neue Buchungen sind vorerst pausiert; Ihr Profil bleibt sichtbar, bestehende Termine bleiben bestehen.',
        foot: 'Ist eine Meldung falsch, können Sie in Ihrem Dashboard unter Performance Einspruch einlegen; wir sehen uns den Fall an. Vorfälle zählen in die Leistung, nie in Ihre Rechnung.',
    },
    es: {
        alertSubject: 'Se han registrado dos consultas no atendidas en su cuenta',
        alertBody: 'En los últimos {days} días, los usuarios informaron {count} consultas reservadas a través de CompliHub360 a las que usted no se presentó. Cada informe queda registrado como incidente de rendimiento; uno más en el mismo periodo pausa las nuevas reservas hasta aclarar el caso.',
        pauseSubject: 'Las nuevas reservas están pausadas en su cuenta',
        pauseBody: 'En los últimos {days} días, {count} consultas reservadas a través de CompliHub360 se informaron como no atendidas por usted. Las nuevas reservas quedan pausadas por ahora; su perfil sigue visible y las citas existentes se mantienen.',
        foot: 'Si un informe es erróneo, puede presentar una objeción en su panel, en Rendimiento; revisaremos el caso. Los incidentes cuentan para el rendimiento, nunca para su factura.',
    },
    tr: {
        alertSubject: 'Hesabınız için kaçırılan iki danışma randevusu kaydedildi',
        alertBody: 'Son {days} gün içinde kullanıcılar, CompliHub360 üzerinden ayırtılan ve sizin katılmadığınız {count} danışma randevusu bildirdi. Her bildirim performans olayı olarak kaydedilir; aynı dönemde bir tane daha olursa, durum netleşene kadar yeni rezervasyonlar duraklatılır.',
        pauseSubject: 'Hesabınız için yeni rezervasyonlar duraklatıldı',
        pauseBody: 'Son {days} gün içinde CompliHub360 üzerinden ayırtılan {count} danışma randevusu sizin tarafınızdan kaçırılmış olarak bildirildi. Yeni rezervasyonlar şimdilik duraklatıldı; profiliniz görünür kalır ve mevcut randevular geçerliliğini korur.',
        foot: 'Bir bildirim hatalıysa panelinizde Performans altında itiraz edebilirsiniz; durumu inceleriz. Olaylar performansa sayılır, faturanıza asla.',
    },
};

export async function sendSerialNoShowMail(p: { to: string | null; providerKey: string; state: 'alert' | 'pause'; count: number; windowDays: number; locale?: string; correlationId?: string }): Promise<void> {
    const loc = resolveLocale(p.locale);
    const t = SERIAL_NO_SHOW_STRINGS[loc];
    const body = (p.state === 'pause' ? t.pauseBody : t.alertBody).replace('{days}', String(p.windowDays)).replace('{count}', String(p.count));
    const text = [body, ``, t.foot].join('\n');
    await deliverProviderMail({ to: p.to, kind: p.state === 'pause' ? 'booking_paused_provider' : 'serial_no_show_alert_provider', ref: { providerKey: p.providerKey, count: p.count }, subject: p.state === 'pause' ? t.pauseSubject : t.alertSubject, text, correlationId: p.correlationId });
}
