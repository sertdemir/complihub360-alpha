import { chromium } from '@playwright/test';
const b = await chromium.launch();
const dir='/tmp/claude-0/-home-user-complihub360-alpha/2ab9ed25-0330-5518-bf8e-a8318103e90f/scratchpad/';
const p = await b.newPage({ viewport: { width: 1440, height: 1200 } });
await p.goto('http://localhost:5173/de/compliance/product-packaging/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2400);
// switch the market via the page selector
const sel = p.locator('header select, select').first();
if (await sel.count()) { await sel.selectOption({ label: 'Deutschland' }).catch(async()=>{ await sel.selectOption('DE'); }); }
else {
  await p.locator('button', { hasText: 'EU-weit' }).first().click();
  await p.waitForTimeout(400);
  await p.locator('[role="option"], li, button').filter({ hasText: /^Deutschland$/ }).first().click();
}
await p.waitForTimeout(1200);
const sec = p.locator('section.bg-primary-700').first();
await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
await sec.screenshot({ path: dir+'enf-DE.png' });
await b.close();
