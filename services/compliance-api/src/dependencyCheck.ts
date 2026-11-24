import { structuredLog } from '@complihub360/types';

// ─── Anbindungen pruefen (Systemcheck 24.11.2026, Befund 4) ──────────────────
//
// /health sagt, dass der Prozess laeuft, /ready antwortet fest. Ob Stripe,
// Resend, Nylas, das LLM und Supabase mit den hinterlegten Schluesseln noch
// antworten, merkte das System erst, wenn ein Nutzer darauf lief: eine Buchung,
// die an einer abgelaufenen Kalenderfreigabe scheitert, ein Anmeldelink, der
// nie ankommt.
//
// Dieses Modul fragt jede Anbindung mit ihrem Schluessel einmal LESEND an:
// kein Schreibzugriff, keine Mail, keine Belastung, kein LLM-Aufruf mit Tokens.
// Das Ergebnis nennt je Anbindung einen Zustand und nie ein Geheimnis: keine
// Schluessel, keine Antwortkoerper, nur Statuscode und ein fester Hinweis.
//
// Zwei Nutzer:
//   - GET /api/v1/admin/readiness (Server-Key oder Admin), fuer den Menschen
//     und fuer den Lauf von aussen (system-check.yml);
//   - startDependencyMonitor(): stuendlich im Prozess. Kippt eine Anbindung,
//     steht eine error-Zeile im Log, und der Watchdog auf dem VPS mailt sie
//     mit seinem Fehler-Digest. Keine neue Infrastruktur.

export type DependencyState =
    | 'ok'              // hat mit dem Schluessel geantwortet
    | 'not_configured'  // kein Schluessel hinterlegt
    | 'rejected'        // erreichbar, aber der Schluessel wird abgewiesen
    | 'unreachable'     // keine Antwort (Netz, Zeitueberschreitung)
    | 'error';          // unerwartete Antwort (5xx und anderes)

export interface DependencyResult {
    name: 'database' | 'stripe' | 'mail' | 'calendar' | 'calendar_grants' | 'llm';
    state: DependencyState;
    /** Dauer des Aufrufs in Millisekunden. */
    ms: number;
    /** HTTP-Status der Gegenseite, wenn es einen gab. */
    status?: number;
    /** Fester, kurzer Hinweis — nie ein Antwortkoerper. */
    note?: string;
}

export interface DependencyReport {
    ok: boolean;
    checkedAt: string;
    /** true: Ergebnis aus dem Zwischenspeicher, nicht frisch gefragt. */
    cached: boolean;
    /** Anbindungen, die laut READINESS_REQUIRED nicht fehlen duerfen. */
    required: string[];
    /** Namen in READINESS_REQUIRED, die es nicht gibt (Tippfehler). Nicht leer heisst: nicht ok. */
    unknownRequired: string[];
    checks: DependencyResult[];
}

type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 6000;
/** Wie viele Kalenderfreigaben hoechstens einzeln geprueft werden. */
const MAX_GRANTS = 50;

/** Ein fester Bezeichner aus einer fremden Antwort, hart begrenzt. */
function safeToken(v: unknown): string | undefined {
    return typeof v === 'string' && /^[a-z0-9_]{1,40}$/i.test(v) ? v.toLowerCase() : undefined;
}

/** Ein Feld aus einer fremden Antwort lesen, ohne ihr eine Form zu unterstellen. */
function field(body: unknown, ...path: string[]): unknown {
    let cur: unknown = body;
    for (const key of path) {
        if (!cur || typeof cur !== 'object') return undefined;
        cur = (cur as Record<string, unknown>)[key];
    }
    return cur;
}

async function probe(fetchImpl: FetchLike, url: string, headers: Record<string, string>): Promise<{ status: number; body: unknown } | { failed: true }> {
    try {
        const res = await fetchImpl(url, { method: 'GET', headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
        const body: unknown = await res.json().catch(() => null);
        return { status: res.status, body };
    } catch {
        return { failed: true };
    }
}

function fromStatus(status: number): DependencyState {
    if (status >= 200 && status < 300) return 'ok';
    if (status === 401 || status === 403) return 'rejected';
    return 'error';
}

async function timed(name: DependencyResult['name'], run: () => Promise<Omit<DependencyResult, 'name' | 'ms'>>): Promise<DependencyResult> {
    const t0 = Date.now();
    try {
        const r = await run();
        return { name, ms: Date.now() - t0, ...r };
    } catch {
        // Ein Fehler in der Pruefung selbst darf nie wie "alles gut" aussehen.
        return { name, ms: Date.now() - t0, state: 'error', note: 'check_failed' };
    }
}

/** Die Rolle aus einem JWT-Schluessel; undefined, wenn er kein JWT ist (neue sb_secret-Schluessel). */
function jwtRole(key: string): string | undefined {
    const parts = key.split('.');
    if (parts.length !== 3) return undefined;
    try {
        return safeToken(field(JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')), 'role'));
    } catch {
        return undefined;
    }
}

async function checkDatabase(env: Env, f: FetchLike): Promise<Omit<DependencyResult, 'name' | 'ms'>> {
    const url = env.SUPABASE_URL?.trim();
    const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) return { state: 'not_configured' };
    // Ein 200 beweist nicht, dass es der Server-Schluessel ist: der oeffentliche
    // anon-Schluessel liest dieselbe Tabelle. Die Rolle steht im Schluessel
    // selbst, wenn er ein JWT ist; gelesen wird sie hier, ohne Netz.
    const role = jwtRole(key);
    if (role !== undefined && role !== 'service_role') return { state: 'rejected', note: 'not_service_role' };
    const r = await probe(f, `${url.replace(/\/+$/, '')}/rest/v1/user_agreements?select=version&limit=1`, { apikey: key, Authorization: `Bearer ${key}` });
    if ('failed' in r) return { state: 'unreachable' };
    return { state: fromStatus(r.status), status: r.status };
}

async function checkStripe(env: Env, f: FetchLike): Promise<Omit<DependencyResult, 'name' | 'ms'>> {
    const key = env.STRIPE_SECRET_KEY?.trim();
    if (!key) return { state: 'not_configured' };
    // Die Beta verspricht Testmodus (Beta-Vereinbarung, Punkt 02). Der Modus
    // steht im Praefix des Schluessels; der Schluessel selbst verlaesst die
    // Funktion nicht.
    const mode = /^(sk|rk)_test_/.test(key) ? 'mode_test' : /^(sk|rk)_live_/.test(key) ? 'mode_live' : 'mode_unknown';
    // Kunden lesen darf der Schluessel ohnehin (stripe.ts: customers: write).
    const r = await probe(f, 'https://api.stripe.com/v1/customers?limit=1', { Authorization: `Bearer ${key}` });
    if ('failed' in r) return { state: 'unreachable', note: mode };
    return { state: fromStatus(r.status), status: r.status, note: mode };
}

async function checkMail(env: Env, f: FetchLike): Promise<Omit<DependencyResult, 'name' | 'ms'>> {
    const key = env.RESEND_API_KEY?.trim();
    if (!key) return { state: 'not_configured', note: 'mails_are_only_logged' };
    const r = await probe(f, 'https://api.resend.com/domains', { Authorization: `Bearer ${key}` });
    if ('failed' in r) return { state: 'unreachable' };
    // Ein Schluessel, der nur senden darf, wird hier abgewiesen, obwohl er
    // gilt. Resend sagt das mit einem eigenen Fehlernamen.
    const errName = safeToken(field(r.body, 'name'));
    if ((r.status === 401 || r.status === 403) && errName === 'restricted_api_key') {
        return { state: 'ok', status: r.status, note: 'send_only_key' };
    }
    return { state: fromStatus(r.status), status: r.status, ...(errName && r.status >= 400 ? { note: errName } : {}) };
}

function nylasBase(env: Env): string {
    return (env.NYLAS_API_URI?.trim() || 'https://api.eu.nylas.com').replace(/\/+$/, '');
}

async function checkCalendar(env: Env, f: FetchLike): Promise<Omit<DependencyResult, 'name' | 'ms'>> {
    const key = env.NYLAS_API_KEY?.trim();
    if (!key) return { state: 'not_configured', note: 'generated_slots_only' };
    const r = await probe(f, `${nylasBase(env)}/v3/grants?limit=1`, { Authorization: `Bearer ${key}` });
    if ('failed' in r) return { state: 'unreachable' };
    return { state: fromStatus(r.status), status: r.status };
}

/**
 * Die Freigaben, an denen Buchungen haengen: je Anbieter mit verbundenem
 * Kalender eine. Laeuft eine ab, scheitert genau dessen Buchung. Die Kennungen
 * kommen vom Aufrufer (aus der Tabelle providers) und verlassen die Funktion
 * nicht; gemeldet wird nur, wie viele gueltig sind.
 */
async function checkCalendarGrants(env: Env, f: FetchLike, grantIds: string[] | 'load_failed'): Promise<Omit<DependencyResult, 'name' | 'ms'>> {
    const key = env.NYLAS_API_KEY?.trim();
    if (!key) return { state: 'not_configured' };
    // Liessen sich die Freigaben nicht laden, ist NICHT geprueft worden. Eine
    // leere Liste saehe hier aus wie "kein Kalender verbunden".
    if (grantIds === 'load_failed') return { state: 'error', note: 'grants_not_loaded' };
    const all = [...new Set(grantIds.filter((g) => typeof g === 'string' && g.length > 0))];
    if (all.length === 0) return { state: 'ok', note: 'grants_0' };
    const ids = all.slice(0, MAX_GRANTS);
    const unchecked = all.length - ids.length;
    const results = await Promise.all(ids.map((id) => probe(f, `${nylasBase(env)}/v3/grants/${encodeURIComponent(id)}`, { Authorization: `Bearer ${key}` })));
    let invalid = 0;
    let unknown = 0;
    for (const r of results) {
        if ('failed' in r) { unknown++; continue; }
        // Gueltig ist nur, was Nylas ausdruecklich so nennt. Fehlt das Feld oder
        // heisst es anders, zaehlt die Freigabe nicht als gueltig.
        if (r.status === 200) { if (safeToken(field(r.body, 'data', 'grant_status')) !== 'valid') invalid++; continue; }
        // Abgewiesen oder geloescht ist ein Befund an der Freigabe; alles
        // andere (429, 5xx) sagt nur, dass gerade nichts zu erfahren war.
        if (r.status === 401 || r.status === 403 || r.status === 404) invalid++; else unknown++;
    }
    const note = `grants_${ids.length}_invalid_${invalid}${unknown ? `_unknown_${unknown}` : ''}${unchecked ? `_unchecked_${unchecked}` : ''}`;
    if (invalid > 0) return { state: 'rejected', note };
    if (unknown > 0) return { state: 'unreachable', note };
    // Mehr Freigaben, als ein Lauf prueft: dann deckt die Pruefung nicht mehr
    // alles ab, und das soll auffallen statt gruen zu bleiben.
    if (unchecked > 0) return { state: 'error', note };
    return { state: 'ok', note };
}

async function checkLlm(env: Env, f: FetchLike): Promise<Omit<DependencyResult, 'name' | 'ms'>> {
    const key = env.LLM_API_KEY?.trim();
    if (!key) return { state: 'not_configured' };
    const base = (env.LLM_BASE_URL?.trim() || 'https://api.scaleway.ai/v1').replace(/\/+$/, '');
    // Die Modell-Liste kostet keine Tokens.
    const r = await probe(f, `${base}/models`, { Authorization: `Bearer ${key}` });
    if ('failed' in r) return { state: 'unreachable' };
    return { state: fromStatus(r.status), status: r.status };
}

const KNOWN_REQUIRED = ['database', 'stripe', 'mail', 'calendar', 'llm'];

function listedRequired(env: Env): string[] {
    return (env.READINESS_REQUIRED || '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
}

/** READINESS_REQUIRED=stripe,mail,calendar,llm — was nicht fehlen darf. Die Datenbank immer. */
export function requiredDependencies(env: Env = process.env): string[] {
    return [...new Set(['database', ...listedRequired(env).filter((s) => KNOWN_REQUIRED.includes(s))])];
}

/** Ein Tippfehler ("resend" statt "mail") darf eine Anforderung nicht still streichen. */
export function unknownRequired(env: Env = process.env): string[] {
    return [...new Set(listedRequired(env).filter((s) => !KNOWN_REQUIRED.includes(s)))].map((s) => s.replace(/[^a-z0-9_-]/g, '?').slice(0, 24));
}

/** Eine fehlende Anbindung ist nur dann ein Befund, wenn sie verlangt ist. */
function healthy(c: DependencyResult, required: string[]): boolean {
    if (c.state === 'ok') return true;
    if (c.state !== 'not_configured') return false;
    return !required.includes(c.name === 'calendar_grants' ? 'calendar' : c.name);
}

/** ok heisst: nichts abgewiesen, nichts unerreichbar, und nichts Verlangtes fehlt. */
export function reportOk(checks: DependencyResult[], required: string[], unknown: string[] = []): boolean {
    return unknown.length === 0 && checks.every((c) => healthy(c, required));
}

export async function checkDependencies(opts: { env?: Env; fetchImpl?: FetchLike; grantIds?: string[] | 'load_failed' } = {}): Promise<DependencyReport> {
    const env = opts.env ?? process.env;
    const f: FetchLike = opts.fetchImpl ?? ((url, init) => fetch(url, init));
    const required = requiredDependencies(env);
    const unknown = unknownRequired(env);
    const checks = await Promise.all([
        timed('database', () => checkDatabase(env, f)),
        timed('stripe', () => checkStripe(env, f)),
        timed('mail', () => checkMail(env, f)),
        timed('calendar', () => checkCalendar(env, f)),
        timed('calendar_grants', () => checkCalendarGrants(env, f, opts.grantIds ?? [])),
        timed('llm', () => checkLlm(env, f)),
    ]);
    return { ok: reportOk(checks, required, unknown), checkedAt: new Date().toISOString(), cached: false, required, unknownRequired: unknown, checks };
}

// ─── Zwischenspeicher: die Route darf oft gefragt werden, die Gegenseiten nicht

const CACHE_MS = 5 * 60 * 1000;
let cached: { at: number; report: DependencyReport } | null = null;

export async function dependencyReport(loadGrantIds: () => Promise<string[]>, opts: { fresh?: boolean; now?: number } = {}): Promise<DependencyReport> {
    const now = opts.now ?? Date.now();
    if (!opts.fresh && cached && now - cached.at < CACHE_MS) return { ...cached.report, cached: true };
    // Lassen sich die Freigaben nicht laden, laufen die uebrigen Pruefungen
    // trotzdem; die Freigaben stehen dann als nicht geprueft da, nicht als gut.
    const grantIds = await loadGrantIds().catch(() => 'load_failed' as const);
    const report = await checkDependencies({ grantIds });
    cached = { at: now, report };
    return report;
}

/** Nur fuer Tests. */
export function resetDependencyCache(): void { cached = null; lastFailing = null; lastLoggedAt = 0; }

// ─── Stuendlicher Selbsttest ─────────────────────────────────────────────────

const MONITOR_MS = 60 * 60 * 1000;
const FIRST_RUN_MS = 60 * 1000;
/** Solange etwas kaputt bleibt, hoechstens so oft erneut melden. */
const REMIND_MS = 6 * 60 * 60 * 1000;
let lastFailing: string | null = null;
let lastLoggedAt = 0;

/** Schreibt genau dann, wenn sich etwas geaendert hat oder die Erinnerung faellig ist. */
export function logReport(report: DependencyReport, now: number = Date.now()): 'error' | 'recovered' | 'silent' {
    const failing = report.checks
        .filter((c) => !healthy(c, report.required))
        .map((c) => `${c.name}:${c.state}`)
        .concat(report.unknownRequired.length ? ['config:unknown_required'] : [])
        .sort()
        .join(',');
    if (failing) {
        const changed = failing !== lastFailing;
        if (changed || now - lastLoggedAt >= REMIND_MS) {
            structuredLog('error', 'Dependency check failed', {
                correlationId: 'dependency-check', errorCode: 'ERR_DEPENDENCY', severity: 'error', route: 'admin/readiness',
                failing, reminder: !changed,
            });
            lastFailing = failing;
            lastLoggedAt = now;
            return 'error';
        }
        return 'silent';
    }
    if (lastFailing) {
        structuredLog('info', 'Dependency check recovered', { correlationId: 'dependency-check', route: 'admin/readiness', recoveredFrom: lastFailing });
        lastFailing = null;
        lastLoggedAt = now;
        return 'recovered';
    }
    return 'silent';
}

export function startDependencyMonitor(loadGrantIds: () => Promise<string[]>): { stop: () => void } {
    const run = () => {
        dependencyReport(loadGrantIds, { fresh: true })
            .then((r) => { logReport(r); })
            .catch((err) => structuredLog('error', 'Dependency check crashed', { correlationId: 'dependency-check', errorCode: 'ERR_DEPENDENCY_CHECK', severity: 'error', route: 'admin/readiness', detail: String(err).slice(0, 200) }));
    };
    const first = setTimeout(run, FIRST_RUN_MS);
    const loop = setInterval(run, MONITOR_MS);
    first.unref?.();
    loop.unref?.();
    return { stop: () => { clearTimeout(first); clearInterval(loop); } };
}
