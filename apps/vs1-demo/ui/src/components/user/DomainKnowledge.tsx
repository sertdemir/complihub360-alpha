import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Segment } from '../compliance-areas/Segment';
import { SEVERITY_STYLE } from '../compliance-areas/severity';
import { getAreaObligations, getAreaProfile, type AreaObligation } from '../../lib/areaProfiles';
import { MARKET_CODES } from '../../lib/marketProfiles';
import type { CountryCode } from '../compliance-areas/types';
import type { DomainSlug } from '../../lib/domains';
import type { DomainSession } from '../../api/domain';

// ─── Wissen zum Bereich (Canvas 4B, 2026-09-13) ──────────────────────────────
// Der Pflichten-Explorer der oeffentlichen Bereichsseite, in den Arbeitsbereich
// geholt und an den Nutzer gebunden: nur seine Maerkte (Umschalter "Alle
// Maerkte"), jede Pflicht, die in einer seiner Sitzungen liegt, traegt die
// Marke "In Ihrer Sitzung", und das Dossier zeigt unter Norm · Kadenz ·
// Bussgeld · Geltung seinen eigenen Stand.
//
// Inhalt ist ausschliesslich Engine (lib/areaProfiles): Norm, Bussgeld,
// Kadenz, Geltung je Markt. Wo die Engine keine nationale Quelle traegt,
// steht der EU-Eintrag und sagt das. Nichts wird hier verfasst.
//
// Kein Auto-Vorlauf wie auf der Marketing-Seite: im Arbeitsbereich liest
// man, man schaut nicht zu.

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';
const TAG = 'inline-flex whitespace-nowrap rounded-md bg-brand-light px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-fg-brand';

interface Entry {
  id: string;
  primary: AreaObligation;
  /** Je Markt des Nutzers: national belegt oder EU-Fallback. */
  perMarket: { code: string; national: boolean }[];
  own: { session: DomainSession; status: string; due?: string; dueDays?: number | null }[];
}

function isMarketCode(code: string): code is CountryCode {
  return (MARKET_CODES as string[]).includes(code);
}

export function DomainKnowledge({ slug, markets, sessions }: {
  slug: DomainSlug;
  /** Maerkte des Nutzers in diesem Bereich (Sitzungen); leer = nur EU-Sicht. */
  markets: string[];
  sessions: DomainSession[];
}) {
  const { t, i18n } = useTranslation('userws');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';
  const mine = markets.map((m) => m.toUpperCase()).filter(isMarketCode);
  const [view, setView] = useState<'mine' | 'all'>(mine.length ? 'mine' : 'all');
  const [picked, setPicked] = useState<string | null>(null);

  const entries = useMemo<Entry[]>(() => {
    const profile = getAreaProfile(slug);
    const codes: (CountryCode | 'EU')[] = view === 'mine' && mine.length ? mine : ['EU'];
    const byCode = new Map(codes.map((c) => [c, getAreaObligations(slug, c)]));
    const out: Entry[] = [];
    for (const sub of profile.subdomains) {
      const hits = codes.map((c) => ({ code: c, ob: byCode.get(c)?.find((o) => o.id === sub.id) })).filter((h) => h.ob);
      if (!hits.length) continue;
      const primary = (hits.find((h) => h.ob?.marketSpecific) ?? hits[0]).ob as AreaObligation;
      const own = sessions.flatMap((s) => s.obligations
        .filter((o) => o.id === sub.id)
        .map((o) => ({ session: s, status: o.status, due: o.due, dueDays: o.dueDays })));
      out.push({
        id: sub.id, primary, own,
        perMarket: hits.map((h) => ({ code: h.code, national: !!h.ob?.marketSpecific })),
      });
    }
    // Eigene Pflichten zuerst, dann nach Gewicht — wie die Kacheln.
    return out.sort((a, b) => (b.own.length ? 1 : 0) - (a.own.length ? 1 : 0) || b.primary.riskWeight - a.primary.riskWeight);
  }, [slug, view, mine.join(','), sessions]);

  const active = entries.find((e) => e.id === picked) ?? entries[0];
  const sessionTitle = (s: DomainSession) => s.label || [s.categories.join(', '), s.country].filter(Boolean).join(' · ');
  const statusLabel = (o: Entry['own'][number]) =>
    o.status === 'in_progress' ? t('domainPage.inProgress')
    : o.status === 'done' ? t('domainPage.statusDone')
    : o.status === 'not_applicable' ? t('domainPage.statusNotApplicable')
    : typeof o.dueDays === 'number' ? t('domainPage.dueInDays', { count: o.dueDays })
    : (o.due || t('domainPage.noDue'));

  if (!entries.length) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-body-md font-bold text-fg">
          {t('domainPage.knowledgeTitle')} <span className="text-fg-brand">{entries.length}</span>
        </h2>
        {mine.length > 0 && (
          <div className="flex items-center gap-2">
            <Segment selected={view === 'mine'} onClick={() => setView('mine')}>{t('domainPage.knowledgeMine')}</Segment>
            <Segment selected={view === 'all'} onClick={() => setView('all')}>{t('domainPage.knowledgeAll')}</Segment>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Rail */}
        <div className="flex flex-col gap-0.5">
          {entries.map((e) => {
            const on = e.id === active?.id;
            return (
              <button
                key={e.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(e.id)}
                className={'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ' +
                  (on ? 'border-l-[3px] border-l-[#d4af37] bg-surface shadow-[0_8px_24px_-18px_rgba(11,21,18,0.3)]' : 'hover:bg-surface/60')}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_STYLE[e.primary.severity].bar}`} />
                <span className="min-w-0 flex-1">
                  <span className={'block text-body-xs ' + (on ? 'font-extrabold text-fg' : 'font-semibold text-fg')}>{e.primary.label}</span>
                  <span className="block text-[10px] text-fg-tertiary">{e.primary.source}</span>
                </span>
                {e.own.length > 0 && <span className={TAG}>{t('domainPage.knowledgeInSession')}</span>}
              </button>
            );
          })}
        </div>

        {/* Dossier */}
        {active && (
          <div className={CARD + ' p-5'}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-accent-strong">
              {t('domainPage.dossier')} · {active.primary.label}
            </p>
            <h3 className="mt-2 font-serif text-[18px] font-bold leading-tight text-fg">{active.primary.label}</h3>
            <p className="mt-2 text-body-xs leading-relaxed text-fg-secondary">{active.primary.description}</p>

            <dl className="mt-3.5 grid gap-x-4 gap-y-2.5 text-body-3xs sm:grid-cols-2">
              <div>
                <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-fg-tertiary">{t('domainPage.dossierNorm')}</dt>
                <dd className="mt-0.5 font-semibold text-fg">{active.primary.source}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-fg-tertiary">{t('domainPage.dossierCadence')}</dt>
                <dd className="mt-0.5 font-semibold text-fg">{active.primary.due}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-fg-tertiary">{t('domainPage.dossierPenalty')}</dt>
                <dd className="mt-0.5 font-semibold text-fg">{active.primary.penalty}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-fg-tertiary">{t('domainPage.dossierScope')}</dt>
                <dd className="mt-0.5 font-semibold text-fg">
                  {active.perMarket.map((m, i) => (
                    <span key={m.code}>
                      {i > 0 && ' · '}
                      {m.code === 'EU' ? tc('compliance.area.euWide', 'EU-wide') : m.code}
                      {m.code !== 'EU' && !m.national && <span className="font-normal text-fg-tertiary"> ({t('domainPage.dossierEuFallback')})</span>}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>

            {active.own.length > 0 && (
              <div className="mt-3.5 flex flex-col gap-1.5">
                {active.own.map((o) => (
                  <div key={o.session.id} className="rounded-lg bg-brand-light px-3 py-2 text-body-3xs text-fg">
                    <b>{t('domainPage.dossierOwn', { session: sessionTitle(o.session) })}</b> {statusLabel(o)} ·{' '}
                    <button type="button" onClick={() => navigate(`/${locale}/results?session=${o.session.id}`)} className="font-bold text-brand underline underline-offset-2 hover:text-brand-700">
                      {t('domainPage.dossierToDuty')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3.5 flex flex-wrap gap-3 text-body-3xs font-bold">
              {active.primary.eurLexUrl && (
                <a href={active.primary.eurLexUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:text-brand-700">
                  {t('domainPage.dossierSource')}
                </a>
              )}
              <Link to={`/${locale}/compliance/${slug}`} className="text-brand underline underline-offset-2 hover:text-brand-700">
                {t('domainPage.dossierPublic')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
