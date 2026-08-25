import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { GoldWord } from '../providers/SectionHeading';
import { Tabs, TabList, Tab } from '../ui/Tabs';

// ─── S8 — FAQ (canvas "Was Sie sich fragen" · Tabs, 2026-08-25) ──────────────
// "What you're probably wondering." The single six-question list grew into
// twelve questions in three themed tabs (Compass Tabs, filled): Assessment &
// Risk Map · Partner & Mandate · Konto & Daten. The six new questions answer
// what the redesigned page itself raises — sources, export, multi-market, the
// 48h SLA, partner binding, account — so the FAQ speaks the sections'
// language. Single-open disclosure list per tab (Compass Accordion motion);
// switching tabs crossfades the list and reopens its first question.
//
// Copy lives in faq.groups.<g>.{label,items.<i>.{q,a}} ('home' ns).

const GROUP_COUNTS = [5, 5, 2] as const;

function FaqRow({ group, index, open, onToggle }: { group: number; index: number; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation('home');
  const base = `faq.groups.${group}.items.${index}`;
  return (
    <div className="border-b border-stroke-subtle">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-4 py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
      >
        <span className="flex-1 text-[18px] font-bold text-fg">{t(`${base}.q`)}</span>
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
            <p className="max-w-[680px] pb-6 text-body-md leading-relaxed text-fg-secondary">{t(`${base}.a`)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HomeFaq() {
  const { t } = useTranslation('home');
  const [tab, setTab] = useState('0');
  const [open, setOpen] = useState(0);
  const group = Number(tab);

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
            {t('faq.label')}
          </span>
          <h2 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-fg sm:text-[2.75rem]">
            {t('faq.title.pre')}<GoldWord>{t('faq.title.gold')}</GoldWord>{t('faq.title.post')}
          </h2>
        </motion.div>

        {/* Theme tabs + the active tab's disclosure list */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          <Tabs
            variant="filled"
            size="md"
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              setOpen(0);
            }}
            className="mt-10"
          >
            <TabList className="flex-wrap justify-center gap-2">
              {GROUP_COUNTS.map((count, g) => (
                <Tab key={g} value={String(g)} badge={count}>
                  {t(`faq.groups.${g}.label`)}
                </Tab>
              ))}
            </TabList>
          </Tabs>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={group}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mx-auto mt-9 max-w-[880px] border-t border-stroke-subtle"
            >
              {Array.from({ length: GROUP_COUNTS[group] }, (_, i) => (
                <FaqRow
                  key={i}
                  group={group}
                  index={i}
                  open={open === i}
                  onToggle={() => setOpen(open === i ? -1 : i)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
