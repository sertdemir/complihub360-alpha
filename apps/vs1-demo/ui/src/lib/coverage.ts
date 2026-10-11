import { areaReach } from './marketProfiles';
import { type DomainSlug } from './domains';
import { COVERAGE_COUNTS, marketListText, marketNameList } from './publicRoutes';

// ─── Coverage in words, derived (EN-Launch step 5) ───────────────────────────
// Checklist v1.0, Availability: "Coverage changes are reflected without editing
// static homepage copy" — and the DNA's "Understate. Don't overclaim." Copy
// that names how many markets or areas we assess, or which ones, takes them
// from here. A market the engine adds shows up in every sentence without
// anyone touching a locale file.
//
// Placeholders in the copy: {{markets}}, {{areas}}, {{marketList}}.
// Names come from common:markets.countries — the same names the market pages
// and the prerendered SEO head use (lib/publicRoutes.ts).

export { COVERAGE_COUNTS };

export function marketNames(nameOf: (code: string) => string): string[] {
  return marketNameList(nameOf);
}

export function coverageVars(locale: string, nameOf: (code: string) => string) {
  return { ...COVERAGE_COUNTS, marketList: marketListText(nameOf, locale) };
}

/** "DE · FR · … · EU-wide" — the homepage atlas line, from areaReach, never from copy. */
export function areaReachLine(slug: DomainSlug, euWideLabel: string): string {
  const r = areaReach(slug);
  return [...r.markets, ...(r.euWide ? [euWideLabel] : [])].join(' · ');
}
