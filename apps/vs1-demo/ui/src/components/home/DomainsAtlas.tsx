import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Package,
  Lock,
  MessageSquare,
  Building2,
  ShieldCheck,
  Truck,
  Scale,
  Check,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { SectionEyebrow, GoldWord, Reveal } from '../providers/SectionHeading';
import { DOMAINS } from '../../lib/domains';
import { useInViewOnce } from '../../lib/useInViewOnce';

// ─── S4 — The domain atlas (canvas "Was wir wissen" · Atlas, 2026-08-25) ─────
// Replaces DomainsKnows ON THE HOMEPAGE ONLY — DomainsKnows stays in the tree.
// The drawer content comes out of hiding onto the page: the eight areas as a
// rail on the left, the ACTIVE area's dossier standing on the Gradient panel
// (CLAUDE.md) on the right — markets, intro, the six coverage points, and the
// gold-tinted "when this matters" callout under the copy.
//
// The drawer itself is GONE (user decision 2026-08-25): each area has its own
// dedicated page now, so the dossier's one CTA is "Mehr erfahren" and leads to
// /:locale/compliance/:slug. No wizard call from here.
//
// The rail plays itself through like the wizard demo — every few seconds the
// next area becomes active and its dossier crossfades in; a click selects
// directly and stops the auto-run. Reduced motion never auto-advances.
//
// All copy lives in the 'home' namespace under domains.* — same keys as
// DomainsKnows, nothing moved.

// One icon per canonical domain, order = lib/domains.ts (drives the rail).
const DOMAIN_ICONS = [
  BarChart3,     // Tax & VAT
  Package,       // EPR & Packaging
  Lock,          // Data & Privacy
  MessageSquare, // Marketing Compliance
  Building2,     // Corporate & Structure
  ShieldCheck,   // Product Compliance
  Truck,         // Logistics & Customs
  Scale,         // Legal Advisory
] as const;
const COVER_COUNT = 6;
const CYCLE_MS = 6000;

export function DomainsAtlas() {
  const { t } = useTranslation('home');
  const { locale } = useParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-120px');
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(false);

  // Self-run: advance once the section is in view, until the user takes over.
  useEffect(() => {
    if (!inView || reduced || picked) return;
    const id = setInterval(() => setActive((a) => (a + 1) % DOMAINS.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [inView, reduced, picked]);

  const base = `domains.items.${active}`;

  return (
    <section id="what-we-know" className="bg-surface py-20 lg:py-28">
      <Container size="2xl" bleed className="px-4 md:px-6 lg:px-10">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('domains.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            {t('domains.title.pre')}<GoldWord>{t('domains.title.gold')}</GoldWord>{t('domains.title.post')}
          </h2>
          <p className="max-w-xl text-body leading-relaxed text-fg-secondary">{t('domains.subtitle')}</p>
        </Reveal>

        <div ref={ref} className="mx-auto mt-14 flex max-w-[1240px] flex-col gap-10 lg:flex-row lg:items-stretch lg:gap-12">
          {/* Rail: the eight areas, pure petrol icons, the active one carded */}
          <motion.div
            className="flex flex-col justify-center gap-1.5 lg:w-[400px] lg:shrink-0"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            {DOMAIN_ICONS.map((Icon, i) => {
              const isActive = i === active;
              return (
                <motion.button
                  key={i}
                  type="button"
                  layout
                  onClick={() => {
                    setPicked(true);
                    setActive(i);
                  }}
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={
                    isActive
                      ? 'flex items-center gap-4 rounded-xl border-l-[3px] border-accent-500 bg-surface px-5 py-4 text-left shadow-[0_20px_50px_-24px_rgba(2,22,17,0.28)] dark:bg-surface-secondary'
                      : 'flex items-center gap-4 border-b border-stroke-subtle px-5 py-2.5 text-left transition-colors hover:bg-surface-secondary/60'
                  }
                >
                  <span className="flex w-12 shrink-0 justify-center">
                    <Icon size={40} strokeWidth={1.5} className="text-fg-brand" />
                  </span>
                  {isActive ? (
                    <motion.span initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="block">
                      <span className="block text-body font-bold text-fg">{t(`${base}.title`)}</span>
                      <span className="mt-1 block text-body-xs leading-snug text-fg-secondary">{t(`${base}.desc`)}</span>
                      <span className="mt-2 block text-body-4xs font-semibold uppercase tracking-[0.1em] text-fg-accent-emphasis">
                        {t(`${base}.markets`)}
                      </span>
                    </motion.span>
                  ) : (
                    <>
                      <span className="flex-1 text-body-md font-semibold text-fg-secondary">{t(`domains.items.${i}.title`)}</span>
                      <ChevronRight size={15} className="text-fg-tertiary" />
                    </>
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {/* The Gradient panel with the active area's dossier */}
          <div className="flex flex-1 items-center rounded-xl bg-gradient-stage p-5 sm:p-8 lg:p-11">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full rounded-[14px] bg-surface p-6 shadow-[0_40px_90px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary sm:p-10"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-body-3xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">{t('domains.drawerEyebrow')}</p>
                    <h3 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight text-fg">{t(`${base}.title`)}</h3>
                    <p className="mt-2 text-body-xs font-semibold text-fg-brand">
                      {t('domains.activeIn')} <span className="font-medium text-fg-secondary">{t(`${base}.markets`)}</span>
                    </p>
                  </div>
                  {(() => {
                    const ActiveIcon = DOMAIN_ICONS[active];
                    return <ActiveIcon size={52} strokeWidth={1.5} className="shrink-0 text-fg-brand" />;
                  })()}
                </div>
                <p className="mt-4 text-body-sm leading-relaxed text-fg-secondary">{t(`${base}.intro`)}</p>
                <p className="mt-4 rounded-[10px] border border-accent-500/35 bg-accent-500/10 px-4 py-3 text-body-xs leading-relaxed text-accent-700 dark:text-fg-accent-strong">
                  <span className="font-bold">{t('drawer.whenThisMatters')}:</span> {t(`${base}.matters.0`)}
                </p>
                <hr className="my-6 border-stroke-subtle" />
                <p className="text-body-4xs font-semibold uppercase tracking-[0.12em] text-fg-tertiary">{t('drawer.whatWeCover')}</p>
                <ul className="mt-3.5 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {Array.from({ length: COVER_COUNT }, (_, i) => (
                    <li key={i} className="flex gap-2.5 text-body-xs text-fg">
                      <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-brand" />
                      {t(`${base}.cover.${i}`)}
                    </li>
                  ))}
                </ul>
                <hr className="my-6 border-stroke-subtle" />
                <div className="flex justify-end">
                  <Button
                    onClick={() => navigate(`/${locale ?? 'en'}/compliance/${DOMAINS[active].slug}`)}
                  >
                    {t('domains.learnMore')} <ArrowRight size={15} className="ml-1.5" />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
}
