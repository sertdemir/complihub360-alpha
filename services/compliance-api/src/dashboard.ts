import type { ServerResponse } from 'http';
import {
    generateRelevantSubdomains, isKnownCountry, ComplianceDomain,
    type CountryCode, type IndustryType, type BusinessModel, type EnrichedSubdomain,
} from '@complihub/compliance-engine';
import { structuredLog } from '@complihub360/types';
import { supabaseApi } from './supabase.js';

// ─── Kennzahlen des Arbeitsbereichs ──────────────────────────────────────────
// Das Dashboard zeigte bis 2026-08-30 fest verdrahtete Zahlen — 3 Anfragen,
// 12 Pflichten, 4 Sitzungen —, unabhaengig davon, wem es gehoert. Ein frisch
// angelegtes Konto sah dieselbe erfundene Lage wie jedes andere. Fuer eine
// Demo war das gedacht; fuer echte Nutzer ist es eine Falschaussage.
//
// Warum das serverseitig gerechnet wird und nicht im Browser: die Pflichten
// einer Sitzung liegen NIRGENDS gespeichert. Sie entstehen jedes Mal neu,
// wenn die Engine ueber die Antworten laeuft (`answers` in `sessions`).
// Der Browser muesste dafuer pro Sitzung einen Suchlauf ausloesen — bei acht
// Sitzungen acht Roundtrips, nur um vier Zahlen anzuzeigen. Hier ist es ein
// Aufruf, und die Engine laeuft im selben Prozess.
//
// Was hier NICHT steht: eine "naechste Frist". Die Kadenzen der Engine sind
// redaktionelle Rhythmen ("jaehrlich", "quartalsweise"), keine Termine —
// daraus ein Datum zu machen hiesse, eine Faelligkeit zu behaupten, die
// niemand geprueft hat. Die Kachel dafuer faellt weg, bis es Stammdaten gibt.

// Wizard-Slugs → Engine-Domaenen. Liegt hier und nicht im Suchpfad, weil
// beide dieselbe Abbildung brauchen und zwei Kopien auseinanderlaufen.
export const SLUG_TO_ENGINE: Record<string, ComplianceDomain> = {
    'tax-vat': ComplianceDomain.TAX,
    'product-packaging': ComplianceDomain.PRODUCT,
    'product-compliance': ComplianceDomain.PRODUCT,
    'data-privacy': ComplianceDomain.DATA,
    'marketing-seo': ComplianceDomain.MARKETING,
    'corporate-structure': ComplianceDomain.CORPORATE,
    'logistics-customs': ComplianceDomain.LOGISTICS,
    'legal-advisory': ComplianceDomain.LEGAL,
};

interface SessionRow {
    id: string;
    country: string | null;
    markets: string[] | null;
    categories: string[] | null;
    label: string | null;
    status: string | null;
    created_at: string;
    updated_at?: string | null;
    answers: Record<string, unknown> | null;
}

/** Die Pflichten EINER Sitzung, so wie die Ergebnisseite sie auch rechnet:
 *  dieselbe Engine, dieselben Eingaben. Faellt die Engine ueber ein
 *  unbekanntes Land, bleibt die Liste leer statt den Aufruf zu sprengen. */
export function obligationsForSession(row: SessionRow): EnrichedSubdomain[] {
    const answers = (row.answers ?? {}) as Record<string, unknown>;
    const markets = Array.isArray(row.markets) && row.markets.length
        ? row.markets
        : (Array.isArray(answers.markets) ? (answers.markets as string[]) : []);
    const countries = [...new Set([row.country || answers.country || 'DE', ...markets])]
        .filter((c): c is CountryCode => isKnownCountry(String(c)));
    if (!countries.length) return [];

    const slugs = (Array.isArray(row.categories) && row.categories.length
        ? row.categories
        : (Array.isArray(answers.categories) ? (answers.categories as string[]) : [])) as string[];
    const focusDomains = [...new Set(slugs.map((s) => SLUG_TO_ENGINE[s]).filter(Boolean))];

    try {
        return generateRelevantSubdomains({
            countries,
            industry: answers.industry as IndustryType,
            businessModel: answers.businessModel as BusinessModel,
            focusDomains,
        });
    } catch {
        // Fehlendes Laenderprofil ist kein Fehler des Nutzers.
        return [];
    }
}

type Erledigt = Record<string, Set<string>>;   // session_id → obligation_ids

/** 'done' und 'not_applicable' zaehlen nicht mehr als offen. 'in_progress'
 *  schon — angefangen ist nicht erledigt. */
function abgeschlossen(rows: Array<{ session_id: string; obligation_id: string; status: string }>): Erledigt {
    const out: Erledigt = {};
    for (const r of rows) {
        if (r.status !== 'done' && r.status !== 'not_applicable') continue;
        (out[r.session_id] ??= new Set()).add(r.obligation_id);
    }
    return out;
}

export async function handleDashboard(
    res: ServerResponse,
    correlationId: string,
    userId: string | null,
): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'SIGNIN_REQUIRED', message: 'Sign-in required', correlationId }));
        return;
    }

    try {
        const sessions = (await supabaseApi.select(
            'sessions', { user_id: userId }, { order: 'created_at.desc', limit: 50 },
        )) as SessionRow[];
        const aktive = sessions.filter((s) => s.status !== 'archived');

        // Ein Aufruf fuer alle Abweichungen; danach je Sitzung nachschlagen.
        const status = abgeschlossen(
            (await supabaseApi.select('session_obligation_status', { })) as
                Array<{ session_id: string; obligation_id: string; status: string }>,
        );

        const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
        const byMarket: Record<string, number> = {};
        const byDomain: Record<string, number> = {};
        // Getrennt gezaehlt, weil der dunkle Balkenanteil im Dashboard genau
        // das zeigt: wie viel davon hohes Risiko ist. Ohne diese Zahl muesste
        // die Oberflaeche sie schaetzen.
        const byMarketHigh: Record<string, number> = {};
        const byDomainHigh: Record<string, number> = {};
        let offen = 0;

        const sessionSummaries = aktive.map((s) => {
            const alle = obligationsForSession(s);
            const fertig = status[s.id] ?? new Set<string>();
            const rest = alle.filter((o) => !fertig.has(o.id));
            let hoechste: string | null = null;
            for (const o of rest) {
                offen += 1;
                const sev = String(o.severity ?? 'low');
                bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
                if (hoechste === null || RANG[sev] > RANG[hoechste]) hoechste = sev;
                const schwer = sev === 'high' || sev === 'critical';
                byDomain[String(o.domain)] = (byDomain[String(o.domain)] ?? 0) + 1;
                if (schwer) byDomainHigh[String(o.domain)] = (byDomainHigh[String(o.domain)] ?? 0) + 1;
                // Leere Marktliste heisst EU-weit — dann zaehlt sie auf das
                // Land der Sitzung, sonst stuende die Pflicht nirgends.
                const maerkte = o.markets?.length ? o.markets : [s.country].filter(Boolean);
                for (const m of maerkte) {
                    byMarket[String(m)] = (byMarket[String(m)] ?? 0) + 1;
                    if (schwer) byMarketHigh[String(m)] = (byMarketHigh[String(m)] ?? 0) + 1;
                }
            }
            return {
                id: s.id,
                label: s.label,
                country: s.country,
                categories: s.categories ?? [],
                open: rest.length,
                total: alle.length,
                severity: hoechste,
                created_at: s.created_at,
                updated_at: s.updated_at ?? s.created_at,
            };
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            sessions: { total: aktive.length, items: sessionSummaries },
            obligations: {
                open: offen, by_severity: bySeverity,
                by_market: byMarket, by_market_high: byMarketHigh,
                by_domain: byDomain, by_domain_high: byDomainHigh,
            },
            correlationId,
        }));
    } catch (err) {
        structuredLog('error', 'Dashboard aggregate failed', {
            correlationId, errorCode: 'ERR_DASHBOARD', severity: 'error', route: '/api/v1/dashboard',
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Dashboard failed', correlationId }));
    }
}

const RANG: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
