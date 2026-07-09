import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, ChevronRight, Receipt, Recycle, ShieldCheck } from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { GoldWord } from './SectionHeading';
import { PartnerInboxList, StructuredRequestCard, demoPartnerData as d } from '../partner-preview';

// ─── S1 — Hero (Provider) · Figma desktop 1786:932 · mobile 1808:849 ──────────
// Faithful rebuild on Compass tokens + Container. Risk shown in petrol (never red).
// Desktop = two columns with the full Partner-Inbox sample card on the right.
// Mobile = stacked, with a CONDENSED inbox preview placed right after the subcopy.

const SPECIALISTS = [
  {
    key: 'vat',
    icon: Receipt,
    title: 'VAT & Tax specialist',
    desc: 'Cross-border returns, OSS / IOSS, marketplace facilitator nexus, distance-selling thresholds.',
  },
  {
    key: 'epr',
    icon: Recycle,
    title: 'EPR & Packaging consultant',
    desc: 'Producer registries, ecomodulation, post-Brexit splits, take-back schemes.',
  },
  {
    key: 'gdpr',
    icon: ShieldCheck,
    title: 'GDPR & Privacy lawyer',
    desc: 'DPIA, RoPA, processor agreements, breach response, transfer impact assessments.',
  },
] as const;

export function ProvidersHero() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const localePrefix = `/${i18n.resolvedLanguage || 'en'}`;
  const goApply = () => navigate(`${localePrefix}/providers#register`);
  const goMatch = () => navigate(`${localePrefix}/providers#matchmaking`);

  return (
    <section className="relative overflow-hidden bg-surface">
      <HeroBackground />

      <Container size="2xl" className="relative">
        {/* ── Desktop: two columns ── */}
        <div className="hidden items-center gap-16 pb-28 pt-32 lg:grid lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col"
          >
            <Eyebrow t={t} />
            <Headline t={t} className="mt-5 text-[3.25rem] leading-[1.1]" />
            <Subcopy t={t} className="mt-5 max-w-[608px]" />
            <CtaPair t={t} onApply={goApply} onMatch={goMatch} className="mt-8" />
            <SpecialistList t={t} className="mt-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="flex flex-col items-end"
          >
            <TrustRow t={t} className="mb-4 w-full max-w-[480px] justify-start" />
            <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-stroke-subtle bg-surface p-5 shadow-xl">
              <PartnerInboxList
                title="Partner Inbox"
                rightSlot={
                  <span>
                    <span className="font-semibold text-fg-brand">ACTIVE · 3</span>
                    <span className="ml-2">ARCHIVE</span>
                  </span>
                }
                leads={d.inboxLeads}
                featured={d.featuredRequest}
                featuredShowAccept
              />
            </div>
            <span className="mt-4 flex items-center gap-2 self-center text-caption text-fg-tertiary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
              {t('providers.hero.sampleNote', 'Dashboard-only · One-click Accept · Pay $100 on accept')}
            </span>
          </motion.div>
        </div>

        {/* ── Mobile: stacked (visual after subcopy) ── */}
        <div className="flex flex-col pb-16 pt-24 sm:pt-28 lg:hidden">
          <Eyebrow t={t} />
          <Headline t={t} className="mt-4 text-[2.125rem] leading-[1.12] sm:text-[2.75rem]" />
          <Subcopy t={t} className="mt-4" />
          <div className="mt-7 w-full overflow-hidden rounded-2xl border border-stroke-subtle bg-surface p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-semibold text-fg">Partner Inbox</span>
              <span className="text-[12px] font-semibold text-fg-brand">ACTIVE · 3</span>
            </div>
            <StructuredRequestCard request={d.featuredRequest} frame="brand" showAccept />
          </div>
          <SpecialistList t={t} className="mt-7" />
          <div className="mt-7 flex flex-col gap-3">
            <Button size="lg" fullWidth onClick={goApply}>
              {t('providers.hero.ctaPrimary', 'Apply for Beta cohort')}
            </Button>
            <button
              onClick={goMatch}
              className="inline-flex items-center justify-center gap-2 py-2 text-body font-semibold text-fg-brand"
            >
              {t('providers.hero.ctaSecondary', 'See how matching works')}
              <ArrowRight size={16} />
            </button>
          </div>
          <TrustRowMobile t={t} className="mt-7" />
          <div className="mt-8">
            <span className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              {t('providers.hero.sampleLabel', 'One incoming request · sample')}
            </span>
            <p className="mt-2 text-caption text-fg-tertiary">
              {t('providers.hero.sampleNote', 'Dashboard-only · One-click Accept · Pay $100 on accept')}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ─── Shared text blocks ───────────────────────────────────────────────────────

type T = TFunction<'common'>;

function Eyebrow({ t }: { t: T }) {
  return (
    <span className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-fg-brand">
      {t('providers.hero.eyebrow', 'For verified partners · Beta')}
    </span>
  );
}

function Headline({ t, className = '' }: { t: T; className?: string }) {
  return (
    <h1 className={`font-serif font-semibold tracking-tight text-fg ${className}`}>
      {t('providers.hero.headlineA', 'The compliance work you ')}
      <GoldWord>{t('providers.hero.headlineHighlight', 'actually')}</GoldWord>{' '}
      {t('providers.hero.headlineB', 'want.')}
    </h1>
  );
}

function Subcopy({ t, className = '' }: { t: T; className?: string }) {
  return (
    <p className={`text-body-lg leading-relaxed text-fg-secondary ${className}`}>
      {t(
        'providers.hero.sub',
        'Pre-qualified by user-completed risk maps. You pay only when you accept the request. No upfront fee. Founding cohort closing at 100 partners.',
      )}
    </p>
  );
}

function CtaPair({ t, onApply, onMatch, className = '' }: { t: T; onApply: () => void; onMatch: () => void; className?: string }) {
  return (
    <div className={`flex items-center gap-7 ${className}`}>
      <Button size="lg" className="h-11" onClick={onApply}>
        {t('providers.hero.ctaPrimary', 'Apply for Beta cohort')}
      </Button>
      <button onClick={onMatch} className="inline-flex items-center gap-2 text-body font-semibold text-fg-brand">
        {t('providers.hero.ctaSecondary', 'See how matching works')}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

const TRUST = [
  { key: 'noFee', label: 'No upfront fee' },
  { key: 'payOnAccept', label: 'Pay on accepted requests' },
  { key: 'badge', label: 'Founding-Partner badge' },
];

function TrustRow({ t, className = '' }: { t: T; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-7 gap-y-2 ${className}`}>
      {TRUST.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-2 text-body-sm text-fg-secondary">
          <Check size={14} className="text-fg-brand" strokeWidth={2.5} />
          {t(`providers.hero.chip.${c.key}`, c.label)}
        </span>
      ))}
    </div>
  );
}

const TRUST_MOBILE = [
  { key: 'noFee', label: 'No upfront fee · no subscription' },
  { key: 'payOnAccept', label: 'Pay only on accepted engagements' },
  { key: 'badge', label: 'Founding-Partner badge through Beta' },
];

function TrustRowMobile({ t, className = '' }: { t: T; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {TRUST_MOBILE.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-2 text-body-sm text-fg-secondary">
          <Check size={14} className="text-fg-brand" strokeWidth={2.5} />
          {t(`providers.hero.chipMobile.${c.key}`, c.label)}
        </span>
      ))}
    </div>
  );
}

function SpecialistList({ t, className = '' }: { t: T; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-3 text-eyebrow font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {t('providers.hero.specialistsLabel', 'Founding specialist profiles')}
      </p>
      <div className="flex flex-col">
        {SPECIALISTS.map((s, i) => (
          <div
            key={s.key}
            className={`flex items-start gap-3 rounded-md py-3 pr-2 ${
              i === 0 ? 'border-l-2 border-stroke-brand bg-surface-secondary pl-3' : 'pl-[14px]'
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center ${
                i === 0 ? 'text-fg-brand' : 'text-fg-tertiary'
              }`}
            >
              <s.icon size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-h6 font-semibold text-fg">
                {t(`providers.hero.specialist.${s.key}.title`, s.title)}
              </p>
              <p className="mt-0.5 text-caption text-fg-tertiary">
                {t(`providers.hero.specialist.${s.key}.desc`, s.desc)}
              </p>
            </div>
            <ChevronRight size={18} className="mt-1 shrink-0 text-fg-tertiary" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Background (gradient + petrol glow + dot texture) ────────────────────────

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-surface" />
      {/* Desktop only — the cross-border world map (Figma "Hero gradient" image
          fill, ~42% opacity) + petrol wash + glow. The mobile hero (1808:849)
          has no map background, so it stays plain surface. */}
      <div className="absolute inset-0 hidden lg:block">
        {/* World map capped at 1440px, centered — beyond that only the side margins grow. */}
        <img
          src="/img/hero-worldmap.png"
          alt=""
          className="absolute inset-0 mx-auto h-full w-full max-w-[1440px] object-cover opacity-[0.42]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-primary-500/[0.05]" />
        <div className="absolute right-[6%] top-[14%] h-[500px] w-[800px] rounded-full bg-primary-500/10 blur-[130px]" />
      </div>
    </div>
  );
}
