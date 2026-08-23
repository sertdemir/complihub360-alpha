import {
  Receipt,
  Recycle,
  ShieldCheck,
  Megaphone,
  Building2,
  BadgeCheck,
  Truck,
  Scale,
} from 'lucide-react';
import type { ElementType } from 'react';
import { DOMAINS, type DomainSlug } from '../../lib/domains';

// ─── The eight compliance areas · presentation layer ─────────────────────────
// Membership and order come from lib/domains — the canonical eight, same list
// the workbench, the footer and provider coverage read. This file adds only
// what the engine cannot know: which icon carries the area, which wizard it
// opens, and how many verified specialists we claim for it.
//
// Everything else — severity, obligations, market weights — is derived in
// lib/areaProfiles from the compliance engine. Nothing risk-related is authored
// here. The riskBarPct field that used to sit in ComplianceAreasPage is gone
// for that reason: it was a hand-kept number that contradicted the engine, and
// with a country selected it contradicted the "Priority for X" badge next to it.

export interface AreaMeta {
  slug: DomainSlug;
  icon: ElementType;
  /** Wizard entry point. Mirrors the slug except where the wizard predates it. */
  wizardPath: string;
  /** TODO: replace with verified counts from the provider DB. */
}

const META: Record<DomainSlug, Omit<AreaMeta, 'slug'>> = {
  'tax-vat': { icon: Receipt, wizardPath: '/wizard/tax-vat' },
  'product-packaging': { icon: Recycle, wizardPath: '/wizard/epr' },
  'data-privacy': { icon: ShieldCheck, wizardPath: '/wizard/data-privacy' },
  'marketing-seo': { icon: Megaphone, wizardPath: '/wizard/marketing-seo' },
  'corporate-structure': { icon: Building2, wizardPath: '/wizard/corporate' },
  'product-compliance': { icon: BadgeCheck, wizardPath: '/wizard/product-compliance' },
  'logistics-customs': { icon: Truck, wizardPath: '/wizard/logistics-customs' },
  'legal-advisory': { icon: Scale, wizardPath: '/wizard/legal-advisory' },
};

/** The eight areas in canonical order. */
export const AREAS: AreaMeta[] = DOMAINS.map((d) => ({ slug: d.slug, ...META[d.slug] }));

export const AREA_BY_SLUG: Record<string, AreaMeta> = Object.fromEntries(
  AREAS.map((a) => [a.slug, a]),
);

// Until 2026-08-21 the page addressed five areas by short id and the copy keys
// followed: compliance.tax.*, compliance.epr.*. The slugs are canonical now, so
// the keys move with them — but the short ids are in shared links and in the
// hub's own anchors, so they keep resolving instead of 404-ing.
export const LEGACY_AREA_IDS: Record<string, DomainSlug> = {
  tax: 'tax-vat',
  epr: 'product-packaging',
  privacy: 'data-privacy',
  marketing: 'marketing-seo',
  corporate: 'corporate-structure',
};
