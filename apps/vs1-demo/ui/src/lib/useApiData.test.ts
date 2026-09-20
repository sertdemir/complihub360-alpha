import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usable, useApiData } from './useApiData';

// ─── Der Formvertrag von useApiData ──────────────────────────────────────────
// Dieser Wächter existiert, weil zwei Admin-Seiten daran gestorben sind
// (2026-09-20): der Hook ersetzte die Fixture, sobald der Endpunkt IRGENDETWAS
// mit Status 200 lieferte — auch `undefined`, auch ein Objekt ohne die Felder,
// die die Seite unmittelbar danach destrukturiert.
//
// Die Fälle unten sind die echten, nicht ausgedachte: `{ ok: true, items: [] }`
// ist wörtlich, was der GET-Auffangzweig des Mock-Servers für jeden unbekannten
// Pfad antwortet, und `undefined` ist, was `fetchCockpit` daraus macht.

interface AdminLike {
  stats: { breaches: number } | null;
  watchlist: Array<{ id: string }>;
  events: Array<{ type: string }>;
}

const ADMIN_FIXTURE: AdminLike = { stats: { breaches: 1 }, watchlist: [{ id: 'RQ-1' }], events: [] };

describe('usable — die Fixture ist die Formdefinition', () => {
  it('weist undefined und null ab', () => {
    expect(usable(undefined, ADMIN_FIXTURE)).toBe(false);
    expect(usable(null, ADMIN_FIXTURE)).toBe(false);
  });

  it('weist die Auffang-Antwort des Mock-Servers ab', () => {
    expect(usable({ items: [], providers: [], laws: [] }, ADMIN_FIXTURE)).toBe(false);
  });

  it('weist ein Objekt ab, dem EIN Pflichtfeld fehlt', () => {
    expect(usable({ stats: {}, watchlist: [] }, ADMIN_FIXTURE)).toBe(false);
  });

  it('nimmt eine vollständige Antwort an — auch mit Zusatzfeldern', () => {
    expect(usable({ ...ADMIN_FIXTURE, series: { dates: [] } }, ADMIN_FIXTURE)).toBe(true);
  });

  it('nimmt ein Pflichtfeld an, das legitim null oder leer ist', () => {
    // `in` statt Wahrheitswert: confirmRate darf null sein, events darf leer sein.
    expect(usable({ stats: null, watchlist: [], events: [] }, ADMIN_FIXTURE)).toBe(true);
  });

  it('verwechselt Array und Objekt nicht', () => {
    expect(usable([], ADMIN_FIXTURE)).toBe(false);
    expect(usable({ length: 0 }, [{ id: 'a' }])).toBe(false);
  });

  it('behält für Arrays die bisherige Regel: leer heißt Fixture behalten', () => {
    // fetchPerformanceKpis nutzt `return []` ausdrücklich als dieses Signal.
    expect(usable([], [{ label: 'CONFIRM_RATE' }])).toBe(false);
    expect(usable([{ label: 'X' }], [{ label: 'CONFIRM_RATE' }])).toBe(true);
  });
});

describe('useApiData', () => {
  afterEach(() => vi.restoreAllMocks());

  it('behält die Fixture, wenn die Antwort die Form nicht hält', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useApiData(async () => ({ ok: true, items: [] }) as unknown as typeof ADMIN_FIXTURE, ADMIN_FIXTURE),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(ADMIN_FIXTURE);
    expect(result.current.source).toBe('fixture');
  });

  it('behält die Fixture, wenn der Fetcher undefined liefert', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useApiData(async () => undefined as unknown as typeof ADMIN_FIXTURE, ADMIN_FIXTURE),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(ADMIN_FIXTURE);
  });

  it('übernimmt eine vollständige Antwort', async () => {
    const live: AdminLike = { stats: { breaches: 9 }, watchlist: [], events: [{ type: 'x' }] };
    const { result } = renderHook(() => useApiData(async () => live, ADMIN_FIXTURE));
    await waitFor(() => expect(result.current.source).toBe('api'));
    expect(result.current.data).toBe(live);
  });

  it('behält die Fixture, wenn der Abruf scheitert', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useApiData(async () => { throw new Error('401'); }, ADMIN_FIXTURE),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(ADMIN_FIXTURE);
    expect(result.current.source).toBe('fixture');
  });
});
