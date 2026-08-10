import { useState, useEffect, useRef, Fragment } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { saveWizardSession, fetchSessions } from '../api/sessions';
import { runSearch, type AnonProvider, type SearchLaw } from '../api/search';
import { useApiData } from '../lib/useApiData';
import { ProviderMatchCard } from '../components/ui/ProviderMatchCard';
import { generateRiskMapPdf } from '../lib/riskMapPdf';
import { useAuthStore } from '../store/useAuthStore';
import { Lock, Check, Info, ArrowRight, ShieldCheck, Download } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { RiskBadge, type RiskLevel } from '../components/ui/RiskBadge';
import { FreeAccountDrawer } from '../components/home/MarketsDrawer';
import type { SearchProfile } from '../components/wizard/WizardContext';

// ─── Results · Risk Map · Figma 1667:215 ────────────────────────────────────
// The generated risk map shown after the wizard. A guest "map" — obligations
// table (severity · obligation · market · due · state), a locked Verified-Partner
// match strip, and a save-to-unlock CTA. Risk shown in petrol tints (never red).

type Severity = 'critical' | 'high' | 'medium' | 'low';
type State =
  | { kind: 'confirmed' }
  | { kind: 'likely' }
  | { kind: 'answer'; count: number };

type Obligation = {
  severity: Severity;
  title: string;
  detail: string;
  market: string;
  due: string;
  dueSub: string;
  state: State;
  /** Verified EU legal basis (EUR-Lex permalink) — rendered as a link so the
   *  claim is checkable instead of just asserted. Absent for purely national
   *  obligations and for the design fixture. */
  sourceLabel?: string;
  sourceUrl?: string;
  /** Adopted law whose start date is past the deadline horizon — shown under
   *  "On the radar" instead of competing with what needs doing this quarter. */
  radar?: boolean;
};

/** Whole days from today until an ISO date, or null once the date has passed
 *  (or is absent). Both sides are normalised to local midnight so a duty that
 *  starts the day after tomorrow reads "2 days" regardless of the clock time.
 *  Deliberately lives here and not in the engine: the enrichment map is
 *  deterministic ground truth, and only the render point knows "now". */
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  return days > 0 ? days : null;
}

/** Beyond a year out, a start date stops being a deadline and becomes a
 *  roadmap item. The PPWR 2030 tranche is ~1,200 days away: counted as a
 *  deadline it would drag the median stat to "1240 days" and render countdowns
 *  nobody can act on. Past the horizon the row still shows its date — only the
 *  countdown and the deadline stats drop out. */
const DEADLINE_HORIZON_DAYS = 365;
const withinHorizon = (iso?: string | null): number | null => {
  const d = daysUntil(iso);
  return d != null && d <= DEADLINE_HORIZON_DAYS ? d : null;
};

export const OBLIGATIONS: Obligation[] = [
  {
    severity: 'critical',
    title: 'OSS quarterly return',
    detail: 'Last filed: Q1 2025 · Penalty: €5,000 + 1%/month · UStG §18i (OSS)',
    market: 'DE · NL',
    due: 'Apr 30',
    dueSub: '6 days',
    state: { kind: 'confirmed' },
  },
  {
    severity: 'critical',
    title: 'VAT registration — UK',
    detail: 'Post-Brexit threshold check needed · Penalty: up to £20,000 · UK VATA 1994 §3',
    market: 'UK',
    due: 'May 15',
    dueSub: '21 days',
    state: { kind: 'likely' },
  },
  {
    severity: 'critical',
    title: 'EPR packaging registration (LUCID)',
    detail: 'Producer status to confirm · Penalty: up to €50,000 · VerpackG Art. 9 Abs. 1',
    market: 'DE',
    due: 'May 02',
    dueSub: '8 days',
    state: { kind: 'likely' },
  },
  {
    severity: 'high',
    title: 'EPR registration renewal (PackUK)',
    detail: 'Last filed: Apr 2024 · Penalty: 4% of UK revenue · UK Packaging Regs. 2023 §7',
    market: 'UK',
    due: 'May 15',
    dueSub: '21 days',
    state: { kind: 'likely' },
  },
  {
    severity: 'high',
    title: 'Cookie banner + consent records',
    detail: 'B2C EU users → required · GDPR Art. 6/7 · TTDSG §25',
    market: 'EU-wide',
    due: 'Ongoing',
    dueSub: 'Live',
    state: { kind: 'confirmed' },
  },
  {
    severity: 'medium',
    title: 'DPIA for tracking pixels',
    detail: 'Depends on tracking stack · GDPR Art. 35',
    market: 'EU-wide',
    due: '—',
    dueSub: 'Depends on tools',
    state: { kind: 'answer', count: 2 },
  },
  {
    severity: 'medium',
    title: 'Reverse-charge mechanism',
    detail: 'Applies only if cross-border B2B share >0 · UStG §13b',
    market: 'DE · NL',
    due: '—',
    dueSub: 'Depends on B2B mix',
    state: { kind: 'answer', count: 2 },
  },
  {
    severity: 'medium',
    title: 'Beneficial-owner update',
    detail: 'Last filed: Mar 2025 · Penalty: €1,000–5,000 · GwG §20 Abs. 1',
    market: 'DE',
    due: 'Jun 30',
    dueSub: 'ongoing',
    state: { kind: 'confirmed' },
  },
];

export const STATS = [
  { value: '8', label: 'obligations identified' },
  // 4 of the fixture rows carry a deadline inside 30 days (6 · 21 · 8 · 21).
  { value: '4', label: 'with a deadline in 30 days' },
  { value: '14 days', label: 'median deadline' },
  { value: '3', label: 'Verified Partners ready' },
];

const MATCHES = ['94%', '88%', '81%'];

// Real partners behind the unlock (seeded provider_keys on staging).
// `match` holds the raw percentage; the "match" wording is translated at render.
// `sub` keeps the English ground truth; rendering translates via results:partners.<i>.sub.
// Phase-3 wiring: design fixture in the ANONYMOUS wire shape — replaced by the
// live, scored /search providers when the backend answers.
const PARTNERS_ANON: AnonProvider[] = [
  { provider_key: 'studio-bianchi', pseudonym_label: 'Verifizierte Steuerkanzlei · Norditalien', region: 'Norditalien', active_since: 2015, specializations: ['VAT & OSS', 'E-Commerce', 'EU-weit'], languages: ['IT', 'DE', 'EN'], rating: 4.9, completed_count: 210, avg_response_hours: 3, billing_model: 'project', is_verified: true, match: 94, match_tier: 'high' },
  { provider_key: 'schmidt-partner', pseudonym_label: 'Verifizierte Steuerberatung · Norddeutschland', region: 'Norddeutschland', active_since: 2013, specializations: ['OSS/IOSS', 'Cross-border Tax'], languages: ['DE', 'EN'], rating: 4.7, completed_count: 96, avg_response_hours: 5, billing_model: 'abo', is_verified: true, match: 88, match_tier: 'strong' },
  { provider_key: 'madrid-tax', pseudonym_label: 'Verifizierter Tax-Spezialist · Spanien', region: 'Spanien', active_since: 2020, specializations: ['Iberian VAT', 'Marketplace'], languages: ['ES', 'EN'], rating: 4.5, completed_count: 41, avg_response_hours: 8, billing_model: 'hourly', is_verified: true, match: 81, match_tier: 'moderate' },
];

const BILLING_LABEL: Record<AnonProvider['billing_model'], string> = {
  abo: 'Abomodell', hourly: 'Stundenbasis', project: 'Projektbasiert', mixed: 'Gemischt',
};

function StatePill({ state, onAnswer }: { state: State; onAnswer: () => void }) {
  const { t } = useTranslation('results');
  if (state.kind === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-[13px] font-semibold text-fg-brand">
        <Check size={13} strokeWidth={3} /> {t('state.confirmed')}
      </span>
    );
  }
  if (state.kind === 'likely') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke px-3 py-1 text-[13px] font-medium text-fg-secondary">
        <Info size={13} /> {t('state.likely')}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onAnswer}
      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5"
    >
      {t('state.answer', { total: state.count })} <ArrowRight size={14} />
    </button>
  );
}

export function ResultsRiskMap() {
  const { t } = useTranslation('results');
  const location = useLocation();
  // Profile survives the magic-link roundtrip via localStorage (Wave A2):
  // router state is lost when the user returns from the e-mail.
  const stateProfile = location.state?.searchProfile as SearchProfile | undefined;
  const storedProfile = (() => {
    try { return JSON.parse(localStorage.getItem('ch360_last_profile') || 'null') as SearchProfile | null; }
    catch { return null; }
  })();
  const profile = stateProfile ?? storedProfile ?? undefined;
  const [saveOpen, setSaveOpen] = useState(false);
  const { isLoggedIn } = useAuthStore();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  // Phase-3 wiring: one results surface, two entrances (funnel + dashboard).
  // ?session=<id> re-queries /search with that session's stored profile.
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const { data: searchData } = useApiData<{ providers: AnonProvider[]; laws: SearchLaw[] }>(async () => {
    let query: Parameters<typeof runSearch>[0] = profile ?? {};
    if (sessionId) {
      try {
        const s = (await fetchSessions()).find((x) => x.id === sessionId);
        if (s) query = { country: s.country ?? 'DE', categories: s.categories as SearchProfile['categories'] };
      } catch { /* fall back to the local profile */ }
    }
    const res = await runSearch(query);
    return { providers: res.providers, laws: res.laws ?? [] };
  }, { providers: PARTNERS_ANON, laws: [] });
  const anonProviders = searchData.providers;

  // Obligations enrichment: live engine laws (severity/statute/penalty/cadence)
  // replace the design fixture as soon as the payload carries severity. Live
  // rows render verbatim (engine ground truth is English) — the indexed
  // results:obligations.* translations only apply to the fixture.
  const liveLaws = searchData.laws.filter((l) => l.severity);
  const isLive = liveLaws.length > 0;
  const rows: Obligation[] = isLive
    ? liveLaws.map((l) => ({
        severity: l.severity as Severity,
        title: l.title,
        detail: [l.penalty ? `Penalty: ${l.penalty}` : null, l.source_url ? null : l.source].filter(Boolean).join(' · '),
        sourceLabel: l.source_url ? (l.source ?? l.celex ?? undefined) : undefined,
        sourceUrl: l.source_url ?? undefined,
        market: l.markets && l.markets.length ? l.markets.join(' · ') : 'EU-wide',
        // A duty that has not started yet must not read "Ongoing · Live" — that
        // would tell the user they are already in breach. Until its start date
        // the Due cell shows that date plus the countdown; from the day it
        // applies the row silently reverts to its normal cadence.
        due: daysUntil(l.applies_from) != null
          ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
              .format(new Date(`${l.applies_from}T00:00:00`))
          : l.due ?? '—',
        dueSub: withinHorizon(l.applies_from) != null
          ? t('appliesIn', { count: withinHorizon(l.applies_from) as number, defaultValue: `applies in ${withinHorizon(l.applies_from)} days` })
          : daysUntil(l.applies_from) != null ? ''   // far future: the date says enough
          : l.due_days != null ? `${l.due_days} days` : l.due === 'Ongoing' ? 'Live' : '',
        state: { kind: l.state === 'confirmed' ? 'confirmed' : 'likely' },
        // Same horizon as the stats: a duty landing in days is "now" even
        // though it has not started; one landing in 2030 is not.
        radar: daysUntil(l.applies_from) != null && withinHorizon(l.applies_from) == null,
      }))
    : OBLIGATIONS;

  // Two groups, not two tables: "Now" is what the user is accountable for
  // today, "On the radar" is adopted law that only bites later. Keeping the
  // original index alongside each row matters — the design fixture translates
  // its cells positionally via results:obligations.<i>, so partitioning must
  // not renumber them. filter() is stable, so order inside each group holds.
  const indexed = rows.map((o, i) => ({ o, i }));
  const nowRows = indexed.filter((x) => !x.o.radar);
  const radarRows = indexed.filter((x) => x.o.radar);
  // Headers appear only when there is something to separate; with no staged
  // obligations the table renders exactly as it did before.
  const grouped = radarRows.length
    ? [{ key: 'now', label: t('groups.now', { defaultValue: 'Now' }), items: nowRows },
       { key: 'radar', label: t('groups.radar', { defaultValue: 'On the radar' }), items: radarRows }]
        .filter((g) => g.items.length)
    : [{ key: 'now', label: '', items: indexed }];

  // Stat strip mirrors the table: count, near-term deadlines, median
  // days-to-deadline, matched partners. Fixture values until the API answers.
  //
  // Brand & Marketing Map V1 §5/§11 rules out "fear-first penalty language".
  // The strip used to lead with "€530k total exposure" — the biggest number on
  // screen was a threat. Penalties are still shown per obligation (they are
  // facts, and useful for prioritising), but the headline stat now conveys
  // URGENCY instead of DREAD: how many deadlines are actually near.
  const SOON_DAYS = 30;
  const stats = (() => {
    if (!isLive) return STATS;
    // A not-yet-applicable duty has a real, dated deadline — the day it starts
    // to apply. Counting it keeps the "near deadlines" stat honest; without it
    // a rule landing in two days would be invisible in the headline numbers.
    // Only inside the horizon, though: the 2030 tranche is a roadmap, and
    // averaging it in would report a median deadline three years out.
    const days = liveLaws.map((l) => l.due_days ?? withinHorizon(l.applies_from))
      .filter((d): d is number => d != null).sort((a, b) => a - b);
    const median = days.length ? days[Math.floor(days.length / 2)] : null;
    const soon = days.filter((d) => d <= SOON_DAYS).length;
    return [
      { value: String(rows.length), label: 'obligations identified' },
      { value: String(soon), label: `with a deadline in ${SOON_DAYS} days` },
      { value: median != null ? `${median} days` : 'ongoing', label: 'median deadline' },
      { value: String(anonProviders.length), label: 'Verified Partners ready' },
    ];
  })();

  // A6 (User Flows §9): guest-allowed PDF snapshot — PII-free, with sources.
  // Translated at the render point (results namespace); canonical EN fallback.
  const exportPdf = () => {
    generateRiskMapPdf({
      profile,
      t,
      stats: stats.map((s, i) => ({ value: s.value, label: t(`stats.${i}.label`, { defaultValue: s.label }) })),
      // Flattened in the same order as the screen, carrying the group label so
      // the export splits where the table splits — a PDF that reorders the
      // rows silently would not be the same document the user just read.
      obligations: grouped.flatMap((g) => g.items.map(({ o, i }) => ({
        groupLabel: g.label || undefined,
        severity: o.severity,
        title: isLive ? o.title : t(`obligations.${i}.title`, { defaultValue: o.title }),
        detail: isLive ? o.detail : t(`obligations.${i}.detail`, { defaultValue: o.detail }),
        market: isLive ? o.market : t(`obligations.${i}.market`, { defaultValue: o.market }),
        due: isLive ? o.due : t(`obligations.${i}.due`, { defaultValue: o.due }),
        dueSub: isLive ? o.dueSub : t(`obligations.${i}.dueSub`, { defaultValue: o.dueSub }),
        stateLabel:
          o.state.kind === 'confirmed' ? t('state.confirmed', { defaultValue: 'Confirmed' })
          : o.state.kind === 'likely' ? t('state.likely', { defaultValue: 'Likely' })
          : t('pdf.questionsOpen', { defaultValue: '{{total}} questions open', total: o.state.count }),
      }))),
    });
  };

  // Wave A1: arriving from the wizard persists the session (the editable
  // dossier). Guest-anchored via guest_key; fire-and-forget — the page renders
  // regardless, and a failed save just means no resume anchor.
  const savedRef = useRef(false);
  useEffect(() => {
    if (!profile || savedRef.current) return;
    savedRef.current = true;
    localStorage.setItem('ch360_last_profile', JSON.stringify(profile));
    saveWizardSession(profile).catch(() => { /* offline/demo — non-fatal */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-stroke-subtle bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-4 md:px-8 lg:px-16">
          <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary sm:inline-flex">
              <Lock size={13} /> {t('topbar.guestBadge')}
            </span>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-xl border border-stroke px-4 py-2.5 text-[14px] font-semibold text-fg transition-colors hover:border-fg-brand"
            >
              <Download size={15} /> {t('topbar.exportPdf')}
            </button>
            <button
              type="button"
              onClick={() => setSaveOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-[14px] font-semibold text-primary-950 transition-transform duration-200 hover:-translate-y-0.5"
            >
              {t('topbar.saveMap')} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-20 md:px-8 lg:px-16">
        {/* Header */}
        <div className="mx-auto mt-14 max-w-3xl text-center">
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-fg-brand">{t('header.eyebrow')}</span>
          <h1 className="mt-3 font-serif text-[2.75rem] font-bold leading-[1.05] tracking-tight text-fg sm:text-[3.25rem]">
            {t('header.title')}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-fg-secondary">
            {profile?.country
              ? t('header.subtitleProfile', { total: profile.categories?.length ?? 0 })
              : t('header.subtitleDefault')}
          </p>
        </div>

        {/* Stat strip */}
        <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-between gap-y-4 rounded-2xl border border-stroke-subtle bg-surface px-8 py-6 shadow-[0_18px_44px_-32px_rgba(2,22,17,0.3)]">
          {stats.map((s, i) => (
            <div key={s.label} className="flex items-center">
              {i > 0 && <span className="mr-8 hidden h-8 w-px bg-stroke-subtle sm:block" />}
              <span className="text-[1.5rem] font-bold text-fg">{s.value}</span>
              <span className="ml-2 text-[14px] text-fg-secondary">{t(`stats.${i}.label`, { defaultValue: s.label })}</span>
            </div>
          ))}
        </div>

        {/* Obligations table */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-stroke-subtle">
          <div className="grid grid-cols-[100px_1fr_120px_110px_160px] gap-4 border-b border-stroke-subtle bg-surface-secondary px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">
            <span>{t('table.severity')}</span>
            <span>{t('table.obligation')}</span>
            <span>{t('table.market')}</span>
            <span>{t('table.due')}</span>
            <span className="text-right">{t('table.state')}</span>
          </div>
          {grouped.map((g) => (
            <Fragment key={g.key}>
              {g.label && (
                <div className="flex items-baseline gap-2 border-b border-stroke-subtle bg-surface-secondary/40 px-6 py-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-secondary">{g.label}</span>
                  <span className="text-[11px] text-fg-tertiary">{g.items.length}</span>
                </div>
              )}
              {g.items.map(({ o, i }) => (
            <div
              key={o.title}
              className="grid grid-cols-[100px_1fr_120px_110px_160px] items-center gap-4 border-b border-stroke-subtle px-6 py-5 last:border-b-0 transition-colors hover:bg-surface-secondary/50"
            >
              <span>
                <RiskBadge level={o.severity as RiskLevel} styleVariant="soft" size="sm">
                  {t(`severity.${o.severity}`, { defaultValue: o.severity.charAt(0).toUpperCase() + o.severity.slice(1) })}
                </RiskBadge>
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-fg">{isLive ? o.title : t(`obligations.${i}.title`, { defaultValue: o.title })}</span>
                {/* Source leads, penalty follows in a muted tone (Brand Map
                    §11: penalties are facts worth showing, but must not be the
                    first thing the eye lands on). */}
                <span className="mt-0.5 block text-[12px] leading-relaxed text-fg-brand">
                  {o.sourceUrl && (
                    <>
                      <a
                        href={o.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
                        title={t('sourceLinkTitle', { defaultValue: 'Open the official text on EUR-Lex' })}
                      >
                        {o.sourceLabel} ↗
                      </a>
                      {o.detail ? ' · ' : ''}
                    </>
                  )}
                  <span className={o.sourceUrl ? 'text-fg-tertiary' : undefined}>
                    {isLive ? o.detail : t(`obligations.${i}.detail`, { defaultValue: o.detail })}
                  </span>
                </span>
              </span>
              <span className="text-[14px] text-fg-secondary">{isLive ? o.market : t(`obligations.${i}.market`, { defaultValue: o.market })}</span>
              <span>
                <span className="block text-[14px] font-semibold text-fg">{isLive ? o.due : t(`obligations.${i}.due`, { defaultValue: o.due })}</span>
                <span className="block text-[12px] text-fg-tertiary">{isLive ? o.dueSub : t(`obligations.${i}.dueSub`, { defaultValue: o.dueSub })}</span>
              </span>
              <span className="flex justify-end">
                <StatePill state={o.state} onAnswer={() => setSaveOpen(true)} />
              </span>
            </div>
              ))}
            </Fragment>
          ))}
        </div>

        {/* Partners matched */}
        <div className="mt-16">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-brand">
                {t('partners.eyebrow')}
              </span>
              <h2 className="mt-2 font-serif text-[1.75rem] font-bold leading-tight text-fg">
                {t('partners.title')}
              </h2>
            </div>
            {isLoggedIn ? (
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-fg-brand">
                <Check size={14} strokeWidth={3} /> {t('partners.unlocked')}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSaveOpen(true)}
                className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-fg-brand transition-colors hover:text-brand"
              >
                <Lock size={14} /> {t('partners.unlockCta')} <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div className={isLoggedIn ? 'mt-6 space-y-4' : 'mt-6 grid gap-5 sm:grid-cols-3'}>
            {isLoggedIn
              ? anonProviders.map((p) => (
                  // v2 stage-1 anonymous listing: the scored, anonymized cards.
                  // "Details" opens the (monetised) stage-2 detail page.
                  <ProviderMatchCard
                    key={p.provider_key}
                    title={p.pseudonym_label}
                    eyebrow={[p.region, p.active_since ? `aktiv seit ${p.active_since}` : null].filter(Boolean).join(' · ') || undefined}
                    match={t('partners.match', { pct: `${p.match}%` })}
                    matchTier={p.match_tier}
                    isVerified={p.is_verified}
                    tags={p.specializations.slice(0, 3)}
                    countries={p.languages.join(' · ')}
                    rating={p.rating != null ? `${p.rating} · ${p.completed_count ?? 0} Mandate` : undefined}
                    responseTime={p.avg_response_hours != null ? `Ø ${p.avg_response_hours} Std. Antwortzeit` : undefined}
                    billing={BILLING_LABEL[p.billing_model]}
                    onDetails={() => navigate(`/${locale}/provider/${p.provider_key}`)}
                  />
                ))
              : MATCHES.map((m) => (
                  <div
                    key={m}
                    className="flex flex-col items-center gap-4 rounded-2xl border border-stroke-subtle bg-surface-secondary px-6 py-8"
                  >
                    <Lock size={22} className="text-fg-tertiary" />
                    <div className="w-full space-y-2">
                      <div className="mx-auto h-2.5 w-3/4 rounded-full bg-neutral-200" />
                      <div className="mx-auto h-2.5 w-1/2 rounded-full bg-neutral-200" />
                    </div>
                    <span className="text-[15px] font-bold text-fg-brand">{t('partners.match', { pct: m })}</span>
                  </div>
                ))}
          </div>
        </div>
      </main>

      {/* Save CTA band */}
      <section className="border-t border-stroke-subtle bg-surface-secondary py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <ShieldCheck size={26} className="mx-auto text-fg-brand" />
          <h2 className="mt-4 font-serif text-[2rem] font-bold leading-tight tracking-tight text-fg">
            {t('cta.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-fg-secondary">
            {t('cta.body')}
          </p>
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent-500 px-7 py-3.5 text-[15px] font-semibold text-primary-950 shadow-[0_18px_34px_-14px_rgba(212,175,55,0.6)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t('cta.button')} <ArrowRight size={17} />
          </button>
        </div>
      </section>

      <FreeAccountDrawer open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  );
}
