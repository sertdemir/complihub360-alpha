import { test, expect, demoLogin, blockForeignHosts, recordWrites, resetMock } from './_demo';

// ─── Kernfluss Anbieter: Leads, Abrechnung, Annahmen ─────────────────────────
// Der Demo-Anbieter (Schmidt & Partner, Growth) hat einen Termin, der auf die
// Anwesenheitsmeldung wartet, eine pausierte Abrechnung und eine alte Fassung
// der Abrechnungsermaechtigung. Geprueft wird, was auf den Draht geht und was
// die Seite danach behauptet — nicht, wie es aussieht.

test.beforeEach(async ({ page, context }) => { await blockForeignHosts(page); await resetMock(page); await demoLogin(context, 'partner'); });

test('Termine & Leads: Band und Gebuehr stehen am Lead, Anwesenheit und Angebot gehen als PATCH', async ({ page }) => {
  const writes = recordWrites(page);
  await page.goto('/en/provider-dashboard/termine', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Appointments & leads.' })).toBeVisible();
  const main = page.locator('main');
  await expect(main).toContainText(/AWAITING YOUR REPORT/i);
  // Phase 4: Band, Standardgebuehr, Endbetrag, Rabattfolge, 10 %-Pflicht.
  await expect(main).toContainText(/BAND 2 · CORE/i);
  await expect(main).toContainText('$149');
  await expect(main).toContainText('$134.10');
  await expect(main).toContainText(/Plan discount 10 %/);
  await expect(main).toContainText('10 % for the client');
  // Phase 5: die drei Ausgaenge mit ihren Folgen, bevor gemeldet wird.
  await expect(main).toContainText('The client did not show up');
  await expect(main).toContainText(/30 %/);

  await main.getByText('The conversation took place').first().click();
  await main.getByRole('button', { name: 'Report' }).first().click();
  await expect.poll(() => writes.find((w) => w.path.endsWith('/attendance'))).toMatchObject({ method: 'PATCH', body: { outcome: 'attended' } });
  await expect(main).not.toContainText(/AWAITING YOUR REPORT/i);

  await main.getByRole('button', { name: 'Yes' }).first().click();
  await expect.poll(() => writes.find((w) => w.path.endsWith('/proposal'))).toMatchObject({ method: 'PATCH', body: { proposal_issued: true } });
});

test('Abrechnung: die Pause ist ehrlich benannt, die Karte wird auf Anstoss geprueft', async ({ page }) => {
  const writes = recordWrites(page);
  await page.goto('/en/provider-dashboard/billing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Bookings paused' })).toBeVisible();
  const main = page.locator('main');
  await expect(main).toContainText('The last lead charge did not go through.');
  await expect(main).toContainText('You remain visible in search results.');
  // ADR-0006/0008: keine Kulanzfrist nach gescheiterter Zahlung, keine Workspace-Sperre.
  await expect(main).not.toContainText(/grace period|workspace lock/i);
  await main.getByRole('button', { name: 'Check card again' }).click();
  await expect.poll(() => writes.find((w) => w.path.endsWith('/billing/recheck'))).toMatchObject({ method: 'POST' });
  await expect(main).toContainText(/Your bank/);
});

test('Bewerbung: die Abrechnungsermaechtigung zeigt die neue Fassung und nimmt sie mit Fassung 2026-10 an', async ({ page }) => {
  const writes = recordWrites(page);
  await page.goto('/en/provider-dashboard/application', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '5 · Agreements' })).toBeVisible();
  const chapter = page.locator('#app-chapter-agreements').locator('xpath=ancestor::*[contains(@class,"space-y-4")][1]');
  await expect(chapter).toContainText(/New version 2026-10 is available/);
  await chapter.getByRole('button', { name: 'Read and accept' }).click();
  const dialog = page.getByRole('dialog').last();
  await expect(dialog.getByRole('heading', { name: /Accept Billing authorisation/ })).toBeVisible();
  const text = dialog.getByTestId('mandate-text');
  await expect(text).toContainText('1. What this is about');
  await expect(text).toContainText('9. Changes');
  await expect(dialog).toContainText(/Legal review of this text is still in progress/);
  await dialog.getByRole('button', { name: 'Accept version 2026-10' }).click();
  await expect.poll(() => writes.find((w) => w.path.endsWith('/agreements'))).toMatchObject({ method: 'POST', body: { agreement_type: 'billing_authorization', version: '2026-10', language: 'en' } });
});
