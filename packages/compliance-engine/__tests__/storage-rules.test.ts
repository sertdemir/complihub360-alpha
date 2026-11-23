import { describe, it, expect } from 'vitest';
import { STORAGE_RULES, validateStorageRule, evaluateStorageRule, type StorageRule, type StorageRuleAnswers } from '../storage-rules';
import { assessmentOf } from '../evidence';

// ─── Lagerregeln (Folgeauftrag Lagerung v1.3) ────────────────────────────────
// Die Regel unten ist ERFUNDEN und steht nur in diesem Test. Sie prueft die
// Mechanik, keine Rechtslage: Titel, Bedingungen und Quelle sind Platzhalter.
const TEST_RULE: StorageRule = {
  id: 'test-storage-check',
  version: 1,
  jurisdiction: 'DE',
  applies_to: { phases: ['current', 'planned'], conditions: [{ fact: 'offering', includes: 'physical' }] },
  required_inputs: [{
    key: 'storage_type',
    question_en: 'TEST: who operates the storage location?',
    options: [{ value: 'own', label_en: 'TEST own' }, { value: 'third-party', label_en: 'TEST third party' }],
  }],
  exceptions: [
    { id: 'established', when: [{ fact: 'established_in_jurisdiction', is: 'yes' }], effect: 'no_check', text_en: 'TEST: not for businesses established here.' },
  ],
  applies_when: [{ fact: 'customers', in: ['consumers', 'both'] }],
  result: { area: 'tax-vat', title_en: 'TEST storage check', explanation_en: 'TEST explanation.', priority: 'high' },
  source: { authority: 'TEST authority', title: 'TEST source', url: 'https://example.invalid/test', provision: 'TEST provision', kind: 'statute', legal_status_as_of: '2026-01-01', last_checked: '2026-11-22' },
  review: { status: 'released', reviewer: 'TEST reviewer', reviewed_on: '2026-11-22' },
};

const answers = (over: Partial<StorageRuleAnswers> = {}): StorageRuleAnswers => ({
  offering: ['physical'], customers: 'consumers', channels: ['marketplaces'], products: [], packaging: [],
  establishment: ['US'], currentMarkets: ['US'], plannedMarkets: ['FR'], inputs: {}, ...over,
});
const at = (phase: 'current' | 'planned', confirmation: 'confirmed' | 'unconfirmed' | 'unstated' = 'confirmed') => ({ country: 'DE', phase, confirmation });

describe('storage rules · register', () => {
  it('every rule on file is formally valid — and a released one names its reviewer', () => {
    expect(STORAGE_RULES.flatMap((r) => validateStorageRule(r).map((e) => `${r.id}: ${e}`))).toEqual([]);
  });
  it('holds no rule yet: none has been reviewed and released', () => {
    expect(STORAGE_RULES).toEqual([]);
  });
  it('rejects a released rule without reviewer, an unofficial link form and a condition on an undeclared input', () => {
    expect(validateStorageRule(TEST_RULE)).toEqual([]);
    const bad: StorageRule = {
      ...TEST_RULE,
      source: { ...TEST_RULE.source, url: 'http://example.invalid', provision: ' ' },
      applies_when: [{ fact: 'input:unknown', is: 'x' }],
      review: { status: 'released' },
    };
    const errors = validateStorageRule(bad).join(' | ');
    expect(errors).toContain('source.url');
    expect(errors).toContain('source.provision');
    expect(errors).toContain('input:unknown');
    expect(errors).toContain('review');
  });
});

describe('storage rules · what a released rule yields', () => {
  it('a draft or merely reviewed rule never influences the result', () => {
    for (const status of ['draft', 'reviewed'] as const) {
      expect(evaluateStorageRule({ ...TEST_RULE, review: { ...TEST_RULE.review, status } }, at('current'), answers())).toBeNull();
    }
  });
  it('another country or a phase the rule does not cover yields nothing', () => {
    expect(evaluateStorageRule(TEST_RULE, { ...at('current'), country: 'NL' }, answers())).toBeNull();
    expect(evaluateStorageRule({ ...TEST_RULE, applies_to: { ...TEST_RULE.applies_to, phases: ['current'] } }, at('planned'), answers())).toBeNull();
  });
  it('the trigger does not hold: no check', () => {
    expect(evaluateStorageRule(TEST_RULE, at('current'), answers({ offering: ['digital'] }))).toBeNull();
  });
  it('a decisive answer is missing: open, and it names what is missing', () => {
    const c = evaluateStorageRule(TEST_RULE, at('current'), answers({ offering: [] }));
    expect(c?.state).toBe('open');
    expect(c?.open).toEqual([{ kind: 'answer', key: 'offering' }]);
  });
  it('a named but unconfirmed location: likely, with the open confirmation first — never applies', () => {
    for (const confirmation of ['unconfirmed', 'unstated'] as const) {
      const c = evaluateStorageRule(TEST_RULE, at('current', confirmation), answers());
      expect(c?.state).toBe('likely');
      expect(c?.open[0]).toEqual({ kind: 'location', key: 'location' });
    }
  });
  it('active and confirmed, rule and answers carry it: applies', () => {
    expect(evaluateStorageRule(TEST_RULE, at('current'), answers())?.state).toBe('confirmed');
    // Die Angaben tragen es nicht: likely.
    expect(evaluateStorageRule(TEST_RULE, at('current'), answers({ customers: 'businesses' }))?.state).toBe('likely');
    // Die entscheidende Angabe fehlt: open.
    const open = evaluateStorageRule(TEST_RULE, at('current'), answers({ customers: '' }));
    expect([open?.state, open?.open]).toEqual(['open', [{ kind: 'answer', key: 'customers' }]]);
  });
  it('a confirmed location alone never makes a duty: without applies_when the ceiling is likely', () => {
    const { applies_when: _drop, ...rule } = TEST_RULE;
    expect(evaluateStorageRule(rule, at('current'), answers())?.state).toBe('likely');
  });
  it('a confirmed plan stays a plan: likely, never applies', () => {
    const c = evaluateStorageRule(TEST_RULE, at('planned'), answers());
    expect([c?.state, c?.phase, c?.open]).toEqual(['likely', 'planned', []]);
  });
});

describe('storage rules · exceptions change the result', () => {
  it('no_check: the rule yields nothing', () => {
    expect(evaluateStorageRule(TEST_RULE, at('current'), answers({ establishment: ['DE'] }))).toBeNull();
  });
  it('an exception whose condition is unknown keeps the result open', () => {
    const c = evaluateStorageRule(TEST_RULE, at('current'), answers({ establishment: null }));
    expect([c?.state, c?.open]).toEqual(['open', [{ kind: 'answer', key: 'established_in_jurisdiction' }]]);
  });
  it('likely: caps an otherwise applying check and carries its text', () => {
    const rule: StorageRule = { ...TEST_RULE, exceptions: [{ id: 'cap', when: [{ fact: 'channels', includes: 'marketplaces' }], effect: 'likely', text_en: 'TEST cap', provision: 'TEST § x' }] };
    const c = evaluateStorageRule(rule, at('current'), answers());
    expect(c?.state).toBe('likely');
    expect(c?.exception).toEqual({ id: 'cap', text: 'TEST cap', provision: 'TEST § x' });
  });
  it('an exception that needs an input the wizard does not ask: open with that question — asked only in this case', () => {
    const rule: StorageRule = { ...TEST_RULE, exceptions: [{ id: 'third', when: [{ fact: 'input:storage_type', is: 'third-party' }], effect: 'open', text_en: 'TEST third party' }] };
    const asked = evaluateStorageRule(rule, at('current'), answers());
    expect(asked?.state).toBe('open');
    expect(asked?.open).toEqual([{ kind: 'input', key: 'input:storage_type', text: 'TEST: who operates the storage location?', options: TEST_RULE.required_inputs![0].options }]);
    // Beantwortet: die Ausnahme greift oder eben nicht.
    expect(evaluateStorageRule(rule, at('current'), answers({ inputs: { 'test-storage-check.storage_type': 'own' } }))?.state).toBe('confirmed');
    const hit = evaluateStorageRule(rule, at('current'), answers({ inputs: { 'test-storage-check.storage_type': 'third-party' } }));
    expect([hit?.state, hit?.exception?.id]).toEqual(['open', 'third']);
  });
});

// STO-A04: US-Unternehmen, Verkaeufe und Bestand USA, geplante Verkaeufe nur
// Frankreich; Deutschland ausschliesslich Lagerland, bestaetigt. Nur die Phase
// des deutschen Lagerorts wechselt.
describe('storage rules · STO-A04 mechanics (with the invented test rule)', () => {
  const base = { offering: ['physical'], customers: 'consumers', channels: ['marketplaces'], establishment: ['US'], plannedMarkets: ['FR'] };
  const run = (phase: 'current' | 'planned') => assessmentOf({
    country: 'US', markets: ['US'],
    details: phase === 'current'
      ? { ...base, stock: ['US', 'DE'], stockStatus: { US: 'confirmed', DE: 'confirmed' }, plannedStock: ['no-other'] }
      : { ...base, stock: ['US'], stockStatus: { US: 'confirmed' }, plannedStock: ['DE'], plannedStockStatus: { DE: 'confirmed' } },
  }, [TEST_RULE]);

  it('the result reacts to German storage and its phase — Germany is never a sales market', () => {
    const [a, b] = [run('current'), run('planned')];
    for (const r of [a, b]) expect(r.assessed).toEqual({ current: ['US'], planned: ['FR'] });
    const de = (r: typeof a) => r.storage.locations.find((l) => l.country === 'DE')!;
    expect([de(a).phase, de(a).also_market, de(a).assessed, de(a).checks.map((c) => c.state)]).toEqual(['current', false, true, ['confirmed']]);
    expect([de(b).phase, de(b).also_market, de(b).assessed, de(b).checks.map((c) => c.state)]).toEqual(['planned', false, true, ['likely']]);
    // US-Bestand: in beiden Laeufen gleich, und ohne Regel fuer die USA unbewertet.
    const us = (r: typeof a) => r.storage.locations.find((l) => l.country === 'US')!;
    expect([us(a), us(b)].map((l) => [l.phase, l.confirmation, l.assessed, l.reason])).toEqual([['current', 'confirmed', false, 'no_rule'], ['current', 'confirmed', false, 'no_rule']]);
    expect(a.storage.open_countries).toEqual({ current: ['US'], planned: [] });
  });

  it('with the real register nothing is assessed: the gap is stated, no check is invented', () => {
    const real = assessmentOf({ country: 'US', markets: ['US'], details: { ...base, stock: ['US', 'DE'], stockStatus: { DE: 'confirmed' } } });
    expect(real.storage.locations.map((l) => [l.country, l.assessed, l.reason, l.checks])).toEqual([['US', false, 'no_rule', []], ['DE', false, 'no_rule', []]]);
  });
});
