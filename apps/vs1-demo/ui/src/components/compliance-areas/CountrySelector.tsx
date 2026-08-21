import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2, ChevronDown, Check } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { COUNTRY_OPTIONS } from './types';
import type { CountryCode } from './types';

interface CountrySelectorProps {
  value: CountryCode;
  onChange: (next: CountryCode) => void;
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = COUNTRY_OPTIONS.find(c => c.code === value) ?? COUNTRY_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex flex-col items-stretch">
      <Typography
        variant="caption"
        className="text-fg-tertiary font-semibold uppercase tracking-wider mb-2"
      >
        {t('compliance.country.label', 'Your primary market')}
      </Typography>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 bg-surface border-2 border-stroke-subtle hover:border-primary-400 transition-colors rounded-xl px-4 py-3 shadow-sm hover:shadow-md min-w-[220px]"
      >
        <Globe2 size={18} className="text-fg-brand shrink-0" />
        <span className="text-2xl leading-none" aria-hidden>{current.flag}</span>
        <span className="text-ui-small font-bold text-fg flex-1 text-left">
          {current.label}
        </span>
        <ChevronDown
          size={16}
          className={`text-fg-tertiary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('compliance.country.label', 'Your primary market')}
          className="absolute top-full mt-2 left-0 right-0 z-50 bg-surface border border-stroke rounded-xl shadow-xl py-1 max-h-80 overflow-y-auto"
        >
          {COUNTRY_OPTIONS.map(opt => {
            const selected = opt.code === value;
            return (
              <li key={opt.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-ui-small hover:bg-brand-light transition-colors ${selected ? 'bg-brand-light/60' : ''}`}
                >
                  <span className="text-xl leading-none" aria-hidden>{opt.flag}</span>
                  <span className={`flex-1 ${selected ? 'font-bold text-fg-brand' : 'text-fg-secondary'}`}>
                    {opt.label}
                  </span>
                  {selected && <Check size={14} className="text-fg-brand" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Typography variant="caption" className="text-fg-tertiary mt-2 leading-snug">
        {t('compliance.country.hint', 'Filters active markets and personalises risk priorities.')}
      </Typography>
    </div>
  );
}
