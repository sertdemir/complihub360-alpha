// Verteilung der 25 Test-Provider (scripts/beta/seed-test-providers.mjs).
// Laeuft in CI ueber `npm run scripts:test`. Prueft nur den reinen Plan —
// das Schreiben braucht Supabase und Stripe und laeuft von Hand auf dem VPS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, AREAS, MARKETS } from './seed-test-providers.mjs';

const { providers, cell, gaps } = buildPlan('demet@complihub360.com');

test('25 Provider, jede der 72 Zellen mindestens einmal besetzt (gleichmaessig)', () => {
  assert.equal(providers.length, 25);
  assert.deepEqual(gaps, []);
  const counts = AREAS.flatMap((a) => MARKETS.map((m) => cell.get(`${a}|${m}`) ?? 0));
  assert.ok(Math.min(...counts) >= 1);
  assert.ok(Math.max(...counts) <= 3, `hoechstens 3 je Zelle, war ${Math.max(...counts)}`);
});

test('Schluessel, Adressen und Namen sind eindeutig; alle Adressen per Plus ins eine Postfach', () => {
  for (const f of ['provider_key', 'email', 'name']) {
    assert.equal(new Set(providers.map((p) => p[f])).size, providers.length, f);
  }
  for (const p of providers) {
    assert.match(p.provider_key, /^tp-\d{2}-[a-z0-9-]+$/);
    assert.match(p.email, /^demet\+p\d{2}@complihub360\.com$/);
  }
});

test('Plan bestimmt die Zahl der Bereiche (Essential 1, Growth 2, Global 3), je 3 Maerkte', () => {
  const want = { essential: 1, growth: 2, global: 3 };
  for (const p of providers) {
    assert.equal(p.areas.length, want[p.plan], p.provider_key);
    assert.equal(new Set(p.markets).size, 3);
    for (const m of p.markets) assert.ok(MARKETS.includes(m));
  }
});

test('kein Name traegt "Partner" (Festlegung 15.10.: Provider)', () => {
  for (const p of providers) assert.doesNotMatch(p.name, /partner/i);
});
