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
}

function actionUrl(action: string, query: string): string {
    return `${PUBLIC_APP_URL}/en/provider/action${query}&action=${action}`;
}

function renderText(m: MagicLinkMail): string {
    // Anonymized dossier stage (Addendum 2026-07-10): the e-mail carries the
    // REDACTED message only — requester identity never travels via e-mail.
    const redacted = m.message ? redactText(m.message, { profile: 'strict' }).sanitizedText : '—';
    return [
        `New engagement request on CompliHub360`,
        ``,
        `Provider: ${m.providerName}`,
        `Scope: ${m.country} · ${m.category}`,
        `Message (anonymized): ${redacted}`,
        `Requester identity: unlocked after you confirm.`,
        ``,
        `Confirm (24h SLA): ${actionUrl('confirm', m.magicLinks.confirm)}`,
        `Reply:             ${actionUrl('reply', m.magicLinks.reply)}`,
        `Decline:           ${actionUrl('decline', m.magicLinks.decline)}`,
        ``,
        `Each link works exactly once and expires after 24 hours.`,
    ].join('\n');
}

// Branded HTML (same shell as the Supabase auth templates: dark slate card,
// serif headline with ONE gold word, gold primary CTA). Table-based + inline
// styles, no external images — see docs/email-templates/.
function renderHtml(m: MagicLinkMail): string {
    const redacted = m.message ? redactText(m.message, { profile: 'strict' }).sanitizedText : '—';
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const btn = (label: string, url: string, primary: boolean) => primary
        ? `<a href="${url}" style="display:block;background-color:#d4af37;border-radius:12px;padding:14px 24px;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#101411;text-decoration:none;">${label} &rarr;</a>`
        : `<a href="${url}" style="display:inline-block;border:1px solid rgba(255,255,255,0.25);border-radius:10px;padding:10px 18px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;color:#e5e7eb;text-decoration:none;">${label}</a>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1620;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="padding:0 8px 24px 8px;"><img src="https://kqylqwogxbiwpnomkzsn.supabase.co/storage/v1/object/public/assets/logo-lockup-email.png" width="207" height="54" alt="CompliHub360 — Compliance. Simplified." style="display:block;border:0;"/></td></tr>
<tr><td style="background-color:#1f2937;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px;">
<div style="font-family:Georgia,serif;font-size:26px;line-height:1.25;font-weight:bold;color:#ffffff;">New <span style="color:#d4af37;">engagement</span> request.</div>
<div style="padding-top:12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#aeb8c4;">A matched client requests your services. Please confirm within <strong style="color:#ffffff;">24 hours</strong>.</div>
<div style="margin-top:22px;background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px 20px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.8;color:#aeb8c4;">
<span style="font-size:10px;letter-spacing:1.2px;color:#77828f;text-transform:uppercase;">Anonymized dossier</span><br/>
<strong style="color:#e5e7eb;">Scope:</strong> ${esc(m.country)} &middot; ${esc(m.category)}<br/>
<strong style="color:#e5e7eb;">Message:</strong> <em>&ldquo;${esc(redacted)}&rdquo;</em><br/>
<span style="color:#77828f;">&#128274; Requester identity unlocks after you confirm.</span>
</div>
<div style="padding-top:24px;">${btn('Confirm engagement', actionUrl('confirm', m.magicLinks.confirm), true)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding-top:12px;" align="left">${btn('Reply to client', actionUrl('reply', m.magicLinks.reply), false)}</td>
<td style="padding-top:12px;" align="right">${btn('Decline', actionUrl('decline', m.magicLinks.decline), false)}</td>
</tr></table>
<div style="margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.08);font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#77828f;">&#128274;&nbsp; Each link works <strong style="color:#aeb8c4;">once</strong> and expires after 24 hours.<br/>&#9200;&nbsp; Fast confirmations improve your partner ranking.</div>
</td></tr>
<tr><td style="padding:24px 8px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#5b6673;">CompliHub360 &mdash; the orchestration layer between compliance complexity and operational reality.<br/>You received this e-mail because your firm is a listed provider on complihub360.com.</td></tr>
</table></td></tr></table>`;
}

export async function sendMagicLinkMail(m: MagicLinkMail): Promise<void> {
    const subject = `New request · ${m.country} ${m.category} — please confirm within 24h`;
    const text = renderText(m);
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
            body: JSON.stringify({ from: MAIL_FROM, to: [m.contactEmail], subject, text, html: renderHtml(m) }),
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
