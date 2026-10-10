import { describe, expect, it } from 'vitest';
import { coverageGaps, formatPriceRange, isLimitedCoverage, matchCountOf } from './matchState';

describe('matchCountOf', () => {
  it('null, eins, mehrere', () => {
    expect(matchCountOf(0)).toBe('none');
    expect(matchCountOf(1)).toBe('one');
    expect(matchCountOf(2)).toBe('multiple');
  });
});

describe('coverageGaps / isLimitedCoverage', () => {
  const cov = { markets: ['DE', 'NL'], areas: ['tax-vat', 'product-packaging', 'data-privacy'], covered: { DE: ['tax-vat', 'product-packaging'], NL: ['tax-vat'] } };

  it('nennt je Markt die fehlenden Bereiche', () => {
    expect(coverageGaps(cov)).toEqual([
      { market: 'DE', areas: ['data-privacy'] },
      { market: 'NL', areas: ['product-packaging', 'data-privacy'] },
    ]);
  });

  it('begrenzt nur mit Treffern — ohne Treffer ist es noProviderMatch', () => {
    expect(isLimitedCoverage(1, cov)).toBe(true);
    expect(isLimitedCoverage(0, cov)).toBe(false);
  });

  it('volle Abdeckung ist nicht begrenzt', () => {
    expect(isLimitedCoverage(3, { markets: ['DE'], areas: ['tax-vat'], covered: { DE: ['tax-vat'] } })).toBe(false);
  });

  it('ohne Matrix (aeltere Antwort) kein Befund', () => {
    expect(isLimitedCoverage(2, undefined)).toBe(false);
  });
});

describe('formatPriceRange', () => {
  it('Spanne in der Sprache des Lesers', () => {
    expect(formatPriceRange({ min: 900, max: 1600, currency: 'EUR' }, 'en')).toEqual({ kind: 'range', text: '€900 – €1,600' });
  });
  it('eine Seite allein', () => {
    expect(formatPriceRange({ min: 900, max: null, currency: 'EUR' }, 'en')).toEqual({ kind: 'from', price: '€900' });
    expect(formatPriceRange({ min: null, max: 1600, currency: 'EUR' }, 'en')).toEqual({ kind: 'upTo', price: '€1,600' });
  });
  it('ohne Preis nichts — nie "€0"', () => {
    expect(formatPriceRange(null, 'en')).toBeNull();
    expect(formatPriceRange({ min: null, max: null, currency: 'EUR' }, 'en')).toBeNull();
  });
});
