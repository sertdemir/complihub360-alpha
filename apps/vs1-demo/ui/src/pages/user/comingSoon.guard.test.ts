import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── Waechter: jede ComingSoon-Flaeche hat ihre Copy, in allen vier Sprachen ──
// BEFUND 2026-09-20: /dashboard/library behauptete "212 Eintraege · 84 Videos
// · 76 Artikel", waehrend zwoelf Fixtures im Code lagen. Die Typzahlen ergaben
// 212, die Bereichszahlen darunter 193 — dieselbe Seite nannte zwei
// Gesamtmengen. Dazu erfundene Herkunftsangaben ("Verifizierter Partner",
// "CompliHub360 Editorial"): Zusagen ueber Beziehungen, die es nicht gibt.
//
// Die Flaeche laeuft seitdem auf ComingSoonPage, wie ihre beiden Nachbarn
// Alerts und Kalender. Der Arbeitsbereich hat damit EINEN Umgang mit
// Unfertigem statt drei — und genau das sichert dieser Waechter.
//
// Geprueft wird die Stelle, an der es bricht: ComingSoonPage baut ihre
// Schluessel als `comingSoon.${page}.<feld>` ZUSAMMEN. Ein fehlender Eintrag
// faellt weder tsc noch `i18n:check` auf (das prueft nur, ob de/es/tr
// dieselben Schluessel tragen wie en — nicht, ob en sie ueberhaupt hat), und
// die Seite rendert dann den rohen Schluesselnamen.
const SPRACHEN = ['en', 'de', 'es', 'tr'] as const;
const FELDER = ['title', 'sub', 'panelTitle', 'panelSub', 'feature1', 'feature2', 'feature3', 'feature4'] as const;
const GETEILT = ['eyebrow', 'bannerTitle', 'joinEarlyAccess'] as const;

const wurzel = join(__dirname, '../../..');

const locale = (sprache: string) =>
  JSON.parse(readFileSync(join(wurzel, 'public/locales', sprache, 'userws.json'), 'utf8'));

/** Die Seiten, die App.tsx tatsaechlich an ComingSoonPage uebergibt. */
function seitenAusRouter(): string[] {
  const quelle = readFileSync(join(__dirname, '../../App.tsx'), 'utf8');
  const treffer = [...quelle.matchAll(/<ComingSoonPage page="([a-z-]+)"/g)].map((m) => m[1]);
  return [...new Set(treffer)].sort();
}

describe('ComingSoon-Flaechen', () => {
  it('der Router kennt genau die drei unfertigen Flaechen', () => {
    // Waechst die Liste, muss die Copy unten mitwachsen — das ist der Zweck.
    expect(seitenAusRouter(), 'Neue ComingSoon-Seite? Dann auch Copy in vier Sprachen.').toEqual([
      'alerts',
      'calendar',
      'library',
    ]);
  });

  it('die Bibliothek laeuft auf ComingSoonPage, nicht auf einer eigenen Seite', () => {
    const quelle = readFileSync(join(__dirname, '../../App.tsx'), 'utf8');
    expect(quelle).toContain('<ComingSoonPage page="library" />');
    // Die Fixture-Seite ist geloescht; ein Wiederanlegen faellt hier auf.
    expect(quelle, 'LibraryPage ist am 2026-09-20 entfallen — 212 erfundene Eintraege.').not.toContain('LibraryPage');
  });

  it.each(SPRACHEN)('%s traegt jedes Feld jeder Flaeche', (sprache) => {
    const cs = locale(sprache).comingSoon;
    for (const geteilt of GETEILT) {
      expect(cs?.[geteilt], `${sprache}: comingSoon.${geteilt} fehlt`).toBeTruthy();
    }
    for (const seite of seitenAusRouter()) {
      for (const feld of FELDER) {
        expect(cs?.[seite]?.[feld], `${sprache}: comingSoon.${seite}.${feld} fehlt`).toBeTruthy();
      }
    }
  });

  it('die erfundenen Bestandszahlen der alten Bibliothek sind weg', () => {
    for (const sprache of SPRACHEN) {
      const lib = locale(sprache).library ?? {};
      // library.title bleibt: BeyondAssessment.tsx liest ihn fuer das
      // Lern-Fenster auf der Startseite. Alles andere war Zaehlwerk zu
      // Fixtures, die es nicht mehr gibt.
      expect(Object.keys(lib), `${sprache}: library.* traegt wieder mehr als den Titel`).toEqual(['title']);
      expect(JSON.stringify(lib), `${sprache}: die 212 sind zurueck`).not.toMatch(/212|\b84\b|\b193\b/);
    }
  });
});
