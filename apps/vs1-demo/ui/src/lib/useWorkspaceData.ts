import { useCallback, useEffect, useRef, useState } from 'react';

// ─── useWorkspaceData ─────────────────────────────────────────────────────────
// Der ehrliche Gegenpart zu `useApiData` fuer den Partner-Arbeitsbereich
// (TKT-PROV-12, Canvas-Wahl A2 · B3 · C3 · D1 · E2, 09.10.2026).
//
// `useApiData` zeigt die Design-Fixture, sobald die API nicht oder LEER
// antwortet. Ein Pilot-Anbieter ohne Buchung saehe so erfundene Termine,
// Rechnungen und Kennzahlen — als waeren es seine. Dieser Hook kennt keine
// Fixture: Es gibt nur „laedt", „bereit" (auch mit leerer Liste) und
// „Fehler". Was dann auf der Flaeche steht, entscheidet die Seite —
// abgenommene Zustaende aus `common:states.partner.*`.
//
// Demo-Daten kommen weiterhin, aber von der API selbst: im lokalen Mock aus
// der Vite-Middleware, beim Staging-Demo-Login aus `src/mock/demoApi.ts`
// (TEMP-DEMO-DATEN in api/client). Die Seite muss davon nichts wissen.

export type WorkspaceState = 'loading' | 'ready' | 'error';

export interface WorkspaceData<T> {
  /** `null`, solange nichts Echtes da ist — nie ein Platzhalter. */
  data: T | null;
  state: WorkspaceState;
  /** Der Fehler des letzten Versuchs, fuer „Technische Details" (`referenceOf`). */
  error: unknown;
  /** „Erneut versuchen" laedt ohne Seitenwechsel neu. */
  reload: () => void;
}

/** `deps`: aendert sich ein Wert, wird neu geladen. Ohne `deps` einmal. */
export function useWorkspaceData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): WorkspaceData<T> {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<WorkspaceState>('loading');
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setError(null);
    fetcherRef.current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        // Kein Rueckfall auf eine Fixture und kein Rest vom letzten Erfolg:
        // was nicht geladen ist, steht nicht da.
        setData(null);
        setError(err);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, state, error, reload };
}
