import { test, expect, demoLogin, blockForeignHosts, recordWrites, resetMock, runWizard } from './_demo';

// ─── Beta-Vereinbarung vor der Buchung (Variantenwahl 1A · 3B · 4A, 23.11.2026) ─
// Bis dahin kam ein Konto aus der Schublade per Mail-Link eingeloggt auf die
// Risk Map und konnte buchen, ohne das Blatt gesehen zu haben: das Gate sass
// nur vor dem Workspace. Was hier haelt:
//   · eingeloggt ohne Annahme fuehrt /results zuerst ueber den Schritt (1A),
//     und der Schritt sagt "Risk Map", nicht "Workspace"
//   · wer ablehnt, behaelt seine Karte als Gast und liest, was das heisst (3B)
//   · geht das Gate an einem alten Tab vorbei, lehnt der Server ab; die
//     Schublade zeigt den Grund und das Blatt, Termin und Anliegen bleiben (4A)

test.beforeEach(async ({ page }) => { await blockForeignHosts(page); await resetMock(page); });

test('Ohne Annahme auf die Risk Map: erst der Schritt, dann zurueck zur eigenen Karte', async ({ page, context }) => {
  await demoLogin(context, 'user');
  expect((await page.request.post('/api/v1/mock/agreements/reset')).ok()).toBeTruthy();

  await runWizard(page);
  await expect(page).toHaveURL(/\/en\/beta-agreement\?redirect=%2Fen%2Fresults/);
  await expect(page.getByRole('heading', { name: 'Before we start: one sheet' })).toBeVisible();
  await expect(page.getByText('3 Your Risk Map')).toBeVisible();
  await expect(page.getByText('3 Your workspace')).toHaveCount(0);
  await expect(page.getByTestId('beta-points').getByRole('listitem')).toHaveCount(10);

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Continue to your Risk Map/ }).click();
  await expect(page).toHaveURL(/\/en\/results$/);
  // Das Profil aus dem Wizard hat den Umweg ueberlebt: die Karte steht da.
  await expect(page.getByRole('heading', { name: 'Your risk map' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View details' }).first()).toBeVisible();
});

test('„Rather not“: abgemeldet zurueck zur Risk Map, mit einem ruhigen Hinweis', async ({ page, context }) => {
  await demoLogin(context, 'user');
  await page.request.post('/api/v1/mock/agreements/reset');

  await runWizard(page);
  await expect(page).toHaveURL(/\/en\/beta-agreement/);
  await page.getByRole('button', { name: /Sign out/ }).click();

  await expect(page).toHaveURL(/\/en\/results$/);
  const hinweis = page.getByRole('status').filter({ hasText: 'You are signed out.' });
  await expect(hinweis).toContainText('Your Risk Map stays visible on this device.');
  await expect(hinweis).toContainText('once you have accepted the beta agreement');
  await expect(hinweis.getByRole('link', { name: 'Read the beta agreement' })).toHaveAttribute('href', '/en/terms');
  await expect(hinweis.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/en/login?redirect=%2Fen%2Fresults');
  // Die Karte ist die Gast-Ansicht: keine Anbieter-Details, das Konto-Angebot steht da.
  await expect(page.getByRole('heading', { name: 'Save this map. Keep your matches.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View details' })).toHaveCount(0);

  await hinweis.getByRole('button', { name: 'Close notice' }).click();
  await expect(page.getByText('You are signed out.')).toHaveCount(0);
});

test('Alter Tab: der Server lehnt ab, die Schublade zeigt Grund und Blatt, Termin und Anliegen bleiben', async ({ page, context }) => {
  await demoLogin(context, 'user');
  const writes = recordWrites(page);

  await runWizard(page);
  await expect(page.getByRole('heading', { name: 'Your risk map' })).toBeVisible();
  // Ab hier gilt eine Fassung, die dieser Tab nicht kennt — das Gate hat schon "ok" gesagt.
  await page.request.post('/api/v1/mock/agreements/reset');

  await page.getByRole('button', { name: 'View details' }).first().click();
  const drawer = page.getByRole('dialog').first();
  await drawer.getByRole('button', { name: /Book appointment/ }).click();
  await drawer.getByRole('button', { name: '10:00 AM' }).first().click();
  await drawer.getByRole('textbox').first().fill('We need help with OSS registration for DE.');
  await drawer.getByRole('button', { name: /Book appointment/ }).click();
  const share = page.getByRole('dialog').last();
  await share.getByText(/I understand and want to continue/).click();
  await share.getByRole('button', { name: 'Confirm and Book' }).click();

  // Nichts gebucht; der Grund steht da, zusammen mit dem, was NICHT passiert ist.
  await expect(drawer.getByText('The beta agreement is still missing before you can book.')).toBeVisible();
  await expect(page).not.toHaveURL(/dashboard\/booking/);
  await drawer.getByRole('button', { name: 'Read the beta agreement' }).click();

  await expect(drawer.getByRole('heading', { name: 'One sheet, then your appointment' })).toBeVisible();
  await expect(drawer).toContainText('Not booked yet.');
  await expect(drawer.getByTestId('beta-points').getByRole('listitem')).toHaveCount(10);
  await expect(drawer.getByTestId('beta-points')).toContainText('Providers are test accounts.');
  // Ohne Haken geht es nicht weiter.
  await drawer.getByRole('button', { name: /Agree and return to the booking/ }).click();
  await expect(drawer.getByRole('alert')).toContainText('Please tick the box');
  await drawer.getByRole('checkbox').check();
  await drawer.getByRole('button', { name: /Agree and return to the booking/ }).click();

  // Zurueck im Termin: Auswahl und Anliegen stehen noch da.
  await expect(drawer.getByRole('heading', { name: 'Book an appointment' })).toBeVisible();
  await expect(drawer.getByRole('textbox').first()).toHaveValue('We need help with OSS registration for DE.');
  await expect(drawer.getByText('The beta agreement is still missing')).toHaveCount(0);
  await drawer.getByRole('button', { name: /Book appointment/ }).click();
  const share2 = page.getByRole('dialog').last();
  await share2.getByText(/I understand and want to continue/).click();
  await share2.getByRole('button', { name: 'Confirm and Book' }).click();

  await expect(page).toHaveURL(/\/en\/dashboard\/booking\//);
  await expect(page.getByRole('heading', { name: 'Your consultation is booked' })).toBeVisible();
  // Zwei Versuche auf dem Draht, dazwischen genau eine Annahme.
  expect(writes.filter((w) => w.path === '/api/v1/scheduling')).toHaveLength(2);
  expect(writes.filter((w) => w.path === '/api/v1/me/agreements/beta')).toHaveLength(1);
});
