import { describe, it, expect, beforeEach } from 'vitest';
import { route, resetMockState } from './demoApi';

// F2 (#385): der Mock antwortet wie der Server. Passt niemand, stehen die
// Anbieter im Markt getrennt in `providers_outside` — ohne match, match_tier
// und Preisspanne, mit eigenen Buchstaben. Sonst ist der Block lokal nicht
// erreichbar.
describe('Mock /search · providers_outside (F2)', () => {
  beforeEach(() => resetMockState());

  it('liefert Anbieter ohne Passung getrennt, wenn niemand passt', () => {
    const r = route('POST', '/api/v1/search', { country: 'ES', domains: ['marketing-seo', 'legal-advisory'], structured_answers: { markets: ['ES'] } }) as any;
    expect(r.providers).toEqual([]);
    expect(r.providers_outside.length).toBeGreaterThan(0);
    const o = r.providers_outside[0];
    expect(o.letter).toBe('A');
    expect(o).not.toHaveProperty('match');
    expect(o).not.toHaveProperty('match_tier');
    expect(o).not.toHaveProperty('price_range');
  });

  it('liefert keine, sobald jemand passt', () => {
    const r = route('POST', '/api/v1/search', { country: 'DE', domains: ['tax-vat'], structured_answers: { markets: ['DE'] } }) as any;
    expect(r.providers.length).toBeGreaterThan(0);
    expect(r.providers_outside).toEqual([]);
  });
});
