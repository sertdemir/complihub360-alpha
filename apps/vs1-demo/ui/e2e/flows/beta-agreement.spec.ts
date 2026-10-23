import { test, expect, demoLogin, resetMock, blockForeignHosts } from './_demo';

// ─── Beta-Vereinbarung (Canvas-Wahl 1A · 2A · 3A+3C · 4C, 22.10.2026) ────────
// Ein Tester ohne Annahme landet nach dem Login im eigenen Schritt, liest die
// neun Saetze, setzt den Haken und kommt dorthin, wohin er wollte. Danach
// steht der Nachweis im Konto. Wer schon angenommen hat, sieht den Schritt
// nicht. /terms zeigt das Blatt fuer jeden, auch ohne Konto.

test.beforeEach(async ({ page }) => {
  await blockForeignHosts(page);
  await resetMock(page);
});

test('Gast: /terms zeigt das Blatt in neun Saetzen, der Footer heisst Beta-Vereinbarung', async ({ page }) => {
  await page.goto('/de/terms', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beta-Vereinbarung');
  await expect(page.getByRole('heading', { name: /^01 · Das ist ein Test\./ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^09 · Jederzeit raus\./ })).toBeVisible();
  await expect(page.getByText(/ohne anwaltliche Prüfung erstellt/).first()).toBeVisible();
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Beta-Vereinbarung' })).toHaveAttribute('href', '/de/terms');
});

test('Nutzer ohne Annahme: Gate → Schritt → Haken → zurueck ans Ziel, Nachweis im Konto', async ({ page, context }) => {
  await demoLogin(context, 'user');
  const reset = await page.request.post('/api/v1/mock/agreements/reset');
  expect(reset.ok()).toBeTruthy();

  await page.goto('/de/dashboard/termine', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/de\/beta-agreement\?redirect=%2Fde%2Fdashboard%2Ftermine/);
  await expect(page.getByRole('heading', { name: 'Bevor es losgeht: ein Blatt' })).toBeVisible();
  await expect(page.getByTestId('beta-points').getByRole('listitem')).toHaveCount(9);
  // Das ganze Blatt steht im Kasten; kein Absprung zum Volltext (Festlegung 23.10.).
  await expect(page.getByTestId('beta-points')).toContainText('Jederzeit raus.');
  await expect(page.getByRole('link', { name: /Das ganze Blatt lesen/ })).toHaveCount(0);

  // Ohne Haken: Hinweis, nichts geschrieben.
  const accept = page.getByRole('button', { name: /Weiter zum Workspace/ });
  await accept.click();
  await expect(page.getByRole('alert')).toContainText('Bitte setzen Sie den Haken');
  await expect(page).toHaveURL(/\/de\/beta-agreement/);

  await page.getByRole('checkbox').check();
  await accept.click();
  await expect(page).toHaveURL(/\/de\/dashboard\/termine$/);

  // Nachweis im Konto: Fassung, Zeitpunkt, Sprache.
  await page.goto('/de/dashboard/account', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Konto' })).toBeVisible();
  await expect(page.getByText('beta-2026-10')).toBeVisible();
  await expect(page.getByText('aktuell')).toBeVisible();
  await expect(page.getByText(/· Deutsch$/)).toBeVisible();

  // Ein zweiter Besuch des Workspace fragt nicht noch einmal.
  await page.goto('/de/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/de\/dashboard$/);
});

test('Nutzer mit Annahme: kein Schritt, der Workspace kommt direkt', async ({ page, context }) => {
  await demoLogin(context, 'user');
  await page.goto('/de/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/de\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Konto' })).toBeVisible();
});

test('Anbieter: kein Blatt in der Beta (4C)', async ({ page, context }) => {
  await demoLogin(context, 'partner');
  await page.request.post('/api/v1/mock/agreements/reset');
  await page.goto('/de/provider-dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/beta-agreement/);
});
