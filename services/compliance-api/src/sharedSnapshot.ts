// ─── Was geteilt wird, ist was bestaetigt wurde (EN-Launch Schritt 4, B1) ────
// Checklist v1.0, Privacy Critical Test "Data minimization": "Only fields
// disclosed in the confirmation screen and required for the request are
// shared."
//
// Bis 2026-10-10 lasen Dialog und Anbieter aus VERSCHIEDENEN Quellen: der
// Pruefdialog zeigte die Firma aus dem Profil (user_metadata.company_name),
// der Anbieter bekam die Firma aus der letzten Anfrage des Nutzers
// (engagement_requests.structured_answers.company). Der Nutzer bestaetigte
// also womoeglich einen anderen Wert als den, der ging.
//
// Jetzt gibt es eine Quelle und einen Schnappschuss:
//   - sharedPreview(): was der Dialog zeigt, vom Server berechnet
//     (GET /acknowledgement mit Login);
//   - buildSharedSnapshot(): derselbe Wert, beim Buchen an die Buchung
//     geschrieben (scheduling.shared_snapshot);
//   - providerSharedView(): was der Anbieter liest — nur der Schnappschuss.
// Ein Feld, das nicht in `shared_fields` steht, ist null und geht nie raus.

export interface SharedSnapshot {
    email: string | null;
    company_name: string | null;
    message: string | null;
    /** Das Thema geht immer mit (Entscheidung 2026-10-10e): ohne es koennte
     *  der Anbieter die Anfrage nicht einordnen. */
    topic: { area_code: string; countries: string[] } | null;
}

export interface SharedSource {
    email?: string | null;
    company?: string | null;
    message?: string | null;
    topic?: { area_code: string; countries: string[] } | null;
}

const clean = (v: unknown, max: number): string | null => {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    return s ? s.slice(0, max) : null;
};

/** Was der Dialog zeigt: E-Mail und Firma, soweit freigegeben. */
export function sharedPreview(fields: readonly string[], src: SharedSource): { email: string | null; company_name: string | null } {
    return {
        email: fields.includes('email') ? clean(src.email, 320) : null,
        company_name: fields.includes('company_name') ? clean(src.company, 200) : null,
    };
}

export function buildSharedSnapshot(fields: readonly string[], src: SharedSource): SharedSnapshot {
    return {
        ...sharedPreview(fields, src),
        message: fields.includes('message') ? clean(src.message, 2000) : null,
        topic: src.topic && src.topic.area_code
            ? { area_code: src.topic.area_code, countries: [...(src.topic.countries ?? [])] }
            : null,
    };
}

/** Was der Anbieter zu einer Buchung sieht. Mit Schnappschuss genau dieser;
 *  aeltere Buchungen ohne Schnappschuss nur die Felder aus `shared_fields`,
 *  Buchungen von vor Phase 4 (ohne Feldliste) unveraendert. */
export function providerSharedView(
    booking: { shared_snapshot?: SharedSnapshot | null; shared_fields?: string[] | null; message?: string | null },
    legacy: { email: string | null; company: string | null },
): { user_email: string | null; user_company: string | null; message: string | null } {
    const snap = booking.shared_snapshot;
    if (snap && typeof snap === 'object') {
        return { user_email: snap.email ?? null, user_company: snap.company_name ?? null, message: snap.message ?? null };
    }
    const fields = Array.isArray(booking.shared_fields) ? booking.shared_fields : [];
    // Buchungen von vor Phase 4 (2026-10-01) tragen gar keine Feldliste
    // (Spaltenvorgabe '{}'): Damals gab es keinen Pruefdialog. Sie behalten,
    // was sie hatten, damit ein laufender Termin seinen Kontakt nicht verliert.
    if (fields.length === 0) {
        return { user_email: legacy.email, user_company: legacy.company, message: booking.message ?? null };
    }
    return {
        user_email: fields.includes('email') ? legacy.email : null,
        user_company: fields.includes('company_name') ? legacy.company : null,
        message: fields.includes('message') ? booking.message ?? null : null,
    };
}
