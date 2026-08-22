import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from '../ui/Typography';
import { SelectMenu, type SelectMenuOption } from '../ui/SelectMenu';
import { COUNTRY_OPTIONS, isCountryCode } from './types';
import type { CountryCode } from './types';

interface CountrySelectorProps {
  value: CountryCode;
  onChange: (next: CountryCode) => void;
  /** Compact variant for the sticky area switcher. */
  size?: 'md' | 'sm';
}

// ─── Market picker ───────────────────────────────────────────────────────────
// This is a value picker, so it is a SelectMenu — the Compass listbox, which
// already carries the whole keyboard contract (arrows with wrap, Home/End,
// Enter, Escape, Tab, aria-activedescendant) and an icon slot the flag drops
// straight into.
//
// It briefly reimplemented all of that by hand here. The rewrite was prompted
// by a real defect — the original announced role="listbox" and aria-haspopup
// while offering no keyboard navigation at all — but implementing the contract
// locally was the wrong fix for it: SelectMenu had shipped that contract long
// before, and a second copy is a second thing to keep correct.
//
// What stays local is layout, not behaviour: the caption above and the hint
// below belong to this control's placement on the page, not to the widget.
export function CountrySelector({ value, onChange, size = 'md' }: CountrySelectorProps) {
  const { t } = useTranslation('common');
  const compact = size === 'sm';

  const options: SelectMenuOption[] = useMemo(
    () =>
      COUNTRY_OPTIONS.map((o) => ({
        value: o.code,
        label: t(o.labelKey, o.fallback),
        // The flag is decoration on top of the label it accompanies — announcing
        // it would have a screen reader read the country twice.
        icon: (
          <span className="text-lg leading-none" aria-hidden>
            {o.flag}
          </span>
        ),
      })),
    [t],
  );

  const select = (
    <SelectMenu
      options={options}
      value={value}
      onChange={(next) => {
        if (isCountryCode(next)) onChange(next);
      }}
      inputSize={compact ? 'sm' : 'md'}
      id={compact ? 'country-select-compact' : 'country-select'}
    />
  );

  if (compact) {
    return (
      <div className="w-[190px]">
        <span className="sr-only" id="country-select-compact-label">
          {t('compliance.country.label', 'Your primary market')}
        </span>
        {select}
      </div>
    );
  }

  return (
    <div className="flex w-[240px] flex-col items-stretch">
      <label
        htmlFor="country-select"
        className="mb-2 font-sans text-caption font-semibold uppercase tracking-wider text-fg-tertiary"
      >
        {t('compliance.country.label', 'Your primary market')}
      </label>

      {select}

      <Typography variant="caption" className="mt-2 leading-snug text-fg-tertiary">
        {t('compliance.country.hint', 'Switches statutes, penalties and deadlines to that market.')}
      </Typography>
    </div>
  );
}
