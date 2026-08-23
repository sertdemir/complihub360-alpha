import { chromium } from '@playwright/test';
const b = await chromium.launch();
const dir='/tmp/claude-0/-home-user-complihub360-alpha/2ab9ed25-0330-5518-bf8e-a8318103e90f/scratchpad/';
const p = await b.newPage({ viewport: { width: 1440, height: 1200 } });
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,180)));
for (const [tag,url] of [['eu','de/compliance/product-packaging'],['de-market','de/compliance/product-packaging?market=DE']]) {
  await p.goto(`http://localhost:5173/${url}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2400);
  const sec = p.locator('section.bg-primary-700').first();
  await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(1400);
  await sec.screenshot({ path: `${dir}enf-${tag}.png` });
}
console.log('errors', errs);
await b.close();
