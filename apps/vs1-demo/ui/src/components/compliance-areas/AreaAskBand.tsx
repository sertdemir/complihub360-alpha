import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { useInViewOnce } from '../../lib/useInViewOnce';
import type { DomainSlug } from '../../lib/domains';

interface Props {
  slug: DomainSlug;
  /** The area's translated title, for the band's question. */
  title: string;
}

// ─── The ask band (canvas "Frage-Band" · Variante D, 2026-08-28) ─────────────
// The page's only gold and its only input. Two columns between gold hairlines:
// the big drawn speech bubble left, and right — left-aligned — the invitation
// with a REAL search field and the button on one row. The field is the honest
// version of what the old band only promised: it navigates to /search with the
// question as ?q=, which is the one parameter that page actually reads.
//
// The field is single-line while it holds only the placeholder and grows
// DOWNWARDS as a question is typed (user ask 2026-08-28); the magnifier is
// anchored to the top so it stays put while the field grows.
//
// The bubble plays in two beats (user ask): first it inflates like a balloon
// from its bottom-left tail towards the right — a back-out ease for the
// balloon's overshoot — and only then the question mark draws itself inside,
// stroke first, dot last. Reduced motion shows the finished drawing.
export function AreaAskBand({ slug, title }: Props) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-100px');
  const [value, setValue] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const localePrefix = locale ? `/${locale}` : '';
  const run = inView || reduced;

  const submit = () => {
    const q = value.trim();
    navigate(`${localePrefix}/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  // rows={1} plus scrollHeight: the textarea is one line with the placeholder
  // and follows the typed question downwards, never sideways.
  const autosize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <div
      ref={ref}
      className="flex items-center gap-14 border-y border-accent-500/40 py-12 desktop-s:gap-[4.5rem] desktop-s:py-14"
    >
      {/* The bubble: 256px of gold line drawing, hidden where it would push
          the form off the screen. */}
      <motion.div
        aria-hidden
        initial={reduced ? false : { scale: 0 }}
        animate={run ? { scale: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        // The tail sits bottom-left — the balloon inflates from there towards
        // the right, not from its centre.
        style={{ transformOrigin: '12% 88%' }}
        className="hidden h-64 w-64 shrink-0 text-accent-500 desktop-s:block"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={0.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-full w-full"
        >
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          <motion.path
            d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
            initial={reduced ? false : { pathLength: 0 }}
            animate={run ? { pathLength: 1 } : {}}
            transition={{ duration: 0.45, delay: 0.75, ease: 'easeOut' }}
          />
          <motion.path
            d="M12 17h.01"
            initial={reduced ? false : { pathLength: 0, opacity: 0 }}
            animate={run ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.2, delay: 1.25 }}
          />
        </svg>
      </motion.div>

      <div className="min-w-0 flex-1">
        <span className="text-body-3xs font-bold uppercase tracking-[0.14em] text-accent-700 dark:text-fg-accent-strong">
          {t('compliance.area.askEyebrow', 'Your question')}
        </span>
        <h2 className="mt-3 font-serif text-[1.625rem] font-bold leading-tight text-fg">
          {t('compliance.area.askTitle', {
            defaultValue: 'A specific question about {{area}}?',
            area: title,
          })}
        </h2>
        <p className="mt-3.5 max-w-[620px] text-body-sm leading-relaxed text-fg-secondary">
          {t('compliance.area.askLead', {
            defaultValue:
              'Ask it in your own words and get an answer with its sources named. The assessment below is the longer way round — it maps the whole area to your business instead of answering one question.',
          })}
        </p>

        <form
          className="mt-7 flex flex-col gap-3.5 sm:flex-row sm:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="flex min-w-0 flex-1 items-start gap-3.5 rounded-xl border border-stroke bg-surface px-5 py-3.5 shadow-[0_12px_30px_-24px_rgba(2,22,17,0.25)] transition-colors focus-within:border-stroke-strong dark:bg-surface-secondary">
            <Search size={19} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-fg-tertiary" />
            <textarea
              ref={taRef}
              rows={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onInput={autosize}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              aria-label={t('compliance.area.askQuestion', 'Ask a question')}
              placeholder={t(`compliance.${slug}.askPlaceholder`, {
                defaultValue: t('compliance.area.askPlaceholder', 'Ask your question in your own words'),
              })}
              // nowrap while only the placeholder shows — the field is never
              // two lines until a question is actually typed; with content it
              // wraps and the autosize lets it grow downwards.
              className="max-h-40 w-full resize-none overflow-hidden whitespace-nowrap bg-transparent text-body-md leading-normal text-fg outline-none placeholder:text-fg-tertiary [&:not(:placeholder-shown)]:whitespace-normal"
            />
          </label>
          <Button type="submit" size="lg" className="shrink-0">
            {t('compliance.area.askQuestion', 'Ask a question')}
            <ArrowRight size={17} strokeWidth={2.2} aria-hidden className="ml-1.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
