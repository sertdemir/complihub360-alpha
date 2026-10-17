import { test, expect, demoLogin, blockForeignHosts, resetMock } from './_demo';

// ─── Admin: Review-Queue und Aktivierungs-Gate ───────────────────────────────
// Das Gate ist dieselbe Antwort wie die der API (Spec A §21.1): solange eine
// Bedingung fehlt, ist der Aktivieren-Knopf aus, und die Seite sagt, welche.
// Die Zahlungsbereitschaft blockiert die Aktivierung NICHT — das steht dort.

test.beforeEach(async ({ page, context }) => { await blockForeignHosts(page); await resetMock(page); await demoLogin(context, 'admin'); });

test('Queue → Pruefung: das Gate nennt die fehlenden Bedingungen und sperrt die Aktivierung', async ({ page }) => {
  await page.goto('/en/admin/providers', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Review Queue' })).toBeVisible();
  await page.getByRole('link', { name: 'Review' }).first().click();
  await expect(page).toHaveURL(/\/en\/admin\/providers\/dahlmann-cpa/);
  await expect(page.getByRole('heading', { name: 'Activation gate' })).toBeVisible();
  const main = page.locator('main');
  await expect(main).toContainText(/7 of 9 conditions/);
  await expect(main).toContainText('Billing authorisation accepted');
  await expect(main).toContainText('This does not block activation');
  await expect(page.getByRole('button', { name: 'Activate as limited' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Approvals per service and country' })).toBeVisible();
});
