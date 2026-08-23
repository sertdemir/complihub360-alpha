import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/de/markets/de', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
const out = await p.evaluate(async () => {
  const mp = await import('/src/lib/marketProfiles.ts');
  const eng = await import('@complihub/compliance-engine');
  const MAP = eng.ObligationEnrichmentMap;
  const rows = [];
  for (const code of mp.MARKET_CODES) {
    let sum = 0, heaviest = null, withCap = 0, deferred = 0;
    for (const [sub, byC] of Object.entries(MAP)) {
      const e = byC[code]; if (!e) continue;
      if (e.penaltyMaxEur) { sum += e.penaltyMaxEur; withCap++;
        if (!heaviest || e.penaltyMaxEur > heaviest.max) heaviest = { sub, max: e.penaltyMaxEur, src: e.source }; }
      if (e.appliesFrom) deferred++;
    }
    const pr = mp.getMarketProfile(code);
    const covered = new Set(pr.byDomain.map(d=>d.domainSlug));
    const missing = pr.weights.filter(w=>!covered.has(w.domainSlug)).map(w=>w.domainSlug);
    rows.push({ code, exposure: sum, withCap, heaviest, deferred, missingAreas: missing });
  }
  return rows;
});
for (const r of out) console.log(JSON.stringify(r));
await b.close();
