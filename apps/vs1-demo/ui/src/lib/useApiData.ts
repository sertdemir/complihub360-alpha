import { useEffect, useRef, useState } from 'react';

// ─── useApiData ───────────────────────────────────────────────────────────────
// Progressive wiring pattern for the workspace pages: try the API, fall back to
// the design fixture when the backend is unreachable/unauthorized. Pages stay
// demo-able without a running backend; once the endpoint answers, real data
// takes over — no page changes needed.

export type DataSource = 'api' | 'fixture';

export function useApiData<T>(fetcher: () => Promise<T>, fixture: T): { data: T; source: DataSource; loading: boolean } {
  const [data, setData] = useState<T>(fixture);
  const [source, setSource] = useState<DataSource>('fixture');
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return;
        // Empty API result → keep the fixture so demos stay meaningful.
        const empty = Array.isArray(result) && result.length === 0;
        if (!empty) {
          setData(result);
          setSource('api');
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
  }, []);

  return { data, source, loading };
}
