import { ComplianceDomain, DomainTemplateLibrary, ObligationSeverity, severityFromRiskWeight } from './domain-schema.js';
import { CountryCode, CountryRiskProfile, getCountryRiskProfile } from './country-profile.js';
import { calculateBusinessModifier, IndustryType, BusinessModel } from './business-modifier.js';
import { resolveEnrichment, resolveEnrichmentKey, ObligationEnrichmentMap, type ObligationEnrichment, type PenaltyCeiling } from './obligation-enrichment.js';
import { evaluateEvidence, EVIDENCE_RULES, EU27, type Evidence, type Facts, type RowContext } from './evidence.js';

export interface GeneratorContext {
    countries: CountryCode[];
    industry?: IndustryType;
    businessModel?: BusinessModel;
    /** Domains the user explicitly selected (wizard step 3). Always included
     *  on top of the score-ranked selection and sorted first — selection is
     *  interest, not proof: whether a duty applies comes from `facts`. */
    focusDomains?: ComplianceDomain[];
    /** What the answers say about the business (evidence.ts, Wizard-Audit F1). */
    facts?: Facts;
    /** Eine Zeile je Rechtsgrundlage und Phase statt einer Zeile fuer alle
     *  Laender (Feedback CW-F04, 19.11.2026). Ohne dieses Feld bleibt es bei
     *  der alten Sammelzeile — das Dashboard zaehlt weiter Vorlagen. */
    perCountry?: {
        /** Land → heutige oder geplante Taetigkeit. 'both' zaehlt als heute. */
        phase: Record<string, 'current' | 'planned' | 'both'>;
        /** Die Fakten fuer genau diese Laender (factsFromAnswers mit Ausschnitt). */
        factsFor: (countries: CountryCode[]) => Facts;
        /** Schon beantwortete Fragen und "keine Verpackung". */
        row?: Pick<RowContext, 'answered' | 'packagingNone'>;
    };
}

/** Wo die Pflicht in einem Land anders heisst als die Vorlage. Die Vorlage
 *  "VAT Registration & Filing" ist fuer die USA sachlich falsch benannt: dort
 *  gibt es keine Mehrwertsteuer, die Quelle der Zeile sind die
 *  Sales-Tax-Regeln der Bundesstaaten. Nur die Benennung — keine neue Regel. */
const MARKET_LABELS: Record<string, Partial<Record<CountryCode, { label: string; description: string }>>> = {
    'tax-vat-registration': {
        US: {
            label: 'US Sales Tax (state level)',
            description: 'Registering for and filing state sales tax once a state\'s economic-nexus threshold is crossed.',
        },
    },
};

export interface EnrichedSubdomain {
    id: string;
    label: string;
    description: string;
    domain: ComplianceDomain;
    severity: ObligationSeverity;
    riskWeight: number;
    /** Requested countries the obligation was evaluated for; empty = EU-wide. */
    markets: CountryCode[];
    /** true when the user explicitly picked this domain in the wizard. */
    focus: boolean;
    /** Whether the answers carry this duty — confirmed, likely or open. */
    evidence: Evidence;
    source?: string;
    penalty?: string;
    /** How the entry stands to national law, set only where it came from the
     *  'default' entry (see ObligationEnrichment.scope). On 'placeholder'
     *  `source` is left out ON PURPOSE: the string there is shaped like a
     *  citation and cites nothing. Every surface — Risk Map, PDF, dossier,
     *  assistant context — reads this instead of printing it as a legal basis. */
    scope?: 'eu' | 'national-pending' | 'placeholder';
    /** `<subdomainId>.<country|default>` — the key the UI translates `penalty`
     *  by (common:compliance.penaltyText.*). Absent when there is no entry. */
    penaltyKey?: string;
    penaltyMaxEur?: number;
    /** Die belegte Obergrenze, so wie das Gesetz sie fuehrt. Reist seit dem
     *  19.09. mit, damit die Risikokarte dieselbe Quelle liest wie die
     *  Bereichsseiten — `penalty` ist ein redaktioneller Satz und kann von der
     *  belegten Zahl abweichen, ohne dass es auffaellt. Genau das war der
     *  Fall: dort stand "up to EUR 30,000 per year", waehrend die Obergrenze
     *  laengst 7.500 EUR JE EINHEIT lautete. */
    penaltyCeiling?: PenaltyCeiling;
    due?: string;
    dueDays?: number;
    /** ISO date the obligation starts to apply; absent = applicable today. */
    appliesFrom?: string;
    /** CELEX id of the underlying EU act (verified against EUR-Lex). */
    celex?: string;
    /** Deep link to the authoritative, always-current text on EUR-Lex. */
    sourceUrl?: string;
    /** Was der Link oeffnet, wenn das NICHT `source` ist: eine Zeile mit
     *  nationaler Fundstelle (UStG) verlinkt den EU-Rechtsakt dahinter und
     *  muss ihn auch so nennen (CW-F04: Beschriftung und Linkziel). */
    sourceUrlLabel?: string;
    /** Eindeutig je Zeile; `id` bleibt die Vorlage und kann sich wiederholen. */
    key?: string;
    /** Heutige oder geplante Taetigkeit — nur mit `perCountry`. */
    phase?: 'current' | 'planned';
    /** `<id>.<Land>`, wenn die Zeile in diesem Land anders heisst (MARKET_LABELS). */
    labelKey?: string;
}

/** EUR-Lex permalink for a CELEX id. The language segment only switches the
 *  interface/translation shown — the act itself is the same document. */
export function eurLexUrl(celex: string, lang = 'EN'): string {
    return `https://eur-lex.europa.eu/legal-content/${lang.toUpperCase()}/TXT/?uri=CELEX:${celex}`;
}

export function aggregateCountryRiskProfiles(countries: CountryCode[]): CountryRiskProfile {
    if (countries.length === 0) {
        throw new Error('At least one country must be provided.');
    }

    const baseProfiles = countries.map(getCountryRiskProfile);

    const aggregatedWeights: Record<ComplianceDomain, number> = {
        [ComplianceDomain.TAX]: 0,
        [ComplianceDomain.PRODUCT]: 0,
        [ComplianceDomain.MARKETING]: 0,
        [ComplianceDomain.DATA]: 0,
        [ComplianceDomain.CORPORATE]: 0,
        [ComplianceDomain.ONGOING_MONITORING]: 0,
        [ComplianceDomain.LOGISTICS]: 0,
        [ComplianceDomain.LEGAL]: 0,
        [ComplianceDomain.ENVIRONMENT]: 0
    };

    let maxStrictness = 0;
    let maxEnforcement = 0;

    for (const profile of baseProfiles) {
        // Aggregation Rules: Weights are SUM, Strictness/Enforcement are MAX
        for (const domain in aggregatedWeights) {
            aggregatedWeights[domain as ComplianceDomain] += profile.domainWeights[domain as ComplianceDomain];
        }
        maxStrictness = Math.max(maxStrictness, profile.strictnessScore);
        maxEnforcement = Math.max(maxEnforcement, profile.enforcementIntensity);
    }

    return {
        domainWeights: aggregatedWeights,
        strictnessScore: maxStrictness,
        enforcementIntensity: maxEnforcement
    };
}

export function generateRelevantSubdomains(context: GeneratorContext): EnrichedSubdomain[] {
    // 1) Load/Aggregate country profiles
    const aggregatedProfile = aggregateCountryRiskProfiles(context.countries);

    // 2 & 3) Calculate weighted domain scores & apply industry modifiers
    const domainScores = Object.entries(aggregatedProfile.domainWeights).map(([domainStr, baseScore]) => {
        const domain = domainStr as ComplianceDomain;
        const modifier = calculateBusinessModifier(domain, context.industry, context.businessModel);
        return {
            domain,
            score: baseScore + modifier
        };
    });

    // 4) Sort domains by score descending, alphabetically on tie for determinism
    domainScores.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.domain.localeCompare(b.domain);
    });

    // 5) Domain selection: every explicitly requested focus domain, topped up
    //    with the best-scored remaining domains to at least 4 in score order.
    const focus = new Set(context.focusDomains ?? []);
    const selected: ComplianceDomain[] = domainScores
        .filter(ds => focus.has(ds.domain))
        .map(ds => ds.domain);
    for (const ds of domainScores) {
        if (selected.length >= 4) break;
        if (!focus.has(ds.domain)) selected.push(ds.domain);
    }

    // 6) Select subdomains based on domain + businessModel, enriched with the
    //    editorial legal metadata (severity, statute, penalty, deadline).
    const results: EnrichedSubdomain[] = [];

    for (const domain of selected) {
        const templates = DomainTemplateLibrary[domain];
        if (!templates) continue;

        for (const template of templates) {
            // Filter by business model if one is specified — but never filter
            // away a domain the user explicitly asked for.
            if (!focus.has(domain) && context.businessModel && !template.applicableBusinessModels.includes(context.businessModel)) {
                continue;
            }
            if (context.perCountry) {
                results.push(...rowsPerSource(template, domain, focus.has(domain), context.countries, context.perCountry));
                continue;
            }
            const enrichment = resolveEnrichment(template.id, context.countries);
            const enrichmentKey = resolveEnrichmentKey(template.id, context.countries);
            // Absent on a default entry is read as 'eu' (back-compatibility,
            // see ObligationEnrichment.scope); a country override has none.
            const scope = enrichmentKey === 'default' ? enrichment?.scope ?? 'eu' : undefined;
            results.push({
                id: template.id,
                label: template.label,
                description: template.description,
                domain,
                severity: severityFromRiskWeight(template.riskWeight),
                riskWeight: template.riskWeight,
                markets: enrichment?.scope === 'eu' ? [] : context.countries,
                focus: focus.has(domain),
                evidence: evaluateEvidence(template.id, context.facts ?? {}),
                source: scope === 'placeholder' ? undefined : enrichment?.source,
                scope,
                penalty: enrichment?.penalty,
                penaltyKey: enrichmentKey ? `${template.id}.${enrichmentKey}` : undefined,
                penaltyMaxEur: enrichment?.penaltyMaxEur,
                penaltyCeiling: enrichment?.penaltyCeiling,
                due: enrichment?.due,
                dueDays: enrichment?.dueDays,
                appliesFrom: enrichment?.appliesFrom,
                celex: template.celex,
                sourceUrl: template.celex ? eurLexUrl(template.celex) : undefined,
            });
        }
    }

    // Focus-domain obligations first, then by risk weight — the table reads
    // top-down as "what you asked about, worst first".
    results.sort((a, b) => {
        if (a.focus !== b.focus) return a.focus ? -1 : 1;
        if (b.riskWeight !== a.riskWeight) return b.riskWeight - a.riskWeight;
        return a.id.localeCompare(b.id);
    });

    return results;
}

type Template = (typeof DomainTemplateLibrary)[ComplianceDomain][number];

/** Eine Zeile je Rechtsgrundlage und Phase (CW-F04).
 *
 *  Bis 19.11.2026 gab es je Vorlage EINE Zeile fuer alle Laender, und sie
 *  trug Quelle, Frist und Bussgeld des ersten Landes mit eigenem Eintrag: eine
 *  Zeile "TR · DE · US · IT" zitierte das tuerkische KDV-Gesetz, und der Link
 *  oeffnete die EU-Richtlinie. Jetzt:
 *
 *  - Jedes Land loest seinen eigenen Eintrag auf. Laender mit demselben
 *    Eintrag und derselben Phase teilen sich eine Zeile.
 *  - Der 'default'-Eintrag ist ein EU-Rechtsakt und gilt nur fuer EU-Laender
 *    — ausser er ist selbst nur ein Platzhalter. Ein Nicht-EU-Land ohne
 *    eigenen Eintrag bekommt eine Zeile OHNE Quelle ('placeholder'), statt
 *    eine EU-Norm zu erben.
 *  - Der EUR-Lex-Link haengt nur an Zeilen mit EU-Land.
 *  - Eine geplante Zeile hat keine Frist in Tagen: ein Plan ist nicht faellig. */
function rowsPerSource(
    template: Template,
    domain: ComplianceDomain,
    isFocus: boolean,
    countries: CountryCode[],
    per: NonNullable<GeneratorContext['perCountry']>,
): EnrichedSubdomain[] {
    const entries = ObligationEnrichmentMap[template.id] ?? {};
    const fallback = entries.default;
    const fallbackScope = fallback ? fallback.scope ?? 'eu' : undefined;
    type Group = { key: CountryCode | 'default' | null; entry: ObligationEnrichment | null; phase: 'current' | 'planned'; countries: CountryCode[] };
    const groups = new Map<string, Group>();
    for (const c of countries) {
        const inEu = EU27.has(c);
        const own = entries[c];
        // Eine Vorlage, deren Regel selbst "verkauft in die EU" verlangt, IST
        // die EU-Pflicht (PPWR, Intrastat). Fuer ein Nicht-EU-Land ohne eigenen
        // Eintrag gibt es dazu nichts zu sagen — keine Zeile, statt "PPWR · US".
        if (!own && !inEu && EVIDENCE_RULES[template.id]?.requires.includes('eu_market')) continue;
        const key: Group['key'] = own ? c : fallback && (fallbackScope === 'placeholder' || inEu) ? 'default' : null;
        const entry = own ?? (key === 'default' ? fallback ?? null : null);
        const phase = per.phase[c] === 'planned' ? 'planned' : 'current';
        // Gleicher Inhalt = gleiche Zeile: mehrere Vorlagen fuehren unter 'DE'
        // woertlich den EU-Eintrag. Ein eigener Landesname trennt immer.
        const named = MARKET_LABELS[template.id]?.[c] ? c : '';
        const sig = [entry ? `${entry.source}|${entry.due ?? ''}|${entry.dueDays ?? ''}|${entry.penalty}` : 'none', phase, inEu ? 'eu' : 'non-eu', named].join('#');
        const g = groups.get(sig);
        if (g) g.countries.push(c);
        else groups.set(sig, { key, entry, phase, countries: [c] });
    }
    return [...groups.values()].map((g) => {
        const inEu = EU27.has(g.countries[0]);
        const scope = !g.entry ? 'placeholder' as const : g.key === 'default' ? g.entry.scope ?? 'eu' : undefined;
        const named = g.countries.length === 1 ? MARKET_LABELS[template.id]?.[g.countries[0]] : undefined;
        const link = inEu && template.celex ? eurLexUrl(template.celex) : undefined;
        // Nationale Fundstelle + EU-Link: der Link nennt den EU-Rechtsakt.
        const euAct = fallback && fallbackScope !== 'placeholder' ? fallback.source : `CELEX ${template.celex}`;
        // Fuehrt der Landeseintrag woertlich den EU-Rechtsakt, ist der Link
        // schon richtig beschriftet.
        const linkLabel = link && g.key !== 'default' && g.entry?.source !== euAct ? euAct : undefined;
        return {
            id: template.id,
            key: `${template.id}@${g.countries.join('+')}:${g.phase}`,
            label: named?.label ?? template.label,
            labelKey: named ? `${template.id}.${g.countries[0]}` : undefined,
            description: named?.description ?? template.description,
            domain,
            severity: severityFromRiskWeight(template.riskWeight),
            riskWeight: template.riskWeight,
            markets: g.countries,
            phase: g.phase,
            focus: isFocus,
            evidence: evaluateEvidence(template.id, per.factsFor(g.countries), { ...per.row, euRow: inEu }),
            source: scope === 'placeholder' ? undefined : g.entry?.source,
            scope,
            penalty: g.entry?.penalty,
            penaltyKey: g.entry && g.key ? `${template.id}.${g.key}` : undefined,
            penaltyMaxEur: g.entry?.penaltyMaxEur,
            penaltyCeiling: g.entry?.penaltyCeiling,
            due: g.entry?.due,
            dueDays: g.phase === 'planned' ? undefined : g.entry?.dueDays,
            appliesFrom: g.entry?.appliesFrom,
            celex: inEu ? template.celex : undefined,
            sourceUrl: link,
            sourceUrlLabel: linkLabel,
        };
    });
}
