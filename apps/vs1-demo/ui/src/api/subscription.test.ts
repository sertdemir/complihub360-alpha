import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchSubscription, selectPlan } from './subscription';

// ─── Tarifwahl: was der Client aus einer Antwort macht ───────────────────────
// Der interessante Teil ist die Zuordnung der Fehler. Beide Absagen der Route
// kommen als 409 — "dieses Konto darf nicht" und "es laeuft schon eines" sind
// aber zwei voellig verschiedene Flaechen in der Oberflaeche. Wer hier nur auf
// den Status schaut, zeigt dem Anbieter den falschen Satz.

vi.mock('../lib/supabase', () => ({ getAccessToken: async () => null, isMockApi: false }));
vi.mock('./provider', () => ({ myProviderKey: async () => 'p-test' }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const antwort = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LAUFEND = {
  plan_code: 'growth', cadence: 'monthly', status: 'active',
  current_period_start: '2026-10-04', current_period_end: '2026-11-04',
  started_at: '2026-10-04T09:00:00Z', renewal_date: '2026-11-04',
};

describe('fetchSubscription', () => {
  it('reicht Abo, Tarife und freigegebene Bereiche durch', async () => {
    fetchMock.mockResolvedValueOnce(antwort(200, {
      ok: true,
      subscription: LAUFEND,
      plans: [{ code: 'growth', label: 'Growth', currency: 'USD', monthly_cents: 9900, annual_cents: 99000, category_allowance: 5, lead_discount_pct: 10, lead_discount_count: 3 }],
      released_categories: [{ code: 'tax-vat', label: 'Tax & VAT' }],
      eligibility: { can_start: false, reason: 'suspended' },
    }));
    const v = await fetchSubscription();
    expect(v.subscription?.plan_code).toBe('growth');
    expect(v.subscription?.renewal_date).toBe('2026-11-04');
    expect(v.plans).toHaveLength(1);
    expect(v.released_categories[0].label).toBe('Tax & VAT');
    expect(v.eligibility).toEqual({ can_start: false, reason: 'suspended' });
  });

  // Gegenprobe: eine aeltere API ohne die neuen Felder darf den Anbieter nicht
  // aussperren — sonst sieht er nach einem Deploy-Versatz eine Sperrseite,
  // obwohl sein Konto in Ordnung ist.
  it('sperrt nicht, wenn die Antwort keine Eignung nennt', async () => {
    fetchMock.mockResolvedValueOnce(antwort(200, { ok: true, subscription: null, plans: [] }));
    const v = await fetchSubscription();
    expect(v.eligibility.can_start).toBe(true);
    expect(v.released_categories).toEqual([]);
  });
});

describe('selectPlan', () => {
  it('gibt das angelegte Abo zurueck', async () => {
    fetchMock.mockResolvedValueOnce(antwort(201, { ok: true, subscription: LAUFEND }));
    const r = await selectPlan('growth', 'monthly');
    expect(r).toEqual({ ok: true, subscription: LAUFEND });
  });

  it('sendet plan_code und cadence als JSON', async () => {
    fetchMock.mockResolvedValueOnce(antwort(201, { ok: true, subscription: LAUFEND }));
    await selectPlan('global', 'annual');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ plan_code: 'global', cadence: 'annual' });
  });

  // Die beiden 409er sind der Kern: gleicher Status, verschiedene Lage.
  it('unterscheidet "Konto nicht berechtigt" von "Abo laeuft schon"', async () => {
    fetchMock.mockResolvedValueOnce(antwort(409, { errorCode: 'PROVIDER_NOT_ELIGIBLE', message: 'nope' }));
    expect(await selectPlan('growth', 'monthly')).toEqual({ ok: false, reason: 'not-eligible' });

    fetchMock.mockResolvedValueOnce(antwort(409, { errorCode: 'SUBSCRIPTION_EXISTS', message: 'nope' }));
    expect(await selectPlan('growth', 'monthly')).toEqual({ ok: false, reason: 'exists' });
  });

  // Gegenprobe: ein 409 OHNE bekannten Code darf nicht als "nicht berechtigt"
  // durchgehen — das waere die haerteste Flaeche fuer einen Fehler, der ganz
  // woanders liegt.
  it('faellt bei unbekanntem 409 auf den allgemeinen Fehler zurueck', async () => {
    fetchMock.mockResolvedValueOnce(antwort(409, { errorCode: 'SOMETHING_ELSE', message: 'nope' }));
    expect(await selectPlan('growth', 'monthly')).toEqual({ ok: false, reason: 'failed' });
  });

  it('meldet einen Netzfehler als allgemeinen Fehler, nicht als Sperre', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    expect(await selectPlan('growth', 'monthly')).toEqual({ ok: false, reason: 'failed' });
  });
});
