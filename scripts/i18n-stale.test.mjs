// Die Stale-Pruefung (scripts/i18n-stale.mjs) an kleinen Attrappen: erkennt
// sie eine Uebersetzung, deren EN-Text sich geaendert hat, und laesst sie
// eine EN-Korrektur nur mit ausdruecklicher Freigabe durch?
// Laeuft in CI ueber `npm run scripts:test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, restamp, stampOf } from './i18n-stale.mjs';

const KEY = 'home:hero.title';
const base = () => ({
  en: { [KEY]: 'Know what applies.' },
  de: { [KEY]: 'Wissen, was gilt.' },
  es: { [KEY]: 'Sepa qué aplica.' },
  tr: { [KEY]: 'Neyin geçerli olduğunu bilin.' },
});
const stamped = (loc) => ({ [KEY]: stampOf(loc, KEY) });

test('unveraendert: nichts zu melden', () => {
  const loc = base();
  assert.deepEqual(evaluate(loc, stamped(loc)), { stale: [], drift: [] });
});

test('EN umgeschrieben, Uebersetzungen nicht: alle drei veraltet', () => {
  const loc = base();
  const stamps = stamped(loc);
  loc.en[KEY] = 'See what applies to you.';
  const { stale, drift } = evaluate(loc, stamps);
  assert.deepEqual(stale.map((s) => s.lang), ['de', 'es', 'tr']);
  assert.deepEqual(drift, []);
});

test('EN umgeschrieben, nur DE nachgezogen: ES und TR veraltet', () => {
  const loc = base();
  const stamps = stamped(loc);
  loc.en[KEY] = 'See what applies to you.';
  loc.de[KEY] = 'Sehen Sie, was für Sie gilt.';
  assert.deepEqual(evaluate(loc, stamps).stale.map((s) => s.lang), ['es', 'tr']);
});

test('alles nachgezogen: nur der Stempel fehlt, --stamp uebernimmt ihn', () => {
  const loc = base();
  const stamps = stamped(loc);
  loc.en[KEY] = 'See what applies to you.';
  loc.de[KEY] = 'Sehen Sie, was für Sie gilt.';
  loc.es[KEY] = 'Vea qué le aplica.';
  loc.tr[KEY] = 'Size neyin geçerli olduğunu görün.';
  const r = evaluate(loc, stamps);
  assert.deepEqual(r.stale, []);
  assert.equal(r.drift.length, 1);
  const { next } = restamp(loc, stamps);
  assert.deepEqual(evaluate(loc, next), { stale: [], drift: [] });
});

test('--stamp uebernimmt einen veralteten Schluessel nicht', () => {
  const loc = base();
  const stamps = stamped(loc);
  loc.en[KEY] = 'See what applies to you.';
  const { next, kept } = restamp(loc, stamps);
  assert.deepEqual(kept, [KEY]);
  assert.equal(evaluate(loc, next).stale.length, 3);
});

test('--en-only gibt eine reine EN-Korrektur frei', () => {
  const loc = base();
  const stamps = stamped(loc);
  loc.en[KEY] = 'Know what applies';
  const { next } = restamp(loc, stamps, [KEY]);
  assert.deepEqual(evaluate(loc, next), { stale: [], drift: [] });
});

test('nur die Uebersetzung poliert: Stempel nachziehen, nicht veraltet', () => {
  const loc = base();
  const stamps = stamped(loc);
  loc.de[KEY] = 'Wissen, was wirklich gilt.';
  const r = evaluate(loc, stamps);
  assert.deepEqual(r.stale, []);
  assert.deepEqual(r.drift.map((d) => d.why), ['Uebersetzung geaendert']);
});

test('neuer und entfernter Schluessel brauchen einen Stempel', () => {
  const loc = base();
  const stamps = { ...stamped(loc), 'home:old.key': stampOf(loc, 'home:old.key') };
  loc.en['home:new.key'] = 'New';
  const whys = evaluate(loc, stamps).drift.map((d) => `${d.key} ${d.why}`).sort();
  assert.deepEqual(whys, ['home:new.key neu', 'home:old.key entfernt']);
});

test('fehlende Uebersetzung veraltet nicht (das meldet die Paritaet)', () => {
  const loc = base();
  delete loc.tr[KEY];
  const stamps = stamped(loc);
  loc.en[KEY] = 'See what applies to you.';
  assert.deepEqual(evaluate(loc, stamps).stale.map((s) => s.lang), ['de', 'es']);
});
