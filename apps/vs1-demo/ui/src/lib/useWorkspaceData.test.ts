import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWorkspaceData } from './useWorkspaceData';

// TKT-PROV-12: Leer heisst leer, Fehler heisst Fehler — nie eine Fixture.
// `useApiData` behielt bei einer leeren Liste die Design-Fixture; ein
// Anbieter ohne Buchung sah so erfundene Termine.

describe('useWorkspaceData', () => {
  it('eine leere Liste ist ein Ergebnis, kein Grund fuer Ersatzdaten', async () => {
    const { result } = renderHook(() => useWorkspaceData(async () => [] as string[]));
    expect(result.current.state).toBe('loading');
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.data).toEqual([]);
  });

  it('ein Fehler ergibt keinen Inhalt, nur den Fehler', async () => {
    const err = new Error('down');
    const { result } = renderHook(() => useWorkspaceData(async () => { throw err; }));
    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(err);
  });

  it('reload laedt erneut und uebernimmt das neue Ergebnis', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('kurz weg')).mockResolvedValueOnce(['a']);
    const { result } = renderHook(() => useWorkspaceData(fetcher));
    await waitFor(() => expect(result.current.state).toBe('error'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.data).toEqual(['a']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
