import type { IncomingMessage, ServerResponse } from "node:http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";

// ─── Nutzer-Vereinbarungen (Beta-Vereinbarung) ──────────────────────────────
//
// Canvas-Wahl 22.10.2026 (1A · 2A · 3A+3C · 4C): In der geschlossenen Beta
// ersetzt ein Blatt in neun Saetzen die AGB. Der Text liegt versioniert und
// je Sprache in user_agreements (oeffentlich); die Annahme je Nutzer in
// user_agreement_acceptance (append-only). Drei Routen:
//
//   GET  /api/v1/agreements/:agreement?lang=   oeffentlich, die aktuelle Fassung
//   GET  /api/v1/me/agreements                 Stand des Nutzers je Vereinbarung
//   POST /api/v1/me/agreements/:agreement      Annahme { version, language }
//
// DNA: Verstehen vor Zustimmen — die Route liefert den Text, der Schritt im
// Frontend zeigt ihn, bevor ein Haken verlangt wird. Eine veraltete Fassung
// wird nicht still angenommen (409 mit current_version), damit niemand etwas
// bestaetigt, das er nicht gesehen hat.

export const USER_AGREEMENTS = ['beta', 'terms'] as const;
export type UserAgreementName = typeof USER_AGREEMENTS[number];

export interface AgreementRow {
    agreement: string;
    version: string;
    language: string;
    title: string;
    points: Array<{ lead: string; text: string }>;
    effective_from: string;
}

export interface AcceptanceRow {
    id: string;
    user_id: string;
    agreement: string;
    version: string;
    language: string;
    accepted_at: string;
}

export interface AgreementState {
    agreement: string;
    current_version: string | null;
    accepted_version: string | null;
    accepted_at: string | null;
    language: string | null;
    /** true, wenn eine Fassung gilt und der Nutzer sie (noch) nicht angenommen hat. */
    required: boolean;
}

/** Die neueste geltende Fassung einer Vereinbarung in der Sprache, Rueckfall Englisch, sonst irgendeine. */
export function currentAgreement(rows: AgreementRow[], agreement: string, lang: string, today: Date = new Date()): AgreementRow | null {
    const day = today.toISOString().slice(0, 10);
    const live = rows.filter((r) => r.agreement === agreement && String(r.effective_from) <= day);
    if (!live.length) return null;
    const newest = live.reduce((a, b) => (String(b.effective_from) > String(a.effective_from)
        || (String(b.effective_from) === String(a.effective_from) && b.version > a.version)) ? b : a);
    const sameVersion = live.filter((r) => r.version === newest.version);
    const want = String(lang || 'en').slice(0, 2).toLowerCase();
    return sameVersion.find((r) => r.language === want) ?? sameVersion.find((r) => r.language === 'en') ?? sameVersion[0];
}

/** Stand eines Nutzers: angenommen ist die juengste Annahme; erforderlich, wenn sie nicht die geltende Fassung ist. */
export function acceptanceState(agreement: string, current: AgreementRow | null, acceptances: AcceptanceRow[]): AgreementState {
    const own = acceptances.filter((a) => a.agreement === agreement)
        .sort((a, b) => (String(a.accepted_at) < String(b.accepted_at) ? 1 : -1));
    const latest = own[0] ?? null;
    return {
        agreement,
        current_version: current ? current.version : null,
        accepted_version: latest ? latest.version : null,
        accepted_at: latest ? latest.accepted_at : null,
        language: latest ? latest.language : null,
        required: !!current && (!latest || latest.version !== current.version),
    };
}

// ─── Routen ─────────────────────────────────────────────────────────────────

type Json = Record<string, any>;

function readJson(req: IncomingMessage, max = 4_000): Promise<Json> {
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', (c: Buffer) => { raw += c.toString(); if (raw.length > max) req.destroy(); });
        req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
    });
}

function json(res: ServerResponse, status: number, body: Json): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

async function logEvent(type: string, payload: Record<string, unknown>, correlationId: string): Promise<void> {
    try {
        await supabaseApi.insert('event_log', { type, payload });
    } catch (err) {
        structuredLog('error', 'event_log insert failed', { correlationId, errorCode: 'ERR_EVENT_LOG', severity: 'error', type, detail: String(err).slice(0, 200) } as any);
    }
}

const isAgreementName = (s: string): s is UserAgreementName => (USER_AGREEMENTS as readonly string[]).includes(s);

async function loadAgreements(): Promise<AgreementRow[]> {
    return (await supabaseApi.select('user_agreements', {}, { limit: 200 })) as AgreementRow[];
}

/**
 * Bedient die drei Vereinbarungs-Routen. Gibt true zurueck, wenn die URL hier
 * gehoert (dann ist geantwortet), sonst false. Auth ist zentral geprueft:
 * /me/* kommt nie ohne gueltiges JWT hier an; ein Server-Schluessel ohne
 * Nutzer bekommt 401, weil eine Annahme ohne Nutzer nichts bedeutet.
 */
export async function handleAgreementsRoute(req: IncomingMessage, res: ServerResponse, ctx: { correlationId: string; authUserId: string | null }): Promise<boolean> {
    const url = new URL(req.url || '/', 'http://x');
    const { correlationId, authUserId } = ctx;

    const pub = /^\/api\/v1\/agreements\/([a-z-]+)$/.exec(url.pathname);
    if (req.method === 'GET' && pub) {
        res.setHeader('x-correlation-id', correlationId);
        const name = pub[1];
        if (!isAgreementName(name)) { json(res, 404, { errorCode: 'AGREEMENT_UNKNOWN', message: 'Unknown agreement', correlationId }); return true; }
        try {
            const lang = (url.searchParams.get('lang') || 'en').slice(0, 2).toLowerCase();
            const row = currentAgreement(await loadAgreements(), name, lang);
            if (!row) { json(res, 503, { errorCode: 'AGREEMENT_MISSING', message: 'No agreement text is configured', correlationId }); return true; }
            json(res, 200, { ok: true, agreement: row.agreement, version: row.version, language: row.language, title: row.title, points: row.points, effective_from: row.effective_from, correlationId });
        } catch (err) {
            structuredLog('error', 'agreement read failed', { correlationId, errorCode: 'ERR_AGREEMENT_READ', severity: 'error', detail: String(err).slice(0, 200) } as any);
            json(res, 500, { errorCode: 'INTERNAL', message: 'Agreement read failed', correlationId });
        }
        return true;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/me/agreements') {
        res.setHeader('x-correlation-id', correlationId);
        if (!authUserId) { json(res, 401, { errorCode: 'UNAUTHORIZED', message: 'A user login is required', correlationId }); return true; }
        try {
            const lang = (url.searchParams.get('lang') || 'en').slice(0, 2).toLowerCase();
            const [rows, acc] = await Promise.all([
                loadAgreements(),
                supabaseApi.select('user_agreement_acceptance', { user_id: authUserId }, { order: 'accepted_at.desc', limit: 100 }) as Promise<AcceptanceRow[]>,
            ]);
            const agreements: Record<string, AgreementState> = {};
            for (const name of USER_AGREEMENTS) agreements[name] = acceptanceState(name, currentAgreement(rows, name, lang), acc);
            json(res, 200, { ok: true, agreements, correlationId });
        } catch (err) {
            structuredLog('error', 'agreement state read failed', { correlationId, errorCode: 'ERR_AGREEMENT_READ', severity: 'error', detail: String(err).slice(0, 200) } as any);
            json(res, 500, { errorCode: 'INTERNAL', message: 'Agreement state read failed', correlationId });
        }
        return true;
    }

    const acceptM = /^\/api\/v1\/me\/agreements\/([a-z-]+)$/.exec(url.pathname);
    if (req.method === 'POST' && acceptM) {
        res.setHeader('x-correlation-id', correlationId);
        const name = acceptM[1];
        if (!isAgreementName(name)) { json(res, 404, { errorCode: 'AGREEMENT_UNKNOWN', message: 'Unknown agreement', correlationId }); return true; }
        if (!authUserId) { json(res, 401, { errorCode: 'UNAUTHORIZED', message: 'A user login is required', correlationId }); return true; }
        const body = await readJson(req);
        const version = typeof body.version === 'string' ? body.version.trim() : '';
        const language = typeof body.language === 'string' && /^[a-z]{2}$/i.test(body.language.trim()) ? body.language.trim().toLowerCase() : 'en';
        if (!version) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'version is required', correlationId }); return true; }
        try {
            const rows = await loadAgreements();
            const current = currentAgreement(rows, name, language);
            if (!current) { json(res, 503, { errorCode: 'AGREEMENT_MISSING', message: 'No agreement text is configured', correlationId }); return true; }
            if (current.version !== version) {
                // Nicht still die neue Fassung unterschieben: der Nutzer hat eine
                // andere gesehen. Das Frontend laedt neu und zeigt sie.
                json(res, 409, { errorCode: 'AGREEMENT_OUTDATED', message: 'A newer version applies', current_version: current.version, correlationId });
                return true;
            }
            // Die Sprache der Annahme muss als Zeile existieren (FK); sonst die Fassung, die geliefert wurde.
            const storedLang = rows.some((r) => r.agreement === name && r.version === version && r.language === language) ? language : current.language;
            const existing = (await supabaseApi.select('user_agreement_acceptance', { user_id: authUserId, agreement: name, version }, { limit: 1 })) as AcceptanceRow[];
            if (existing.length) {
                json(res, 200, { ok: true, replay: true, agreement: name, version, accepted_at: existing[0].accepted_at, language: existing[0].language, correlationId });
                return true;
            }
            const inserted = (await supabaseApi.insert('user_agreement_acceptance', {
                user_id: authUserId, agreement: name, version, language: storedLang, audit_ref: correlationId,
            })) as AcceptanceRow[];
            const row = inserted[0];
            await logEvent('agreement_accepted', { userId: authUserId, agreement: name, version, language: storedLang, correlationId }, correlationId);
            json(res, 201, { ok: true, agreement: name, version, language: storedLang, accepted_at: row?.accepted_at ?? new Date().toISOString(), correlationId });
        } catch (err) {
            structuredLog('error', 'agreement acceptance failed', { correlationId, errorCode: 'ERR_AGREEMENT_ACCEPT', severity: 'error', detail: String(err).slice(0, 200) } as any);
            json(res, 500, { errorCode: 'INTERNAL', message: 'Agreement acceptance failed', correlationId });
        }
        return true;
    }

    return false;
}
