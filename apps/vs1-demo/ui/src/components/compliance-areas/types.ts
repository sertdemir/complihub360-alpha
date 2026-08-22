import type { ElementType } from 'react';
import type { CountryCode as EngineCountryCode } from '@complihub/compliance-engine';
import { MARKET_CODES } from '../../lib/marketProfiles';

// ─── Market selection · membership comes from the engine ─────────────────────
// Until 2026-08-21 this list was hand-written and disagreed with the engine in
// both directions: it offered CH, which the risk matrix has no row for, and
// omitted NL and TR, which it profiles in full. Picking Switzerland changed
// nothing on screen; the Netherlands could not be picked at all.
//
// So the options are derived now. 'EU' leads as the market-independent reading
// — the EU-level instrument behind a duty, before any national implementation —
// and the eight profiled markets follow. The old 'ALL' option is gone: it
// behaved exactly like 'EU' and gave the user two names for one state.

export type CountryCode = EngineCountryCode | 'EU';

/** Flags are presentation, not data — the engine has no business carrying them. */
const FLAGS: Record<CountryCode, string> = {
  EU: '🇪🇺', DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸',
  UK: '🇬🇧', US: '🇺🇸', NL: '🇳🇱', TR: '🇹🇷',
};

export interface CountryOption {
  code: CountryCode;
  flag: string;
  /** i18n key into markets.countries.*; 'EU' has no entry and falls back. */
  labelKey: string;
  fallback: string;
}

const FALLBACK: Record<string, string> = {
  DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain',
  UK: 'United Kingdom', US: 'United States', NL: 'Netherlands', TR: 'Türkiye',
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'EU', flag: FLAGS.EU, labelKey: 'compliance.country.euOption', fallback: 'EU-wide' },
  ...[...MARKET_CODES]
    .sort((a, b) => (FALLBACK[a] ?? a).localeCompare(FALLBACK[b] ?? b))
    .map((code) => ({
      code: code as CountryCode,
      flag: FLAGS[code as CountryCode],
      labelKey: `markets.countries.${code}`,
      fallback: FALLBACK[code] ?? code,
    })),
];

export function isCountryCode(code: string | null | undefined): code is CountryCode {
  return !!code && COUNTRY_OPTIONS.some((o) => o.code === code);
}

/** Legacy short ids kept for the hub's own anchors; see components/compliance-areas/areas.ts. */
export type AreaKey = string;

export interface AreaConfig {
  id: AreaKey;
  icon: ElementType;
  wizardPath: string;
  specialistsCount: number;
}
