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
// product terms (CompliHub360, Verified Partner, Magic-Link) stay untranslated.
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
function renderHtml(m: MagicLinkMail, t: MailStrings['magic']): string {
    const redacted = m.message ? redactText(m.message, { profile: 'strict' }).sanitizedText : '—';
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const btn = (label: string, url: string, primary: boolean) => primary
        ? `<a href="${url}" style="display:block;background-color:#d4af37;border-radius:12px;padding:14px 24px;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#101411;text-decoration:none;">${label} &rarr;</a>`
        : `<a href="${url}" style="display:inline-block;border:1px solid rgba(255,255,255,0.25);border-radius:10px;padding:10px 18px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;color:#e5e7eb;text-decoration:none;">${label}</a>`;
    // NOTE: logo-lockup-email.png still carries the retired claim "Compliance.
    // Simplified." baked into the pixels. The alt text already states the new
    // one; re-export the asset from Compass to close the gap (Brand Map §5).
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1620;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="padding:0 8px 24px 8px;"><img src="https://kqylqwogxbiwpnomkzsn.supabase.co/storage/v1/object/public/assets/logo-lockup-email.png" width="207" height="54" alt="CompliHub360 — Always on your side." style="display:block;border:0;"/></td></tr>
<tr><td style="background-color:#1f2937;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px;">
<div style="font-family:Georgia,serif;font-size:26px;line-height:1.25;font-weight:bold;color:#ffffff;">${esc(t.headlinePre)}<span style="color:#d4af37;">${esc(t.headlineGold)}</span>${esc(t.headlinePost)}</div>
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
<div style="font-family:Georgia,serif;font-size:26px;line-height:1.25;font-weight:bold;color:#ffffff;">${escE(t.headlinePre)}<span style="color:#d4af37;">${escE(t.headlineGold)}</span>${escE(t.headlinePost)}</div>
<div style="padding-top:12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#aeb8c4;">${escE(t.bodyPre)}<strong style="color:#ffffff;">${escE(p.providerName)}</strong>${escE(t.bodyPost)}</div>
<div style="padding-top:24px;"><a href="${url}" style="display:block;background-color:#d4af37;border-radius:12px;padding:14px 24px;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#101411;text-decoration:none;">${escE(t.cta)} &rarr;</a></div>
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
    } catch (err) {
        structuredLog('error', 'Email-change mail failed', {
            correlationId: p.correlationId, route: 'mailer', severity: 'error', errorCode: 'ERR_MAIL',
        });
    }
}

// ─── Review-watchdog mails (decision 2026-08-06) ─────────────────────────────
// After a completed meeting both sides are asked to review within 2 days.
// Provider reviews are MANDATORY (ranking depends on them): no reaction →
// warning → downgrade + reduced visibility. User reviews are incentivized
// (better service / personalisation / faster reaction to problems).

export type ReviewMailKind = 'request_user' | 'request_provider' | 'warning_provider' | 'downgraded_provider';

const REVIEW_STRINGS: Record<MailLocale, Record<ReviewMailKind, { subject: string; body: string }>> = {
    en: {
        request_user: {
            subject: 'How was your appointment? 2 minutes for your review',
            body: 'Your intro call has taken place. Rate your specialist within the next 2 days — your feedback personalises your matching, helps us react faster to problems and improves your service. Reviews are verified and appear anonymised.\n\n→ Dashboard → Appointments → "Rate provider"',
        },
        request_provider: {
            subject: 'Action required: review your lead (within 2 days)',
            body: 'Your booked appointment has taken place. As a CompliHub360 partner your lead review is REQUIRED within 2 days — your ranking and visibility depend on an active review loop. Missing reviews lead to a warning and subsequently to a downgrade with reduced visibility.\n\n→ Partner dashboard → Appointments → open dossier → "Rate this lead"',
        },
        warning_provider: {
            subject: 'Warning: review overdue — downgrade imminent',
            body: 'Your lead review is overdue (deadline: 2 days after the appointment). This is a formal warning: if the review is still missing 2 days from now, your partner status will be downgraded and your visibility to users reduced.\n\n→ Partner dashboard → Appointments → open dossier → "Rate this lead"',
        },
        downgraded_provider: {
            subject: 'Your partner status has been downgraded',
            body: 'Despite our warning the required lead review was not submitted. Your partner status has been downgraded — your visibility in user matchings is reduced. Submit the outstanding review and contact partners@complihub360.com to restore your status.',
        },
    },
    de: {
        request_user: {
            subject: 'Wie war dein Termin? 2 Minuten für deine Bewertung',
            body: 'Dein Erstgespräch hat stattgefunden. Bewerte deinen Spezialisten innerhalb der nächsten 2 Tage — dein Feedback personalisiert dein Matching, hilft uns, schneller auf Missstände zu reagieren, und verbessert deinen Service. Bewertungen sind verifiziert und erscheinen anonymisiert.\n\n→ Dashboard → Termine → „Provider bewerten"',
        },
        request_provider: {
            subject: 'Aktion erforderlich: Lead bewerten (innerhalb von 2 Tagen)',
            body: 'Dein gebuchter Termin hat stattgefunden. Als CompliHub360-Partner ist deine Lead-Bewertung innerhalb von 2 Tagen VERPFLICHTEND — dein Ranking und deine Sichtbarkeit hängen an einer aktiven Review-Schleife. Fehlende Bewertungen führen zu einer Verwarnung und anschließend zur Herabstufung mit reduzierter Sichtbarkeit.\n\n→ Partner-Dashboard → Termine → Dossier öffnen → „Lead bewerten"',
        },
        warning_provider: {
            subject: 'Verwarnung: Bewertung überfällig — Herabstufung droht',
            body: 'Deine Lead-Bewertung ist überfällig (Frist: 2 Tage nach dem Termin). Dies ist eine formale Verwarnung: Fehlt die Bewertung in 2 weiteren Tagen weiterhin, wird dein Partner-Status herabgestuft und deine Sichtbarkeit für User reduziert.\n\n→ Partner-Dashboard → Termine → Dossier öffnen → „Lead bewerten"',
        },
        downgraded_provider: {
            subject: 'Dein Partner-Status wurde herabgestuft',
            body: 'Trotz Verwarnung wurde die verpflichtende Lead-Bewertung nicht abgegeben. Dein Partner-Status wurde herabgestuft — deine Sichtbarkeit in User-Matchings ist reduziert. Reiche die ausstehende Bewertung nach und melde dich unter partners@complihub360.com, um deinen Status wiederherzustellen.',
        },
    },
    es: {
        request_user: {
            subject: '¿Qué tal tu cita? 2 minutos para tu valoración',
            body: 'Tu llamada inicial ha tenido lugar. Valora a tu especialista en los próximos 2 días — tu feedback personaliza tu matching, nos ayuda a reaccionar más rápido ante problemas y mejora tu servicio. Las valoraciones son verificadas y aparecen anonimizadas.\n\n→ Dashboard → Citas → «Valorar proveedor»',
        },
        request_provider: {
            subject: 'Acción requerida: valora tu lead (en 2 días)',
            body: 'Tu cita reservada ha tenido lugar. Como partner de CompliHub360, tu valoración del lead es OBLIGATORIA en un plazo de 2 días — tu ranking y visibilidad dependen de un ciclo de valoraciones activo. Las valoraciones ausentes conllevan una advertencia y posteriormente una degradación con visibilidad reducida.\n\n→ Panel de partner → Citas → abrir dossier → «Valorar este lead»',
        },
        warning_provider: {
            subject: 'Advertencia: valoración vencida — degradación inminente',
            body: 'Tu valoración del lead está vencida (plazo: 2 días tras la cita). Esta es una advertencia formal: si la valoración sigue faltando dentro de 2 días, tu estado de partner será degradado y tu visibilidad ante los usuarios reducida.\n\n→ Panel de partner → Citas → abrir dossier → «Valorar este lead»',
        },
        downgraded_provider: {
            subject: 'Tu estado de partner ha sido degradado',
            body: 'A pesar de la advertencia, la valoración obligatoria del lead no fue enviada. Tu estado de partner ha sido degradado — tu visibilidad en los matchings se ha reducido. Envía la valoración pendiente y contacta con partners@complihub360.com para restaurar tu estado.',
        },
    },
    tr: {
        request_user: {
            subject: 'Randevun nasıldı? Değerlendirmen için 2 dakika',
            body: 'İlk görüşmen gerçekleşti. Uzmanını önümüzdeki 2 gün içinde değerlendir — geri bildirimin eşleştirmeni kişiselleştirir, sorunlara daha hızlı tepki vermemize yardımcı olur ve hizmetini iyileştirir. Değerlendirmeler doğrulanır ve anonim görünür.\n\n→ Panel → Randevular → «Sağlayıcıyı değerlendir»',
        },
        request_provider: {
            subject: 'İşlem gerekli: lead değerlendirmesi (2 gün içinde)',
            body: 'Rezerve edilen randevun gerçekleşti. CompliHub360 partneri olarak lead değerlendirmen 2 gün içinde ZORUNLUDUR — sıralaman ve görünürlüğün aktif bir değerlendirme döngüsüne bağlıdır. Eksik değerlendirmeler uyarıya ve ardından görünürlüğü azaltılmış bir düşürmeye yol açar.\n\n→ Partner paneli → Randevular → dosyayı aç → «Bu lead\'i değerlendir»',
        },
        warning_provider: {
            subject: 'Uyarı: değerlendirme gecikti — düşürme yaklaşıyor',
            body: 'Lead değerlendirmen gecikti (süre: randevudan 2 gün sonra). Bu resmi bir uyarıdır: değerlendirme 2 gün içinde hâlâ eksikse partner statün düşürülecek ve kullanıcılara görünürlüğün azaltılacaktır.\n\n→ Partner paneli → Randevular → dosyayı aç → «Bu lead\'i değerlendir»',
        },
        downgraded_provider: {
            subject: 'Partner statün düşürüldü',
            body: 'Uyarıya rağmen zorunlu lead değerlendirmesi gönderilmedi. Partner statün düşürüldü — eşleştirmelerdeki görünürlüğün azaltıldı. Bekleyen değerlendirmeyi gönder ve statünü geri almak için partners@complihub360.com ile iletişime geç.',
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
