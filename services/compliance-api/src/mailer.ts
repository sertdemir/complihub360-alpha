import { supabaseApi } from './supabase.js';
import { structuredLog } from '@complihub360/types';

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
    return [
        `New engagement request on CompliHub360`,
        ``,
        `Provider: ${m.providerName}`,
        `Scope: ${m.country} · ${m.category}`,
        `Message: ${m.message || '—'}`,
        ``,
        `Confirm (24h SLA): ${actionUrl('confirm', m.magicLinks.confirm)}`,
        `Reply:             ${actionUrl('reply', m.magicLinks.reply)}`,
        `Decline:           ${actionUrl('decline', m.magicLinks.decline)}`,
        ``,
        `Each link works exactly once and expires after 24 hours.`,
    ].join('\n');
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
            body: JSON.stringify({ from: MAIL_FROM, to: [m.contactEmail], subject, text }),
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
