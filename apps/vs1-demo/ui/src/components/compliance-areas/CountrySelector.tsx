import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2, ChevronDown, Check } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { COUNTRY_OPTIONS } from './types';
import type { CountryCode } from './types';

interface CountrySelectorProps {
  value: CountryCode;
  onChange: (next: CountryCode) => void;
  /** Compact variant for the sticky area switcher. */
  size?: 'md' | 'sm';
}

// The control announced itself as a listbox (role, aria-haspopup) but could not
// be driven as one: no arrow keys, no Escape, no focus return, no
// aria-activedescendant. That is worse than an unlabelled div — a screen reader
// promises an interaction the widget does not honour. The keyboard contract is
// implemented here rather than the roles removed, because a market picker that
// only works with a mouse is not shippable on a compliance product.
export function CountrySelector({ value, onChange, size = 'md' }: CountrySelectorProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const currentIndex = Math.max(0, COUNTRY_OPTIONS.findIndex(c => c.code === value));
  const current = COUNTRY_OPTIONS[currentIndex];
  const label = (o: (typeof COUNTRY_OPTIONS)[number]) => t(o.labelKey, o.fallback);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Opening lands on the current value, not on the first option.
  useEffect(() => {
    if (open) setActiveIndex(currentIndex);
  }, [open, currentIndex]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`#country-opt-${COUNTRY_OPTIONS[activeIndex].code}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const commit = (index: number) => {
    onChange(COUNTRY_OPTIONS[index].code);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = COUNTRY_OPTIONS.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { setOpen(true); return; }
        setActiveIndex(i => (i >= last ? 0 : i + 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) { setOpen(true); return; }
        setActiveIndex(i => (i <= 0 ? last : i - 1));
        return;
      case 'Home':
        if (!open) return;
        e.preventDefault();
        setActiveIndex(0);
        return;
      case 'End':
        if (!open) return;
        e.preventDefault();
        setActiveIndex(last);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) commit(activeIndex);
        else setOpen(true);
        return;
      case 'Escape':
        if (!open) return;
        e.preventDefault();
        close();
        return;
      case 'Tab':
        if (open) close(false);
        return;
      default:
        return;
    }
  };

  const compact = size === 'sm';

  return (
    <div ref={containerRef} className="relative inline-flex flex-col items-stretch">
      {!compact && (
        <Typography
          id="country-selector-label"
          variant="caption"
          className="text-fg-tertiary font-semibold uppercase tracking-wider mb-2"
        >
          {t('compliance.country.label', 'Your primary market')}
        </Typography>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-controls="country-listbox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={open ? `country-opt-${COUNTRY_OPTIONS[activeIndex].code}` : undefined}
        aria-label={compact ? t('compliance.country.label', 'Your primary market') : undefined}
        aria-labelledby={compact ? undefined : 'country-selector-label'}
        className={`inline-flex items-center gap-2.5 bg-surface border-2 border-stroke-subtle hover:border-primary-400 focus-visible:border-primary-400 transition-colors rounded-xl shadow-sm hover:shadow-md ${
          compact ? 'px-3 py-2 min-w-[170px]' : 'px-4 py-3 min-w-[220px]'
        }`}
      >
        <Globe2 size={compact ? 15 : 18} className="text-fg-brand shrink-0" />
        <span className={compact ? 'text-lg leading-none' : 'text-2xl leading-none'} aria-hidden>
          {current.flag}
        </span>
        <span className="text-ui-small font-bold text-fg flex-1 text-left">{label(current)}</span>
        <ChevronDown
          size={compact ? 14 : 16}
          className={`text-fg-tertiary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id="country-listbox"
          role="listbox"
          tabIndex={-1}
          aria-label={t('compliance.country.label', 'Your primary market')}
          className="absolute top-full mt-2 left-0 right-0 z-50 bg-surface border border-stroke rounded-xl shadow-xl py-1 max-h-80 overflow-y-auto"
        >
          {COUNTRY_OPTIONS.map((opt, i) => {
            const selected = opt.code === value;
            const active = i === activeIndex;
            return (
              <li key={opt.code}>
                <button
                  id={`country-opt-${opt.code}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={() => commit(i)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-ui-small transition-colors ${
                    active ? 'bg-brand-light' : selected ? 'bg-brand-light/60' : ''
                  }`}
                >
                  <span className="text-xl leading-none" aria-hidden>{opt.flag}</span>
                  <span className={`flex-1 ${selected ? 'font-bold text-fg-brand' : 'text-fg-secondary'}`}>
                    {label(opt)}
                  </span>
                  {selected && <Check size={14} className="text-fg-brand" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!compact && (
        <Typography variant="caption" className="text-fg-tertiary mt-2 leading-snug">
          {t('compliance.country.hint', 'Switches statutes, penalties and deadlines to that market.')}
        </Typography>
      )}
    </div>
  );
}
