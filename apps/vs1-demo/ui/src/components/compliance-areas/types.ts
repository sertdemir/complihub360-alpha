import type { ElementType } from 'react';

export type AreaKey = 'tax' | 'epr' | 'privacy' | 'marketing' | 'corporate';

export type CountryCode = 'EU' | 'DE' | 'FR' | 'IT' | 'ES' | 'UK' | 'US' | 'CH' | 'ALL';

export interface AreaConfig {
  id: AreaKey;
  icon: ElementType;
  risk: string;
  riskColor: string;
  cardBorder: string;
  iconBg: string;
  iconColor: string;
  wizardPath: string;
  markets: { code: CountryCode; label: string }[];
  specialistsCount: number;
  riskBarPct: number;
  riskBarColor: string;
  riskBarBadge: string;
  personaFitKey: string;
}

export interface CountryOption {
  code: CountryCode;
  flag: string;
  label: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'EU', flag: '🇪🇺', label: 'EU (default)' },
  { code: 'DE', flag: '🇩🇪', label: 'Germany' },
  { code: 'FR', flag: '🇫🇷', label: 'France' },
  { code: 'IT', flag: '🇮🇹', label: 'Italy' },
  { code: 'ES', flag: '🇪🇸', label: 'Spain' },
  { code: 'UK', flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'CH', flag: '🇨🇭', label: 'Switzerland' },
  { code: 'US', flag: '🇺🇸', label: 'United States' },
  { code: 'ALL', flag: '🌍', label: 'All Markets' },
];
