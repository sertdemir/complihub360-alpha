import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { structuredLog } from '@complihub360/types';
import type { ContactRequest, OutgoingMail, SendResult } from './contact.js';
import type { Caller } from './providerAuth.js';

// ─── Bewerbung sichten, einladen, einloesen ──────────────────────────────────
//
// Entscheidung der Mitgruenderin, 24.11.2026 (Provider-Beta-Test P01). Drei
// Stufen, jede mit ihrem eigenen Wort:
//
//   received    Die Bewerbung ist da. Ein Mensch sichtet sie im Admin-Bereich.
//   invited     "Zum Onboarding einladen": das System verschickt einen Link,
//               der nur zu dieser Bewerbung gehoert. Der Zeitpunkt steht dran.
//   onboarding  Der Link wurde eingeloest: es gibt ein Konto und einen
//               Anbieter im Entwurf. Ab hier laeuft der bestehende Weg
//               (Application, Nachweise, Einreichen, Pruefung).
//
// "Eingeladen" ist NICHT "verifiziert". Der Anbieter entsteht mit
// partner_status 'inactive' und lifecycle_status 'draft'; sichtbar und
// buchbar wird er erst durch die Pruefung (providerReview.ts). Es bleibt
// dabei, dass sich kein Anbieter selbst registriert (v2 §10/D7): ohne
// Einladung gibt es kein Konto.
//
//   GET  /api/v1/admin/provider-applications             Liste (Admin)
//   POST /api/v1/admin/provider-applications/:id/invite  einladen (Admin)
//   GET  /api/v1/provider-invite?token=…                 Link pruefen (offen)
//   POST /api/v1/provider-invite/accept                  Konto einrichten (offen)
//
// Der Link ist der Ausweis der beiden offenen Routen. In der Datenbank steht
// nur sein SHA-256; eine neue Einladung macht die alte ungueltig.

export const INVITE_DAYS = 14;
export const PASSWORD_MIN = 8;
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RX = /^[A-Za-z0-9_-]{40,64}$/;
type Locale = 'en' | 'de' | 'es' | 'tr';

export interface ApplicationRow {
    id: string;
    reference: string;
    created_at: string;
    locale: Locale;
    first_name: string | null;
    contact_name: string;
    email: string;
    firm: string;
    website: string | null;
    credentials: string;
    areas: string[];
    markets: string[];
    message: string | null;
    status: 'received' | 'invited' | 'onboarding';
    invited_at: string | null;
    invited_by: string | null;
    invite_token_hash: string | null;
    invite_expires_at: string | null;
    invite_send_count: number;
    redeemed_at: string | null;
    provider_key: string | null;
    user_id: string | null;
}

/** Die Zeile, die aus einer Bewerbung der Kontaktroute wird. */
export function applicationRowOf(r: ContactRequest, reference: string): Record<string, unknown> {
    const a = r.application!;
    return {
        reference,
        locale: r.locale,
        first_name: a.firstName,
        contact_name: r.name,
        email: r.email,
        firm: a.firm,
        website: a.website,
        credentials: a.credentials,
        areas: a.areas,
        markets: a.markets,
        message: r.message || null,
    };
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}
export function newToken(): string {
    return randomBytes(32).toString('base64url');
}

/** Was der Admin-Bereich sieht: alles aus dem Formular, nie der Hash. */
export function adminView(row: ApplicationRow, now: Date) {
    const expired = row.status === 'invited' && !!row.invite_expires_at && new Date(row.invite_expires_at).getTime() <= now.getTime();
    return {
        id: row.id,
        reference: row.reference,
        created_at: row.created_at,
        locale: row.locale,
        first_name: row.first_name,
        contact_name: row.contact_name,
        email: row.email,
        firm: row.firm,
        website: row.website,
        credentials: row.credentials,
        areas: row.areas ?? [],
        markets: row.markets ?? [],
        message: row.message,
        status: row.status,
        invited_at: row.invited_at,
        invite_expires_at: row.invite_expires_at,
        invite_expired: expired,
        invite_send_count: row.invite_send_count ?? 0,
        redeemed_at: row.redeemed_at,
        provider_key: row.provider_key,
    };
}

// ─── Die Einladungsmail ──────────────────────────────────────────────────────
// Entwurf vom 24.11.2026, noch nicht abgenommen; de, es und tr sind nicht von
// Muttersprachlern freigegeben. Die Mail sagt, was der Link tut, bis wann er
// gilt und dass eingeladen nicht verifiziert heisst. Keine Dringlichkeit.

type InviteStrings = {
    subject: string;
    hello: string;
    helloName: string;
    intro: string;
    steps: string;
    link: string;
    valid: string;
    notVerified: string;
    reply: string;
};

const INVITE: Record<Locale, InviteStrings> = {
    en: {
        subject: 'Your invitation to CompliHub360 provider onboarding',
        hello: 'Hello,',
        helloName: 'Hi {name},',
        intro: 'thank you for your application for {firm}. We’d like to invite you to continue with onboarding.',
        steps: 'With your invitation link you can set up your account, complete your company profile, see which documents are needed and upload them.',
        link: 'Your invitation link',
        valid: 'The link belongs to your application and is valid until {date}.',
        notVerified: 'Verification begins once you’ve submitted your details and documents. Your firm is listed as verified only after that review.',
        reply: 'If you have a question, you can reply to this message.',
    },
    de: {
        subject: 'Ihre Einladung zum Onboarding als CompliHub360-Anbieter',
        hello: 'Guten Tag,',
        helloName: 'Guten Tag {name},',
        intro: 'vielen Dank für Ihre Bewerbung für {firm}. Wir laden Sie ein, mit dem Onboarding fortzufahren.',
        steps: 'Über Ihren Einladungslink richten Sie Ihr Konto ein, vervollständigen Ihr Unternehmensprofil, sehen, welche Nachweise benötigt werden, und laden sie hoch.',
        link: 'Ihr Einladungslink',
        valid: 'Der Link gehört zu Ihrer Bewerbung und gilt bis {date}.',
        notVerified: 'Die Verifizierung beginnt, sobald Sie Ihre Angaben und Nachweise eingereicht haben. Als verifiziert wird Ihr Unternehmen erst nach dieser Prüfung geführt.',
        reply: 'Bei Fragen können Sie auf diese Nachricht antworten.',
    },
    es: {
        subject: 'Su invitación al onboarding como proveedor de CompliHub360',
        hello: 'Hola:',
        helloName: 'Hola, {name}:',
        intro: 'gracias por su solicitud para {firm}. Le invitamos a continuar con el onboarding.',
        steps: 'Con su enlace de invitación puede crear su cuenta, completar el perfil de su empresa, ver qué documentos se necesitan y subirlos.',
        link: 'Su enlace de invitación',
        valid: 'El enlace pertenece a su solicitud y es válido hasta el {date}.',
        notVerified: 'La verificación comienza cuando haya enviado sus datos y documentos. Su empresa figura como verificada solo después de esa revisión.',
        reply: 'Si tiene alguna pregunta, puede responder a este mensaje.',
    },
    tr: {
        subject: 'CompliHub360 sağlayıcı onboarding davetiniz',
        hello: 'Merhaba,',
        helloName: 'Merhaba {name},',
        intro: '{firm} için yaptığınız başvuru için teşekkür ederiz. Sizi onboarding sürecine devam etmeye davet ediyoruz.',
        steps: 'Davet bağlantınızla hesabınızı oluşturabilir, şirket profilinizi tamamlayabilir, hangi belgelerin gerektiğini görebilir ve bunları yükleyebilirsiniz.',
        link: 'Davet bağlantınız',
        valid: 'Bağlantı başvurunuza aittir ve {date} tarihine kadar geçerlidir.',
        notVerified: 'Doğrulama, bilgilerinizi ve belgelerinizi gönderdiğinizde başlar. Şirketiniz ancak bu incelemeden sonra doğrulanmış olarak gösterilir.',
        reply: 'Bir sorunuz varsa bu mesajı yanıtlayabilirsiniz.',
    },
};

const DATE_LOCALE: Record<Locale, string> = { en: 'en-GB', de: 'de-DE', es: 'es-ES', tr: 'tr-TR' };

export function inviteUrl(appUrl: string, locale: Locale, token: string): string {
    return `${appUrl.replace(/\/$/, '')}/${locale}/provider-invite?token=${token}`;
}

export function renderInviteMail(row: Pick<ApplicationRow, 'locale' | 'first_name' | 'firm' | 'email'>, url: string, expires: Date, replyTo: string | null): OutgoingMail {
    const t = INVITE[row.locale] ?? INVITE.en;
    const date = expires.toLocaleDateString(DATE_LOCALE[row.locale] ?? 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const text = [
        row.first_name ? t.helloName.replace('{name}', row.first_name) : t.hello,
        t.intro.replace('{firm}', row.firm),
        '',
        t.steps,
        '',
        `${t.link}:`,
        url,
        '',
        t.valid.replace('{date}', date),
        '',
        t.notVerified,
        '',
        t.reply,
        '',
        'CompliHub360',
    ].join('\n');
    return { to: row.email, subject: t.subject, text, ...(replyTo ? { replyTo } : {}) };
}

// ─── Abhaengigkeiten ─────────────────────────────────────────────────────────

export type CreateUserResult =
    | { ok: true; userId: string }
    | { ok: false; reason: 'exists' | 'weak_password' | 'failed' };

export interface InviteDb {
    select(table: string, match: Record<string, unknown>, opts?: { order?: string; limit?: number }): Promise<unknown>;
    insert(table: string, data: Record<string, unknown>): Promise<unknown>;
    update(table: string, match: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown>;
}

export interface InviteDeps {
    db: InviteDb;
    send: ((mail: OutgoingMail, from: string) => Promise<SendResult>) | null;
    mailFrom: string;
    inbox: string | null;
    appUrl: string;
    createUser: (p: { email: string; password: string; fullName: string }) => Promise<CreateUserResult>;
    now: () => Date;
}

/** Legt den Login an: bestaetigt (die Einladung kam an genau diese Adresse)
 *  und mit der Rolle, die den Anbieterbereich oeffnet. */
export function supabaseUserCreator(supabaseUrl: string | undefined, serviceKey: string | undefined): InviteDeps['createUser'] {
    return async ({ email, password, fullName }) => {
        if (!supabaseUrl || !serviceKey) return { ok: false, reason: 'failed' };
        const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users`, {
            method: 'POST',
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName }, app_metadata: { role: 'partner' } }),
        });
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        if (res.ok && typeof body.id === 'string') return { ok: true, userId: body.id };
        const code = `${body.error_code ?? ''} ${body.msg ?? ''} ${body.message ?? ''}`.toLowerCase();
        if (code.includes('email_exists') || code.includes('already been registered') || code.includes('already registered')) return { ok: false, reason: 'exists' };
        if (code.includes('weak_password') || code.includes('password')) return { ok: false, reason: 'weak_password' };
        return { ok: false, reason: 'failed' };
    };
}

type Outcome = { status: number; body: Record<string, unknown> };

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function listApplications(deps: InviteDeps): Promise<Outcome> {
    const rows = (await deps.db.select('provider_applications', {}, { order: 'created_at.desc', limit: 200 })) as ApplicationRow[];
    const now = deps.now();
    const views = rows.map((r) => adminView(r, now));
    return {
        status: 200,
        body: {
            ok: true,
            applications: views,
            counts: {
                total: views.length,
                received: views.filter((v) => v.status === 'received').length,
                invited: views.filter((v) => v.status === 'invited').length,
                onboarding: views.filter((v) => v.status === 'onboarding').length,
            },
        },
    };
}

/** Einladen oder erneut einladen. Erst die Mail, dann der Stand: geht die
 *  Mail nicht hinaus, bleibt die Bewerbung, wie sie war, und der Admin sieht
 *  den Fehler, statt eine Einladung, die niemand bekommen hat. */
export async function inviteApplication(deps: InviteDeps, id: string, invitedBy: string | null): Promise<Outcome> {
    if (!UUID_RX.test(id)) return { status: 400, body: { errorCode: 'VALIDATION_ERROR', message: 'Unknown application id' } };
    const row = ((await deps.db.select('provider_applications', { id }, { limit: 1 })) as ApplicationRow[])[0];
    if (!row) return { status: 404, body: { errorCode: 'NOT_FOUND', message: 'Application not found' } };
    if (row.status === 'onboarding') {
        return { status: 409, body: { errorCode: 'ALREADY_ONBOARDING', message: 'This invitation was already used; the provider has an account' } };
    }
    if (!deps.send) return { status: 503, body: { errorCode: 'MAIL_UNAVAILABLE', message: 'Mail delivery is not configured; no invitation was sent' } };

    const token = newToken();
    const now = deps.now();
    const expires = new Date(now.getTime() + INVITE_DAYS * 86_400_000);
    // Der Hash steht, bevor die Mail geht: sonst waere ein zugestellter Link
    // nicht einloesbar. Scheitert der Versand, wird er wieder entfernt.
    const before = { invite_token_hash: row.invite_token_hash, invite_expires_at: row.invite_expires_at };
    await deps.db.update('provider_applications', { id }, { invite_token_hash: hashToken(token), invite_expires_at: expires.toISOString() });
    let sent: SendResult;
    try {
        sent = await deps.send(renderInviteMail(row, inviteUrl(deps.appUrl, row.locale, token), expires, deps.inbox), deps.mailFrom);
    } catch {
        sent = { ok: false, status: 0 };
    }
    if (!sent.ok) {
        await deps.db.update('provider_applications', { id }, before);
        await deps.db.insert('event_log', { type: 'provider_invite_failed', payload: { applicationId: id, status: sent.status } }).catch(() => {});
        return { status: 502, body: { errorCode: 'INVITE_SEND_FAILED', message: 'The invitation could not be sent; nothing was changed' } };
    }
    const patch = { status: 'invited', invited_at: now.toISOString(), invited_by: invitedBy, invite_send_count: (row.invite_send_count ?? 0) + 1 };
    await deps.db.update('provider_applications', { id }, patch);
    await deps.db.insert('event_log', { type: 'provider_invited', payload: { applicationId: id, by: invitedBy, resend: row.status === 'invited' } }).catch(() => {});
    return { status: 200, body: { ok: true, application: adminView({ ...row, ...patch, invite_expires_at: expires.toISOString() } as ApplicationRow, now) } };
}

// ─── Der Link ────────────────────────────────────────────────────────────────

type TokenCheck = { ok: true; row: ApplicationRow } | { ok: false; outcome: Outcome };

async function byToken(deps: InviteDeps, token: unknown): Promise<TokenCheck> {
    const invalid: Outcome = { status: 404, body: { errorCode: 'INVITE_INVALID', message: 'This invitation link is not valid' } };
    if (typeof token !== 'string' || !TOKEN_RX.test(token)) return { ok: false, outcome: invalid };
    const row = ((await deps.db.select('provider_applications', { invite_token_hash: hashToken(token) }, { limit: 1 })) as ApplicationRow[])[0];
    if (!row) return { ok: false, outcome: invalid };
    if (row.status === 'onboarding' || row.redeemed_at) {
        return { ok: false, outcome: { status: 409, body: { errorCode: 'INVITE_USED', message: 'This invitation was already used' } } };
    }
    if (!row.invite_expires_at || new Date(row.invite_expires_at).getTime() <= deps.now().getTime()) {
        return { ok: false, outcome: { status: 410, body: { errorCode: 'INVITE_EXPIRED', message: 'This invitation has expired' } } };
    }
    return { ok: true, row };
}

/** Was die Einladungsseite zeigen darf: Vorname, Firma, die Adresse des Kontos. */
export async function readInvite(deps: InviteDeps, token: unknown): Promise<Outcome> {
    const c = await byToken(deps, token);
    if (!c.ok) return c.outcome;
    return { status: 200, body: { ok: true, invite: { first_name: c.row.first_name, firm: c.row.firm, email: c.row.email, expires_at: c.row.invite_expires_at } } };
}

function slugOf(firm: string): string {
    return firm.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52) || 'provider';
}

/** Konto einrichten. Jeder Schritt merkt sich an der Bewerbung, was schon da
 *  ist: bricht es nach dem Anbieter oder nach dem Login ab, setzt ein zweiter
 *  Versuch dort fort, statt Doppeltes anzulegen. */
export async function acceptInvite(deps: InviteDeps, input: Record<string, unknown>): Promise<Outcome> {
    const c = await byToken(deps, input.token);
    if (!c.ok) return c.outcome;
    const row = c.row;
    const password = typeof input.password === 'string' ? input.password : '';
    if (password.length < PASSWORD_MIN || password.length > 200) {
        return { status: 400, body: { errorCode: 'VALIDATION_ERROR', field: 'password', message: `password: at least ${PASSWORD_MIN} characters` } };
    }

    let providerKey = row.provider_key;
    if (!providerKey) {
        const base = slugOf(row.firm);
        const taken = ((await deps.db.select('providers', { provider_key: base }, { limit: 1 })) as unknown[]).length > 0;
        providerKey = taken ? `${base}-${row.id.slice(0, 6)}` : base;
        await deps.db.insert('providers', {
            provider_key: providerKey,
            name: row.firm,
            website_url: row.website,
            partner_status: 'inactive', // sichtbar erst nach der Pruefung
            countries_supported: [],
            languages: [],
            categories: [],
        });
        await deps.db.update('provider_applications', { id: row.id }, { provider_key: providerKey });
    }

    let userId = row.user_id;
    if (!userId) {
        const made = await deps.createUser({ email: row.email, password, fullName: row.contact_name });
        if (!made.ok) {
            if (made.reason === 'exists') {
                return { status: 409, body: { errorCode: 'EMAIL_HAS_LOGIN', message: 'A login with this address already exists; it has to be linked by the team' } };
            }
            if (made.reason === 'weak_password') {
                return { status: 400, body: { errorCode: 'VALIDATION_ERROR', field: 'password', message: 'password rejected as too weak' } };
            }
            return { status: 502, body: { errorCode: 'ACCOUNT_FAILED', message: 'The account could not be created' } };
        }
        userId = made.userId;
        await deps.db.update('provider_applications', { id: row.id }, { user_id: userId });
    }

    const member = (await deps.db.select('provider_members', { provider_key: providerKey }, { limit: 1 })) as unknown[];
    if (!member.length) await deps.db.insert('provider_members', { provider_key: providerKey, user_id: userId, role: 'owner' });
    await deps.db.update('provider_applications', { id: row.id }, { status: 'onboarding', redeemed_at: deps.now().toISOString(), invite_token_hash: null });
    await deps.db.insert('event_log', { type: 'provider_invite_accepted', payload: { applicationId: row.id, providerKey } }).catch(() => {});
    return { status: 201, body: { ok: true, provider_key: providerKey, email: row.email } };
}

// ─── HTTP ────────────────────────────────────────────────────────────────────

function json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: unknown) => {
            body += String(chunk);
            if (body.length > 8_000) reject(new Error('payload too large'));
        });
        req.on('end', () => {
            try {
                const d = JSON.parse(body || '{}');
                resolve(d && typeof d === 'object' ? d as Record<string, unknown> : {});
            } catch {
                reject(new Error('invalid json'));
            }
        });
        req.on('error', reject);
    });
}

const ADMIN_LIST = /^\/api\/v1\/admin\/provider-applications(?:\?.*)?$/;
const ADMIN_INVITE = /^\/api\/v1\/admin\/provider-applications\/([^/?]+)\/invite$/;
const PUBLIC_READ = /^\/api\/v1\/provider-invite(?:\?.*)?$/;
const PUBLIC_ACCEPT = /^\/api\/v1\/provider-invite\/accept$/;
/** Fuer PUBLIC_ROUTES in index.ts: der Link ist der Ausweis. */
export const INVITE_PUBLIC_ROUTES: Array<[string, RegExp]> = [['GET', PUBLIC_READ], ['POST', PUBLIC_ACCEPT]];

// Eigenes Limit der beiden offenen Routen: 30 Aufrufe je Adresse in 15
// Minuten. Der Link hat 256 Bit und laesst sich nicht erraten; das Limit haelt
// trotzdem das Durchprobieren und das wiederholte Anlegen klein.
const WINDOW_MS = 15 * 60 * 1000;
export const INVITE_LIMIT = 30;
const hits = new Map<string, number[]>();
export function inviteRateLimited(ip: string, now = Date.now()): boolean {
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= INVITE_LIMIT) { hits.set(ip, recent); return true; }
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 10_000) {
        for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
    return false;
}
export function resetInviteLimit(): void { hits.clear(); }

/** `true`, wenn die URL diesem Modul gehoert. */
export async function handleProviderInvites(req: IncomingMessage, res: ServerResponse, correlationId: string,
    caller: Caller, deps: InviteDeps, ip: string): Promise<boolean> {
    const url = req.url || '';
    const method = req.method || 'GET';
    const invite = ADMIN_INVITE.exec(url);
    const isAdminRoute = ADMIN_LIST.test(url) || !!invite;
    const isPublic = PUBLIC_READ.test(url) || PUBLIC_ACCEPT.test(url);
    if (!isAdminRoute && !isPublic) return false;
    res.setHeader('x-correlation-id', correlationId);
    const done = (o: Outcome) => { json(res, o.status, { ...o.body, correlationId }); return true; };
    try {
        if (isAdminRoute) {
            if (!caller.isAdmin && !caller.viaApiKey) return done({ status: 403, body: { errorCode: 'FORBIDDEN', message: 'Admin only' } });
            if (ADMIN_LIST.test(url) && method === 'GET') return done(await listApplications(deps));
            if (invite && method === 'POST') return done(await inviteApplication(deps, invite[1], caller.userId));
            return done({ status: 405, body: { errorCode: 'METHOD_NOT_ALLOWED', message: 'Not supported on this route' } });
        }
        if (inviteRateLimited(ip)) return done({ status: 429, body: { errorCode: 'RATE_LIMIT_EXCEEDED', message: 'Too many attempts, please try again later' } });
        if (PUBLIC_READ.test(url) && method === 'GET') {
            return done(await readInvite(deps, new URL(url, 'http://x').searchParams.get('token')));
        }
        if (PUBLIC_ACCEPT.test(url) && method === 'POST') return done(await acceptInvite(deps, await readBody(req)));
        return done({ status: 405, body: { errorCode: 'METHOD_NOT_ALLOWED', message: 'Not supported on this route' } });
    } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'invalid json' || msg === 'payload too large') {
            return done({ status: 400, body: { errorCode: 'VALIDATION_ERROR', message: msg === 'invalid json' ? 'Body must be JSON' : 'Body too large' } });
        }
        structuredLog('error', 'Provider invite route failed', { correlationId, errorCode: 'ERR_PROVIDER_INVITE', severity: 'error', route: url.split('?')[0] });
        return done({ status: 500, body: { errorCode: 'INTERNAL', message: 'Request failed' } });
    }
}
