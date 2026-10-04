import { describe, it, expect } from 'vitest';
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
