import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DOMAINS } from './domains';

// ─── Kontextzeile einer Anfrage ──────────────────────────────────────────────
// Canvas-Wahl 1 V3 (2026-10-01): Nutzer- und Partnerseite beschreiben eine
// Anfrage in derselben Reihenfolge — Bereich · Markt · Eingang · ID. Bereich
// und Markt kommen uebersetzt (nie als Slug), die Zeit relativ und lokalisiert.
// Vorher baute jede Seite ihre eigene Zeile, die Partnerseite mit Slugs und
// englischer Zeit ("DE · product-packaging", "12 min ago").

export const SLUG_TO_I18N: Record<string, string> = Object.fromEntries(DOMAINS.map((d) => [d.slug, d.i18nKey]));

/** "vor 2 Std." / "hace 2 h" — lokalisiert ohne eigene Schluessel. */
export function relZeit(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  const diffMs = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diffMs / 60_000);
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}

export interface RequestContextParts {
  category?: string;
  country?: string;
  createdAt?: string;
  /** Kurz-ID ("RQ-7C41") — steht am Ende, fuer den Support. */
  ref?: string;
}

export interface AnbieterBeschreibung {
  areaCodes?: string[] | null;
  region?: string | null;
  /** Die fertige Zeile des Servers (englische Bereichsnamen). */
  fallback?: string | null;
}

/** Bereichs- und Marktnamen in der aktuellen Sprache, plus die fertige
 *  Kontextzeile. Die Bereichsnamen liegen im Namespace `userws` (domain.*);
 *  der Hook laedt ihn selbst, auch auf Partnerseiten. */
export function useRequestContext() {
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const regionName = useMemo(() => {
    try { return new Intl.DisplayNames([locale], { type: 'region' }); } catch { return null; }
  }, [locale]);

  const bereich = (slug?: string) => (slug && SLUG_TO_I18N[slug] ? t(`domain.${SLUG_TO_I18N[slug]}`) : slug ?? '');
  const markt = (code?: string) => {
    if (!code) return '';
    try { return regionName?.of(code.toUpperCase()) ?? code; } catch { return code; }
  };
  const kontext = ({ category, country, createdAt, ref }: RequestContextParts) =>
    [bereich(category), markt(country), relZeit(createdAt, locale), ref].filter(Boolean).join(' · ');

  /** Anbieter-Beschreibung (3 V3): Bereiche uebersetzt aus den Codes, dahinter
   *  die Region. Ohne Codes (aelterer Server) bleibt die fertige Zeile stehen.
   *  `max` begrenzt die Bereiche wie der Server ("+1"); 0 = alle. */
  const beschreibung = (p: AnbieterBeschreibung, max = 2) => {
    const codes = p.areaCodes ?? [];
    if (!codes.length) return p.fallback ?? '';
    const namen = codes.map((c) => bereich(c)).filter(Boolean).sort((a, b) => a.localeCompare(b, locale));
    const gezeigt = max > 0 ? namen.slice(0, max) : namen;
    const rest = namen.length - gezeigt.length;
    const teil = gezeigt.join(', ') + (rest > 0 ? ` +${rest}` : '');
    return [teil, (p.region ?? '').trim()].filter(Boolean).join(' · ');
  };

  return { locale, bereich, markt, kontext, beschreibung };
}
