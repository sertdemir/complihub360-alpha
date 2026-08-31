import { describe, it, expect } from 'vitest';
import { icsUtc, icsEsc, icsHref } from './TerminePage';

// ─── .ics-Wächter ────────────────────────────────────────────────────────────
// Bis 2026-08-31 trug das VEVENT weder DTSTART noch UID — die Kalenderdatei
// eines Termins hatte kein Datum, und kein Test hat es gemerkt. Diese Tests
// halten fest, was eine Kalenderdatei mindestens tragen muss.

const beispiel = {
  id: 'b1f8c9aa-0000-4000-8000-000000000001',
  slotStartIso: '2026-09-04T12:30:00.000Z',
  slotEndIso: '2026-09-04T13:00:00.000Z',
  provider: 'Kanzlei Nord — Hamburg',
  meta: 'VAT-Registrierung; Frankreich, Phase 1',
};

function dekodiert(href: string): string {
  expect(href.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
  return decodeURIComponent(href.slice('data:text/calendar;charset=utf-8,'.length));
}

describe('icsHref', () => {
  it('trägt Beginn und Ende als UTC-Instants', () => {
    const ics = dekodiert(icsHref(beispiel));
    expect(ics).toContain('DTSTART:20260904T123000Z');
    expect(ics).toContain('DTEND:20260904T130000Z');
  });

  it('trägt UID und DTSTAMP — ohne sie verwerfen Kalender das Ereignis', () => {
    const ics = dekodiert(icsHref(beispiel));
    expect(ics).toContain(`UID:${beispiel.id}@complihub360.com`);
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it('nimmt 30 Minuten an, wenn kein Ende gespeichert ist', () => {
    const ics = dekodiert(icsHref({ ...beispiel, slotEndIso: null }));
    expect(ics).toContain('DTEND:20260904T130000Z');
  });

  it('maskiert Kommas und Semikola statt sie zu verschlucken', () => {
    const ics = dekodiert(icsHref(beispiel));
    expect(ics).toContain('DESCRIPTION:VAT-Registrierung\\; Frankreich\\, Phase 1');
  });
});

describe('icsUtc', () => {
  it('formt einen ISO-Zeitpunkt in die RFC-5545-UTC-Form um', () => {
    expect(icsUtc('2026-09-04T12:30:00.000Z')).toBe('20260904T123000Z');
  });
});

describe('icsEsc', () => {
  it('maskiert Backslash zuerst, sonst maskiert er die Maskierung', () => {
    expect(icsEsc('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });
});
