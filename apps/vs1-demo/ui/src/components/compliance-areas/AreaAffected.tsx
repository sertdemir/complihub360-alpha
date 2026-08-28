import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Store,
  Factory,
  Repeat,
  Package,
  ShoppingCart,
  Laptop,
  Globe,
  Rocket,
  Cloud,
  Database,
  MousePointerClick,
  Users,
  HeartPulse,
  TrendingUp,
  Building2,
  Ship,
  Tag,
  Truck,
  Handshake,
  type LucideIcon,
} from 'lucide-react';
import { SectionEyebrow, Reveal, Stagger, StaggerItem } from '../providers/SectionHeading';
import { useInViewOnce } from '../../lib/useInViewOnce';
import type { DomainSlug } from '../../lib/domains';

interface Props {
  slug: DomainSlug;
  eyebrow: string;
}

// ─── Who is affected (canvas "Wer ist betroffen" · D "Rollen + Selbst-Check",
// 2026-08-28) ─────────────────────────────────────────────────────────────────
// The two prose paragraphs become a narrative pair: WHO is affected — the
// affected sentence decomposed into role cards (icon over serif name, the
// one-liner anchored to the card's foot so all feet share a baseline) — and
// ARE YOU — the Gradient panel with a self-check card whose three statements
// tick themselves one after another. The grey business-model chips are gone:
// a chip without a verb makes no claim, and their information lives on as the
// check statement about direct sale and marketplaces.
//
// Copy: compliance.<slug>.affectedRoles / affectedChecks (authored per area,
// four locales, derived from the affected sentences) + the generic
// compliance.area.checkTitle/checkFoot. Icons are presentation, so they live
// here, aligned by index with the locale arrays.

const ROLE_ICONS: Record<string, LucideIcon[]> = {
  'tax-vat': [ShoppingCart, Store, Laptop, Globe],
  'product-packaging': [Store, Factory, Repeat, Package],
  'data-privacy': [Rocket, Cloud, Database, MousePointerClick],
  'marketing-seo': [Users, Store, HeartPulse, TrendingUp],
  'corporate-structure': [Rocket, Users, Building2, Laptop],
  'product-compliance': [Factory, Ship, Tag, Store],
  'logistics-customs': [Truck, Ship, Globe],
  'legal-advisory': [Store, Handshake, Globe],
};

interface Role {
  name: string;
  line: string;
}

export function AreaAffected({ slug, eyebrow }: Props) {
  const { t } = useTranslation('common');
  const reduced = useReducedMotion();
  const [panelRef, panelInView] = useInViewOnce<HTMLDivElement>('-100px');

  const rolesRaw = t(`compliance.${slug}.affectedRoles`, { returnObjects: true, defaultValue: [] });
  const roles: Role[] = Array.isArray(rolesRaw) ? (rolesRaw as Role[]) : [];
  const checksRaw = t(`compliance.${slug}.affectedChecks`, { returnObjects: true, defaultValue: [] });
  const checks: string[] = Array.isArray(checksRaw) ? (checksRaw as string[]) : [];

  const icons = ROLE_ICONS[slug] ?? [];
  const description = t(`compliance.${slug}.description`, '');
  const affected = t(`compliance.${slug}.affected`, '');

  return (
    <div>
      {/* Centered header: eyebrow, serif title, the context paragraph beneath. */}
      <Reveal className="mx-auto flex max-w-[720px] flex-col items-center text-center">
        <SectionEyebrow tone="brand">{eyebrow}</SectionEyebrow>
        <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
          {t('compliance.whoAffected', 'Who is affected')}
        </h2>
        {description && (
          <p className="mt-3.5 text-body-sm leading-relaxed text-fg-secondary">{description}</p>
        )}
      </Reveal>

      {roles.length > 0 ? (
        <div className="mt-12 flex flex-col gap-8 desktop-s:mt-14 desktop-s:flex-row desktop-s:items-stretch desktop-s:gap-10">
          {/* WHO: the role cards, feet on one shared baseline. */}
          <Stagger stagger={0.09} className="grid flex-[1.15] content-stretch gap-3.5 tablet:grid-cols-2">
            {roles.map((r, i) => {
              const Icon = icons[i] ?? Users;
              return (
                <StaggerItem
                  key={r.name}
                  className="flex flex-col items-center rounded-xl border border-stroke-subtle bg-surface p-6 text-center shadow-[0_18px_44px_-30px_rgba(2,22,17,0.22)] dark:bg-surface-secondary"
                >
                  <Icon size={32} strokeWidth={1.6} className="shrink-0 text-fg-brand" aria-hidden />
                  <span className="mt-3 font-serif text-[1.0625rem] font-bold leading-snug text-fg">{r.name}</span>
                  <span className="mt-auto pt-3 text-body-2xs leading-relaxed text-fg-secondary">… {r.line}.</span>
                </StaggerItem>
              );
            })}
          </Stagger>

          {/* ARE YOU: the self-check card on the Gradient panel. The rows tick
              one after another once the panel is in view, a beat after the
              role cascade; reduced motion shows the finished list. */}
          <div ref={panelRef} className="flex flex-1 items-center rounded-xl bg-gradient-stage p-5 sm:p-9">
            <div className="w-full rounded-xl bg-surface p-6 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary sm:p-7">
              <span className="block border-b border-stroke-subtle pb-3 font-serif text-[1.0625rem] font-bold text-fg">
                {t('compliance.area.checkTitle', 'Does this apply to you?')}
              </span>
              <div>
                {checks.map((c, i) => {
                  // Two beats per row: the TEXT lands first, then the bare
                  // brand check draws itself LEFT TO RIGHT — the path starts
                  // at the short stroke and finishes on the long one, the way
                  // a hand ticks a box (user ask 2026-08-28; the filled
                  // circle background left with the same note).
                  const base = 0.4 + i * 0.55;
                  const run = panelInView || reduced;
                  return (
                    <motion.div
                      key={c}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={run ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.3, delay: base }}
                      className={`flex items-center gap-3.5 py-3 ${i < checks.length - 1 ? 'border-b border-stroke-subtle' : ''}`}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-fg-brand"
                          aria-hidden
                        >
                          <motion.path
                            d="M4 12l5 5L20 6"
                            initial={reduced ? false : { pathLength: 0 }}
                            animate={run ? { pathLength: 1 } : {}}
                            transition={{ duration: 0.35, delay: base + 0.35, ease: 'easeOut' }}
                          />
                        </svg>
                      </span>
                      <span className="text-body-sm font-semibold text-fg">{c}</span>
                    </motion.div>
                  );
                })}
              </div>
              <p className="border-t border-stroke-subtle pt-3 text-body-2xs leading-relaxed text-fg-tertiary">
                {t(
                  'compliance.area.checkFoot',
                  'If one applies, this area carries duties for you — the assessment narrows them to your case.',
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Fallback while an area has no decomposed roles yet: the affected
        // sentence as a centered lead, nothing invented.
        affected && (
          <p className="mx-auto mt-8 max-w-[720px] text-center text-body-lg leading-relaxed text-fg">
            {affected}
          </p>
        )
      )}
    </div>
  );
}
