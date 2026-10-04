// ─── Nylas: Kalender lesen und Termine schreiben (Spec §11 P4) ───────────────
//
// Bis hierher war Scheduling ein Generator: Geschaeftszeiten minus bereits
// gebuchte Slots. Das sieht aus wie Verfuegbarkeit, ist aber keine — der
// Anbieter konnte laengst anderweitig besetzt sein. Dieses Modul holt die
// echte Belegung und traegt gebuchte Termine in beide Kalender ein.
//
// Entscheidung 2026-08-09, bestaetigt 2026-10-05: Aggregator ist Nylas, Region
// Europe (api.eu.nylas.com). ACHTUNG: Nylas' EU-Region liegt in LONDON, nicht
// in Irland — fuer Kundendaten ist das eine Drittlandsuebermittlung, siehe
// docs/legal. Sandbox-Grants haengen an der Nylas-eigenen OAuth-Anwendung; fuer
// Produktion braucht es eine eigene Google-/Microsoft-App mit eigenen Scopes.
//
// Fehlerhaltung: Dieses Modul wirft NICHT. Ein Kalender, der nicht antwortet,
// darf weder die Slot-Anzeige noch eine bezahlte Buchung kippen. Alle Aufrufe
// liefern null/[] und protokollieren; der Aufrufer entscheidet, was das heisst.

const API_URI = process.env.NYLAS_API_URI || 'https://api.eu.nylas.com';
const API_KEY = process.env.NYLAS_API_KEY || '';
const TIMEOUT_MS = 8000;

/** Ohne Key ist die Integration schlicht aus — der Generator bleibt zustaendig. */
export function nylasConfigured(): boolean {
    return API_KEY.length > 0;
}

export interface BusyWindow {
    /** Unix-Sekunden. */
    start: number;
    end: number;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T | null> {
    if (!nylasConfigured()) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${API_URI}${path}`, {
            ...init,
            signal: ctrl.signal,
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                ...(init.headers || {}),
            },
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Belegte Zeitfenster eines Kalenders. Bewusst aus Free/Busy, nicht aus der
 * Terminliste: abgesagte Termine behalten bei Google `busy: true` und wuerden
 * Slots blockieren, die laengst frei sind (geprueft 2026-10-05).
 */
export async function fetchBusy(grantId: string, email: string, startSec: number, endSec: number): Promise<BusyWindow[]> {
    const body = JSON.stringify({ start_time: startSec, end_time: endSec, emails: [email] });
    const out = await call<{ data?: any }>(`/v3/grants/${encodeURIComponent(grantId)}/calendars/free-busy`, { method: 'POST', body });
    if (!out) return [];
    const rows = Array.isArray(out.data) ? out.data : Array.isArray(out) ? (out as any) : [];
    const windows: BusyWindow[] = [];
    for (const row of rows) {
        for (const slot of row?.time_slots ?? []) {
            if (typeof slot?.start_time === 'number' && typeof slot?.end_time === 'number') {
                windows.push({ start: slot.start_time, end: slot.end_time });
            }
        }
    }
    return windows;
}

export interface CreatedEvent {
    id: string;
}

/** Legt den gebuchten Termin im Kalender des Anbieters an. */
export async function createEvent(p: {
    grantId: string;
    calendarId: string;
    title: string;
    description?: string;
    startSec: number;
    endSec: number;
    participants?: { email: string; name?: string }[];
}): Promise<CreatedEvent | null> {
    const body = JSON.stringify({
        title: p.title,
        description: p.description ?? '',
        when: { start_time: p.startSec, end_time: p.endSec },
        ...(p.participants?.length ? { participants: p.participants } : {}),
    });
    const out = await call<{ data?: any }>(
        `/v3/grants/${encodeURIComponent(p.grantId)}/events?calendar_id=${encodeURIComponent(p.calendarId)}`,
        { method: 'POST', body },
    );
    const id = out?.data?.id;
    return typeof id === 'string' ? { id } : null;
}

/** Entfernt einen Termin wieder (Storno). true = Nylas hat bestaetigt. */
export async function cancelEvent(grantId: string, calendarId: string, eventId: string): Promise<boolean> {
    const out = await call<unknown>(
        `/v3/grants/${encodeURIComponent(grantId)}/events/${encodeURIComponent(eventId)}?calendar_id=${encodeURIComponent(calendarId)}`,
        { method: 'DELETE' },
    );
    return out !== null;
}

/**
 * Zieht belegte Fenster von den erzeugten Slots ab.
 *
 * Rein und ohne Netz, damit die Regel testbar ist: Ein Slot faellt, sobald er
 * ein belegtes Fenster UEBERLAPPT — nicht erst, wenn er deckungsgleich ist.
 * Ein Termin von 9:15 bis 9:45 macht den 9:00-Slot unbuchbar, obwohl kein
 * Zeitpunkt zusammenfaellt; genau daran scheitert die naive Mengenlogik, die
 * der alte Generator mit `bookedSet.has(iso)` benutzt hat.
 */
export function subtractBusy(slotsIso: string[], busy: BusyWindow[], slotMinutes = 30): string[] {
    if (!busy.length) return slotsIso;
    return slotsIso.filter((iso) => {
        const start = Math.floor(Date.parse(iso) / 1000);
        if (Number.isNaN(start)) return false;
        const end = start + slotMinutes * 60;
        return !busy.some((w) => start < w.end && end > w.start);
    });
}
