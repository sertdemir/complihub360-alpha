import { describe, expect, it } from 'vitest';
import { priceRangeOf, searchCoverage } from '../searchCoverage';

// EN-Launch Schritt 2: "Limited coverage" und "expected price range" duerfen
// nur sagen, was die Freigabe-View hergibt — nie mehr.
const rows = [
  { provider_key: 'a', country_code: 'DE', area_code: 'tax-vat', price_min: 900, price_max: 1600, currency: 'EUR' },
  { provider_key: 'a', country_code: 'DE', area_code: 'product-packaging', price_min: 600, price_max: 900, currency: 'EUR' },
  { provider_key: 'a', country_code: 'NL', area_code: 'tax-vat', price_min: null, price_max: null, currency: null },
  { provider_key: 'b', country_code: 'NL', area_code: 'tax-vat', price_min: 300, price_max: 500, currency: 'USD' },
  { provider_key: 'c', country_code: 'FR', area_code: 'data-privacy', price_min: 100, price_max: 200, currency: 'EUR' },
];

describe('searchCoverage', () => {
  const cov = searchCoverage(rows, ['DE', 'NL'], ['tax-vat', 'product-packaging', 'data-privacy']);

  it('meldet je Markt die abgedeckten Bereiche', () => {
    expect(cov.public.covered).toEqual({ DE: ['tax-vat', 'product-packaging'], NL: ['tax-vat'] });
  });

  it('zaehlt nur angefragte Maerkte — FR liegt ausserhalb', () => {
    expect(cov.public.markets).toEqual(['DE', 'NL']);
    expect(Object.keys(cov.public.covered)).not.toContain('FR');
  });

  it('traegt keinen Anbieter auf den Draht', () => {
    expect(JSON.stringify(cov.public)).not.toMatch(/"a"|"b"|"c"|provider/);
  });

  it('kennt die Maerkte je Anbieter', () => {
    expect(cov.marketsOf('a')).toEqual(['DE', 'NL']);
    expect(cov.marketsOf('b')).toEqual(['NL']);
    expect(cov.marketsOf('zzz')).toEqual([]);
  });
});

describe('priceRangeOf', () => {
  it('spannt ueber die angefragten Bereiche', () => {
    expect(priceRangeOf(rows.filter((r) => r.provider_key === 'a'), ['tax-vat', 'product-packaging']))
      .toEqual({ min: 600, max: 1600, currency: 'EUR' });
  });

  it('nimmt nur Leistungen der angefragten Bereiche', () => {
    expect(priceRangeOf(rows.filter((r) => r.provider_key === 'a'), ['tax-vat']))
      .toEqual({ min: 900, max: 1600, currency: 'EUR' });
  });

  it('gibt keine Spanne ueber zwei Waehrungen hinweg', () => {
    expect(priceRangeOf(rows.filter((r) => r.provider_key !== 'c'), ['tax-vat'])).toBeNull();
  });

  it('ohne Preis: null, nie 0', () => {
    expect(priceRangeOf([rows[2]], ['tax-vat'])).toBeNull();
  });
});
