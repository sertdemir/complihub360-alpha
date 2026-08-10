import { CountryCode } from './country-profile.js';

// ─── Obligation enrichment ───────────────────────────────────────────────────
// Per-subdomain legal metadata: statute reference, penalty exposure and the
// typical filing cadence. Keyed by subdomain id → country override, with a
// 'default' fallback (EU-level instruments or a generic phrasing). This is
// editorial ground truth for the risk map — deterministic, no live lookups.

export interface ObligationEnrichment {
    /** Primary legal source, e.g. 'UStG §18i (OSS)'. */
    source: string;
    /** Human penalty phrasing, e.g. 'up to €50,000'. */
    penalty: string;
    /** Upper penalty bound in EUR used for the total-exposure stat. */
    penaltyMaxEur?: number;
    /** Cadence label: 'Quarterly' | 'Annual' | 'Monthly' | 'Ongoing' | 'One-off'. */
    due: string;
    /** Typical days until the next deadline; drives the median-deadline stat. */
    dueDays?: number;
    /** ISO date (YYYY-MM-DD) from which the obligation actually bites. Set only
     *  where an act is already in force but not yet applicable, or where a
     *  staged duty starts later than its parent act (PPWR recycled-content and
     *  empty-space quotas in 2030). Omitted = applicable today, which is the
     *  case for every obligation unless stated otherwise. Kept as a plain date
     *  rather than a countdown so this map stays deterministic — the days-until
     *  arithmetic belongs at the render point, which is the only place that
     *  legitimately knows 'now'. */
    appliesFrom?: string;
    /** 'eu' = applies market-independently across the EU (shown as EU-wide). */
    scope?: 'eu';
}

type EnrichmentMap = Record<string, Partial<Record<CountryCode | 'default', ObligationEnrichment>>>;

export const ObligationEnrichmentMap: EnrichmentMap = {
    'tax-vat-registration': {
        DE: { source: 'UStG §18 / §18i (OSS)', penalty: 'late-filing surcharge up to 10%, max €25,000', penaltyMaxEur: 25000, due: 'Quarterly', dueDays: 30 },
        UK: { source: 'UK VATA 1994 §3', penalty: 'up to £20,000 + interest', penaltyMaxEur: 23000, due: 'Quarterly', dueDays: 30 },
        FR: { source: 'CGI Art. 256 / 287', penalty: '10–40% surcharge on VAT due', penaltyMaxEur: 20000, due: 'Monthly', dueDays: 24 },
        IT: { source: 'DPR 633/1972 Art. 35', penalty: '120–240% of unpaid VAT', penaltyMaxEur: 30000, due: 'Quarterly', dueDays: 30 },
        ES: { source: 'Ley 37/1992 (IVA) Art. 164', penalty: '50–150% of unpaid VAT', penaltyMaxEur: 25000, due: 'Quarterly', dueDays: 30 },
        NL: { source: 'Wet OB 1968 Art. 14', penalty: 'up to €5,514 per late return', penaltyMaxEur: 5514, due: 'Quarterly', dueDays: 30 },
        TR: { source: 'KDV Kanunu No. 3065', penalty: 'tax-loss fine: 1× the unpaid KDV', penaltyMaxEur: 15000, due: 'Monthly', dueDays: 26 },
        US: { source: 'State economic-nexus rules (post-Wayfair)', penalty: 'per-state assessments + interest', penaltyMaxEur: 20000, due: 'Monthly', dueDays: 20 },
        default: { source: 'EU VAT Directive 2006/112/EC', penalty: 'national surcharges + interest', penaltyMaxEur: 20000, due: 'Quarterly', dueDays: 30 },
    },
    'tax-corporate': {
        DE: { source: 'KStG §7 / AO §149', penalty: 'late surcharge 0.25%/month of assessed tax', penaltyMaxEur: 10000, due: 'Annual', dueDays: 120 },
        UK: { source: 'CTA 2010 / HMRC CT600', penalty: '£100–£1,000 + tax-geared penalties', penaltyMaxEur: 5000, due: 'Annual', dueDays: 120 },
        FR: { source: 'CGI Art. 205 (impôt sur les sociétés)', penalty: '10–40% majoration + intérêts de retard', penaltyMaxEur: 12000, due: 'Annual', dueDays: 105 },
        IT: { source: 'TUIR DPR 917/1986 (IRES)', penalty: '90–180% dell’imposta non versata', penaltyMaxEur: 20000, due: 'Annual', dueDays: 120 },
        ES: { source: 'Ley 27/2014 (Impuesto sobre Sociedades)', penalty: '50–150% de la cuota + recargos', penaltyMaxEur: 15000, due: 'Annual', dueDays: 115 },
        NL: { source: 'Wet Vpb 1969 (vennootschapsbelasting)', penalty: 'verzuim-/vergrijpboete tot 100%', penaltyMaxEur: 12000, due: 'Annual', dueDays: 150 },
        US: { source: 'IRC §11 / state franchise tax', penalty: '5%/month of unpaid tax, max 25%', penaltyMaxEur: 15000, due: 'Annual', dueDays: 105 },
        default: { source: 'National corporate income tax act', penalty: 'late surcharges + interest', penaltyMaxEur: 10000, due: 'Annual', dueDays: 120 },
    },
    'prod-epr': {
        DE: { source: 'VerpackG §9 (LUCID)', penalty: 'up to €200,000 + distribution ban', penaltyMaxEur: 200000, due: 'Annual', dueDays: 60 },
        FR: { source: 'Code env. Art. L541-10 (AGEC)', penalty: 'up to €30,000 per year of default', penaltyMaxEur: 30000, due: 'Annual', dueDays: 60 },
        UK: { source: 'UK Packaging Waste Regs 2023 §7 (PackUK)', penalty: 'up to 4% of UK revenue', penaltyMaxEur: 50000, due: 'Annual', dueDays: 90 },
        ES: { source: 'RD 1055/2022 (Envases)', penalty: 'up to €100,000', penaltyMaxEur: 100000, due: 'Annual', dueDays: 60 },
        IT: { source: 'D.Lgs. 152/2006 (CONAI)', penalty: 'up to €60,000', penaltyMaxEur: 60000, due: 'Annual', dueDays: 60 },
        NL: { source: 'Besluit beheer verpakkingen (Afvalfonds)', penalty: 'recovery + administrative fines', penaltyMaxEur: 25000, due: 'Annual', dueDays: 60 },
        default: { source: 'EU PPWR 2025/40', penalty: 'national EPR fines + sales ban', penaltyMaxEur: 50000, due: 'Annual', dueDays: 60 },
    },
    // PPWR is a Regulation: it binds whoever places packaging on the EU market,
    // identically in every member state, so there are no country overrides here.
    // The national layer (registration, licensing fees) sits in 'prod-epr'.
    'prod-packaging-conformity': {
        default: { source: 'EU PPWR 2025/40 Art. 37–39 (Annex VII/VIII)', penalty: 'national penalties under Art. 68 + withdrawal from the market', penaltyMaxEur: 100000, due: 'Ongoing', appliesFrom: '2026-08-12', scope: 'eu' },
    },
    // The 2030 tranche. Same reasoning as above: a Regulation, so no country
    // overrides. Art. 24 additionally slips to "3 years after the implementing
    // act" if the Commission is late, so the date is a floor, not a promise —
    // said plainly in the source string rather than pretended away.
    'prod-packaging-recycled-content': {
        default: { source: 'EU PPWR 2025/40 Art. 7 (post-consumer recyclate only)', penalty: 'national penalties under Art. 68 + withdrawal from the market', penaltyMaxEur: 100000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu' },
    },
    'prod-packaging-recyclability': {
        default: { source: 'EU PPWR 2025/40 Art. 6 + Annex II (grade A–C; A/B from 2038)', penalty: 'national penalties under Art. 68 + withdrawal from the market', penaltyMaxEur: 100000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu' },
    },
    'prod-packaging-empty-space': {
        default: { source: 'EU PPWR 2025/40 Art. 24 (50% cap, or 3 years after the implementing act)', penalty: 'national penalties under Art. 68 + withdrawal from the market', penaltyMaxEur: 75000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu' },
    },
    'prod-packaging-format-bans': {
        default: { source: 'EU PPWR 2025/40 Art. 25 + Annex V', penalty: 'format may no longer be placed on the market', penaltyMaxEur: 75000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu' },
    },
    'prod-packaging-reuse-targets': {
        default: { source: 'EU PPWR 2025/40 Art. 29 (40% transport / 10% grouped; cardboard exempt)', penalty: 'national penalties under Art. 68', penaltyMaxEur: 50000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu' },
    },
    'prod-safety': {
        UK: { source: 'UK GPSR 2005', penalty: 'up to £20,000 + 12 months imprisonment', penaltyMaxEur: 23000, due: 'Ongoing' },
        US: { source: 'CPSA / CPSC recall rules', penalty: 'up to $120,000 per violation', penaltyMaxEur: 110000, due: 'Ongoing' },
        default: { source: 'EU GPSR 2023/988', penalty: 'up to 4% of annual turnover', penaltyMaxEur: 100000, due: 'Ongoing', scope: 'eu' },
    },
    'mktg-consent': {
        DE: { source: 'UWG §7 / GDPR Art. 7', penalty: 'up to €300,000 per campaign (UWG)', penaltyMaxEur: 300000, due: 'Ongoing' },
        TR: { source: 'ETK No. 6563 / KVKK', penalty: 'up to ₺1,000,000', penaltyMaxEur: 30000, due: 'Ongoing' },
        US: { source: 'CAN-SPAM / TCPA', penalty: 'up to $51,744 per email; $1,500 per call/text', penaltyMaxEur: 48000, due: 'Ongoing' },
        default: { source: 'GDPR Art. 7 + ePrivacy Directive 2002/58', penalty: 'up to €20M or 4% of turnover', penaltyMaxEur: 100000, due: 'Ongoing', scope: 'eu' },
    },
    'mktg-health-claims': {
        default: { source: 'EU Reg. 1924/2006 (Health Claims)', penalty: 'national fines + mandatory withdrawal', penaltyMaxEur: 50000, due: 'Ongoing', scope: 'eu' },
        US: { source: 'FTC Act §5 / FDA labeling rules', penalty: 'FTC injunctions + consumer redress', penaltyMaxEur: 90000, due: 'Ongoing' },
    },
    'data-privacy': {
        UK: { source: 'UK GDPR / DPA 2018 Art. 13', penalty: 'up to £17.5M or 4% of turnover', penaltyMaxEur: 100000, due: 'Ongoing' },
        US: { source: 'CCPA/CPRA + state privacy acts', penalty: '$2,500–$7,500 per violation', penaltyMaxEur: 50000, due: 'Ongoing' },
        TR: { source: 'KVKK No. 6698 Art. 10', penalty: 'up to ₺13,000,000', penaltyMaxEur: 380000, due: 'Ongoing' },
        default: { source: 'GDPR Art. 13 / Art. 6', penalty: 'up to €20M or 4% of turnover', penaltyMaxEur: 100000, due: 'Ongoing', scope: 'eu' },
    },
    'data-hosting': {
        default: { source: 'GDPR Chapter V (transfers) + SCCs', penalty: 'transfer suspension + GDPR fines', penaltyMaxEur: 50000, due: 'One-off', dueDays: 90, scope: 'eu' },
        US: { source: 'EU-US Data Privacy Framework', penalty: 'loss of certification; transfer freeze', penaltyMaxEur: 30000, due: 'Annual', dueDays: 180 },
    },
    'corp-registration': {
        DE: { source: 'HGB §29 / GewO §14', penalty: 'coercive fines up to €5,000', penaltyMaxEur: 5000, due: 'One-off', dueDays: 30 },
        UK: { source: 'Companies Act 2006 §9', penalty: 'late-filing penalties up to £1,500', penaltyMaxEur: 1700, due: 'One-off', dueDays: 30 },
        FR: { source: 'Code de commerce Art. L123 (RCS / Guichet unique)', penalty: 'amendes + radiation d’office', penaltyMaxEur: 4500, due: 'One-off', dueDays: 30 },
        IT: { source: 'Registro delle Imprese (CCIAA), Art. 2196 c.c.', penalty: 'sanzioni €103–€1.032', penaltyMaxEur: 3000, due: 'One-off', dueDays: 30 },
        ES: { source: 'Registro Mercantil (RRM)', penalty: 'multas + cierre registral', penaltyMaxEur: 6000, due: 'One-off', dueDays: 30 },
        NL: { source: 'Handelsregisterwet (KVK-inschrijving)', penalty: 'boete + niet-inschrijving', penaltyMaxEur: 4500, due: 'One-off', dueDays: 8 },
        US: { source: 'State incorporation + foreign qualification', penalty: 'loss of good standing + back fees', penaltyMaxEur: 5000, due: 'One-off', dueDays: 30 },
        default: { source: 'National commercial register act', penalty: 'administrative fines', penaltyMaxEur: 5000, due: 'One-off', dueDays: 30 },
    },
    'monitor-kyb': {
        DE: { source: 'GwG §10 / §20 (Transparenzregister)', penalty: '€1,000–€5,000, serious cases up to €1M', penaltyMaxEur: 150000, due: 'Ongoing' },
        FR: { source: 'Code monétaire et financier Art. L561 (RBE)', penalty: 'amendes AMF/ACPR + sanctions pénales', penaltyMaxEur: 120000, due: 'Ongoing' },
        IT: { source: 'D.Lgs. 231/2007 (antiriciclaggio, Registro TE)', penalty: 'sanzioni €2.000–€1M', penaltyMaxEur: 120000, due: 'Ongoing' },
        default: { source: 'EU AMLD5 (2018/843)', penalty: 'national AML fines', penaltyMaxEur: 100000, due: 'Ongoing', scope: 'eu' },
    },
    'log-eori': {
        UK: { source: 'UK EORI (HMRC, post-Brexit)', penalty: 'goods held at border; storage costs', penaltyMaxEur: 10000, due: 'One-off', dueDays: 14 },
        TR: { source: 'Gümrük Kanunu No. 4458', penalty: 'clearance refusal + customs fines', penaltyMaxEur: 10000, due: 'One-off', dueDays: 14 },
        default: { source: 'UCC Reg. 952/2013 Art. 9', penalty: 'customs clearance blocked', penaltyMaxEur: 10000, due: 'One-off', dueDays: 14, scope: 'eu' },
    },
    'log-customs-classification': {
        US: { source: '19 U.S.C. §1592 (CBP)', penalty: 'up to the domestic value of the goods', penaltyMaxEur: 60000, due: 'Ongoing' },
        default: { source: 'UCC Reg. 952/2013 + Combined Nomenclature', penalty: 'back duties + up to 3× duty difference', penaltyMaxEur: 30000, due: 'Ongoing', scope: 'eu' },
    },
    'log-intrastat': {
        DE: { source: 'Intrastat (EBS Reg. 2019/2152), threshold €500k arrivals', penalty: 'up to €5,000 per missed report', penaltyMaxEur: 5000, due: 'Monthly', dueDays: 20 },
        IT: { source: 'Intrastat (Agenzia Dogane), modelli INTRA', penalty: 'sanzioni €500–€1.000 per modello', penaltyMaxEur: 5000, due: 'Monthly', dueDays: 25 },
        ES: { source: 'Intrastat (AEAT), umbral €400k', penalty: 'multas estadísticas hasta €30.000', penaltyMaxEur: 15000, due: 'Monthly', dueDays: 12 },
        NL: { source: 'Intrastat (CBS aangifte)', penalty: 'bestuurlijke boetes CBS', penaltyMaxEur: 5000, due: 'Monthly', dueDays: 10 },
        default: { source: 'EBS Reg. 2019/2152 (Intrastat)', penalty: 'national statistical fines', penaltyMaxEur: 5000, due: 'Monthly', dueDays: 20, scope: 'eu' },
    },
    'legal-consumer-terms': {
        DE: { source: 'BGB §312g / EGBGB Art. 246a', penalty: 'competitor warnings (Abmahnung) + injunctions', penaltyMaxEur: 15000, due: 'One-off', dueDays: 45 },
        UK: { source: 'Consumer Rights Act 2015', penalty: 'CMA enforcement orders', penaltyMaxEur: 15000, due: 'One-off', dueDays: 45 },
        FR: { source: 'Code de la consommation Art. L221 (droit de rétractation)', penalty: 'amendes DGCCRF + clauses réputées non écrites', penaltyMaxEur: 15000, due: 'One-off', dueDays: 45 },
        IT: { source: 'Codice del Consumo D.Lgs. 206/2005', penalty: 'sanzioni AGCM + clausole nulle', penaltyMaxEur: 15000, due: 'One-off', dueDays: 45 },
        ES: { source: 'RDL 1/2007 (Ley General Consumidores)', penalty: 'sanciones de consumo + cláusulas nulas', penaltyMaxEur: 15000, due: 'One-off', dueDays: 45 },
        default: { source: 'Consumer Rights Directive 2011/83/EU', penalty: 'national enforcement + void clauses', penaltyMaxEur: 15000, due: 'One-off', dueDays: 45, scope: 'eu' },
    },
    'legal-commercial-contracts': {
        DE: { source: 'BGB/HGB + Rom-I-VO 593/2008', penalty: 'unwirksame Klauseln; Prozessrisiko', penaltyMaxEur: 10000, due: 'One-off', dueDays: 60 },
        default: { source: 'National commercial code + Rome I Reg. 593/2008', penalty: 'unenforceable clauses; dispute exposure', penaltyMaxEur: 10000, due: 'One-off', dueDays: 60 },
    },
};

/** Resolve the enrichment for a subdomain: first requested country with an
 *  override wins, otherwise the 'default' entry. Returns null when a subdomain
 *  has no editorial data yet (callers should degrade gracefully). */
export function resolveEnrichment(
    subdomainId: string,
    countries: CountryCode[],
): ObligationEnrichment | null {
    const entry = ObligationEnrichmentMap[subdomainId];
    if (!entry) return null;
    for (const c of countries) {
        const hit = entry[c];
        if (hit) return hit;
    }
    return entry.default ?? null;
}
