import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── Waechter: der Erstzustand darf nicht am Ladezustand haengenbleiben ──────
// BEFUND 2026-08-31: SessionsPage fing eine gescheiterte Anfrage mit
// `.catch(() => { /* Fixture behalten */ })` ab — einem Rest aus der Zeit vor
// #118, als es noch eine Fixture gab. Ohne sie liess derselbe catch den
// Zustand fuer immer auf `null`, und weil der Erstzustand "nicht mehr am
// Laden" verlangt, zeigte die Seite ohne erreichbare API gar nichts: kein
// Inhalt, keine Karte, kein Fehler.
//
// Die Unterscheidung, um die es geht, traegt der ganze Arbeitsbereich:
//   null → laedt noch      []  → es gibt nichts
// Ein Fehler gehoert auf die zweite Seite. Sonst ist der haeufigste Fall im
// User Testing — API aus, Konto leer — eine weisse Flaeche.
//
// GEPRUEFT WIRD NUR DER LADEPFAD. Stille catches an Schreibvorgaengen sind
// beabsichtigt: ein fehlgeschlagenes cancelBooking() darf die Liste nicht
// leeren. Ein erster Entwurf dieses Tests fiel genau darueber.
//
// Der Test liest die Quelle statt zu rendern: er soll die REGEL sichern, nicht
// vier Seiten mit ihren Drawern, Charts und i18n-Baeumen aufbauen.

const SEITEN = ['SessionsPage.tsx', 'UserRequestsPage.tsx', 'TerminePage.tsx', 'UserHomePage.tsx'];

const quelle = (datei: string) => readFileSync(join(__dirname, datei), 'utf8');

/** Jede Lade-Kette der Seite: ab `fetchXY(` bis zum Ende ihrer Punkt-Kette. */
function ladeKetten(s: string): string[] {
  return [...s.matchAll(/fetch[A-Z]\w*\([^;]*?(?=;)/gs)].map((m) => m[0]);
}

describe('Erstzustand statt Dauerladen', () => {
  it.each(SEITEN)('%s faengt Ladefehler mit einem leeren Ergebnis ab', (datei) => {
    const ketten = ladeKetten(quelle(datei));
    expect(ketten.length, `keine Lade-Kette in ${datei} gefunden`).toBeGreaterThan(0);
    for (const kette of ketten) {
      if (!kette.includes('.catch(')) continue;   // ohne catch schlaegt der Fehler durch — auch gut
      const leert = /\[\]/.test(kette) || /EMPTY_/.test(kette);
      expect(leert, `Lade-catch ohne leeres Ergebnis in ${datei}:\n${kette}`).toBe(true);
    }
  });

  it('SessionsPage setzt beim Fehler ausdruecklich die leere Liste', () => {
    expect(quelle('SessionsPage.tsx')).toContain('.catch(() => setLive([]))');
  });
});
