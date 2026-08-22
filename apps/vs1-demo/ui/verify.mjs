import { chromium } from 'playwright';
const dir = '/tmp/claude-0/-home-user-complihub360-alpha/2ab9ed25-0330-5518-bf8e-a8318103e90f/scratchpad';
const BASE = 'http://localhost:4201';
const SLUGS = ['tax-vat','product-packaging','data-privacy','marketing-seo','corporate-structure','product-compliance','logistics-customs','legal-advisory'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const issues = [];
p.on('pageerror', e => issues.push('pageerror: ' + e.message));
for (const [lng, country] of [['en','EU'], ['de','DE'], ['es','ES'], ['tr','TR']]) {
  for (const slug of SLUGS) {
    await p.goto(`${BASE}/${lng}/compliance/${slug}?country=${country}`, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('h1', { timeout: 8000 });
    const r = await p.evaluate(() => ({
      raw: /\{\{|compliance\.[a-z]/.test(document.body.innerText),
      h1: !!document.querySelector('h1'),
      ph: /\{\{/.test(document.title),
    }));
    if (r.raw) issues.push(`${lng}/${slug}: raw key visible`);
    if (!r.h1) issues.push(`${lng}/${slug}: no h1`);
    if (r.ph) issues.push(`${lng}/${slug}: placeholder in title`);
  }
}
// sticky clearance survived the Container swap
await p.goto(`${BASE}/en/compliance/tax-vat`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
await p.evaluate(() => window.scrollTo(0, 1400));
await p.waitForTimeout(600);
const geo = await p.evaluate(() => {
  const hdr = document.querySelector('header').getBoundingClientRect();
  const st = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).position === 'sticky').getBoundingClientRect();
  return { clears: st.top >= hdr.bottom - 1, top: Math.round(st.top), hdr: Math.round(hdr.bottom) };
});
if (!geo.clears) issues.push(`sticky switcher hidden behind header (${geo.top} vs ${geo.hdr})`);
await p.screenshot({ path: `${dir}/merged-area.png` });
await p.goto(`${BASE}/en/compliance`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1000);
const h = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h + 900; y += 350) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(70); }
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(1200);
await p.screenshot({ path: `${dir}/merged-hub.png`, fullPage: true });
console.log(issues.length ? 'ISSUES:\n' + [...new Set(issues)].join('\n') : `all 32 area pages clean; sticky clears header (${geo.top}px)`);
await b.close();
