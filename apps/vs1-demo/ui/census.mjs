import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/de/markets/de', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
const out = await p.evaluate(async () => {
  const mp = await import('/src/lib/marketProfiles.ts');
  const eng = await import('/src/lib/../../../../packages/compliance-engine/index.ts').catch(()=>null);
  const rows = [];
  for (const code of mp.MARKET_CODES) {
    const pr = mp.getMarketProfile(code);
    rows.push({
      code,
      enf: pr.enforcementIntensity,
      strict: pr.strictnessScore,
      obligations: pr.obligations.length,
      domainsCovered: pr.byDomain.length,
      weights: pr.weights.map(w => `${w.domainSlug}:${w.weight}`).join(' '),
      cadences: [...new Set(pr.obligations.map(o=>o.due))].join('|'),
      leadDays: pr.obligations.map(o=>o.dueDays).filter(x=>x!=null).sort((a,b)=>a-b),
      withCelex: pr.obligations.filter(o=>o.eurLexUrl).length,
    });
  }
  return rows;
});
for (const r of out) console.log(JSON.stringify(r));
await b.close();
