// ─── Nutzer-Vereinbarungen (Beta-Vereinbarung, spaeter AGB) ──────────────────
//
// Der Text liegt versioniert und je Sprache in der Datenbank; die Annahme je
// Nutzer ist append-only. Canvas-Wahl 22.10.2026 (1A · 2A · 3A+3C · 4C).

export type UserAgreementName = 'beta' | 'terms';

export interface UserAgreementPoint {
    /** Der Satz, der die Pointe traegt („Es kostet nichts."). */
    lead: string;
    /** Die Erklaerung dahinter. */
    text: string;
}

/** GET /agreements/:agreement — die aktuelle Fassung in der gewuenschten Sprache (Rueckfall Englisch). */
export interface UserAgreement {
    agreement: UserAgreementName;
    version: string;
    language: string;
    title: string;
    points: UserAgreementPoint[];
    effective_from: string;
}

/** GET /me/agreements — Stand des Nutzers je Vereinbarung. */
export interface UserAgreementState {
    agreement: UserAgreementName;
    current_version: string | null;
    accepted_version: string | null;
    accepted_at: string | null;
    language: string | null;
    /** true: eine Fassung gilt, die der Nutzer noch nicht angenommen hat — das Frontend zeigt den Schritt. */
    required: boolean;
}

export interface UserAgreementsResponse {
    ok: true;
    agreements: Record<UserAgreementName, UserAgreementState>;
}

/** POST /me/agreements/:agreement */
export interface UserAgreementAcceptRequest {
    version: string;
    language?: string;
}

export interface UserAgreementAcceptResponse {
    ok: true;
    agreement: UserAgreementName;
    version: string;
    language: string;
    accepted_at: string;
    /** true, wenn dieselbe Fassung schon angenommen war — nichts Neues geschrieben. */
    replay?: boolean;
}

export type UserAgreementErrorCode = 'AGREEMENT_UNKNOWN' | 'AGREEMENT_MISSING' | 'AGREEMENT_OUTDATED';
