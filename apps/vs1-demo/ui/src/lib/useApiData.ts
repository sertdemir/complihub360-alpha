import { useEffect, useRef, useState } from 'react';

// ─── useApiData ───────────────────────────────────────────────────────────────
// Progressive wiring pattern for the workspace pages: try the API, fall back to
// the design fixture when the backend is unreachable/unauthorized. Pages stay
// demo-able without a running backend; once the endpoint answers, real data
// takes over — no page changes needed.
//
// Der Vertrag, den jede aufrufende Seite annimmt: **`data` hat IMMER die Form
// der Fixture.** Alle acht Aufrufer destrukturieren sofort
// (`const { stats, watchlist } = data`) — ein Feld, das fehlt, ist dort kein
// leerer Zustand, sondern ein weisser Bildschirm.
//
// Bis 2026-09-20 galt der Vertrag nur fuer den FEHLERFALL. Sobald der Endpunkt
// ueberhaupt antwortete, ersetzte das Ergebnis die Fixture vollstaendig — auch
// `undefined`, auch ein Objekt ohne die benoetigten Felder. Zwei Admin-Seiten
// waren dadurch tot, mit zwei verschiedenen Meldungen und einer Ursache:
//
//   /de/admin           `watchlist.filter` → watchlist war undefined
//   /de/admin/cockpit   `data` selbst war undefined
//
// Ausgeloest hat es der Mock-Modus (`VITE_MOCK_API=1`), dessen GET-Auffangzweig
// fuer JEDEN unbekannten Pfad `{ ok: true, items: [], … }` mit Status 200
// liefert — es gibt dort keine `admin`-Route. `fetchAdminStats` castet die
// Antwort mit `as AdminStats`, `fetchCockpit` greift blind `.cockpit` heraus;
// beide Luegen blieben unbemerkt, weil dieser Hook sie durchreichte. Ein
// echter Backend-Endpunkt, der seine Form aendert, oder ein Proxy mit
// generischer 200-Antwort erzeugen denselben Absturz.
//
// `usable()` unten macht aus dem Vertrag eine gepruefte Zusage.

export type DataSource = 'api' | 'fixture';

/** Taugt `result` als Ersatz fuer `fixture` — also: haelt es den Vertrag?
 *
 *  Die Fixture ist dabei die Form-Definition, und zwar eine genaue: in diesem
 *  Projekt traegt jede Objekt-Fixture exakt die PFLICHTFELDER ihres Interface
 *  und kein optionales (`AdminStats.series` etwa fehlt in der Fixture und wird
 *  auf der Seite mit `?.` gelesen). Ein Schluessel-Abgleich gegen die Fixture
 *  weist deshalb genau die unvollstaendigen Antworten ab und keine gueltige.
 *
 *  Arrays behalten ihre bisherige Regel — leer heisst „Fixture behalten", und
 *  `fetchPerformanceKpis` nutzt das ausdruecklich als Signal (`return []`). */
export function usable<T>(result: unknown, fixture: T): result is T {
  if (result === null || result === undefined) return false;

  if (Array.isArray(fixture)) return Array.isArray(result) && result.length > 0;

  if (fixture !== null && typeof fixture === 'object') {
    if (typeof result !== 'object' || Array.isArray(result)) return false;
    return Object.keys(fixture as object).every((k) => k in (result as object));
  }

  // Primitive Fixture: jeder nicht-leere Wert ist brauchbar.
  return true;
}

/** `deps`: wenn sich einer der Werte aendert, wird neu geladen (z. B. nach
 *  dem Speichern geaenderter Antworten). Ohne `deps` laedt der Hook einmal. */
export function useApiData<T>(fetcher: () => Promise<T>, fixture: T, deps: unknown[] = []): { data: T; source: DataSource; loading: boolean } {
  const [data, setData] = useState<T>(fixture);
  const [source, setSource] = useState<DataSource>('fixture');
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // Ueber ein Ref, weil mehrere Aufrufer ihre Fixture inline bauen
  // (`buildKpiFixture(t)`) — als Effekt-Abhaengigkeit waere sie bei jedem
  // Render neu und wuerde endlos nachladen.
  const fixtureRef = useRef(fixture);
  fixtureRef.current = fixture;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return;
        if (usable(result, fixtureRef.current)) {
          setData(result);
          setSource('api');
        } else {
          // Nicht gemeldet zu werden waere hier das Schlimmste: die Seite zeigt
          // dann Fixture-Daten, und niemand wuesste, warum die echten fehlen.
          console.info('[useApiData] result does not match the fixture shape — keeping the fixture:', result);
        }
      })
      .catch((err) => {
        console.info('[useApiData] falling back to design fixture:', err?.message ?? err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, source, loading };
}
