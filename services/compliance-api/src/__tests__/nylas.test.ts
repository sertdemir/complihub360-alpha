import { describe, it, expect, vi, afterEach } from 'vitest';
import { subtractBusy, nylasConfigured, calendarRefFor, type BusyWindow } from '../nylas.js';

// Die Slot-Filterung ist die Stelle, an der eine Kalenderanbindung praktisch
// scheitert: Der alte Generator verglich ISO-Strings auf Gleichheit
// (`bookedSet.has(iso)`), echte Termine liegen aber quer zum Raster.

const iso = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 12, h, m, 0)).toISOString();
const sec = (h: number, m = 0) => Math.floor(Date.UTC(2026, 9, 12, h, m, 0) / 1000);
const busy = (fromH: number, fromM: number, toH: number, toM: number): BusyWindow =>
    ({ start: sec(fromH, fromM), end: sec(toH, toM) });

describe('subtractBusy', () => {
    const slots = [iso(9), iso(9, 30), iso(10), iso(10, 30), iso(11)];

    it('lässt alle Slots stehen, wenn der Kalender leer ist', () => {
        expect(subtractBusy(slots, [])).toEqual(slots);
    });

    it('entfernt den deckungsgleichen Slot', () => {
        expect(subtractBusy(slots, [busy(10, 0, 10, 30)])).not.toContain(iso(10));
    });

    it('entfernt einen Slot, der nur teilweise überlappt', () => {
        // 9:15–9:45 trifft KEINEN Slot-Anfang, macht aber 9:00 und 9:30 unbuchbar.
        const out = subtractBusy(slots, [busy(9, 15, 9, 45)]);
        expect(out).not.toContain(iso(9));
        expect(out).not.toContain(iso(9, 30));
        expect(out).toContain(iso(10));
    });

    it('lässt einen Slot stehen, der exakt an das belegte Fenster anschließt', () => {
        // Ein Termin bis 10:00 blockiert den 10:00-Slot nicht — sonst verliert
        // der Anbieter nach jedem Termin einen zusätzlichen Slot.
        const out = subtractBusy(slots, [busy(9, 0, 10, 0)]);
        expect(out).toContain(iso(10));
        expect(out).not.toContain(iso(9, 30));
    });

    it('verarbeitet mehrere belegte Fenster', () => {
        // 10:45 liegt MITTEN im 10:30-Slot (10:30–11:00) — der faellt damit auch,
        // nicht nur der 11:00er. Genau hier lag beim Schreiben dieses Tests der
        // eigene Denkfehler: gezaehlt wird die Ueberlappung, nicht der Anfang.
        const out = subtractBusy(slots, [busy(9, 0, 9, 30), busy(10, 45, 11, 15)]);
        expect(out).toEqual([iso(9, 30), iso(10)]);
    });

    it('verwirft unparsbare Slots, statt sie durchzulassen', () => {
        expect(subtractBusy(['keine-zeit'], [busy(9, 0, 10, 0)])).toEqual([]);
    });

    it('respektiert eine abweichende Slot-Länge', () => {
        // 60-Minuten-Termine: 9:30 kollidiert jetzt mit einem Fenster ab 10:15.
        const out = subtractBusy([iso(9, 30)], [busy(10, 15, 10, 45)], 60);
        expect(out).toEqual([]);
    });
});

describe('nylasConfigured', () => {
    it('ist ohne Key aus — der Generator bleibt zuständig', () => {
        // Im Test ist NYLAS_API_KEY nicht gesetzt; die Integration darf dann
        // nichts tun, statt mit halber Konfiguration loszulaufen.
        expect(nylasConfigured()).toBe(Boolean(process.env.NYLAS_API_KEY));
    });
});

describe('calendarRefFor', () => {
    const provider = { nylas_grant_id: 'grant-1', nylas_calendar_id: 'cal@example.com' };
    const booking = { nylas_event_id: 'ev-1' };

    // Ohne Key ist die Integration aus — dann gibt es auch nichts aufzuräumen.
    // Im Test ist NYLAS_API_KEY nicht gesetzt, also ist null hier das korrekte
    // Ergebnis für JEDEN Fall; geprüft wird die Bedingung, nicht der Zufall.
    const configured = Boolean(process.env.NYLAS_API_KEY);

    it('liefert ohne Konfiguration nichts', () => {
        if (!configured) expect(calendarRefFor(provider, booking)).toBeNull();
    });

    it('liefert nichts ohne Grant beim Anbieter', () => {
        expect(calendarRefFor({ nylas_grant_id: null, nylas_calendar_id: null }, booking)).toBeNull();
    });

    it('liefert nichts ohne Event-ID an der Buchung', () => {
        // Buchungen aus der Zeit vor der Anbindung haben keine — das ist kein
        // Fehler, sondern der Normalfall für Altbestand.
        expect(calendarRefFor(provider, { nylas_event_id: null })).toBeNull();
    });

    it('verträgt fehlende Zeilen', () => {
        expect(calendarRefFor(null, booking)).toBeNull();
        expect(calendarRefFor(provider, undefined)).toBeNull();
    });
});

// "Keine Antwort" und "nichts belegt" sind zwei Auskuenfte. Bis 2026-11 gab
// fetchBusy in beiden Faellen [] zurueck, und die Slot-Route meldete einen
// Kalender als geprueft, der gar nicht geantwortet hatte.
describe('fetchBusy', () => {
    // Der Key wird beim Laden des Moduls gelesen, deshalb je Test frisch laden.
    const load = async (key = 'nyk_test') => {
        vi.resetModules();
        if (key) process.env.NYLAS_API_KEY = key; else delete process.env.NYLAS_API_KEY;
        return import('../nylas.js');
    };
    const answer = (status: number, body: unknown) =>
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })));

    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.NYLAS_API_KEY;
        vi.resetModules();
    });

    it('liefert die belegten Fenster, wenn der Kalender antwortet', async () => {
        const { fetchBusy } = await load();
        answer(200, { data: [{ email: 'k@x.de', object: 'free_busy', time_slots: [{ start_time: 100, end_time: 200, status: 'busy' }] }] });
        expect(await fetchBusy('g1', 'k@x.de', 0, 1000)).toEqual([{ start: 100, end: 200 }]);
        const [url, init] = (globalThis.fetch as any).mock.calls[0];
        expect(String(url)).toContain('/v3/grants/g1/calendars/free-busy');
        expect(JSON.parse(init.body)).toEqual({ start_time: 0, end_time: 1000, emails: ['k@x.de'] });
    });

    it('liefert [] für einen Kalender, der antwortet und nichts belegt hat', async () => {
        const { fetchBusy } = await load();
        answer(200, { data: [{ email: 'k@x.de', object: 'free_busy', time_slots: [] }] });
        expect(await fetchBusy('g1', 'k@x.de', 0, 1000)).toEqual([]);
    });

    it('liefert null, wenn Nylas ablehnt (abgelaufener Grant)', async () => {
        const { fetchBusy } = await load();
        answer(401, { error: { type: 'unauthorized' } });
        expect(await fetchBusy('g1', 'k@x.de', 0, 1000)).toBeNull();
    });

    it('liefert null, wenn Nylas nicht erreichbar ist', async () => {
        const { fetchBusy } = await load();
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));
        expect(await fetchBusy('g1', 'k@x.de', 0, 1000)).toBeNull();
    });

    it('liefert null bei einer Fehlerzeile für die angefragte Adresse', async () => {
        const { fetchBusy } = await load();
        answer(200, { data: [{ email: 'k@x.de', object: 'error', error: 'Unable to resolve e-mail address' }] });
        expect(await fetchBusy('g1', 'k@x.de', 0, 1000)).toBeNull();
    });

    it('liefert null, wenn eine von mehreren Zeilen ein Fehler ist — halb geprüft ist nicht geprüft', async () => {
        const { fetchBusy } = await load();
        answer(200, { data: [
            { email: 'a@x.de', object: 'free_busy', time_slots: [{ start_time: 100, end_time: 200 }] },
            { email: 'b@x.de', object: 'error', error: 'nope' },
        ] });
        expect(await fetchBusy('g1', 'a@x.de', 0, 1000)).toBeNull();
    });

    it('liefert null bei einer Antwort ohne Zeilen oder in unbekannter Form', async () => {
        const { fetchBusy } = await load();
        answer(200, { data: [] });
        expect(await fetchBusy('g1', 'k@x.de', 0, 1000)).toBeNull();
        answer(200, { request_id: 'r1' });
        expect(await fetchBusy('g1', 'k@x.de', 0, 1000)).toBeNull();
        answer(200, { data: [{ email: 'k@x.de', object: 'free_busy' }] });
        expect(await fetchBusy('g1', 'k@x.de', 0, 1000)).toBeNull();
    });

    it('liefert null ohne Key und ruft Nylas dann gar nicht an', async () => {
        const { fetchBusy } = await load('');
        const spy = vi.fn();
        vi.stubGlobal('fetch', spy);
        expect(await fetchBusy('g1', 'k@x.de', 0, 1000)).toBeNull();
        expect(spy).not.toHaveBeenCalled();
    });
});
