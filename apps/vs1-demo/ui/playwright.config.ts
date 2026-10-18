import { defineConfig, devices } from '@playwright/test';

// ─── Navigations-Smoke gegen den Produktions-Build ───────────────────────────
// Warum es das gibt: zweimal hintereinander hat ein gruener Contract-Test in
// jsdom behauptet, der Tastaturvertrag von NavMenu halte, waehrend er auf der
// echten Seite nicht hielt.
//
//   #74 — Tab hinter dem letzten Link liess das Panel offen hinter dem
//         fokussierten Element stehen.
//   #76 — ArrowDown oeffnete das Panel und liess den Fokus auf dem Knopf:
//         requestAnimationFrame feuert im Browser VOR Reacts Effekt-Flush, die
//         Item-Liste war noch leer.
//
// WAS DIESER SMOKE NACHWEISLICH FAENGT und was nicht — beides ausprobiert,
// indem der jeweilige Fix zurueckgenommen und neu gebaut wurde:
//
//   #74  ja. Zwei Tests werden rot, auf beiden Headern. Kein Rennen, sondern
//        ein fehlender Handler, also deterministisch.
//   #76  NEIN. Bleibt gruen. Das Rennen entschied sich nur, waehrend die Seite
//        noch an externen Subressourcen haengt; unter ruhigen Bedingungen
//        gewinnt Reacts Effekt-Flush zuverlaessig, auch bei 20-facher
//        CPU-Drosselung. Gefunden hat es dieselbe Zusicherung bei langsamem
//        Seitenaufbau. Reproduzierbar machen hiesse, den Lauf an die
//        Erreichbarkeit von fonts.googleapis.com zu haengen — dafuer ist ein
//        CI-Test das falsche Werkzeug.
//
// Was er dafuer verlaesslich haelt: echte Anker mit richtigen hrefs,
// aria-expanded/aria-controls-Verdrahtung, aria-current auf dem aktuellen Ziel,
// kein role="menu", Escape mit Fokus-Rueckgabe, Tab ohne Falle, kein
// horizontaler Ueberlauf. Das ist genau die Klasse, die eine Sichtpruefung
// nicht sieht und ein jsdom-Test falsch misst.
//
// Bewusst ein Smoke und keine Suite: drei Menues, kein Screenshot-Vergleich.
// Eine E2E-Suite, die bei jeder Textaenderung rot wird, wird abgeschaltet, und
// dann ist gar nichts mehr da.
//
// Voraussetzung: `npm run build` lief vorher — der Preview-Server liefert
// dist/, nicht den Dev-Server.

const PORT = Number(process.env.E2E_PORT || 4173);
// ─── Kernfluss-E2E gegen den Dev-Server mit Mock-API (seit 2026-10-15) ───────
// Zweites Projekt, zweiter Server: `VITE_MOCK_API=1 vite` beantwortet /api/v1/*
// aus dem eingebauten Datensatz (src/mock/demoApi.ts), der Demo-Login kommt aus
// localStorage. Damit laufen Wizard → Risk Map → Buchung → Bestaetigung und die
// Anbieter- und Admin-Flaechen in einem echten Chromium, ohne Backend, Supabase
// oder Stripe — deterministisch und in CI. Was das NICHT prueft: die
// Belastung bei Stripe, die Engine, RLS. Dafuer gibt es die API-Suite und den
// Staging-Testlauf von Hand (docs/stripe-setup.md). Der Mock laeuft nur unter
// `vite dev`, deshalb kein Preview-Build wie beim Navigations-Smoke.
const FLOWS_PORT = Number(process.env.E2E_FLOWS_PORT || 4174);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Ein `test.only`, das versehentlich gepusht wird, macht den Lauf gruen und
  // prueft nichts.
  forbidOnly: !!process.env.CI,
  // Keine Retries. Ein Test, der beim zweiten Versuch gruen wird, hat ein
  // Problem gefunden — nur eben keines, das jemand dann noch anschaut.
  retries: 0,
  // Ein Worker. Der Mock-Zustand (src/mock/demoApi.ts) lebt im Vite-Dev-Server
  // und ist fuer alle Tests derselbe; `resetMock()` im beforeEach eines Tests
  // raeumt den Zustand weg, in dem ein parallel laufender Test gerade steht.
  // Zweimal in CI gesehen (2026-10-18, PR #348 und #350): user-booking.spec
  // Test 22 scheitert an der Drawer-Ueberschrift, waehrend Test 23 derselben
  // Datei auf dem zweiten Worker laeuft — lokal, sequenziell, 9/9 gruen.
  // Parallelitaet wuerde eigenen Mock-Zustand je Worker brauchen; bis dahin
  // ist ein Worker die ehrliche Einstellung.
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: /flows\//, use: { ...devices['Desktop Chrome'] } },
    { name: 'flows', testMatch: /flows\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${FLOWS_PORT}` } },
  ],
  webServer: [
    {
      command: `npx vite preview --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${FLOWS_PORT} --strictPort`,
      url: `http://localhost:${FLOWS_PORT}/en`,
      env: { VITE_MOCK_API: '1' },
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
    },
  ],
});
