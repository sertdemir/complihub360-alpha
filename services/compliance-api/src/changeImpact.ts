import { supabaseApi } from './supabase.js';
import { areaCodeOf } from './verificationRules.js';

// ─── Wen eine Pause beruehrt (Canvas F V1, Spec A §26) ──────────────────────
//
// Ein wesentliches Ereignis pausiert einzelne Leistungen eines Partners. Ein
// Nutzer ist betroffen, wenn er einen kommenden Termin bei diesem Partner hat
// UND sein Anliegen in einem pausierten Bereich liegt. Das Anliegen steht in
// seiner Anfrage an DIESEN Partner (engagement_requests.category); fehlt sie,
// gilt der Termin als betroffen — lieber einmal zu viel Bescheid sagen als
// einen Nutzer in einen Termin laufen lassen, den es so nicht geben wird.
//
// Beide Stellen lesen von hier: die Mail beim Melden (providerApplication.ts)
// und das Flag an GET /bookings (index.ts).

/** Bereiche, die je Partner gerade pausiert sind — aus offenen Ereignissen. */
export async function pausedAreasByProvider(providerKey?: string): Promise<Map<string, Set<string>>> {
    const out = new Map<string, Set<string>>();
    const match: Record<string, string> = { effect: 'pause' };
    if (providerKey) match.provider_key = providerKey;
    const events = ((await supabaseApi.select('provider_change_requests', match, { limit: 500 })) as any[])
        .filter((c) => (c.status === 'submitted' || c.status === 'under_review') && (c.affected_service_ids ?? []).length);
    for (const ev of events) {
        const services = (await supabaseApi.select('provider_services', { provider_key: ev.provider_key }, { limit: 200 })) as any[];
        const areas = out.get(ev.provider_key) ?? new Set<string>();
        for (const id of ev.affected_service_ids as string[]) {
            const sv = services.find((s) => s.id === id);
            // Nur, was noch pausiert ist — eine schon wieder freigegebene Leistung zaehlt nicht.
            if (sv && sv.status === 'paused') areas.add(areaCodeOf(sv.service_code));
        }
        if (areas.size) out.set(ev.provider_key, areas);
    }
    return out;
}

/** Die neueste Anfrage des Nutzers an diesen Partner — Bereich und Markt seines Anliegens. */
export async function requestOf(userId: string | null, providerKey: string): Promise<{ category: string | null; country: string | null } | null> {
    if (!userId) return null;
    const rows = (await supabaseApi.select('engagement_requests', { user_id: userId, provider_key: providerKey }, { order: 'created_at.desc', limit: 1 })) as any[];
    return rows[0] ? { category: rows[0].category ?? null, country: rows[0].country ?? null } : null;
}

export function bookingAffected(paused: Set<string> | undefined, category: string | null | undefined): boolean {
    if (!paused?.size) return false;
    return !category || paused.has(category);
}

/** Sprache fuer eine Nutzer-Mail: ein eigenes Profilfeld gibt es nicht, also
 *  der Markt seines Anliegens — DE, ES, TR, sonst Englisch. */
export function localeFromCountry(country: string | null | undefined): string {
    const c = (country ?? '').toLowerCase();
    return c === 'de' || c === 'at' || c === 'ch' ? 'de' : c === 'es' ? 'es' : c === 'tr' ? 'tr' : 'en';
}
