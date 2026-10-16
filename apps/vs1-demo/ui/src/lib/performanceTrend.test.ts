import { describe, it, expect } from 'vitest';
import { countTrend, previousOf, rateTrend, ratingTrend, signed } from './performanceTrend';
import type { ProviderPerformanceResponse } from '@complihub360/types/src/provider';

// Richtung = Daten, Farbe = Bedeutung. Und: kein Pfeil, wo die Stichprobe
// nicht traegt oder das Vorfenster fehlt.

describe('performanceTrend', () => {
  it('Quote: besser in Prozentpunkten, Richtung nach oben', () => {
    const t = rateTrend({ count: 9, of: 12, rate: 0.75 }, { count: 6, of: 9, rate: 0.67 });
    expect(t).toEqual({ direction: 'up', tone: 'better', delta: 8, kind: 'pp' });
  });

  it('Quote: ohne Quote auf einer Seite kein Pfeil', () => {
    expect(rateTrend({ count: 2, of: 3, rate: null }, { count: 6, of: 9, rate: 0.67 })).toBeNull();
    expect(rateTrend({ count: 9, of: 12, rate: 0.75 }, { count: 2, of: 3, rate: null })).toBeNull();
    expect(rateTrend({ count: 9, of: 12, rate: 0.75 }, null)).toBeNull();
  });

  it('Stueck: weniger eigene No-Shows ist Pfeil nach unten in Gruen', () => {
    expect(countTrend(1, 2, false)).toEqual({ direction: 'down', tone: 'better', delta: -1, kind: 'count' });
  });

  it('Stueck: Nutzer-No-Shows tragen nur die Richtung, keine Wertung', () => {
    expect(countTrend(3, 1, null)).toEqual({ direction: 'up', tone: 'same', delta: 2, kind: 'count' });
    expect(countTrend(2, 2, null)).toEqual({ direction: 'flat', tone: 'same', delta: 0, kind: 'count' });
  });

  it('Bewertung: Zehntel, gleich bleibt gleich', () => {
    expect(ratingTrend({ average: 4.6 }, { average: 4.6 })).toEqual({ direction: 'flat', tone: 'same', delta: 0, kind: 'rating' });
    expect(ratingTrend({ average: 4.6 }, { average: 4.3 })).toEqual({ direction: 'up', tone: 'better', delta: 0.3, kind: 'rating' });
    expect(ratingTrend({ average: null }, { average: 4.3 })).toBeNull();
  });

  it('signed: Plus, typografisches Minus, ±0', () => {
    expect(signed(8)).toBe('+8');
    expect(signed(-1)).toBe('−1');
    expect(signed(0)).toBe('±0');
    expect(signed(0.3, 1, 'de')).toBe('+0,3');
  });

  it('previousOf: nur ein echtes Fakten-Objekt zaehlt', () => {
    const base = { ok: true, providerKey: 'k', analytics: { level: 'basic', trends: false, export: false }, enforcement: null } as unknown as ProviderPerformanceResponse;
    expect(previousOf(base)).toBeNull();
    expect(previousOf({ ...base, previous: null } as unknown as ProviderPerformanceResponse)).toBeNull();
    expect(previousOf({ ...base, previous: { bookings: 10 } } as unknown as ProviderPerformanceResponse)).toEqual({ bookings: 10 });
  });
});
