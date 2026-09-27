// ─── Anonymes Matching, ohne Datenbank-Nebeneffekte ─────────────────────────
//
// Phase 3 des Provider-Plans (ADR-0004). Vier Dinge, alle rein:
//
//   1. serializeProvider — welche Felder eine Antwort tragen darf, entscheidet
//      das Register `provider_field_visibility` (Spec A §13), nicht eine Liste
//      im Handler. Standard zu: ein Feld ohne Eintrag faellt weg.
//   2. publicTitle — der Titel vor der Buchung entsteht hier: "Verified
//      Provider B" plus eine Beschreibung aus freigegebenen Bereichen und
//      Region. Nichts davon schreibt der Anbieter (Nutzer-Entscheidung
//      2026-09-27; Spec §15 "unique wording").
//   3. identityScan / maskIdentity — deterministische Suche nach Identitaet in
//      Freitexten: Domain, Handle, Rechtsform, Registernummer, der eigene
//      Firmenname. Regex und feste Heuristiken, kein LLM (Privacy-Regel).
//      Beim Schreiben wird blockiert und benannt; beim Lesen maskiert als Netz.
//   4. verificationDepth / rankBasis — der Prioritaetsanteil des Rankings
//      haengt ab jetzt am Anteil unabhaengig geprueft er Pflichtnachweise, nicht
//      an `partner_status`. rankBasis nennt die Fakten hinter der Reihenfolge
//      fuer die Karte — Fakten, keine Gewichte.

import { redactText } from '@complihub360/redaction';
import { evidenceMatches, requiredEvidence, type CoverageLike, type EvidenceLike, type RequiredEvidence, type ServiceLike } from './verificationRules.js';

// ─── 1. Serializer gegen das Register ────────────────────────────────────────

export type VisibilityClass = 'anonymous' | 'revealed' | 'internal' | 'confidential' | 'billing';
export type Stage = 'anonymous' | 'revealed';

type Register = Map<string, VisibilityClass>;

let cache: { at: number; reg: Register } | null = null;
const TTL_MS = 10 * 60 * 1000;

export type RegisterRow = { field_path: string; visibility_class: VisibilityClass };

/**
 * Liest das Register einmal je zehn Minuten. Der Leser kommt von aussen, damit
 * dieses Modul ohne Datenbank bleibt (Tests) — index.ts gibt supabaseApi mit.
 * Fuer Tests: `invalidateVisibility()`.
 */
export async function loadVisibility(fetchRows: () => Promise<RegisterRow[]>): Promise<Register> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.reg;
    const rows = await fetchRows();
    const reg: Register = new Map();
    for (const r of rows) reg.set(r.field_path, r.visibility_class);
    cache = { at: Date.now(), reg };
    return reg;
}

export function invalidateVisibility(): void { cache = null; }

/** Die Klassen, die eine Stufe tragen darf. 'internal' und die vertraulichen Klassen nie. */
const ALLOWED: Record<Stage, ReadonlySet<VisibilityClass>> = {
    anonymous: new Set<VisibilityClass>(['anonymous']),
    revealed: new Set<VisibilityClass>(['anonymous', 'revealed']),
};

/**
 * Nimmt eine `providers`-Zeile und gibt nur die Felder zurueck, die das
 * Register fuer diese Stufe erlaubt. `provider_key` wird nie ausgegeben, auch
 * wenn jemand das Register aendert — der Schluessel ist aus dem Namen gebildet
 * und damit selbst ein Identitaetsmerkmal. `public_ref` wird immer ausgegeben.
 */
export function serializeProvider(row: Record<string, unknown>, reg: Register, stage: Stage): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const allowed = ALLOWED[stage];
    for (const [field, value] of Object.entries(row)) {
        if (field === 'provider_key' || field === 'pseudonym_label') continue;
        if (field === 'public_ref') { out.public_ref = value; continue; }
        const cls = reg.get(`providers.${field}`);
        if (cls && allowed.has(cls)) out[field] = value ?? null;
    }
    if (!('public_ref' in out) && typeof row.public_ref === 'string') out.public_ref = row.public_ref;
    return out;
}

// ─── 2. Der Titel vor der Buchung ────────────────────────────────────────────

export interface PublicTitle {
    /** "Verified Provider B" — der Buchstabe ist die Position in DIESER Liste. */
    label: string;
    /** Buchstabe allein, fuer Monogramm-Kacheln. */
    letter: string;
    /** "Steuern & USt · Norditalien" — aus freigegebenen Bereichen und Region. */
    descriptor: string;
}

/** 0 → A, 25 → Z, 26 → AA, 27 → AB … */
export function letterFor(index: number): string {
    let n = Math.max(0, Math.floor(index));
    let s = '';
    do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
    return s;
}

/**
 * Titel und Beschreibung. `areaNames` sind die Namen der freigegebenen
 * Bereiche (aus `service_categories.label_en`), hoechstens zwei kommen in die
 * Zeile; mehr wird zu "+n". Die Region ist die grobe Angabe des Anbieters und
 * hat den Identitaets-Scan passiert. Ohne Bereiche und ohne Region bleibt die
 * Beschreibung leer — die Karte zeigt dann nur das Label, statt etwas zu
 * behaupten.
 */
export function publicTitle(index: number, areaNames: string[], region: string | null | undefined): PublicTitle {
    const letter = letterFor(index);
    const names = [...new Set(areaNames.map((n) => n.trim()).filter(Boolean))].sort();
    const shown = names.slice(0, 2);
    const rest = names.length - shown.length;
    const areaPart = shown.length ? shown.join(', ') + (rest > 0 ? ` +${rest}` : '') : '';
    const descriptor = [areaPart, (region ?? '').trim()].filter(Boolean).join(' · ');
    return { label: `Verified Provider ${letter}`, letter, descriptor };
}

// ─── 3. Identitaet in Freitexten ─────────────────────────────────────────────

export type FindingType = 'email' | 'phone' | 'domain' | 'handle' | 'legal_form' | 'registry' | 'own_name';

export interface IdentityFinding {
    type: FindingType;
    /** Der gefundene Text, so wie er im Feld steht. */
    match: string;
    /** Zeichenposition im Text (0-basiert). */
    index: number;
}

export interface IdentityContext {
    /** Der Klarname des Anbieters (`providers.name`), dessen Tokens gesucht werden. */
    providerName?: string | null;
    /** `providers.website_url`; die Domain daraus ist ein Treffer. */
    website?: string | null;
}

const TLDS = 'de|com|it|es|fr|nl|eu|io|org|net|co\\.uk|uk|at|ch|tr|be|pl|pt|se|dk|fi|no|ie|lu|cz|hu|ro|gr|info|biz|law|tax|legal';
const RX_DOMAIN = new RegExp(`(?:https?://)?(?:www\\.)?\\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9-]+)*\\.(?:${TLDS})\\b(?:/[^\\s]*)?`, 'gi');
const RX_HANDLE = /(?<![\w.])@[a-z0-9_.]{3,}/gi;
// Rechtsform NACH einem Firmenwort: "Mustermann GmbH", "Studio Bianchi S.r.l.".
// Ein alleinstehendes "GmbH" ("unsere GmbH-Kunden") ist kein Treffer.
const RX_LEGAL = /\b[A-ZÄÖÜ][\w&.'-]{1,}(?:\s+[A-ZÄÖÜ&][\w&.'-]*){0,3}\s+(?:GmbH(?:\s*&\s*Co\.?\s*KG)?|AG|KGaA|KG|UG(?:\s*\(haftungsbeschränkt\))?|GbR|mbB|OHG|e\.?K\.?|S\.?r\.?l\.?|S\.?p\.?A\.?|S\.?L\.?|S\.?A\.?|S\.?A\.?S\.?|SARL|SAS|Ltd\.?|LLP|LLC|Inc\.?|PLC|B\.?V\.?|N\.?V\.?|A\.?Ş\.?|Ltd\.?\s*Şti\.?|Oy|AB|ApS|A\/S|GmbH)\b\.?/g;
const RX_REGISTRY = /\b(?:HRB|HRA|GnR|PR|VR)\s?\d{2,7}\b|\bREA\s?[A-Z]{2}[-\s]?\d{4,8}\b|\bRCS\s+[A-Za-z-]+\s?\d{3}\s?\d{3}\s?\d{3}\b|\b(?:CIF|NIF)\s?[A-Z]\d{7,8}[A-Z0-9]?\b|\bCompanies\s+House\s?\d{8}\b|\bKvK\s?\d{8}\b|\bP\.?\s?IVA\s?\d{11}\b|\bUID\s?CHE-?\d{3}\.?\d{3}\.?\d{3}\b/g;

/** Woerter, die in Firmennamen vorkommen, aber niemanden identifizieren. */
const STOP = new Set([
    'kanzlei', 'steuerkanzlei', 'steuerberatung', 'steuerberater', 'rechtsanwalt', 'rechtsanwaelte', 'rechtsanwälte', 'anwalt', 'anwaelte', 'anwälte',
    'partner', 'partners', 'consulting', 'consultants', 'beratung', 'berater', 'group', 'gruppe', 'legal', 'law', 'tax', 'compliance', 'services', 'service',
    'international', 'deutschland', 'germany', 'europe', 'europa', 'italia', 'italy', 'espana', 'españa', 'spain', 'france', 'studio', 'office', 'associates',
    'associati', 'asesores', 'asesoria', 'asesoría', 'avocats', 'abogados', 'solicitors', 'chartered', 'accountants', 'audit', 'advisory', 'advisors',
    'gmbh', 'ag', 'kg', 'ug', 'gbr', 'mbb', 'srl', 'spa', 'sarl', 'sas', 'ltd', 'llp', 'llc', 'inc', 'plc', 'bv', 'nv', 'und', 'and', 'the', 'von', 'der', 'die', 'das',
]);

function nameTokens(name: string | null | undefined): string[] {
    if (!name) return [];
    return [...new Set(name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ')
        .map((t) => t.trim()).filter((t) => t.length >= 4 && !STOP.has(t)))];
}

function hostOf(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const h = new URL(url.includes('://') ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '');
        return h || null;
    } catch { return null; }
}

function escapeRx(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function collect(text: string, rx: RegExp, type: FindingType, out: IdentityFinding[]): void {
    rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text)) !== null) {
        out.push({ type, match: m[0], index: m.index });
        if (m[0].length === 0) rx.lastIndex++;
    }
}

/**
 * Sucht Identitaet in einem Freitext. Rueckgabe nennt jeden Fund mit Typ und
 * Stelle — das ist die 422-Antwort an den Anbieter, in Worten, die er
 * versteht ("Bitte ohne Firmenname: 'Bianchi' in Zeile 2"), keine Verstoss-
 * Sprache. Deterministisch; derselbe Text ergibt dieselben Funde.
 */
export function identityScan(text: string | null | undefined, ctx: IdentityContext = {}): { ok: boolean; findings: IdentityFinding[] } {
    if (!text) return { ok: true, findings: [] };
    const out: IdentityFinding[] = [];

    // E-Mail und Telefon aus der Redaction (deterministische Muster, strict).
    const red = redactText(text, { profile: 'strict' });
    const counts = red.report.countsByType;
    if (counts.EMAIL) collect(text, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email', out);
    if (counts.PHONE) collect(text, /(?:\+|00)\d{1,3}[\s./-]?(?:\(?\d{1,5}\)?[\s./-]?)?\d{2,5}(?:[\s./-]?\d{2,5}){1,4}\b|\b0\d{2,5}[\s./-]?\d{3,9}\b/g, 'phone', out);

    collect(text, RX_DOMAIN, 'domain', out);
    collect(text, RX_HANDLE, 'handle', out);
    collect(text, RX_LEGAL, 'legal_form', out);
    collect(text, RX_REGISTRY, 'registry', out);

    for (const tok of nameTokens(ctx.providerName)) collect(text, new RegExp(`\\b${escapeRx(tok)}\\b`, 'gi'), 'own_name', out);
    const host = hostOf(ctx.website);
    if (host) collect(text, new RegExp(escapeRx(host), 'gi'), 'own_name', out);

    // Ein Handle, das Teil einer E-Mail ist, ist keine zweite Meldung; ein
    // eigener Name, der in einer Domain steckt, ebenfalls nicht.
    const dedup = out
        .sort((a, b) => a.index - b.index || b.match.length - a.match.length)
        .filter((f, i, arr) => !arr.some((g, j) => j !== i && g.index <= f.index && g.index + g.match.length >= f.index + f.match.length && (g.match.length > f.match.length || j < i)));
    return { ok: dedup.length === 0, findings: dedup };
}

/** Netz beim Lesen: jeder Fund wird durch "[…]" ersetzt. Schreiben blockiert; das hier faengt Altbestand. */
export function maskIdentity(text: string | null | undefined, ctx: IdentityContext = {}): string | null {
    if (!text) return text ?? null;
    const { findings } = identityScan(text, ctx);
    if (!findings.length) return text;
    let out = '';
    let pos = 0;
    for (const f of findings) {
        if (f.index < pos) continue;
        out += text.slice(pos, f.index) + '[…]';
        pos = f.index + f.match.length;
    }
    return out + text.slice(pos);
}

/** Alle Freitext-Felder eines Dossiers auf einmal; Schluessel sind Feldpfade wie "services[2]". */
export function scanFields(fields: Record<string, unknown>, ctx: IdentityContext): Array<IdentityFinding & { field: string }> {
    const out: Array<IdentityFinding & { field: string }> = [];
    const walk = (v: unknown, path: string) => {
        if (typeof v === 'string') { for (const f of identityScan(v, ctx).findings) out.push({ ...f, field: path }); return; }
        if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
        if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`); }
    };
    for (const [k, v] of Object.entries(fields)) walk(v, k);
    return out;
}

// ─── 4. Verifikationstiefe und Rang-Fakten ───────────────────────────────────

/**
 * Anteil der Pflichtnachweise, die unabhaengig geprueft sind: 1 je
 * `independently_verified`, 0.5 je `reviewed`, 0 sonst — gemittelt ueber die
 * Pflichtpunkte des Dossiers (`requiredEvidence`). Jeder neue Anbieter kann
 * das sofort erreichen; Groesse, Alter und Plan spielen keine Rolle.
 */
export function verificationDepth(required: RequiredEvidence[], evidence: EvidenceLike[]): number {
    if (!required.length) return 0;
    let sum = 0;
    for (const req of required) {
        let best = 0;
        for (const e of evidence) {
            if (!evidenceMatches(req, e)) continue;
            const v = e.result === 'independently_verified' ? 1 : e.result === 'reviewed' ? 0.5 : 0;
            if (v > best) best = v;
        }
        sum += best;
    }
    return Math.round((sum / required.length) * 1000) / 1000;
}

export type VerificationLevel = 'independent' | 'reviewed' | 'partial' | 'none';

export interface RankBasis {
    /** independent = alle Pflichtnachweise unabhaengig geprueft; reviewed = alle geprueft, nicht alle unabhaengig; partial = nicht alle. */
    verification: VerificationLevel;
    verified_count: number;
    required_count: number;
    response_hours: number | null;
    /** 0..1 */
    confirmation_rate: number | null;
    /** Nur Bewertungen aus Buchungen. */
    rating: number | null;
    reviews_count: number | null;
}

export function rankBasis(input: {
    required: RequiredEvidence[]; evidence: EvidenceLike[];
    avg_response_hours?: number | null; confirmation_rate?: number | null; rating?: number | null; reviews_count?: number | null;
}): RankBasis {
    const required = input.required;
    let independent = 0, reviewed = 0;
    for (const req of required) {
        const hits = input.evidence.filter((e) => evidenceMatches(req, e));
        if (hits.some((e) => e.result === 'independently_verified')) independent++;
        else if (hits.some((e) => e.result === 'reviewed')) reviewed++;
    }
    const verified = independent + reviewed;
    const verification: VerificationLevel = !required.length || verified === 0 ? 'none'
        : verified < required.length ? 'partial'
        : independent === required.length ? 'independent' : 'reviewed';
    const num = (v: unknown) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));
    return {
        verification, verified_count: verified, required_count: required.length,
        response_hours: num(input.avg_response_hours), confirmation_rate: num(input.confirmation_rate),
        rating: num(input.rating), reviews_count: num(input.reviews_count),
    };
}

/** Pflichtpunkte eines Anbieters aus Leistungen und Coverage — dieselbe Regel wie in der Checkliste. */
export function requiredFor(services: ServiceLike[], coverage: CoverageLike[]): RequiredEvidence[] {
    return requiredEvidence(services, coverage);
}
