import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { saveWizardSession } from '../api/sessions';
import { generateRiskMapPdf } from '../lib/riskMapPdf';
import { useAuthStore } from '../store/useAuthStore';
import { RequestQuoteModal, type QuoteProvider } from '../components/user/RequestQuoteModal';
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
  { value: '€25k', label: 'total exposure' },
  { value: '14 days', label: 'median deadline' },
  { value: '3', label: 'Verified Partners ready' },
];

const MATCHES = ['94%', '88%', '81%'];

// Real partners behind the unlock (seeded provider_keys on staging).
// `match` holds the raw percentage; the "match" wording is translated at render.
// `sub` keeps the English ground truth; rendering translates via results:partners.<i>.sub.
const PARTNERS = [
  { key: 'studio-bianchi', name: 'Studio Bianchi SRL', meta: 'Milano, IT', match: '94%', sub: 'Italian VAT registration + fiscal representation · DE·IT bilingual' },
  { key: 'schmidt-partner', name: 'Schmidt & Partner', meta: 'Hamburg, DE', match: '88%', sub: 'OSS/IOSS setup · 12 years cross-border tax · 8 EU offices' },
  { key: 'madrid-tax', name: 'Madrid Tax Consultants', meta: 'Madrid, ES', match: '81%', sub: 'Iberian VAT (ES/PT) · monthly filing · marketplace optimization' },
];

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
  const { isLoggedIn, user } = useAuthStore();
  const [quoteFor, setQuoteFor] = useState<(QuoteProvider & { country: string; category: string }) | null>(null);

  // A6 (User Flows §9): guest-allowed PDF snapshot — PII-free, with sources.
  const exportPdf = () => {
    generateRiskMapPdf({
      profile,
      stats: STATS,
      obligations: OBLIGATIONS.map((o) => ({
        severity: o.severity,
        title: o.title,
        detail: o.detail,
        market: o.market,
        due: o.due,
        dueSub: o.dueSub,
        stateLabel: o.state.kind === 'confirmed' ? 'Confirmed' : o.state.kind === 'likely' ? 'Likely' : `${o.state.count} questions open`,
      })),
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
          {STATS.map((s, i) => (
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
          {OBLIGATIONS.map((o, i) => (
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
                <span className="block text-[15px] font-bold text-fg">{t(`obligations.${i}.title`, { defaultValue: o.title })}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-fg-brand">{t(`obligations.${i}.detail`, { defaultValue: o.detail })}</span>
              </span>
              <span className="text-[14px] text-fg-secondary">{t(`obligations.${i}.market`, { defaultValue: o.market })}</span>
              <span>
                <span className="block text-[14px] font-semibold text-fg">{t(`obligations.${i}.due`, { defaultValue: o.due })}</span>
                <span className="block text-[12px] text-fg-tertiary">{t(`obligations.${i}.dueSub`, { defaultValue: o.dueSub })}</span>
              </span>
              <span className="flex justify-end">
                <StatePill state={o.state} onAnswer={() => setSaveOpen(true)} />
              </span>
            </div>
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

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {isLoggedIn
              ? PARTNERS.map((pt, i) => (
                  <div
                    key={pt.key}
                    className="flex flex-col gap-3 rounded-2xl border border-stroke-subtle bg-surface-secondary px-6 py-7"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[16px] font-bold text-fg">{pt.name}</p>
                        <p className="text-[12px] text-fg-tertiary">{pt.meta}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-[12px] font-bold text-fg-brand">{t('partners.match', { pct: pt.match })}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-fg-secondary">{t(`partners.${i}.sub`, { defaultValue: pt.sub })}</p>
                    <button
                      type="button"
                      onClick={() => setQuoteFor({ key: pt.key, name: pt.name, meta: pt.meta, country: profile?.country || 'DE', category: 'vat' })}
                      className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-[14px] font-semibold text-primary-950 transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      {t('partners.requestQuote')} <ArrowRight size={15} />
                    </button>
                  </div>
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
      {quoteFor && (
        <RequestQuoteModal
          provider={quoteFor}
          country={quoteFor.country}
          category={quoteFor.category}
          domainLabel={t('quote.domainTaxVat')}
          requesterEmail={user?.email}
          onClose={() => setQuoteFor(null)}
        />
      )}
    </div>
  );
}
