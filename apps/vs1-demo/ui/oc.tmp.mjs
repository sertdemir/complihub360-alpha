import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:5173/de/compliance/product-packaging/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
const o = await p.evaluate(() => {
  const h=[...document.querySelectorAll('h2')].find(x=>x.textContent.includes('Wo das am schwersten'));
  return [...h.closest('section').querySelectorAll('li')].map(li=>li.innerText.replace(/\n+/g,' | '));
});
console.log(o.join('\n'));
await b.close();
