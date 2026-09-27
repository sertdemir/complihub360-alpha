import { apiFetch } from './client';
import { ensureGuestKey } from './sessions';

// ─── „Request This Market“ (Zustand marketUnavailable) ───────────────────────
// Server: services/compliance-api/src/marketRequests.ts. Angemeldet zaehlt der
// JWT (apiFetch haengt ihn an), als Gast der guest_key — der wird nur dann
// mitgeschickt, damit ein Konto nicht nebenbei einen Gast-Schluessel anlegt.
// Ein Update-Wunsch (`notify`) geht nur mit Konto; der Server lehnt ihn fuer
// Gaeste mit 403 ab, die Oberflaeche bietet ihn dort gar nicht an.

export async function requestMarket(input: {
  market: string;
  domains: string[];
  notify?: boolean;
  asGuest: boolean;
}): Promise<void> {
  await apiFetch('/api/v1/market-requests', {
    method: 'POST',
    body: JSON.stringify({
      market: input.market,
      domains: input.domains,
      notify: input.notify === true,
      ...(input.asGuest ? { guest_key: ensureGuestKey() } : {}),
    }),
  });
}
