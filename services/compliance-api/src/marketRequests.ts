import { isKnownCountry } from "@complihub/compliance-engine";
import { SLUG_TO_ENGINE } from "./dashboard.js";

// ─── „Request This Market“ ───────────────────────────────────────────────────
// Der abgenommene Zustand `marketUnavailable` erscheint, wenn die Engine keinen
// der angefragten Maerkte pruefen kann. Seine Aktion „Request This Market“
// landet hier (Entscheidung 2026-09-27):
//
// - Anfragen darf jeder, auch ein Gast (guest_key). Eine Zeile je Anfragendem
//   und Markt; eine Wiederholung aktualisiert sie.
// - Ein Update zur Verfuegbarkeit nur mit Konto: die Adresse steht dann in
//   auth.users. Fuer Gaeste speichern wir keine E-Mail.
// - Die Identitaet kommt ausschliesslich aus dem geprueften JWT. Eine user_id
//   im Body wird nicht gelesen — sonst koennte ein Gast fuer ein fremdes Konto
//   ein Update bestellen.
//
// Seit 20261012000100 haelt die Zeile fest, WOFUER sie steht (`reason`):
// 'market' = das Land ist noch nicht in der Engine; 'provider_coverage' = das
// Land ist geprueft, aber kein freigegebener Anbieter deckt die genannten
// Bereiche ab (Canvas C2, "Request More Coverage"). Der Grund folgt aus dem
// Markt, nicht aus dem Wunsch des Aufrufers: ein bekannter Markt ist immer
// eine Abdeckungs-Anfrage, ein unbekannter immer eine Laender-Anfrage.

const GUEST_KEY = /^[A-Za-z0-9_-]{8,64}$/;
const MARKET = /^[A-Z]{2}$/;
const MAX_DOMAINS = 12;
// Die Sprache, in der das Update spaeter geschrieben wird (20261001184141).
// Unbekannt oder fehlend → null, der Mailer schreibt dann Englisch.
const LOCALES = new Set(['en', 'de', 'es', 'tr']);

export type MarketRequestInput = {
    market?: unknown;
    domains?: unknown;
    notify?: unknown;
    guest_key?: unknown;
    locale?: unknown;
    /** 'provider_coverage': der Markt ist geprueft, aber kein freigegebener
     *  Anbieter deckt die genannten Bereiche dort ab (Canvas C2). */
    reason?: unknown;
};

export type MarketRequestReason = 'market' | 'provider_coverage';

export type MarketRequestRow = {
    requester_key: string;
    user_id: string | null;
    guest_key: string | null;
    market: string;
    domains: string[];
    notify: boolean;
    locale: string | null;
    reason: MarketRequestReason;
    updated_at: string;
};

export type MarketRequestCheck =
    | { ok: true; row: MarketRequestRow }
    | { ok: false; status: 400 | 403 | 409; errorCode: string; message: string };

/** Prueft eine Anfrage und baut die Zeile. Rein, ohne I/O — der Aufrufer
 *  schreibt sie per Upsert auf (requester_key, market). */
export function checkMarketRequest(input: MarketRequestInput, authUserId: string | null, now = new Date()): MarketRequestCheck {
    const market = typeof input.market === 'string' ? input.market.trim().toUpperCase() : '';
    if (!MARKET.test(market)) {
        return { ok: false, status: 400, errorCode: 'VALIDATION_ERROR', message: 'market must be a two-letter country code' };
    }
    const domains = Array.isArray(input.domains)
        ? [...new Set(input.domains.filter((d): d is string => typeof d === 'string' && d in SLUG_TO_ENGINE))].slice(0, MAX_DOMAINS)
        : [];

    // Ein Markt, den die Engine prueft, braucht keine Laender-Anfrage. Kommt
    // sie trotzdem, sagen wir es, statt eine Nachfrage zu zaehlen, die es
    // nicht gibt. Ausnahme seit EN-Launch Schritt 2 (Canvas C2, "Request More
    // Coverage"): die Engine prueft den Markt, aber kein freigegebener Anbieter
    // deckt dort die genannten Bereiche ab. Dieselbe Zeile, die Bereiche sagen
    // was fehlt. Das Update dafuer verschickt der Watcher, sobald
    // matchable_provider_services dort einen dieser Bereiche abdeckt
    // (runMarketCoverageTick, Zweig provider_coverage) — erst seit es ihn
    // gibt, darf `notify` hier durch.
    const known = isKnownCountry(market);
    const coverageRequest = input.reason === 'provider_coverage';
    if (known && !(coverageRequest && domains.length)) {
        return { ok: false, status: 409, errorCode: 'MARKET_COVERED', message: 'This market is already covered' };
    }
    const reason: MarketRequestReason = known ? 'provider_coverage' : 'market';

    const notify = input.notify === true;
    const rawLocale = typeof input.locale === 'string' ? input.locale.toLowerCase().slice(0, 2) : '';
    const locale = LOCALES.has(rawLocale) ? rawLocale : null;
    if (notify && !authUserId) {
        return { ok: false, status: 403, errorCode: 'NOTIFY_REQUIRES_ACCOUNT', message: 'An availability update needs an account' };
    }

    if (authUserId) {
        return {
            ok: true,
            row: { requester_key: `user:${authUserId}`, user_id: authUserId, guest_key: null, market, domains, notify, locale, reason, updated_at: now.toISOString() },
        };
    }
    const guestKey = typeof input.guest_key === 'string' ? input.guest_key : '';
    if (!GUEST_KEY.test(guestKey)) {
        return { ok: false, status: 400, errorCode: 'VALIDATION_ERROR', message: 'guest_key required' };
    }
    return {
        ok: true,
        row: { requester_key: `guest:${guestKey}`, user_id: null, guest_key: guestKey, market, domains, notify: false, locale, reason, updated_at: now.toISOString() },
    };
}

/** Was von einer gespeicherten Zeile fuer das Zusammenfuehren zaehlt. */
export type StoredMarketRequest = {
    domains?: string[] | null;
    notify?: boolean | null;
    notified_at?: string | null;
    reason?: string | null;
};

/**
 * Fuehrt eine neue Anfrage mit der bestehenden Zeile desselben Anfragenden
 * und Markts zusammen (eine Zeile je requester_key + market). Rein; der
 * Aufrufer liest die Zeile vorher und schreibt das Ergebnis per Upsert.
 *
 * - Laender-Anfrage auf Laender-Anfrage: wie bisher, die neue ersetzt Bereiche
 *   und Update-Wunsch. Ein schon verschicktes Update bleibt verschickt.
 * - Sonst, solange die Zeile ein offenes Versprechen traegt (noch keine Mail):
 *   nichts geht still verloren. Die Bereiche werden vereinigt (eine Anfrage aus
 *   einer anderen Risk Map nimmt der ersten ihren Bereich nicht weg), ein
 *   bestelltes Update bleibt bestellt, und eine Abdeckungs-Anfrage bleibt eine
 *   — auch wenn spaeter eine Laender-Anfrage fuer denselben Markt kommt (das
 *   ginge nur, wenn die Engine ein Land wieder verliert; die API lehnt eine
 *   Laender-Anfrage fuer einen bekannten Markt sonst mit 409 ab).
 * - Ist die Mail fuer die Zeile schon raus, ist die neue Anfrage eine neue
 *   Frage: sie ersetzt die Zeile und `notified_at` wird geleert. Die Mail
 *   sagt "the only email we send about this request" — gemeint ist die
 *   beantwortete Anfrage, nicht jede kuenftige.
 */
export function mergeMarketRequest(existing: StoredMarketRequest | null, next: MarketRequestRow): MarketRequestRow & { notified_at?: null } {
    if (!existing) return next;
    const before: MarketRequestReason = existing.reason === 'provider_coverage' ? 'provider_coverage' : 'market';
    if (before === 'market' && next.reason === 'market') return next;
    if (existing.notified_at) return { ...next, notified_at: null };
    return {
        ...next,
        reason: before === 'provider_coverage' || next.reason === 'provider_coverage' ? 'provider_coverage' : 'market',
        domains: [...new Set([...(existing.domains ?? []), ...next.domains])].slice(0, MAX_DOMAINS),
        // Ein Gast hat nie ein Update (CHECK market_requests_notify_needs_account).
        notify: next.user_id ? next.notify || !!existing.notify : false,
    };
}
