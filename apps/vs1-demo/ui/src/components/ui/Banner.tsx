import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Banner / Alert ───────────────────────────────────────────────────────────
// Derived from the SCREENS (not the light-only Compass Alert): the provider
// dashboard sticky warning banner + inline alert card. Ships LIGHT and DARK
// (the app/dashboards are dark slate #0F172A/#1F2937; marketing is light) — dark
// uses a translucent status tint over the dark surface with white text, exactly
// like the "response time has slipped" banner (amber #f59e0b @ ~40%, white title,
// white@85% description). Toggle via the `dark` class on any ancestor.
//   status: info · success · warning · error · brand · accent
//   (at-risk = warning amber, never red; brand = petrol ranking/identity banners,
//    accent = gold upsell/expansion banners — mirrors Compass Alert Status=Brand/Accent)
//   variant: card (rounded) · strip (full-bleed, square — the sticky top banner)

export type BannerStatus = 'info' | 'success' | 'warning' | 'error' | 'brand' | 'accent';
export type BannerSurface = 'light' | 'medium' | 'strong' | 'solid';

// Per-status surface intensities.
//   light  = soft tint (the original look)
//   medium = stronger tint
//   strong = solid-ish fill with a darker border
//   solid  = filled status color, inverse (white) text
// Note: opacity on CSS-var colors is broken in this DS, so we use STATIC tailwind
// colors (emerald/amber/red/sky -500, dark -400) for everything below.
// `action` = Schriftfarbe der einzelnen Aktion rechts, wo `accent` als TEXT auf
// dem hellen Ton unter 4.5:1 liegt (nachgemessen 2026-11-28: info 3.84,
// success 3.58, warning 3.07, error 4.41, brand 3.43 / 3.65, accent-medium
// 4.46). `accent` selbst bleibt fuer das Icon: dort reichen 3:1.
type SurfaceStyle = { surface: string; accent: string; action?: string };

const SURFACES: Record<BannerStatus, Record<BannerSurface, SurfaceStyle>> = {
  info: {
    light: {
      surface: 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-500/15 dark:border-sky-500/40 dark:text-white',
      accent: 'text-sky-600 dark:text-sky-300',
      action: 'text-sky-700 dark:text-sky-300',
    },
    medium: {
      surface: 'bg-sky-100 border-sky-300 text-sky-900 dark:bg-sky-500/25 dark:border-sky-500/55 dark:text-white',
      accent: 'text-sky-700 dark:text-sky-200',
    },
    strong: {
      surface: 'bg-sky-200 border-sky-500 text-sky-950 dark:bg-sky-500/35 dark:border-sky-400 dark:text-white',
      accent: 'text-sky-800 dark:text-sky-100',
    },
    solid: {
      surface: 'bg-sky-600 border-sky-600 text-white dark:bg-sky-500 dark:border-sky-500 dark:text-white',
      accent: 'text-white',
    },
  },
  success: {
    light: {
      surface: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-white',
      accent: 'text-emerald-600 dark:text-emerald-300',
      action: 'text-emerald-700 dark:text-emerald-300',
    },
    medium: {
      surface: 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-500/25 dark:border-emerald-500/55 dark:text-white',
      accent: 'text-emerald-700 dark:text-emerald-200',
    },
    strong: {
      surface: 'bg-emerald-200 border-emerald-500 text-emerald-950 dark:bg-emerald-500/35 dark:border-emerald-400 dark:text-white',
      accent: 'text-emerald-800 dark:text-emerald-100',
    },
    solid: {
      surface: 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500 dark:text-white',
      accent: 'text-white',
    },
  },
  warning: {
    light: {
      surface: 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/45 dark:text-white',
      accent: 'text-amber-600 dark:text-amber-300',
      action: 'text-amber-700 dark:text-amber-300',
    },
    medium: {
      surface: 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-500/25 dark:border-amber-500/55 dark:text-white',
      accent: 'text-amber-700 dark:text-amber-200',
    },
    strong: {
      surface: 'bg-amber-200 border-amber-500 text-amber-950 dark:bg-amber-500/35 dark:border-amber-400 dark:text-white',
      accent: 'text-amber-800 dark:text-amber-100',
    },
    solid: {
      surface: 'bg-amber-500 border-amber-500 text-white dark:bg-amber-500 dark:border-amber-500 dark:text-white',
      accent: 'text-white',
    },
  },
  error: {
    light: {
      surface: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-500/15 dark:border-red-500/40 dark:text-white',
      accent: 'text-red-600 dark:text-red-300',
      action: 'text-red-700 dark:text-red-300',
    },
    medium: {
      surface: 'bg-red-100 border-red-300 text-red-900 dark:bg-red-500/25 dark:border-red-500/55 dark:text-white',
      accent: 'text-red-700 dark:text-red-200',
    },
    strong: {
      surface: 'bg-red-200 border-red-500 text-red-950 dark:bg-red-500/35 dark:border-red-400 dark:text-white',
      accent: 'text-red-800 dark:text-red-100',
    },
    solid: {
      surface: 'bg-red-600 border-red-600 text-white dark:bg-red-500 dark:border-red-500 dark:text-white',
      accent: 'text-white',
    },
  },
  // Petrol/teal — ranking + identity banners ("Current search rank"). Matches the
  // Compass tokens bg/brand-translucent + border/brand-soft (screen specs 2694:16).
  brand: {
    light: {
      surface: 'bg-[#004d40]/10 border-[#258d78]/35 text-[#0b3d34] dark:bg-[#004d40]/25 dark:border-[#258d78]/40 dark:text-white',
      accent: 'text-[#258d78] dark:text-[#2cc0ad]',
      action: 'text-[#004d40] dark:text-[#2cc0ad]',
    },
    medium: {
      surface: 'bg-[#004d40]/20 border-[#258d78]/55 text-[#0b3d34] dark:bg-[#004d40]/40 dark:border-[#258d78]/55 dark:text-white',
      accent: 'text-[#1d7a67] dark:text-[#2cc0ad]',
      action: 'text-[#004d40] dark:text-[#2cc0ad]',
    },
    strong: {
      surface: 'bg-[#004d40]/30 border-[#258d78] text-[#07281f] dark:bg-[#004d40]/60 dark:border-[#258d78] dark:text-white',
      accent: 'text-[#14574a] dark:text-[#7fd4c5]',
    },
    solid: {
      surface: 'bg-[#004d40] border-[#004d40] text-white dark:bg-[#14a89a] dark:border-[#14a89a] dark:text-white',
      accent: 'text-white',
    },
  },
  // Gold — upsell/expansion banners ("Explore expansion"). Matches the Compass
  // tokens bg/accent-translucent + border/accent-soft (screen specs 2694:81).
  // Der accent-Slot (Icon + Titel) laeuft seit 2026-09-19 auf der Messing-Linie
  // der Wortmarke (Farbton 37 Grad, wie #C5913B) statt auf den Oliv-Stufen der
  // Skala: #8c672a misst 4.80:1 auf gold/10 und 4.46:1 auf gold/20, #6b4e1f
  // 6.3:1 auf gold/35 — durchweg mehr Kontrast als die abgeloesten #96802a
  // (3.62 / 3.37) und derselbe Ton wie das Gold im Logo.
  accent: {
    light: {
      surface: 'bg-[#d4af37]/10 border-[#d4af37]/35 text-[#6a5b1e] dark:bg-[#d4af37]/[0.12] dark:border-[#d4af37]/35 dark:text-white',
      accent: 'text-[#8c672a] dark:text-[#d4af37]',
    },
    medium: {
      surface: 'bg-[#d4af37]/20 border-[#d4af37]/55 text-[#6a5b1e] dark:bg-[#d4af37]/25 dark:border-[#d4af37]/55 dark:text-white',
      accent: 'text-[#8c672a] dark:text-[#e6c964]',
      action: 'text-[#6b4e1f] dark:text-[#e6c964]',
    },
    strong: {
      surface: 'bg-[#d4af37]/35 border-[#d4af37] text-[#3d3411] dark:bg-[#d4af37]/40 dark:border-[#d4af37] dark:text-white',
      accent: 'text-[#6b4e1f] dark:text-[#f0d67d]',
    },
    solid: {
      surface: 'bg-[#d4af37] border-[#d4af37] text-[#101411] dark:bg-[#d4af37] dark:border-[#d4af37] dark:text-[#101411]',
      accent: 'text-[#101411]',
    },
  },
};

const ICONS: Record<BannerStatus, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  brand: Info,
  accent: Sparkles,
};

export interface BannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  status?: BannerStatus;
  title: React.ReactNode;
  /** Description content under the title. */
  children?: React.ReactNode;
  /** Override the leading icon, or pass false to hide it. */
  icon?: React.ReactNode | false;
  /** Trailing action (e.g. a link or button). */
  action?: React.ReactNode;
  /**
   * Aktionen UNTER dem Text, in einer Reihe mit Umbruch (Compass "Alert Strip",
   * Canvas-Wahl 3A vom 2026-11-28). Fuer zwei oder mehr Links: deutsche
   * Linktexte sind lang, unter dem Text brechen sie sauber um, rechts daneben
   * (`action`) nicht. Links mit `BannerLink` bauen.
   */
  actions?: React.ReactNode;
  /** Show a dismiss ✕ that calls this. */
  onClose?: () => void;
  /** Name des Schliessen-Knopfs fuer Screenreader. Standard: common:a11y.dismissNotice in der Sprache der Seite. */
  closeLabel?: string;
  /**
   * Nur strip: Klassen fuer den inneren Container, damit der Inhalt des
   * Streifens mit dem Raster der Seite fluchtet (max-w-…, mx-auto, px-…).
   */
  innerClassName?: string;
  /** card = rounded (inline alert) · strip = square full-bleed (sticky top banner). */
  variant?: 'card' | 'strip';
  /** Tint intensity: light (soft) · medium · strong · solid (filled, inverse text). */
  surface?: BannerSurface;
}

export function Banner({
  status = 'info',
  title,
  children,
  icon,
  action,
  actions,
  onClose,
  closeLabel: closeLabelProp,
  variant = 'card',
  surface = 'light',
  className,
  innerClassName,
  ...rest
}: BannerProps) {
  const s = SURFACES[status][surface];
  const Icon = ICONS[status];
  const strip = variant === 'strip';
  // Der Knopf hiess bis 2026-11-28 fest "Dismiss", in jeder Sprache.
  const { t } = useTranslation('common');
  const closeLabel = closeLabelProp ?? t('a11y.dismissNotice', { defaultValue: 'Dismiss' });
  const body = (
    <>
      {icon !== false && (
        <span className={cn('mt-0.5 shrink-0', s.accent)}>{icon ?? <Icon size={20} strokeWidth={2} />}</span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-body-sm font-semibold leading-snug">{title}</p>
          {children && <div className="mt-0.5 text-body-sm leading-relaxed opacity-85">{children}</div>}
          {actions && (
            // Die Links erben die Textfarbe des Banners, nicht `s.accent`: die
            // Akzentfarbe ist fuer Icons gemacht und liegt als Schrift auf den
            // hellen Toenen unter 4.5:1 (Brand hell: 3.4:1).
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm font-semibold">
              {actions}
            </div>
          )}
        </div>
        {action && (
          <div data-banner-action className={cn('shrink-0 text-body-sm font-semibold underline-offset-2', s.action ?? s.accent)}>{action}</div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className={cn(
            'shrink-0 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current',
            // Im Streifen ist das Schliessen die einzige Bedienung am Rand: volle
            // 44 px Trefferflaeche. In der Karte bleibt es beim kleinen Knopf.
            strip ? '-my-2 -mr-2 grid h-11 w-11 place-items-center rounded-lg' : '-mr-1 ml-1 rounded p-0.5',
          )}
        >
          <X size={18} aria-hidden />
        </button>
      )}
    </>
  );
  return (
    <div
      role="status"
      className={cn(
        'border',
        strip ? 'rounded-none border-x-0 border-t-0' : 'rounded-lg',
        // Ohne inneren Container traegt die Huelle selbst Reihe und Abstand.
        !(strip && innerClassName) && 'flex items-start gap-3 px-4 py-3',
        s.surface,
        className,
      )}
      {...rest}
    >
      {strip && innerClassName ? <div className={cn('flex items-start gap-3 py-3', innerClassName)}>{body}</div> : body}
    </div>
  );
}

/**
 * Ein Link in `actions`. Immer unterstrichen — der Link haengt nie allein an
 * der Farbe; die Farbe erbt er vom Status des Banners. Rendert <a> oder, mit
 * `as`, eine andere Komponente (react-router `Link`).
 */
type BannerLinkProps<C extends React.ElementType> = { as?: C; className?: string; children: React.ReactNode } &
  Omit<React.ComponentPropsWithoutRef<C>, 'as' | 'className' | 'children'>;

export function BannerLink<C extends React.ElementType = 'a'>({ as, className, children, ...rest }: BannerLinkProps<C>) {
  const Tag: React.ElementType = as ?? 'a';
  return (
    <Tag
      className={cn(
        'rounded-sm py-0.5 underline underline-offset-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-current',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
