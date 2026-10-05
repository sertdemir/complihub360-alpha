import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import i18next, { type TFunction } from 'i18next';

// Plural pass 2026-10-04 (follows "1 Bereiche im Fokus", PR #261). i18next
// picks _one/_other only from `count`; a string read with `{{total}}` or
// `{{days}}` stayed plural for a single item, in every language. Two guards:
// the copy itself (real locale files, 1 vs 2) and the call sites (they pass
// `count`, or the copy never gets the chance).

const HERE = dirname(fileURLToPath(import.meta.url));
const LOCALES = join(HERE, '../../public/locales');
const NS = ['common', 'results', 'providerws', 'userws'] as const;
const LNGS = ['en', 'de', 'es', 'tr'] as const;

async function tFor(lng: string, ns: string): Promise<TFunction> {
  const i18n = i18next.createInstance();
  const resources = { [lng]: Object.fromEntries(NS.map((n) => [n, JSON.parse(readFileSync(join(LOCALES, lng, `${n}.json`), 'utf8'))])) };
  await i18n.init({ lng, resources, defaultNS: ns, ns: [...NS], interpolation: { escapeValue: false } });
  return i18n.t;
}

type Case = { ns: string; key: string; opts: (n: number) => Record<string, unknown>; en1: string; de1: string };
const c = (ns: string, key: string, opts: (n: number) => Record<string, unknown>, en1: string, de1: string): Case => ({ ns, key, opts, en1, de1 });

const CASES: Case[] = [
  c('common', 'compliance.card.obligations', (n) => ({ count: n }), '1 obligation', '1 Pflicht'),
  c('common', 'compliance.area.metrics.days', (n) => ({ count: n }), '1 day', '1 Tag'),
  c('common', 'compliance.area.timeline.inDays', (n) => ({ count: n }), 'In 1 day', 'In 1 Tag'),
  c('common', 'compliance.area.timeline.dueBody', (n) => ({ cadence: 'Annual', days: n, count: n }), 'Cadence: Annual — 1 day of lead time.', 'Takt: Annual — 1 Tag Vorlauf.'),
  c('common', 'compliance.area.facts.duties', (n) => ({ count: n }), '1 duty', '1 Pflicht'),
  c('common', 'compliance.area.facts.later', (n) => ({ count: n }), '1 applies only from a later date', '1 greift erst später'),
  c('common', 'compliance.area.risk.marketsCompared', (n) => ({ count: n }), '1 market compared', '1 Markt im Vergleich'),
  c('common', 'compliance.area.enforcementTop', (n) => ({ total: n, count: n }), 'the only market compared', 'der einzige Markt im Vergleich'),
  c('common', 'compliance.area.enforcementAvg', (n) => ({ total: n, count: n }), 'average across 1 market', 'Durchschnitt über 1 Markt'),
  c('common', 'compliance.area.metrics.exposureProvenNote', (n) => ({ proven: n, total: 5, count: n }),
    '1 of 5 duties names an amount in law. The others are counted at zero, not estimated.',
    '1 von 5 Pflichten nennt im Gesetz einen Betrag. Die übrigen zählen mit null, sie werden nicht geschätzt.'),
  c('common', 'compliance.area.coverageNoteSpecific', (n) => ({ count: n, total: 5, market: 'France' }),
    '1 of 5 duties has a source specific to France.', '1 von 5 Pflichten hat eine Quelle speziell für France.'),
  c('common', 'compliance.area.coverageNoteGapsRest', (n) => ({ count: n }),
    'Of the rest, 1 has a national text we do not carry yet — the others are EU Regulations, which apply here directly.',
    'Von den übrigen hat 1 eine nationale Fassung, die wir noch nicht führen — der Rest sind EU-Verordnungen, die hier unmittelbar gelten.'),
  c('common', 'markets.country.leadTime', (n) => ({ days: n, count: n }), '1 day lead time', '1 Tag Vorlauf'),
  c('common', 'markets.country.leadDays', (n) => ({ count: n }), '1 day lead time', '1 Tag Vorlauf'),
  c('common', 'markets.country.exposureConverted', (n) => ({ count: n }), '1 of them is converted from another currency', '1 davon ist aus einer anderen Währung umgerechnet'),
  c('common', 'markets.country.exposureUnbacked', (n) => ({ count: n, total: 5 }), '1 of 5 duties carries no amount stated in law', '1 von 5 Pflichten führt keinen im Gesetz genannten Betrag'),
  c('common', 'counts.duties', (n) => ({ count: n }), '1 duty', '1 Pflicht'),
  c('common', 'counts.areasIn', (n) => ({ count: n }), '1 area', '1 Bereich'),
  c('providerws', 'application.services.countries', (n) => ({ count: n }), '1 country', '1 Land'),
  c('results', 'state.answer', (n) => ({ total: n, count: n }), 'Answer 1 question', '1 Frage beantworten'),
  c('results', 'pdf.questionsOpen', (n) => ({ total: n, count: n }), '1 question open', '1 Frage offen'),
  c('results', 'detail.lageMarketsAll', (n) => ({ count: n }), '1 market covered', '1 Markt abgedeckt'),
  c('results', 'detail.matrixCovered', (n) => ({ covered: 0, total: n, count: n }), '0 of 1 market', '0 von 1 Markt'),
  c('results', 'detail.figureRating', (n) => ({ count: n }), 'Rating · 1 voice', 'Bewertung · 1 Stimme'),
  c('results', 'detail.reviewsCount', (n) => ({ count: n }), '1 review', '1 Bewertung'),
  c('results', 'detail.mandatesCount', (n) => ({ count: n }), '1 mandate', '1 Mandat'),
  c('results', 'rankBasis.reviews', (n) => ({ rating: '4.8', count: n }), '4.8 from 1 review after an appointment', '4.8 aus 1 Bewertung nach einem Termin'),
  c('userws', 'sessions.kpiStaleSub', (n) => ({ count: n }), 'oldest 1 month ago', 'älteste vor 1 Monat'),
];

describe('plural forms agree with a single item', () => {
  for (const k of CASES) {
    it(`${k.ns}:${k.key}`, async () => {
      for (const lng of LNGS) {
        const t = await tFor(lng, k.ns);
        const one = t(k.key, k.opts(1));
        const two = t(k.key, k.opts(2));
        // A missing key comes back as the key itself.
        expect(one, `${lng} one`).not.toBe(k.key);
        expect(two, `${lng} other`).not.toBe(k.key);
        if (lng === 'en') expect(one).toBe(k.en1);
        if (lng === 'de') expect(one).toBe(k.de1);
        // Turkish keeps the noun singular after a numeral; the others change.
        if (lng !== 'tr' && !k.key.startsWith('compliance.area.enforcementTop')) {
          expect(two.replace(/2/g, '1'), `${lng} 1 and 2 read the same`).not.toBe(one);
        }
      }
    });
  }

  it('composes two numbers with two forms ("1 duty in 3 areas")', async () => {
    const en = await tFor('en', 'common');
    const de = await tFor('de', 'common');
    const tr = await tFor('tr', 'common');
    const fact = (t: TFunction, d: number, a: number) =>
      t('header.nav.marketFact', { duties: t('counts.duties', { count: d }), areas: t('counts.areasIn', { count: a }) });
    expect(fact(en, 1, 3)).toBe('1 duty in 3 areas');
    expect(fact(en, 4, 1)).toBe('4 duties in 1 area');
    expect(fact(de, 1, 1)).toBe('1 Pflicht in 1 Bereich');
    expect(fact(de, 4, 3)).toBe('4 Pflichten in 3 Bereichen');
    expect(fact(tr, 4, 3)).toBe('3 alanda 4 yükümlülük');
    const cal = (t: TFunction) =>
      t('markets.country.calendarLead', { duties: t('counts.duties', { count: 2 }), areas: t('counts.areasFrom', { count: 1 }) });
    expect(cal(en)).toMatch(/^2 duties from 1 area in one view/);
    expect(cal(tr)).toMatch(/^1 alandan 2 yükümlülük/);
  });
});

// The copy only helps if the call passes `count`. Each entry: the file and the
// key whose t(...) call must carry `count`.
const CALLS: Array<[string, string]> = [
  ['components/compliance-areas/AreaTimeline.tsx', 'compliance.area.timelineLead'],
  ['components/compliance-areas/AreaTimeline.tsx', 'compliance.area.timeline.dueBody'],
  ['components/compliance-areas/AreaMetrics.tsx', 'compliance.area.metrics.exposureNoneProven'],
  ['components/compliance-areas/AreaMetrics.tsx', 'compliance.area.metrics.exposureProvenNote'],
  ['components/compliance-areas/AreaEnforcement.tsx', 'compliance.area.enforcementTop'],
  ['components/compliance-areas/AreaEnforcement.tsx', 'compliance.area.enforcementAvg'],
  ['components/compliance-areas/ObligationsExplorer.tsx', 'compliance.area.coverageNoteSpecific'],
  ['components/compliance-areas/ObligationsExplorer.tsx', 'compliance.area.coverageNoteGapsRest'],
  ['components/compliance-areas/ObligationsExplorer.tsx', 'markets.country.leadTime'],
  ['components/compliance-areas/RiskShowcase.tsx', 'markets.country.leadTime'],
  ['pages/ResultsRiskMap.tsx', 'state.answer'],
  ['pages/ResultsRiskMap.tsx', 'pdf.questionsOpen'],
  ['pages/ProviderDetailPage.tsx', 'detail.lageMarketsPartial'],
  ['pages/ProviderDetailPage.tsx', 'detail.matrixCovered'],
  ['pages/ProviderDetailPage.tsx', 'detail.reviewsCount'],
  ['pages/ProviderDetailPage.tsx', 'detail.mandatesCount'],
];

describe('plural call sites pass count', () => {
  for (const [file, key] of CALLS) {
    it(`${file} → ${key}`, () => {
      const src = readFileSync(join(HERE, '..', file), 'utf8');
      const at = src.indexOf(`t('${key}'`);
      expect(at, 'call not found').toBeGreaterThan(-1);
      // The options object of this call: up to the closing paren at depth 0.
      let depth = 0;
      let end = at + 1;
      for (let i = at + 2; i < src.length; i++) {
        if (src[i] === '(') depth++;
        if (src[i] === ')') {
          if (depth === 0) { end = i; break; }
          depth--;
        }
      }
      expect(src.slice(at, end)).toMatch(/\bcount\s*:/);
    });
  }
});
