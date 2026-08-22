import { expect, test, type Page, type Locator } from '@playwright/test';

// ─── Der Vertrag, den man nicht sehen kann ───────────────────────────────────
// Drei NavMenu-Aufrufstellen, im zusammengesetzten Produktions-Build:
//
//   GlobalNav        Sprachauswahl auf jeder Seite unterhalb der Landingpage
//   MarketingHeader  Sprachauswahl auf der Landingpage selbst
//   AreaSwitcher     der seitliche Wechsler zwischen den acht Bereichsseiten
//
// Geprueft wird, was ein Blick auf die Seite nicht zeigt: dass die Ziele echte
// Links sind, dass Trigger und Panel verdrahtet sind, und dass die Tastatur
// tut, was die Komponente verspricht. Nicht geprueft wird, wie es aussieht —
// dafuer gibt es Storybook, und ein Screenshot-Vergleich hier wuerde bei jeder
// Textaenderung rot.

// Jede Navigation wartet auf `domcontentloaded`, nicht auf `load`. Die Seite
// laedt ihre Schriften von fonts.googleapis.com, und `load` wartet darauf: in
// einer Umgebung ohne Zugang dorthin kostete jeder Test 12,7 Sekunden statt
// 0,2. Auf einem Runner mit Zugang waere es schnell — und trotzdem haenge ich
// einen Smoke-Test nicht an die Erreichbarkeit eines fremden CDN. Die Locators
// warten ohnehin von selbst auf das, was sie brauchen.

/** Reacts useId erzeugt Ids mit Doppelpunkten (":r1:") — als CSS-Id-Selektor ungueltig. */
const byId = (page: Page, id: string) => page.locator(`[id="${id}"]`);

async function openPanel(page: Page, trigger: Locator) {
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const id = await trigger.getAttribute('aria-controls');
  expect(id, 'ein offener Trigger muss auf sein Panel zeigen').toBeTruthy();
  const panel = byId(page, id!);
  await expect(panel).toHaveCount(1);
  return panel;
}

/** Der Fokus sitzt auf einem Anker mit diesem Text — nicht irgendwo. */
async function expectFocusOnLink(page: Page, text: RegExp) {
  const focused = await page.evaluate(() => ({
    tag: document.activeElement?.tagName ?? null,
    text: document.activeElement?.textContent?.trim() ?? '',
  }));
  expect(focused.tag, 'der Fokus muss auf dem Anker liegen, nicht auf dem Trigger').toBe('A');
  expect(focused.text).toMatch(text);
}

// Alles ausser der eigenen Herkunft wird abgewiesen. Die Seite laedt ihre
// Schriften von fonts.googleapis.com; in einer Umgebung ohne Zugang dorthin
// haengt jeder Test 13 Sekunden an ausstehenden Anfragen. Auf einem Runner mit
// Zugang waere es schnell — und trotzdem haengt ein Smoke-Test nicht an der
// Erreichbarkeit eines fremden CDN. Geprueft wird Navigation, nicht Typografie.
test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
});

const LANGUAGE_SURFACES = [
  { name: 'GlobalNav', path: '/de/compliance', hrefPattern: /^\/(en|de|es|tr)\/compliance$/ },
  { name: 'MarketingHeader', path: '/de', hrefPattern: /^\/(en|de|es|tr)$/ },
];

for (const surface of LANGUAGE_SURFACES) {
  test.describe(`Sprachauswahl · ${surface.name}`, () => {
    // Beide Header hatten bis 2026-08-22 eine eigene Kopie, die sich in fast
    // allem unterschied. Deshalb wird jeder einzeln geprueft, obwohl es
    // inzwischen dieselbe Komponente ist: genau diese Annahme war schon einmal
    // falsch.
    test.beforeEach(async ({ page }) => {
      await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('button', { name: /language|sprache|idioma|dil/i }).first(),
      ).toBeVisible();
    });

    const trigger = (page: Page) =>
      page.getByRole('button', { name: /language|sprache|idioma|dil/i }).first();

    test('zeigt vier Locales als echte Links mit aria-current auf dem aktuellen', async ({ page }) => {
      const panel = await openPanel(page, trigger(page));

      const links = panel.locator('a');
      await expect(links).toHaveCount(4);
      for (const href of await links.evaluateAll((a) => a.map((x) => x.getAttribute('href')))) {
        expect(href).toMatch(surface.hrefPattern);
      }
      await expect(panel.locator('a[aria-current="page"]')).toHaveCount(1);
    });

    test('kuendigt kein Menue-Widget an', async ({ page }) => {
      await openPanel(page, trigger(page));
      await expect(page.locator('[role="menu"]')).toHaveCount(0);
      await expect(page.getByRole('menuitem')).toHaveCount(0);
    });

    test('ArrowDown oeffnet und setzt den Fokus auf das erste Ziel', async ({ page }) => {
      // Das ist der Regressionstest fuer #76. Bis dahin oeffnete ArrowDown das
      // Panel und der Fokus blieb auf dem Knopf liegen.
      const t = trigger(page);
      await t.focus();
      await page.keyboard.press('ArrowDown');
      await expect(t).toHaveAttribute('aria-expanded', 'true');
      await expectFocusOnLink(page, /English/i);
    });

    test('ArrowUp oeffnet auf der letzten Zeile, und die Pfeile springen um', async ({ page }) => {
      const t = trigger(page);
      await t.focus();
      await page.keyboard.press('ArrowUp');
      await expectFocusOnLink(page, /Türkçe/i);
      await page.keyboard.press('ArrowDown');
      await expectFocusOnLink(page, /English/i);
      await page.keyboard.press('End');
      await expectFocusOnLink(page, /Türkçe/i);
      await page.keyboard.press('Home');
      await expectFocusOnLink(page, /English/i);
    });

    test('Escape schliesst und gibt den Fokus an den Trigger zurueck', async ({ page }) => {
      const t = trigger(page);
      await openPanel(page, t);
      await page.keyboard.press('Escape');
      await expect(t).toHaveAttribute('aria-expanded', 'false');
      await expect(t).toBeFocused();
    });

    test('Tab faengt den Fokus nicht und schliesst das Panel dahinter', async ({ page }) => {
      // Der Regressionstest fuer #74: der Fokus zog weiter, das Panel blieb
      // offen dahinter stehen.
      const t = trigger(page);
      const panel = await openPanel(page, t);
      const id = (await t.getAttribute('aria-controls'))!;
      await page.keyboard.press('Tab');
      await page.keyboard.press('End');
      await page.keyboard.press('Tab');

      await expect(t).toHaveAttribute('aria-expanded', 'false');
      expect(
        await page.evaluate((panelId) => {
          const el = document.getElementById(panelId);
          return !!el && el.contains(document.activeElement);
        }, id),
        'der Fokus muss das Panel verlassen haben',
      ).toBe(false);
      await expect(panel).toHaveCount(0);
    });
  });
}

test.describe('AreaSwitcher · Bereichsseite', () => {
  test('oeffnet die acht Bereiche als echte Links', async ({ page }) => {
    await page.goto('/de/compliance/data-privacy', { waitUntil: 'domcontentloaded' });

    const trigger = page
      .locator('button[aria-expanded]')
      .filter({ hasText: /Datenschutz|Data|Privacy/i })
      .last();
    const panel = await openPanel(page, trigger);

    const links = panel.locator('a');
    await expect(links).toHaveCount(8);
    for (const href of await links.evaluateAll((a) => a.map((x) => x.getAttribute('href')))) {
      expect(href).toMatch(/^\/de\/compliance\/[a-z-]+$/);
    }
    await expect(panel.locator('a[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('[role="menu"]')).toHaveCount(0);
    await expect(page.getByRole('menuitem')).toHaveCount(0);
  });
});

test.describe('Layout', () => {
  // Das Sheet spannt sich ueber die volle Breite und der Switcher-Trigger
  // traegt acht deutsche Bereichstitel — beides hat schon einmal ueberlaufen.
  for (const path of ['/de', '/de/compliance', '/de/compliance/data-privacy']) {
    test(`${path} laeuft nicht horizontal ueber`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('header')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
