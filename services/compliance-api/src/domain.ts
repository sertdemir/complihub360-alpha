import type { ServerResponse } from 'http';
import {
    ComplianceDomain, DomainTemplateLibrary, ObligationEnrichmentMap,
    type EnrichedSubdomain,
} from '@complihub/compliance-engine';
import { structuredLog } from '@complihub360/types';
import { supabaseApi } from './supabase.js';
import { obligationsForSession, SLUG_TO_ENGINE } from './dashboard.js';

// ─── Bereichs-Querschnitt ────────────────────────────────────────────────────
// Canvas "Bereichsseite" (Nutzer-Wahl 2026-09-13, 1B · 2C · 3B · 4B · 5D · 6B):
// ein Bereich ist fuer den Dashboard-Nutzer der QUERSCHNITT ueber alle seine
// Sitzungen — "alles aus Steuern & USt ueber meine drei Maerkte". Das
// Dashboard rechnet dieselben Pflichten schon je Sitzung (dashboard.ts),
// liefert aber nur Summen je Bereich. Hier kommt die Liste: je aktiver
// Sitzung die Pflichten DIESES Bereichs mit Stand, Frist, Norm und Maerkten.
//
// Warum serverseitig: die Pflichten liegen nirgends gespeichert, sie
// entstehen aus `answers` durch die Engine. Der Browser muesste sonst je
// Sitzung einen Suchlauf ausloesen.

/** Produkt-Slug einer Engine-Pflicht. Die Engine kennt sieben Domaenen, das
 *  Produkt acht Bereiche: PRODUCT teilt sich in Verpackung und
 *  Produkt-Compliance, ONGOING_MONITORING faellt unter Unternehmen. Dieselbe
 *  Abbildung wie `lib/areaProfiles.ts` im Frontend — beide muessen gleich
 *  entscheiden, sonst steht eine Pflicht auf der einen Seite und fehlt auf der
 *  anderen. */
const SUBDOMAIN_SLUG_OVERRIDE: Record<string, string> = {
    'prod-safety': 'product-compliance',
    'monitor-kyb': 'corporate-structure',
};
const DOMAIN_TO_SLUG: Record<ComplianceDomain, string> = {
    [ComplianceDomain.TAX]: 'tax-vat',
    [ComplianceDomain.PRODUCT]: 'product-packaging',
    [ComplianceDomain.DATA]: 'data-privacy',
    [ComplianceDomain.MARKETING]: 'marketing-seo',
    [ComplianceDomain.CORPORATE]: 'corporate-structure',
    [ComplianceDomain.ONGOING_MONITORING]: 'corporate-structure',
    [ComplianceDomain.LOGISTICS]: 'logistics-customs',
    [ComplianceDomain.LEGAL]: 'legal-advisory',
};
export function slugForObligation(o: { id: string; domain: ComplianceDomain }): string {
    return SUBDOMAIN_SLUG_OVERRIDE[o.id] ?? DOMAIN_TO_SLUG[o.domain];
}

export const DOMAIN_SLUGS = new Set(Object.keys(SLUG_TO_ENGINE));

type ObligationStatus = 'open' | 'in_progress' | 'done' | 'not_applicable';

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

export interface DomainObligation {
    id: string;
    label: string;
    severity: string;
    /** Leer = EU-weit (gilt in jedem Markt der Sitzung). */
    markets: string[];
    source?: string;
    sourceUrl?: string;
    penalty?: string;
    due?: string;
    dueDays?: number;
    status: ObligationStatus;
}

export interface DomainSession {
    id: string;
    label: string | null;
    country: string | null;
    markets: string[];
    categories: string[];
    updated_at: string;
    obligations: DomainObligation[];
}

/** Die Pflichten EINES Bereichs fuer eine Sitzung — dieselbe Engine wie das
 *  Dashboard, danach auf den Slug gefiltert. */
export function domainObligationsForSession(row: SessionRow, slug: string): EnrichedSubdomain[] {
    return obligationsForSession(row).filter((o) => slugForObligation(o) === slug);
}

const RANG: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** Bereichswissen aus der Engine fuer den Assistenten: je Pflicht des
 *  Bereichs Beschreibung und, je Markt, Norm · Bussgeld · Kadenz. Nichts
 *  davon ist verfasst — es ist genau das, was die oeffentliche Bereichsseite
 *  zeigt. */
export function domainKnowledge(slug: string, markets: string[]): string[] {
    const lines: string[] = [];
    for (const [domain, subs] of Object.entries(DomainTemplateLibrary)) {
        for (const sub of subs) {
            if (slugForObligation({ id: sub.id, domain: domain as ComplianceDomain }) !== slug) continue;
            const byCountry = (ObligationEnrichmentMap[sub.id] ?? {}) as Record<string, { source: string; penalty: string; due: string } | undefined>;
            const seen = markets.length ? markets : ['EU'];
            const perMarket = seen.map((m) => {
                const national = byCountry[m];
                const e = national ?? byCountry.default;
                if (!e) return null;
                const tag = national ? m : `${m} (EU-level entry, no national source on file)`;
                return `${tag}: ${e.source}; penalty ${e.penalty}; cadence ${e.due}`;
            }).filter(Boolean);
            lines.push(`- ${sub.label}: ${sub.description}${perMarket.length ? '\n  ' + perMarket.join('\n  ') : ''}`);
        }
    }
    return lines;
}

/** Die Sitzungen eines Nutzers mit den Pflichten eines Bereichs. Gemeinsam
 *  fuer den Endpunkt und den Assistenten (der braucht denselben Querschnitt
 *  als Kontext). */
export async function loadDomainSessions(userId: string, slug: string, sessionIds?: string[]): Promise<{ active: DomainSession[]; archived: number }> {
    const rows = (await supabaseApi.select(
        'sessions', { user_id: userId }, { order: 'created_at.desc', limit: 50 },
    )) as SessionRow[];
    const status = (await supabaseApi.select('session_obligation_status', {})) as
        Array<{ session_id: string; obligation_id: string; status: string }>;
    const statusOf = new Map(status.map((s) => [`${s.session_id}:${s.obligation_id}`, s.status]));

    const active: DomainSession[] = [];
    let archived = 0;
    for (const row of rows) {
        const hatBereich = (row.categories ?? []).includes(slug);
        if (row.status === 'archived') {
            if (hatBereich) archived += 1;
            continue;
        }
        if (sessionIds?.length && !sessionIds.includes(row.id)) continue;
        const alle = domainObligationsForSession(row, slug);
        if (!alle.length && !hatBereich) continue;
        active.push({
            id: row.id,
            label: row.label,
            country: row.country,
            markets: Array.isArray(row.markets) ? row.markets : [],
            categories: row.categories ?? [],
            updated_at: row.updated_at ?? row.created_at,
            obligations: alle
                .map((o) => ({
                    id: o.id, label: o.label, severity: String(o.severity), markets: o.markets ?? [],
                    source: o.source, sourceUrl: o.sourceUrl, penalty: o.penalty, due: o.due, dueDays: o.dueDays,
                    status: (statusOf.get(`${row.id}:${o.id}`) ?? 'open') as ObligationStatus,
                }))
                .sort((a, b) => (RANG[b.severity] ?? 0) - (RANG[a.severity] ?? 0) || (a.dueDays ?? 9999) - (b.dueDays ?? 9999)),
        });
    }
    return { active, archived };
}

export async function handleDomain(
    res: ServerResponse,
    correlationId: string,
    userId: string | null,
    slug: string,
): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'SIGNIN_REQUIRED', message: 'Sign-in required', correlationId }));
        return;
    }
    if (!DOMAIN_SLUGS.has(slug)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Unknown domain', correlationId }));
        return;
    }
    try {
        const { active, archived } = await loadDomainSessions(userId, slug);
        // Offen = weder erledigt noch nicht zutreffend; angefangen zaehlt.
        const offen = active.flatMap((s) => s.obligations.filter((o) => o.status === 'open' || o.status === 'in_progress'));
        const markets = [...new Set(active.flatMap((s) => [s.country, ...s.markets].filter((m): m is string => !!m)))];
        const naechste = offen.map((o) => o.dueDays).filter((d): d is number => typeof d === 'number');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            slug,
            sessions: active,
            archived,
            markets,
            open: offen.length,
            high: offen.filter((o) => o.severity === 'high' || o.severity === 'critical').length,
            next_due_days: naechste.length ? Math.min(...naechste) : null,
            correlationId,
        }));
    } catch (err) {
        structuredLog('error', 'Domain overview failed', {
            correlationId, errorCode: 'ERR_DOMAIN', severity: 'error', route: `/api/v1/domain/${slug}`,
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Domain overview failed', correlationId }));
    }
}
