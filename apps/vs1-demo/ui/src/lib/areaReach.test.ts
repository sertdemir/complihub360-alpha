import { describe, expect, it } from 'vitest';
import { areaReach, MARKET_CODES } from './marketProfiles';
import { DOMAINS } from './domains';

// EN-Launch step 5: the homepage atlas no longer authors market lists. These
// guard the two claims it makes from the data.
describe('areaReach', () => {
  it('only ever names markets the engine assesses', () => {
    for (const d of DOMAINS) for (const m of areaReach(d.slug).markets) expect(MARKET_CODES).toContain(m);
  });

  it('every area reaches somewhere — nationally or EU-wide', () => {
    for (const d of DOMAINS) {
      const r = areaReach(d.slug);
      expect(r.markets.length > 0 || r.euWide).toBe(true);
    }
  });

  it('Tax & VAT is national in every assessed market', () => {
    expect(areaReach('tax-vat').markets.sort()).toEqual([...MARKET_CODES].sort());
  });
});
