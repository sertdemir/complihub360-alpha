import { structuredLog } from '@complihub360/types';
import { supabaseApi } from './supabase.js';
import { RULES, same, type Classification, type ClassifiedField } from './changeControl.js';

// ─── „Gilt ab": geplante Konditionsaenderungen (Spec A §18, Canvas 2026-10-04) ─
//
// §18 nennt fuer Preis, Umfang, Lieferzeit und Subunternehmer die Frist
// "before effective date". Bis hierher gab es kein Datum: jede Freigabe galt
// sofort. Gewaehlt (A V2): JEDE Konditionsaenderung kann ein Datum tragen, in
// beide Richtungen. Die Regel "die Richtung zaehlt" (changeControl.ts)
// entscheidet weiter ueber die Pruefung, das Datum nur ueber den Zeitpunkt:
//
//   unguenstiger + Datum  wartender Vorgang (held, submitted) mit effective_at;
//                         nach der Freigabe "freigegeben, geplant" (approved,
//                         applied_at leer), uebernommen am Datum
//   guenstiger + Datum    geplanter Vorgang ohne Pruefung (held, approved,
//                         reviewed_at leer) — am Datum uebernommen und dann
//                         wie jede guenstigere Aenderung nachtraeglich geprueft
//
// Uebernommen wird im Waechter-Lauf (runScheduledChanges), mit derselben
// Pruefung wie bei der Freigabe: steht der Live-Wert nicht mehr auf "vorher",
// wird nichts ueberschrieben. Eine Freigabe nach dem Datum gilt ab der
// Freigabe, nie rueckwirkend.
//
// effective_at ist ein Tagesbeginn in UTC. Ein Datum heute oder in der
// Vergangenheit wird abgewiesen.

/** Weiter als ein Jahr voraus plant niemand Konditionen verbindlich. */
export const MAX_LEAD_DAYS = 366;

export type DateCheck = { ok: true; at: string | null } | { ok: false; reason: 'format' | 'past' | 'too_far' };

export function parseEffectiveDate(v: unknown, now = new Date()): DateCheck {
    if (v === undefined || v === null || v === '') return { ok: true, at: null };
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, reason: 'format' };
    const at = new Date(`${v}T00:00:00.000Z`);
    if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== v) return { ok: false, reason: 'format' };
    if (v <= now.toISOString().slice(0, 10)) return { ok: false, reason: 'past' };
    if (at.getTime() - now.getTime() > MAX_LEAD_DAYS * 86400_000) return { ok: false, reason: 'too_far' };
    return { ok: true, at: at.toISOString() };
}

/** Konditionen im Sinne von §18: die Felder mit der Frist "before effective date". */
export const isTerm = (field: string): boolean => RULES[field]?.deadline === 'before_effective_date';

/**
 * Mit Datum wird keine Kondition sofort geschrieben: was die Regel sofort
 * uebernehmen wuerde (guenstiger), wandert in `scheduled`. Wartendes bleibt
 * wartend — es bekommt das Datum am Vorgang.
 */
export function withSchedule(c: Classification): { now: Classification; scheduled: ClassifiedField[] } {
    const scheduled = c.review.filter((f) => isTerm(f.field));
    const write = { ...c.write };
    for (const f of scheduled) delete write[f.field];
    return { now: { write, review: c.review.filter((f) => !isTerm(f.field)), held: c.held }, scheduled };
}

/** Wartet (eingereicht, in Pruefung) oder ist geplant (freigegeben, noch nicht uebernommen). */
export function isPending(c: any): boolean {
    if (c.effect !== 'held') return false;
    return c.status === 'submitted' || c.status === 'under_review' || (c.status === 'approved' && !c.applied_at);
}
/** Geplant ohne Pruefung: die guenstigere Richtung (reviewed_at bleibt leer). */
export const isUnreviewedPlan = (c: any): boolean => c.effect === 'held' && c.status === 'approved' && !c.applied_at && !c.reviewed_at;

// ─── Uebernehmen — Freigabe und Waechter teilen sich diesen Weg ───────────────

export async function liveRows(providerKey: string, serviceId: string | null) {
    if (serviceId) {
        const sv = ((await supabaseApi.select('provider_services', { id: serviceId, provider_key: providerKey }, { limit: 1 })) as any[])[0] ?? null;
        return { provider_services: sv } as Record<string, any>;
    }
    const p = ((await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[])[0] ?? null;
    const conf = ((await supabaseApi.select('provider_confidential', { provider_key: providerKey }, { limit: 1 })) as any[])[0] ?? null;
    return { providers: p, provider_confidential: conf } as Record<string, any>;
}
export function liveValue(rows: Record<string, any>, field: string, serviceId: string | null) {
    const table = serviceId ? 'provider_services' : (RULES[field]?.table ?? 'providers');
    return rows[table]?.[field] ?? null;
}

export type ApplyResult = { ok: true } | { ok: false; reason: 'not_found' } | { ok: false; reason: 'stale'; stale: string[] };

/** Felder, deren Live-Wert nicht mehr auf "vorher" steht. */
export async function staleFields(c: any): Promise<string[] | null> {
    const serviceId: string | null = c.service_id ?? null;
    const rows = await liveRows(c.provider_key, serviceId);
    if (serviceId && !rows.provider_services) return null;
    return Object.keys(c.old_value ?? {}).filter((k) => !same(liveValue(rows, k, serviceId), c.old_value[k]));
}

/** Schreibt new_value in die Live-Tabellen — nur, wenn nichts ueberholt ist. */
export async function applyHeldValues(c: any, now: string): Promise<ApplyResult> {
    const stale = await staleFields(c);
    if (stale === null) return { ok: false, reason: 'not_found' };
    if (stale.length) return { ok: false, reason: 'stale', stale };
    const serviceId: string | null = c.service_id ?? null;
    const byTable: Record<string, Record<string, unknown>> = {};
    for (const [k, v] of Object.entries(c.new_value ?? {})) {
        const table = serviceId ? 'provider_services' : (RULES[k]?.table ?? 'providers');
        (byTable[table] ??= {})[k] = v;
    }
    if (byTable.provider_services) await supabaseApi.update('provider_services', { id: serviceId }, { ...byTable.provider_services, updated_at: now });
    if (byTable.providers) await supabaseApi.update('providers', { provider_key: c.provider_key }, { ...byTable.providers, updated_at: now });
    if (byTable.provider_confidential) await supabaseApi.upsert('provider_confidential', 'provider_key', { provider_key: c.provider_key, ...byTable.provider_confidential, updated_at: now });
    return { ok: true };
}

/** Die Felder eines Vorgangs als ClassifiedField — fuer einen Folgevorgang. */
export function fieldsOf(c: any): ClassifiedField[] {
    return Object.keys(c.new_value ?? {}).map((k) => ({
        field: k, old: c.old_value?.[k] ?? null, new: c.new_value[k],
        changeType: RULES[k]?.changeType ?? 'other', deadline: RULES[k]?.deadline ?? 'within_3_business_days',
    }));
}

// ─── Waechter-Pass ───────────────────────────────────────────────────────────

export interface ScheduleTick { due: number; applied: number; stale: number; errors: number }

/**
 * Uebernimmt faellige geplante Vorgaenge. Shadow zaehlt, schreibt aber nicht —
 * wie die uebrigen Waechter-Paesse.
 *
 *   uebernommen   status applied, applied_at = jetzt. War der Vorgang
 *                 ungeprueft (guenstigere Richtung), folgt ein Vorgang
 *                 "applied" fuer die nachtraegliche Pruefung — wie bei einer
 *                 guenstigeren Aenderung ohne Datum.
 *   ueberholt     zurueck in die Pruefung (under_review); das Pruefteam sieht
 *                 im Drawer, welcher Wert sich bewegt hat. Steht dort schon
 *                 ein offener Vorgang fuer dasselbe Ziel, laesst der Index
 *                 keinen zweiten zu — dann bleibt der Vorgang stehen und der
 *                 Lauf meldet ihn als Fehler, statt ihn still zu verwerfen.
 */
export async function runScheduledChanges(shadow = false, now = new Date()): Promise<ScheduleTick> {
    const out: ScheduleTick = { due: 0, applied: 0, stale: 0, errors: 0 };
    const nowIso = now.toISOString();
    const rows = ((await supabaseApi.select('provider_change_requests', { effect: 'held', status: 'approved' }, { order: 'effective_at.asc', limit: 500 })) as any[])
        .filter((c) => !c.applied_at && c.effective_at && new Date(c.effective_at).getTime() <= now.getTime());
    for (const c of rows) {
        out.due++;
        if (shadow) continue;
        try {
            const r = await applyHeldValues(c, nowIso);
            if (r.ok) {
                await supabaseApi.update('provider_change_requests', { id: c.id }, { status: 'applied', applied_at: nowIso });
                if (!c.reviewed_at) {
                    const fields = fieldsOf(c);
                    await supabaseApi.insert('provider_change_requests', {
                        provider_key: c.provider_key, service_id: c.service_id ?? null,
                        change_type: c.change_type, field_path: c.field_path,
                        old_value: c.old_value, new_value: c.new_value,
                        deadline_class: fields.some((f) => f.deadline === 'before_effective_date') ? 'before_effective_date' : 'within_3_business_days',
                        effect: 'applied', status: 'submitted', applied_at: nowIso, effective_at: c.effective_at,
                        provider_note: c.provider_note ?? null, submitted_at: nowIso,
                    });
                }
                await supabaseApi.insert('event_log', { type: 'provider_change_applied_scheduled', payload: { providerKey: c.provider_key, changeId: c.id } });
                out.applied++;
            } else {
                await supabaseApi.update('provider_change_requests', { id: c.id }, { status: 'under_review' });
                await supabaseApi.insert('event_log', { type: 'provider_change_scheduled_stale', payload: { providerKey: c.provider_key, changeId: c.id, reason: r.reason } });
                out.stale++;
            }
        } catch {
            structuredLog('error', 'Scheduled change not applied', { correlationId: 'watchers', route: 'watchers/tick', severity: 'error', errorCode: 'ERR_SCHEDULED_CHANGE', changeId: c.id } as Record<string, unknown>);
            out.errors++;
        }
    }
    return out;
}

// ─── Was Nutzer davon sehen (Canvas D V2) ────────────────────────────────────

export interface PlannedPrice {
    service_name: string;
    effective_at: string;
    currency: string | null;
    price_min: number | null;
    price_max: number | null;
}

/**
 * Freigegebene, geplante Preisaenderungen an Leistungen, die gerade matchbar
 * sind. Nur Freigegebenes: was noch in Pruefung ist, steht nicht fest und
 * wird Nutzern nicht angekuendigt. Die Seite zeigt es neutral, in beide
 * Richtungen, ohne Farbe und ohne Countdown — Information, keine
 * Verkaufstaktik. `view` sind die Zeilen der Match-View des Anbieters.
 */
export async function plannedPrices(providerKey: string, view: any[], now = new Date()): Promise<PlannedPrice[]> {
    const services = new Map<string, any>();
    for (const r of view) if (r.service_id && !services.has(r.service_id)) services.set(r.service_id, r);
    if (!services.size) return [];
    const rows = ((await supabaseApi.select('provider_change_requests', { provider_key: providerKey, effect: 'held', status: 'approved' }, { limit: 200 })) as any[])
        .filter((c) => !c.applied_at && c.effective_at && new Date(c.effective_at).getTime() > now.getTime()
            && c.service_id && services.has(c.service_id)
            && ('price_min' in (c.new_value ?? {}) || 'price_max' in (c.new_value ?? {})));
    return rows.map((c) => {
        const sv = services.get(c.service_id);
        const nv = c.new_value ?? {};
        return {
            service_name: String(sv.service_name ?? ''),
            effective_at: new Date(c.effective_at).toISOString(),
            currency: sv.currency ?? null,
            price_min: 'price_min' in nv ? nv.price_min ?? null : sv.price_min ?? null,
            price_max: 'price_max' in nv ? nv.price_max ?? null : sv.price_max ?? null,
        };
    }).sort((a, b) => a.effective_at.localeCompare(b.effective_at));
}
