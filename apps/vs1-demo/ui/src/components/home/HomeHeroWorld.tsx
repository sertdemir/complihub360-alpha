import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Headset,
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { GoldWord } from '../providers/SectionHeading';
import { Stagger, StaggerItem } from '../providers/SectionHeading';
import { HeroWorldMap } from './HeroWorldMap';

// ─── S1 — Hero (world-map edition, canvas "Homepage Hero" 2026-08-24) ─────────
// Replaces HomeHero ON THE HOMEPAGE ONLY — HomeHero itself stays in the tree
// (stories, and any future surface that wants the wizard-led hero back).
//
// Three stacked blocks, exactly as reviewed on the canvas:
//   1 Hero      → serif display headline ("Globale Compliance." / gold
//                 "Vereinfacht."), lead, two stacked entries (Risk-Map CTA +
//                 free-question input), animated world map right
//   2 Promises  → four promises on the Gradient (dark petrol fill until
//                 2026-08-25)
//   3 Proof     → five text-only proofs separated by hairlines
//
// Copy lives in the 'home' namespace under heroWorld.*.

const PROMISE_ICONS: LucideIcon[] = [FileText, Users, CheckCircle2, Headset];
// Text-only since 2026-08-25 (user decision) — the icons went through gold,
// petrol and stacked variants and always fought the promise band above;
// hairlines between the five proofs carry the rhythm instead.
const PROOF_COUNT = 5;

function AskForm({ className = '' }: { className?: string }) {
  const { t } = useTranslation('home');
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [query, setQuery] = useState('');
  const ask = () => {
    const q = query.trim();
    navigate(`/${locale}/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ask();
      }}
      className={`flex items-center gap-2 rounded-xl border border-stroke bg-surface p-1.5 pl-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)] focus-within:border-fg-brand ${className}`}
    >
      <Search size={16} className="shrink-0 text-fg-tertiary" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('heroWorld.ask.placeholder')}
        aria-label={t('heroWorld.ask.placeholder')}
        className="min-w-0 flex-1 bg-transparent py-2 text-body-md text-fg placeholder:text-fg-tertiary focus:outline-none"
      />
      <Button type="submit" className="shrink-0">
        {t('heroWorld.ask.send')}
      </Button>
    </form>
  );
}

export function HomeHeroWorld() {
  const { t } = useTranslation('home');
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const startRiskMap = () => navigate(`/${locale}/wizard`);

  return (
    <section className="bg-surface">
      {/* ── 1 · Hero ── */}
      <Container size="2xl" bleed className="px-4 md:px-6 lg:pl-[88px] lg:pr-10">
        <div className="flex flex-col items-center gap-10 pb-14 pt-14 lg:flex-row lg:gap-6 lg:pb-16 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="w-full min-w-0 lg:max-w-[560px] lg:flex-1"
          >
            <h1 className="font-serif text-display-md font-semibold tracking-[-0.015em] text-fg lg:text-display-xl lg:leading-[1.08]">
              <span className="whitespace-nowrap">{t('heroWorld.title.line1')}</span>
              <br />
              <GoldWord>{t('heroWorld.title.line2')}</GoldWord>
            </h1>
            <p className="mt-6 max-w-[44ch] text-[1.25rem] leading-[1.6] text-fg-secondary">{t('heroWorld.lead')}</p>
            <div className="mt-9 flex max-w-[480px] flex-col gap-3">
              <Button size="lg" fullWidth onClick={startRiskMap}>
                {t('heroWorld.ctaRiskMap')} <ArrowRight size={17} />
              </Button>
              <AskForm />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="w-full lg:w-[600px] lg:shrink-0 xl:w-[720px]"
          >
            <HeroWorldMap />
          </motion.div>
        </div>
      </Container>

      {/* ── 2 · Gradient band: four promises ── */}
      {/* On the Gradient (CLAUDE.md) since 2026-08-25 — the dark petrol fill
          was retired with the light redesign. Icons in the emphasis gold that
          reads on light surfaces. */}
      <Container size="2xl" bleed className="px-4 md:px-6 lg:px-10">
        <Stagger className="grid grid-cols-1 rounded-xl bg-[linear-gradient(165deg,#EAF3F1_0%,#DDECE8_55%,#E9E4D3_100%)] px-3 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:py-11">
          {PROMISE_ICONS.map((Icon, i) => (
            <StaggerItem key={i} className="border-primary-500/15 px-6 py-4 sm:py-2 lg:border-r lg:px-7 lg:last:border-r-0">
              <Icon size={40} strokeWidth={1.7} className="text-fg-accent-emphasis" aria-hidden />
              <p className="mt-4 font-serif text-h3 font-bold leading-snug text-fg">{t(`heroWorld.promises.${i}.title`)}</p>
              <p className="mt-2 text-body-sm text-fg-secondary">{t(`heroWorld.promises.${i}.desc`)}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>

      {/* ── 3 · Proof strip: five short proofs ── */}
      <Container size="2xl" bleed className="px-4 pb-14 pt-6 md:px-6 lg:px-10">
        <Stagger
          stagger={0.08}
          className="grid grid-cols-1 gap-y-5 py-7 sm:grid-cols-2 lg:grid-cols-5 lg:gap-y-0"
        >
          {Array.from({ length: PROOF_COUNT }, (_, i) => (
            <StaggerItem
              key={i}
              className="border-stroke-subtle px-6 lg:border-r lg:px-7 lg:last:border-r-0"
            >
              <p className="text-body-md font-bold text-neutral-900">{t(`heroWorld.proofs.${i}.title`)}</p>
              <p className="mt-0.5 text-body-2xs text-neutral-500">{t(`heroWorld.proofs.${i}.desc`)}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
