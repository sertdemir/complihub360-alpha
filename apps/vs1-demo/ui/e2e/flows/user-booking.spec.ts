import { test, expect, demoLogin, blockForeignHosts, recordWrites, resetMock, runWizard, REAL_PROVIDER_NAMES } from './_demo';

// ─── Kernfluss Nutzer: Wizard → Risk Map → anonymer Anbieter → Buchung ───────
// Was hier haelt, ist der Vertrag der Phasen 3 und 4 auf der echten Seite:
//   · vor der Buchung steht nirgends ein echter Anbietername (ADR-0004)
//   · die Buchung traegt die Fassung des Acknowledgements und die Nachricht
//   · erst die Bestaetigung legt Identitaet und geteilte Felder offen
//   · scheitert die Belastung beim Anbieter, gibt es keine Buchung, keine
//     Offenlegung und eine neutrale Nachricht (ADR-0005, Entscheidung 3)
// Der Mock antwortet wie der Server (Formate, Codes), belastet aber nichts.

test.beforeEach(async ({ page }) => { await blockForeignHosts(page); await resetMock(page); });

test('Gast: die Risk Map kommt ohne Konto, die Anbieter bleiben verschlossen', async ({ page }) => {
  await runWizard(page);
  await expect(page.getByRole('heading', { name: "Here's what applies to you." })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Save this map. Unlock the providers.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View details' })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(REAL_PROVIDER_NAMES);
});

test('Nutzer: Wizard → Risk Map → Buchung → Bestaetigung mit Offenlegung', async ({ page, context }) => {
  await demoLogin(context, 'user');
  const writes = recordWrites(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await runWizard(page);
  await expect(page.getByRole('heading', { name: 'Your risk map' })).toBeVisible();
  const search = writes.find((w) => w.path === '/api/v1/search');
  expect(search?.body).toMatchObject({ country: 'DE', domains: ['tax-vat'] });

  // Anonym bis zur Buchung: der Demo-Nutzer hat zwei Anbieter schon gebucht
  // (die stehen mit Namen und „was Verified Provider A/B"), der dritte nicht —
  // dessen Name darf nirgends stehen, bis die Buchung durch ist.
  await expect(page.locator('body')).toContainText('Verified Provider C');
  await expect(page.locator('body')).not.toContainText('Madrid Tax Advisors');

  await page.getByRole('button', { name: 'View details' }).first().click();
  const drawer = page.getByRole('dialog').first();
  await expect(drawer.getByRole('heading', { name: /Verified Provider/ })).toBeVisible();
  await drawer.getByRole('button', { name: /Book appointment/ }).click();
  await expect(drawer.getByRole('heading', { name: 'Book an appointment' })).toBeVisible();
  await expect(drawer.getByText('Pick a slot above.')).toBeVisible();

  await drawer.getByRole('button', { name: '10:00 AM' }).first().click();
  await drawer.getByRole('textbox').first().fill('We need help with OSS registration for DE.');
  // Das Acknowledgement steht vor dem Klick: Offenlegung, Follow-up-Recht, 10 %.
  await expect(drawer).toContainText(/provider's name and contact details become visible to you/);
  await expect(drawer).toContainText(/even if you cancel, do not attend or stop responding/);
  await expect(drawer).toContainText(/10 % discount/);
  await drawer.getByRole('button', { name: /Book appointment/ }).click();

  // Sharing-Dialog: Wert fuer Wert, und ohne Haken geht nichts ab.
  const share = page.getByRole('dialog').last();
  await expect(share.getByRole('heading', { name: 'Review what will be shared' })).toBeVisible();
  for (const label of ['Email address', 'Company name', 'Your message', 'Topic of your request']) await expect(share).toContainText(label);
  await expect(share).toContainText('We need help with OSS registration for DE.');
  await share.getByRole('button', { name: 'Confirm and Book' }).click({ force: true });
  await page.waitForTimeout(300);
  expect(writes.filter((w) => w.path === '/api/v1/scheduling')).toHaveLength(0);

  await share.getByText(/I understand and want to continue/).click();
  await expect(share.getByRole('checkbox')).toBeChecked();
  await share.getByRole('button', { name: 'Confirm and Book' }).click();

  await expect(page).toHaveURL(/\/en\/dashboard\/booking\//);
  await expect(page.getByRole('heading', { name: 'Your consultation is booked' })).toBeVisible();
  const booking = writes.find((w) => w.path === '/api/v1/scheduling');
  expect(booking?.method).toBe('POST');
  expect(booking?.body).toMatchObject({ public_ref: expect.any(String), slot_start: expect.stringMatching(/T10:00:00/), message: 'We need help with OSS registration for DE.', acknowledgement_version: 'booking-ack-v1', language: 'en' });

  // Jetzt, und erst jetzt: Identitaet und was geteilt wurde.
  const main = page.locator('main');
  await expect(main).toContainText('Madrid Tax Advisors');
  await expect(main).toContainText('was Verified Provider C');
  await expect(main).toContainText('alex.weber@acme.example');
  await expect(main).toContainText('Acme GmbH');
  await expect(main).toContainText('Not shared with any other provider.');
  await expect(main).toContainText(/Tax & VAT/);

  await page.getByRole('link', { name: /^Appointments/ }).click();
  await expect(page.getByRole('heading', { name: 'Your appointments.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Nutzer: scheitert die Belastung beim Anbieter, gibt es keine Buchung und keine Offenlegung', async ({ page, context }) => {
  await demoLogin(context, 'user');
  const writes = recordWrites(page);
  await runWizard(page);
  await page.getByRole('button', { name: 'View details' }).first().click();
  const drawer = page.getByRole('dialog').first();
  await drawer.getByRole('button', { name: /Book appointment/ }).click();
  // Der Mock laesst 15:30 wie eine abgelehnte Karte des Anbieters scheitern (409 BOOKING_NOT_COMPLETED).
  await drawer.getByRole('button', { name: '03:30 PM' }).first().click();
  await drawer.getByRole('button', { name: /Book appointment/ }).click();
  const share = page.getByRole('dialog').last();
  await share.getByText(/I understand and want to continue/).click();
  await share.getByRole('button', { name: 'Confirm and Book' }).click();

  // Die Fehlerkarte steht in der Schublade: neutral, ohne Kartenwort, ohne Vorwurf.
  await expect(drawer).toContainText(/We couldn.t complete your booking/);
  await expect(drawer).toContainText('This is not on your side');
  await expect(drawer).toContainText('No booking was created');
  await expect(drawer).toContainText('Nothing was shared with the provider');
  await expect(drawer.getByRole('button', { name: 'Choose another provider' })).toBeVisible();
  await expect(drawer).not.toContainText(/declined|card/i);
  await expect(page).toHaveURL(/\/en\/results/);
  expect(writes.filter((w) => w.path === '/api/v1/scheduling')).toHaveLength(1);
  await expect(page.locator('body')).not.toContainText('Madrid Tax Advisors');
  await expect(page.getByRole('heading', { name: 'Your consultation is booked' })).toHaveCount(0);
});
