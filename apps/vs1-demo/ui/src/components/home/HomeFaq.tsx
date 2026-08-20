import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { GoldWord } from '../providers/SectionHeading';

// ─── S8 — FAQ · Figma 1641:1196 ─────────────────────────────────────────────
// "What you're probably wondering." A centered, borderless disclosure list
// (single-open) over the page's recurring promises: free, not-legal-advice,
// vetting, cost, data, coverage. Token-based, mirrors the Compass Accordion
// motion (height auto, chevron rotates) in the marketing divider-list style.

// Q&A copy lives in faq.items.<index>.{q,a} ('home' ns).
const FAQ_COUNT = 6;

function FaqRow({ index, open, onToggle }: { index: number; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation('home');
  return (
    <div className="border-b border-stroke-subtle">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-4 py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
      >
        <span className="flex-1 text-[18px] font-bold text-fg">{t(`faq.items.${index}.q`)}</span>
        <ChevronDown
          size={22}
          className={`shrink-0 text-fg-secondary transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="max-w-[680px] pb-6 text-body-md leading-relaxed text-fg-secondary">{t(`faq.items.${index}.a`)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HomeFaq() {
  const { t } = useTranslation('home');
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="bg-surface py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-6 lg:px-10">
        {/* Header (centered) */}
        <motion.div
          className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="inline-flex items-center gap-2 text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-brand">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {t('faq.label')}
          </span>
          <h2 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-fg sm:text-[2.75rem]">
            {t('faq.title.pre')}<GoldWord>{t('faq.title.gold')}</GoldWord>{t('faq.title.post')}
          </h2>
        </motion.div>

        {/* List */}
        <motion.div
          className="mx-auto mt-12 max-w-[760px] border-t border-stroke-subtle"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          {Array.from({ length: FAQ_COUNT }, (_, i) => (
            <FaqRow key={i} index={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
