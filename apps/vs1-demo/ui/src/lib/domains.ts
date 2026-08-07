// ─── Canonical compliance domains (final 8, decided 2026-08-04) ──────────────
// Single source of truth for every domain list in the app: DomainBar, workbench
// routes, filters, drawers, provider coverage. "Full Support" was removed;
// Product Compliance, Logistics & Customs and Legal Advisory were added.
// Slugs are route segments (dashboard/workbench/:slug); i18nKey maps into the
// `userws` namespace (`domain.<key>`); label is the canonical English name used
// as React key / activeDomain matcher.

export type DomainSlug =
  | 'tax-vat'
  | 'product-packaging'
  | 'data-privacy'
  | 'marketing-seo'
  | 'corporate-structure'
  | 'product-compliance'
  | 'logistics-customs'
  | 'legal-advisory';

export interface DomainDef {
  slug: DomainSlug;
  label: string;
  i18nKey: string;
}

export const DOMAINS: DomainDef[] = [
  { slug: 'tax-vat', label: 'Tax & VAT', i18nKey: 'taxVat' },
  { slug: 'product-packaging', label: 'Product & Packaging', i18nKey: 'productPackaging' },
  { slug: 'data-privacy', label: 'Data & Privacy', i18nKey: 'dataPrivacy' },
  { slug: 'marketing-seo', label: 'Marketing & SEO', i18nKey: 'marketingSeo' },
  { slug: 'corporate-structure', label: 'Corporate & Structure', i18nKey: 'corporateStructure' },
  { slug: 'product-compliance', label: 'Product Compliance', i18nKey: 'productCompliance' },
  { slug: 'logistics-customs', label: 'Logistics & Customs', i18nKey: 'logisticsCustoms' },
  { slug: 'legal-advisory', label: 'Legal Advisory', i18nKey: 'legalAdvisory' },
];

/** Canonical label → i18n key (replaces the 5 duplicated DOMAIN_KEY maps). */
export const DOMAIN_I18N_KEY: Record<string, string> = Object.fromEntries(
  DOMAINS.map((d) => [d.label, d.i18nKey]),
);

/** Route slug → definition. */
export const DOMAIN_BY_SLUG: Record<string, DomainDef> = Object.fromEntries(
  DOMAINS.map((d) => [d.slug, d]),
);
