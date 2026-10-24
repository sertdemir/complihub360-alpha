import type { IncomingMessage, ServerResponse } from "node:http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";
import { publicTitle, maskIdentity, type IdentityContext } from "./anonymity.js";
import { priceRangeOf, timelineRangeOf, type PriceRange, type TimelineRange } from "./searchCoverage.js";

// ─── Gemerkte Anbieter (Handover 1.0 §5 "Add to Selection") ─────────────────
//
// Nutzerentscheidung 24.10.2026: "Add to Selection" kommt zusammen mit der
// Merkliste im Arbeitsbereich. Drei Routen, alle nur mit Nutzer-Login:
//
//   GET    /api/v1/me/saved-providers         die Merkliste, anonym
//   PUT    /api/v1/me/saved-providers/:ref    merken { session_id? }
//   DELETE /api/v1/me/saved-providers/:ref    vergessen
//
// Drei Regeln:
//   1. Anonym bis zur Buchung (ADR-0004): die Liste traegt dieselben Felder
//      der Klasse anonymous wie die Suche, die Region durch das Identitaets-
//      Netz. Der Name steht nur in der Buchung, nie hier.
//   2. Die Liste ist KEIN Detail-Aufruf. GET /p/:ref/detail schreibt
//      `provider_detail_opened` (billable); wer seine Merkliste oeffnet, darf
//      keinem Anbieter etwas in Rechnung stellen.
//   3. Der Anbieter erfaehrt nichts: kein Event, keine Benachrichtigung.

const PUBLIC_REF_RX = /^[0-9a-f]{12}$/;
/** Hoechstens so viele Eintraege je Nutzer. Die Liste liest genau so viele;
 *  PUT nimmt den naechsten nicht an (409), statt die aeltesten still aus der
 *  Liste fallen zu lassen. */
export const SAVED_MAX = 200;
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SavedRow {
    user_id: string;
    provider_key: string;
    session_id: string | null;
    created_at: string;
}

/** Ein Eintrag der Merkliste. `available: false`: der Anbieter steht nicht
 *  mehr in der View — die Liste sagt das, statt ihn still zu verschweigen. */
export type SavedProvider =
    | {
        available: true;
        public_ref: string;
        title: string;
        letter: string;
        descriptor: string;
        area_codes: string[];
        descriptor_region: string | null;
        specializations: string[];
        markets: string[];
        completed_count: number | null;
        avg_response_hours: number | null;
        billing_model: string;
        price_range: PriceRange | null;
        timeline_days: TimelineRange | null;
        saved_at: string;
        session_id: string | null;
    }
    | { available: false; public_ref: string | null; saved_at: string };

export interface SavedDeps {
    /** Zeilen der View matchable_provider_services je Anbieter. */
    matchableRows: (providerKey: string) => Promise<any[]>;
    /** Bereichsname aus der Taxonomie. */
    areaLabels: (codes: string[]) => Promise<Map<string, string>>;
}

const identityCtx = (p: any): IdentityContext => ({ providerName: p?.name ?? null, website: p?.website_url ?? null });

/** Rein: aus gemerkten Zeilen, Anbietern und View-Zeilen die anonyme Liste.
 *  Der Buchstabe ist die Position in DIESER Liste (wie in der Suche), ueber
 *  die verfuegbaren Eintraege, neueste zuerst. */
export function buildSavedList(
    rows: SavedRow[],
    providers: Map<string, any>,
    views: Map<string, any[]>,
    labels: Map<string, string>,
): SavedProvider[] {
    const sorted = [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    let i = 0;
    return sorted.map((row): SavedProvider => {
        const p = providers.get(row.provider_key);
        const view = views.get(row.provider_key) ?? [];
        if (!p || !view.length) return { available: false, public_ref: p?.public_ref ?? null, saved_at: row.created_at };
        const areas = [...new Set(view.map((r: any) => r.area_code).filter(Boolean) as string[])].sort();
        const specializations = [...new Set(view.map((r: any) => r.service_name).filter(Boolean) as string[])].sort();
        const region = typeof p.region === 'string' ? maskIdentity(p.region, identityCtx(p)) : null;
        const title = publicTitle(i++, areas.map((a) => labels.get(a) ?? a), region);
        return {
            available: true,
            public_ref: p.public_ref,
            title: title.label,
            letter: title.letter,
            descriptor: title.descriptor,
            area_codes: areas,
            descriptor_region: region,
            specializations,
            markets: [...new Set(view.map((r: any) => r.country_code).filter(Boolean) as string[])].sort(),
            completed_count: p.completed_count ?? null,
            avg_response_hours: p.avg_response_hours != null ? Number(p.avg_response_hours) : null,
            billing_model: p.billing_model || 'project',
            price_range: priceRangeOf(view, []),
            timeline_days: timelineRangeOf(view, []),
            saved_at: row.created_at,
            session_id: row.session_id ?? null,
        };
    });
}

function json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<any> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of req) {
        size += (c as Buffer).length;
        if (size > 4096) throw new Error('body too large');
        chunks.push(c as Buffer);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    return raw ? JSON.parse(raw) : {};
}

export async function handleSavedProvidersRoute(
    req: IncomingMessage,
    res: ServerResponse,
    ctx: { correlationId: string; authUserId: string | null },
    deps: SavedDeps,
): Promise<boolean> {
    const url = new URL(req.url || '/', 'http://x');
    const { correlationId, authUserId } = ctx;
    const list = url.pathname === '/api/v1/me/saved-providers';
    const one = /^\/api\/v1\/me\/saved-providers\/([^/]+)$/.exec(url.pathname);
    if (!list && !one) return false;
    res.setHeader('x-correlation-id', correlationId);
    // Nur ein Nutzer hat eine Merkliste — kein API-Schluessel, kein Gast.
    if (!authUserId) { json(res, 401, { errorCode: 'UNAUTHORIZED', message: 'A user login is required', correlationId }); return true; }

    if (list && req.method === 'GET') {
        try {
            const rows = (await supabaseApi.select('saved_providers', { user_id: authUserId }, { order: 'created_at.desc', limit: SAVED_MAX })) as SavedRow[];
            const keys = [...new Set(rows.map((r) => r.provider_key))];
            const providers = new Map<string, any>();
            const views = new Map<string, any[]>();
            await Promise.all(keys.map(async (k) => {
                const [p] = (await supabaseApi.select('providers', { provider_key: k }, { limit: 1 })) as any[];
                if (p) providers.set(k, p);
                views.set(k, await deps.matchableRows(k));
            }));
            const areas = [...new Set([...views.values()].flat().map((r: any) => r.area_code).filter(Boolean) as string[])];
            const labels = await deps.areaLabels(areas);
            json(res, 200, { ok: true, providers: buildSavedList(rows, providers, views, labels), correlationId });
        } catch (err) {
            structuredLog('error', 'saved providers read failed', { correlationId, errorCode: 'ERR_SAVED_READ', severity: 'error', detail: String(err).slice(0, 200) } as any);
            json(res, 500, { errorCode: 'INTERNAL', message: 'Saved providers could not be loaded', correlationId });
        }
        return true;
    }

    if (one && (req.method === 'PUT' || req.method === 'DELETE')) {
        const ref = one[1];
        if (!PUBLIC_REF_RX.test(ref)) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }); return true; }
        try {
            const [p] = (await supabaseApi.select('providers', { public_ref: ref }, { limit: 1 })) as any[];
            if (req.method === 'DELETE') {
                // Vergessen geht auch, wenn der Anbieter nicht mehr in der View steht.
                if (p) await supabaseApi.remove('saved_providers', { user_id: authUserId, provider_key: p.provider_key });
                json(res, 200, { ok: true, removed: !!p, correlationId });
                return true;
            }
            // Merken nur, was der Nutzer auch finden konnte: ein Anbieter in der View.
            if (!p || !(await deps.matchableRows(p.provider_key)).length) {
                json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId });
                return true;
            }
            let body: any = {};
            try { body = await readBody(req); } catch {
                json(res, 400, { errorCode: 'VALIDATION_FAILED', field: 'body', message: 'Invalid body', correlationId });
                return true;
            }
            // Die Sitzung nur, wenn sie dem Nutzer gehoert — sonst ohne.
            let sessionId: string | null = null;
            if (typeof body?.session_id === 'string' && UUID_RX.test(body.session_id)) {
                const [s] = (await supabaseApi.select('sessions', { id: body.session_id }, { limit: 1 })) as Array<{ user_id?: string | null }>;
                if (s && s.user_id === authUserId) sessionId = body.session_id;
            }
            // Voll ist voll: lieber nein sagen als einen alten Eintrag verlieren.
            const mine = (await supabaseApi.select('saved_providers', { user_id: authUserId }, { limit: SAVED_MAX })) as SavedRow[];
            if (mine.length >= SAVED_MAX && !mine.some((r) => r.provider_key === p.provider_key)) {
                json(res, 409, { errorCode: 'SELECTION_FULL', message: `A selection holds up to ${SAVED_MAX} providers`, max: SAVED_MAX, correlationId });
                return true;
            }
            await supabaseApi.upsert('saved_providers', 'user_id,provider_key', {
                user_id: authUserId,
                provider_key: p.provider_key,
                ...(sessionId ? { session_id: sessionId } : {}),
            });
            json(res, 200, { ok: true, saved: true, public_ref: ref, correlationId });
        } catch (err) {
            structuredLog('error', 'saved provider write failed', { correlationId, errorCode: 'ERR_SAVED_WRITE', severity: 'error', detail: String(err).slice(0, 200) } as any);
            json(res, 500, { errorCode: 'INTERNAL', message: 'Saved provider could not be changed', correlationId });
        }
        return true;
    }

    json(res, 405, { errorCode: 'METHOD_NOT_ALLOWED', message: 'Method not allowed', correlationId });
    return true;
}
