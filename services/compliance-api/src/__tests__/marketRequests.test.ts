import { describe, expect, it, vi } from 'vitest';
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));
import { checkMarketRequest, mergeMarketRequest, type MarketRequestRow } from '../marketRequests';

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

  // Bis 2026-10-11 hiess dieser Test "verspricht fuer Anbieter-Abdeckung kein
  // Update" und erwartete notify=false — es gab den Versand nicht. Jetzt gibt
  // es ihn (runMarketCoverageTick, Zweig provider_coverage).
  it('nimmt fuer Anbieter-Abdeckung ein Update an — mit Konto', () => {
    const r = checkMarketRequest({ market: 'NL', domains: ['product-packaging'], reason: 'provider_coverage', notify: true }, user);
    expect(r.ok && r.row).toMatchObject({ notify: true, reason: 'provider_coverage', user_id: user });
  });

  it('als Gast mit guest_key, nie mit Update', () => {
    const r = checkMarketRequest({ market: 'NL', domains: ['data-privacy'], reason: 'provider_coverage', guest_key: 'guest_12345678' }, null);
    expect(r.ok && r.row).toMatchObject({ requester_key: 'guest:guest_12345678', notify: false, reason: 'provider_coverage' });
    const update = checkMarketRequest({ market: 'NL', domains: ['data-privacy'], reason: 'provider_coverage', notify: true, guest_key: 'guest_12345678' }, null);
    expect(update).toMatchObject({ ok: false, status: 403, errorCode: 'NOTIFY_REQUIRES_ACCOUNT' });
  });

  it('der Grund folgt aus dem Markt: unbekannt ist immer eine Laender-Anfrage', () => {
    const r = checkMarketRequest({ market: 'BR', domains: ['tax-vat'], reason: 'provider_coverage', notify: true }, user);
    expect(r.ok && r.row.reason).toBe('market');
  });
});

describe('mergeMarketRequest — eine Zeile je Anfragendem und Markt, nichts geht still verloren', () => {
  const row = (over: Partial<MarketRequestRow> = {}): MarketRequestRow => ({
    requester_key: 'user:u-1', user_id: 'u-1', guest_key: null, market: 'DE', domains: ['tax-vat'], notify: false,
    locale: 'en', reason: 'provider_coverage', updated_at: '2026-10-11T00:00:00Z', ...over,
  });

  it('ohne bestehende Zeile: die neue', () => {
    expect(mergeMarketRequest(null, row())).toEqual(row());
  });

  it('Laender-Anfrage auf Laender-Anfrage: wie bisher, die neue ersetzt Bereiche und Update-Wunsch', () => {
    const next = row({ market: 'BR', reason: 'market', domains: ['environment'], notify: false });
    expect(mergeMarketRequest({ reason: 'market', domains: ['tax-vat'], notify: true, notified_at: null }, next)).toEqual(next);
  });

  it('offene Abdeckungs-Anfrage: Bereiche vereinigt, bestelltes Update bleibt bestellt', () => {
    const merged = mergeMarketRequest({ reason: 'provider_coverage', domains: ['tax-vat'], notify: true, notified_at: null }, row({ domains: ['data-privacy'], notify: false }));
    expect(merged).toMatchObject({ reason: 'provider_coverage', domains: ['tax-vat', 'data-privacy'], notify: true });
    expect('notified_at' in merged).toBe(false);
  });

  it('eine spaetere Laender-Anfrage nimmt einer offenen Abdeckungs-Anfrage nichts', () => {
    const merged = mergeMarketRequest({ reason: 'provider_coverage', domains: ['tax-vat'], notify: true, notified_at: null }, row({ reason: 'market', domains: ['environment'], notify: false }));
    expect(merged).toMatchObject({ reason: 'provider_coverage', domains: ['tax-vat', 'environment'], notify: true });
  });

  it('nach der Mail ist eine neue Anfrage eine neue Frage', () => {
    const merged = mergeMarketRequest({ reason: 'market', domains: ['tax-vat'], notify: true, notified_at: '2026-10-01T00:00:00Z' }, row({ domains: ['data-privacy'], notify: true }));
    expect(merged).toMatchObject({ reason: 'provider_coverage', domains: ['data-privacy'], notify: true, notified_at: null });
  });

  it('ein Gast bekommt auch zusammengefuehrt kein Update', () => {
    const merged = mergeMarketRequest({ reason: 'provider_coverage', domains: ['tax-vat'], notify: true, notified_at: null },
      row({ requester_key: 'guest:guest_12345678', user_id: null, guest_key: 'guest_12345678', notify: false }));
    expect(merged.notify).toBe(false);
  });
});
