import { type Page, type BrowserContext, test as base, expect } from '@playwright/test';

// ─── Gemeinsames Geruest der Kernfluss-Tests ─────────────────────────────────
// Demo-Login wie der lokale Mock ihn kennt: drei localStorage-Schluessel, die
// useAuthStore liest, sobald `isDemoLoginEnabled` (DEV + VITE_MOCK_API) gilt.
// Fremde Hosts werden abgewiesen. Seit 23.10.2026 laedt die Seite nichts
// mehr von Dritten (Schriften self-hosted); die Sperre bleibt als Wache, damit
// ein neuer Fremdaufruf hier rot wird statt still durchzugehen.

export type DemoRole = 'user' | 'partner' | 'admin';

export async function demoLogin(context: BrowserContext, role: DemoRole, name = 'Anna Beispiel') {
  await context.addInitScript(([r, n]) => {
    localStorage.setItem('demo_is_logged_in', 'true');
    localStorage.setItem('demo_user_role', r);
    localStorage.setItem('demo_user_name', n);
  }, [role, name] as const);
}

/** Der Mock traegt Spuren (Anwesenheit, Readiness, Zaehler); jeder Test beginnt am Ausgangszustand. */
export async function resetMock(page: Page) {
  const res = await page.request.post('/api/v1/mock/reset');
  expect(res.ok(), 'der Mock muss POST /api/v1/mock/reset kennen').toBeTruthy();
}

export async function blockForeignHosts(page: Page) {
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
}

/** Alle schreibenden Aufrufe an die API, in Reihenfolge — die Tests pruefen, WAS auf den Draht geht. */
export function recordWrites(page: Page) {
  const writes: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
  page.on('request', (req) => {
    if (req.method() === 'GET' || !req.url().includes('/api/v1/')) return;
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch { /* kein JSON */ }
    writes.push({ method: req.method(), path: new URL(req.url()).pathname, body });
  });
  return writes;
}

/** Die drei Wizard-Schritte bis zur Risk Map: ein Markt, eine Betriebsart, ein Bereich. */
export async function runWizard(page: Page, picks = { market: /Germany/, operation: /D2C e-commerce/, domain: /Tax & VAT/ }) {
  await page.goto('/en/wizard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Where do you operate?' })).toBeVisible();
  // Die Karte traegt den Info-Knopf („About Germany“) in sich — die Karte ist das erste Treffer-Element.
  await page.getByRole('button', { name: picks.market }).first().click();
  await page.getByRole('button', { name: /^Next/ }).click();
  await expect(page.getByRole('heading', { name: 'What do your operations look like?' })).toBeVisible();
  await page.getByRole('button', { name: picks.operation }).first().click();
  await page.getByRole('button', { name: /^Next/ }).click();
  await expect(page.getByRole('heading', { name: 'Which compliance areas concern you?' })).toBeVisible();
  await page.getByRole('button', { name: picks.domain }).first().click();
  await page.getByRole('button', { name: /^Next/ }).click();
  await expect(page.getByRole('heading', { name: 'Your situation, summarized.' })).toBeVisible();
  await page.getByRole('button', { name: /Create my Risk Map/ }).click();
}

/** Die echten Namen der Demo-Anbieter — sie duerfen VOR der Buchung nirgends stehen (ADR-0004). */
export const REAL_PROVIDER_NAMES = /Madrid Tax Advisors|Schmidt & Partner|Studio Bianchi|Lucid Reg|Nordic Privacy|Packwise|Lex Iberia/;

export const test = base;
export { expect };
