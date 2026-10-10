import { describe, expect, it, vi } from 'vitest';
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));
import { checkMarketRequest } from '../marketRequests';

// "Request This Market" (unbekannter Markt) und seit EN-Launch Schritt 2
// "Request More Coverage" (bekannter Markt, Anbieter fehlen) laufen ueber
// dieselbe Pruefung.
describe('checkMarketRequest', () => {
  const user = 'u-1';

  it('nimmt einen unbekannten Markt an, mit Update fuer ein Konto', () => {
    const r = checkMarketRequest({ market: 'br', domains: ['tax-vat'], notify: true }, user);
    expect(r.ok && r.row).toMatchObject({ market: 'BR', notify: true, domains: ['tax-vat'] });
  });

  it('lehnt einen bekannten Markt ohne Grund ab', () => {
    const r = checkMarketRequest({ market: 'DE', domains: ['tax-vat'] }, user);
    expect(r).toMatchObject({ ok: false, status: 409, errorCode: 'MARKET_COVERED' });
  });

  it('nimmt Anbieter-Abdeckung fuer einen bekannten Markt an — nur mit Bereichen', () => {
    const ok = checkMarketRequest({ market: 'NL', domains: ['product-packaging'], reason: 'provider_coverage' }, user);
    expect(ok.ok && ok.row).toMatchObject({ market: 'NL', domains: ['product-packaging'] });
    const ohne = checkMarketRequest({ market: 'NL', domains: [], reason: 'provider_coverage' }, user);
    expect(ohne).toMatchObject({ ok: false, errorCode: 'MARKET_COVERED' });
  });

  it('verspricht fuer Anbieter-Abdeckung kein Update — der Versand meldet nur neue Laender', () => {
    const r = checkMarketRequest({ market: 'NL', domains: ['product-packaging'], reason: 'provider_coverage', notify: true }, user);
    expect(r.ok && r.row.notify).toBe(false);
  });

  it('als Gast mit guest_key, nie mit Update', () => {
    const r = checkMarketRequest({ market: 'NL', domains: ['data-privacy'], reason: 'provider_coverage', guest_key: 'guest_12345678' }, null);
    expect(r.ok && r.row).toMatchObject({ requester_key: 'guest:guest_12345678', notify: false });
  });
});
