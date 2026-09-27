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

const GUEST_KEY = /^[A-Za-z0-9_-]{8,64}$/;
const MARKET = /^[A-Z]{2}$/;
const MAX_DOMAINS = 12;

export type MarketRequestInput = {
    market?: unknown;
    domains?: unknown;
    notify?: unknown;
    guest_key?: unknown;
};

export type MarketRequestRow = {
    requester_key: string;
    user_id: string | null;
    guest_key: string | null;
    market: string;
    domains: string[];
    notify: boolean;
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
    // Ein Markt, den die Engine prueft, braucht keine Anfrage. Die Oberflaeche
    // bietet den Knopf dort nicht an; kommt er trotzdem, sagen wir es, statt
    // eine Nachfrage zu zaehlen, die es nicht gibt.
    if (isKnownCountry(market)) {
        return { ok: false, status: 409, errorCode: 'MARKET_COVERED', message: 'This market is already covered' };
    }

    const domains = Array.isArray(input.domains)
        ? [...new Set(input.domains.filter((d): d is string => typeof d === 'string' && d in SLUG_TO_ENGINE))].slice(0, MAX_DOMAINS)
        : [];

    const notify = input.notify === true;
    if (notify && !authUserId) {
        return { ok: false, status: 403, errorCode: 'NOTIFY_REQUIRES_ACCOUNT', message: 'An availability update needs an account' };
    }

    if (authUserId) {
        return {
            ok: true,
            row: { requester_key: `user:${authUserId}`, user_id: authUserId, guest_key: null, market, domains, notify, updated_at: now.toISOString() },
        };
    }
    const guestKey = typeof input.guest_key === 'string' ? input.guest_key : '';
    if (!GUEST_KEY.test(guestKey)) {
        return { ok: false, status: 400, errorCode: 'VALIDATION_ERROR', message: 'guest_key required' };
    }
    return {
        ok: true,
        row: { requester_key: `guest:${guestKey}`, user_id: null, guest_key: guestKey, market, domains, notify: false, updated_at: now.toISOString() },
    };
}
