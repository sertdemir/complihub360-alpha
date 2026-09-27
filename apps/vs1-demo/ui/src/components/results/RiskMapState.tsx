import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { isKnownCountry } from '@complihub/compliance-engine';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { Accordion, AccordionItem } from '../ui/Accordion';

// ─── Risk Map · leere Zustaende (Canvas-Wahl A3 · B3 · C3) ───────────────────
// Figma: Screens-Datei, Seite Landingpages, Section 3390:14594 — Loading
// 3392:1958, Failed 3392:2068 / 3392:2221 (Details offen) / 3392:2348 (ohne
// Profil), No requirements 3392:2425 / 3392:2522 (ohne Profil). Abgenommen
// 27.09.2026.
//
// Der Zustand selbst IST die Seite: Eyebrow, Ueberschrift, Satz, dann was der
// Zustand braucht. Bis hierhin stand an dieser Stelle ein Banner unter einer
// unsichtbaren Ueberschrift.

/** Eyebrow, h1, Satz — der Kopf aller drei Zustaende. `role="status"` liest
 *  den Wechsel von "Creating" auf "couldn't create" vor, ohne den Fokus zu
 *  ziehen (Figma: State, aria-live=polite). */
export function RiskMapStateHero({
  heading,
  message,
  children,
}: {
  heading: string;
  message: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation('results');
  // 1040 statt der 877 aus Figma: IBM Plex Serif setzt die Ueberschrift
  // breiter als Figma — EN 880, DE 1030, ES 1012 px (Staging, 27.09.).
  return (
    <div role="status" className="flex max-w-[1040px] flex-col items-center gap-4 text-center">
      {/* Versalien per CSS: Compass hat keinen Versalien-Stil (Uebergabe-Notiz). */}
      <span className="text-body-2xs font-semibold uppercase tracking-[0.16em] text-fg-brand">
        {t('header.eyebrow')}
      </span>
      <h1 className="text-balance font-serif text-[2.25rem] font-bold leading-[1.1] tracking-[-0.02em] text-fg sm:text-[3rem]">
        {heading}
      </h1>
      <p className="max-w-[720px] text-[1.125rem] leading-[1.6] text-fg-secondary">{message}</p>
      {children}
    </div>
  );
}

/** Fortschritt ohne Prozentzahl — die Engine meldet keinen. Bei
 *  prefers-reduced-motion steht der Balken still. */
export function IndeterminateProgress() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="relative h-[3px] w-[240px] overflow-hidden rounded-full bg-brand-light">
      <motion.div
        className="absolute top-0 h-[3px] w-[96px] rounded-full bg-brand"
        initial={{ left: reduce ? 48 : -96 }}
        animate={reduce ? { left: 48 } : { left: [-96, 240] }}
        transition={reduce ? { duration: 0 } : { duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
      />
    </div>
  );
}

/** Die Pflichten-Tabelle, bevor es sie gibt (A3). Dieselben Spalten wie die
 *  echte Tabelle, damit beim Umschalten nichts springt. Rein dekorativ. */
export function RiskMapTableSkeleton({ rows = 4 }: { rows?: number }) {
  const { t } = useTranslation('results');
  const bar = 'rounded-md bg-surface-tertiary animate-pulse motion-reduce:animate-none';
  return (
    <div aria-hidden className="w-full max-w-[1120px] overflow-hidden rounded-xl border border-stroke-subtle opacity-55">
      <div className="grid grid-cols-[100px_1fr_120px_110px_160px] gap-4 border-b border-stroke-subtle bg-surface-secondary px-6 py-3.5 text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary">
        <span>{t('table.severity')}</span>
        <span>{t('table.obligation')}</span>
        <span>{t('table.market')}</span>
        <span>{t('table.due')}</span>
        <span className="text-right">{t('table.state')}</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[100px_1fr_120px_110px_160px] items-center gap-4 border-b border-stroke-subtle px-6 py-5 last:border-b-0"
        >
          <span className={`${bar} h-[22px] w-[62px] rounded-full`} />
          <span className="flex min-w-0 flex-col gap-2">
            <span className={`${bar} h-[14px] w-full max-w-[420px]`} />
            <span className={`${bar} h-[10px] w-full max-w-[240px]`} />
          </span>
          <span className={`${bar} h-[12px] w-[36px]`} />
          <span className="flex flex-col gap-2">
            <span className={`${bar} h-[12px] w-[72px]`} />
            <span className={`${bar} h-[10px] w-[44px]`} />
          </span>
          <span className="flex justify-end">
            <span className={`${bar} h-[30px] w-[96px] rounded-full`} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Welche Maerkte und Bereiche die Engine fuer dieses Profil ansetzt.
 *
 *  Spiegelt die Suche genau: Heimatmarkt (ohne Angabe DE, wie `runSearch`)
 *  plus Zielmaerkte, Bereiche wie gewaehlt. `checked` laesst Maerkte weg, fuer
 *  die die Engine kein Laenderprofil hat — die verwirft sie still, und "What we
 *  checked" darf nichts nennen, was nicht geprueft wurde. "What we tried to
 *  assess" nennt dagegen die Anfrage, wie sie gestellt war. */
export function scopeOf(
  profile: { country?: string; markets?: string[]; categories?: string[] },
  mode: 'requested' | 'checked',
): { markets: string[]; areas: string[] } {
  const requested = [...new Set([profile.country || 'DE', ...(profile.markets ?? [])].filter(Boolean))];
  return {
    markets: mode === 'checked' ? requested.filter((c) => isKnownCountry(c)) : requested,
    areas: [...new Set((profile.categories ?? []).filter(Boolean))],
  };
}

/** Die Umfangs-Box (Figma: Risk Map / Scope Panel). Nur mit Profil — ohne
 *  Wizard-Profil gibt es nichts, was wir benennen koennten. */
export function RiskMapScopePanel({
  label,
  markets,
  areas,
}: {
  label: string;
  markets: string[];
  areas: string[];
}) {
  const { t, i18n } = useTranslation(['common', 'results']);
  const locale = i18n.resolvedLanguage || 'en';
  const region = (() => {
    try { return new Intl.DisplayNames([locale], { type: 'region' }); } catch { return null; }
  })();
  const marketName = (code: string) => {
    try { return region?.of(code) ?? code; } catch { return code; }
  };
  const areaName = (slug: string) => {
    const d = DOMAIN_BY_SLUG[slug];
    return d ? t(`results:domains.${d.i18nKey}`, { defaultValue: d.label }) : slug;
  };
  const Row = ({ title, items }: { title: string; items: string[] }) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="w-24 shrink-0 text-body-sm font-semibold text-fg-secondary">{title}</span>
      <ul className="flex flex-wrap gap-2">
        {items.map((it) => (
          <li
            key={it}
            className="inline-flex h-7 items-center rounded-md border border-stroke bg-surface-secondary px-2.5 text-[12px] font-semibold leading-none text-fg-secondary"
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
  if (!markets.length && !areas.length) return null;
  return (
    <section
      aria-label={label}
      className="flex w-full max-w-[720px] flex-col gap-3 rounded-2xl border border-stroke-subtle bg-surface-secondary px-7 py-6"
    >
      <span className="text-body-2xs font-semibold uppercase tracking-[0.16em] text-fg-tertiary">{label}</span>
      {markets.length > 0 && <Row title={t('common:states.scope.markets')} items={markets.map(marketName)} />}
      {areas.length > 0 && <Row title={t('common:states.scope.areas')} items={areas.map(areaName)} />}
    </section>
  );
}

/** Referenz-ID und Zeitpunkt aus `referenceOf` — standardmaessig zu. Ohne
 *  Referenz nichts: eine erfundene ID waere schlechter als keine. */
export function TechnicalDetails({ reference }: { reference: { id: string; at: string } | null }) {
  const { t } = useTranslation(['common']);
  if (!reference) return null;
  const at = new Date(reference.at);
  const when = Number.isNaN(at.getTime())
    ? reference.at
    : `${at.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
  return (
    <Accordion styleVariant="ghost" size="sm" className="w-full max-w-[480px]">
      <AccordionItem value="technical" title={t('common:states.technicalDetails')}>
        {/* Monospace per Klasse: Compass hat kein Mono-Token (Uebergabe-Notiz). */}
        <span className="select-all break-all font-mono text-[12px]">{reference.id}</span>
        <span> · </span>
        <time dateTime={reference.at}>{when}</time>
      </AccordionItem>
    </Accordion>
  );
}
