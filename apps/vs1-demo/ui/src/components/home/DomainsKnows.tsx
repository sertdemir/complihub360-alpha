import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
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
  X,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';

// ─── S4 — What CompliHub360 Knows · Figma 1249:439 ──────────────────────────────
// "Six domains. One coherent map." A 3×2 grid of domain cards (gold frame on
// hover) that stagger-reveal on scroll; clicking one opens the domain side-sheet
// (Figma 1650:5764) with cover/when-this-matters detail.
// All copy lives in the 'home' namespace under domains.items.<index>.*.

// One icon per canonical domain, in the order of lib/domains.ts — this array
// drives the grid, so its length IS the number of cards rendered. It had six
// entries while the app had eight domains, and the sixth was the long-removed
// "Full Compliance Coverage"; the section therefore under-sold the coverage it
// was supposed to demonstrate. Adding a domain means adding an icon here.
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
const MATTERS_COUNT = 3;

function CheckList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-body-3xs font-semibold uppercase tracking-[0.12em] text-fg-tertiary">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex gap-3 text-body-md text-fg">
            <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-brand" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DomainDrawer({ index, onClose }: { index: number; onClose: () => void }) {
  const { t } = useTranslation('home');
  const base = `domains.items.${index}`;
  const cover = Array.from({ length: COVER_COUNT }, (_, i) => t(`${base}.cover.${i}`));
  const matters = Array.from({ length: MATTERS_COUNT }, (_, i) => t(`${base}.matters.${i}`));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100]">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-label={t('domains.drawerAria', { domain: t(`${base}.title`) })}
        className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col bg-surface shadow-2xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.42 }}
      >
        <div className="flex-1 overflow-y-auto px-8 pt-8">
          <div className="flex items-start justify-between">
            <p className="text-body-3xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">{t('domains.drawerEyebrow')}</p>
            <button onClick={onClose} aria-label={t('drawer.close')} className="text-fg-tertiary transition-colors hover:text-fg">
              <X size={22} />
            </button>
          </div>
          <h3 className="mt-3 font-serif text-[2.25rem] font-bold leading-none text-fg">{t(`${base}.title`)}</h3>
          <p className="mt-3 text-body-sm font-semibold text-fg-brand">
            {t('domains.activeIn')} <span className="text-fg-secondary">{t(`${base}.markets`)}</span>
          </p>
          <p className="mt-6 text-body leading-relaxed text-fg-secondary">{t(`${base}.intro`)}</p>

          <hr className="my-8 border-stroke-subtle" />
          <CheckList title={t('drawer.whatWeCover')} items={cover} />
          <hr className="my-8 border-stroke-subtle" />
          <CheckList title={t('drawer.whenThisMatters')} items={matters} />
          <div className="h-8" />
        </div>

        <div className="border-t border-stroke-subtle bg-surface-secondary px-8 py-5">
          <p className="text-body-xs text-fg-tertiary">{t('drawer.continues')}</p>
          <Button fullWidth className="mt-3">
            {t('drawer.seeIfApplies')} <ArrowRight size={16} className="ml-1.5" />
          </Button>
        </div>
      </motion.aside>
    </div>
  );
}

export function DomainsKnows() {
  const { t } = useTranslation('home');
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="what-we-know" className="bg-surface py-20 lg:py-28">
      <Container size="xl">
        {/* Heading */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('domains.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            {t('domains.title.pre')}<GoldWord>{t('domains.title.gold')}</GoldWord>{t('domains.title.post')}
          </h2>
          <p className="max-w-xl text-body leading-relaxed text-fg-secondary">
            {t('domains.subtitle')}
          </p>
          <div className="mt-3 flex items-center gap-3">
            {DOMAIN_ICONS.map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-brand" />
            ))}
          </div>
        </div>

        {/* Domain grid — stagger-reveal on scroll */}
        <motion.div
          className="mx-auto mt-14 grid max-w-[1080px] gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {DOMAIN_ICONS.map((Icon, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => setOpen(i)}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="group rounded-xl border border-transparent p-6 text-left transition-colors duration-200 hover:border-accent-400 hover:bg-surface"
            >
              <Icon size={26} strokeWidth={1.75} className="text-fg-brand" />
              <p className="mt-4 text-[18px] font-bold text-fg">{t(`domains.items.${i}.title`)}</p>
              <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{t(`domains.items.${i}.desc`)}</p>
              <p className="mt-4 text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{t(`domains.items.${i}.markets`)}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-brand">
                {t('domains.cardCta')} <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          ))}
        </motion.div>
      </Container>

      <AnimatePresence>
        {open !== null && <DomainDrawer index={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </section>
  );
}
