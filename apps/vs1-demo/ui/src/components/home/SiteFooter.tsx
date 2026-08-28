import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { supportedLngs } from '../../i18n/config';
import { DOMAINS } from '../../lib/domains';
import { MARKET_CODES } from '../../lib/marketProfiles';
import { Badge } from '../ui/Badge';
import { NewsletterBand } from './NewsletterBand';

// ─── S10 — Site footer · Figma 1212:11 ──────────────────────────────────────
// Light four-column footer closing the landing page: brand + positioning, the
// link columns (with BETA tags), the markets-covered line, the not-a-law-firm
// disclaimer, and the legal bottom bar. Copy lives in footer.* ('home' ns).
//
// The NewsletterBand (the monthly-briefing closer from the homepage) is
// ANCHORED here since 2026-08-27 (user decision): every page that ends in the
// footer ends with the briefing hand-off first — one closer for the whole
// site, no per-page CTA sections to keep in sync.

// href ist OPTIONAL: ein Eintrag ohne Ziel wird als Text gerendert, nicht als
// Link. Bis 20.08. trugen zehn Eintraege href="#" — sichtbar, klickbar,
// wirkungslos. Sie zu loeschen haette den Fahrplan mitgeloescht, den sie
// ankuendigen; ein toter Link bleibt trotzdem ein Defekt. Also: sichtbar
// bleiben, aber nicht so tun, als fuehre er irgendwohin.
type Link = { key: string; href?: string; beta?: boolean; fallback?: string };
type Column = { key: string; links: Link[] };

// The eight areas, membership and order straight from lib/domains so the
// column cannot drift out of sync again. Labels stay in the 'home' namespace
// (loading 'userws' here would pull 360 dashboard keys into every marketing
// page); the canonical English name is the fallback.
const AREA_LINKS: Link[] = [
  // The hub first, then the eight areas. Until 2026-08-21 all eight pointed at
  // /compliance, because that page held every area's detail inside an
  // accordion and there was nothing more specific to link to. Each area has
  // its own page now, so the column finally goes where it says it goes.
  { key: 'areasOverview', href: '/compliance' },
  ...DOMAINS.map((d) => ({ key: d.i18nKey, href: `/compliance/${d.slug}`, fallback: d.label })),
];

// The eight markets, membership and order from the engine — same reasoning as
// the areas column above, and the reason this column can exist at all: every
// market has had its own page since 2026-08-28.
const MARKET_LINKS: Link[] = [
  { key: 'marketsOverview', href: '/markets' },
  ...MARKET_CODES.map((code) => ({
    key: `market_${code}`,
    href: `/markets/${code.toLowerCase()}`,
    fallback: code,
  })),
];

const COLUMNS: Column[] = [
  {
    key: 'platform',
    links: [
      { key: 'howItWorks', href: '/how-it-works' },
      // "Für wen" sits right under "So funktioniert es" (user decision
      // 2026-08-28): the by-role page answers the question the how-it-works
      // page raises next.
      { key: 'forWhom', href: '/solutions' },
      { key: 'pricing', href: '/pricing' },
      // 'platformOverview' left this column 2026-08-28: the page it points at
      // is the partner pitch (structured dossiers, magic-link workflow, the
      // SLA the ranking rewards), so it belongs with the company, not with
      // what a visitor gets. It is the 'partner' entry below now.
      // 'exampleResult' left 2026-08-28 (user decision): /results renders the
      // result of an assessment the visitor has taken — from the footer it
      // opens an empty report, not an example. The wizard entry above is the
      // honest way there, and the flow itself routes to /results on finish.
      { key: 'startAssessment', href: '/wizard' },
    ],
  },
  {
    key: 'areas',
    links: AREA_LINKS,
  },
  {
    key: 'markets',
    links: MARKET_LINKS,
  },
  // The RESOURCES column is hidden until it has something to point at (user
  // decision 2026-08-28): country guides only led back to /markets, tutorials
  // and the glossary do not exist, news and the knowledge library are BETA
  // placeholders, and the overview page itself is still empty. Listing six
  // entries where five are dead is worse than not listing them.
  // TODO(resources-live): restore this column — resourcesOverview,
  // complianceNews (beta), knowledgeLibrary (beta), tutorials, glossary — once
  // the resources surface carries content. Same trigger as the paused
  // ResourceTeaser on the compliance hub.
  {
    key: 'company',
    links: [
      { key: 'about', href: '/about' },
      // TODO(partner-redesign): /platform is the partner-facing page and still
      // speaks the pre-redesign language — it is queued for its own pass after
      // the current stages (user decision 2026-08-28).
      { key: 'partner', href: '/platform' },
      { key: 'trustSecurity', href: '/ai-governance' },  // traegt selbst den Titel "Trust Center"
      // Beide zeigen auf DIESELBE Seite, und das ist Absicht: /contact sortiert
      // nach Anliegen, nicht nach Abteilung — "Support" ist dort einer der vier
      // Wege, nicht ein eigenes Ziel. Bis 2026-08-28 waren beide tote Eintraege
      // ohne href.
      // TODO(contact-live): echte Postfaecher, Anschrift, Telefonnummer und
      // Servicezeiten stehen noch aus; die Seite zeigt sie als Platzhalter und
      // haelt den Absendeweg offen, statt einen Versand vorzutaeuschen.
      { key: 'contact', href: '/contact' },
      { key: 'support', href: '/contact' },
    ],
  },
];

const LEGAL: Link[] = [
  { key: 'privacy', href: '/privacy' },
  { key: 'terms', href: '/terms' },
  { key: 'imprint', href: '/imprint' },
  { key: 'cookies', href: '/cookies' },
  { key: 'subProcessors' },
];

export function SiteFooter() {
  const { t, i18n } = useTranslation('home');
  // Links carrying a canonical fallback (the domain columns) resolve to the
  // English domain name if their translation is ever missing, not the raw key.
  const linkLabel = (key: string, fallback?: string) => (fallback ? t(key, fallback) : t(key));
  const location = useLocation();
  const navigate = useNavigate();

  // Locale-prefix internal links (/privacy → /de/privacy) so legal pages open
  // in the language the visitor is browsing in.
  const locale = i18n.resolvedLanguage || 'en';
  const localize = (href: string) => (href.startsWith('/') ? `/${locale}${href}` : href);

  // Same path-rewrite mechanism as the global LanguageSwitcher: swap (or add)
  // the /:locale prefix and navigate — LocaleLayout then calls changeLanguage.
  // Zielpfad als reine Funktion: href UND onClick lesen dieselbe Quelle, sonst
  // zeigt der Link woanders hin als der Klick.
  const languagePath = (lng: string) => {
    // Der fehlende Schraegstrich hier war ein stiller Fehler: aus /de/pricing
    // wurde '/'+'en'+'pricing' = /enpricing. Ohne Locale-Praefix fiel das in den
    // Catch-all, und der Sprachwechsel warf den Nutzer von JEDER Unterseite auf
    // die Startseite. Sichtbar wurde es erst, als der Umschalter ein echter
    // Link mit href wurde.
    const parts = location.pathname.split('/').filter(Boolean);
    const rest = supportedLngs.includes(parts[0]) ? parts.slice(1) : parts;
    const tail = rest.join('/');
    return `/${lng}${tail ? `/${tail}` : ''}${location.search}${location.hash}`;
  };
  const switchLanguage = (lng: string) => navigate(languagePath(lng));

  return (
    <>
      <NewsletterBand />
      <footer className="border-t border-stroke-subtle bg-surface">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 lg:px-6">
        {/* Brand + link columns */}
        <div className="grid gap-10 py-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />
            <p className="mt-5 max-w-xs text-body-sm leading-relaxed text-fg-secondary">
              {t('footer.tagline')}
            </p>
            <div className="mt-6 flex items-center gap-2 text-body-xs font-semibold">
              {supportedLngs.map((lng, i) => (
                <span key={lng} className="flex items-center gap-2">
                  {i > 0 && <span className="text-fg-tertiary">·</span>}
                  {/* Ein <a>, kein <button>. Als Button war der Umschalter der
                      EINZIGE Weg nach /es und /tr — und ein Crawler folgt keinem
                      onClick, also existierten beide Sprachen fuer ihn nicht.
                      Der Klick bleibt SPA-Navigation (preventDefault); Mittel-
                      klick, Aufklappen im neuen Tab und Crawler bekommen das
                      href. hrefLang nennt die Zielsprache explizit. */}
                  <a
                    href={languagePath(lng)}
                    hrefLang={lng}
                    aria-current={lng === locale ? 'true' : undefined}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      switchLanguage(lng);
                    }}
                    className={lng === locale ? 'text-fg' : 'text-fg-tertiary transition-colors hover:text-fg'}
                  >
                    {lng.toUpperCase()}
                  </a>
                </span>
              ))}
            </div>
            <p className="mt-6 text-body-2xs text-fg-tertiary">{t('footer.notLawFirm')}</p>
          </div>

          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {COLUMNS.map((col) => (
              <div key={col.key}>
                <h3 className="text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary">
                  {t(`footer.columns.${col.key}.title`)}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.key}>
                      {(() => {
                        const inner = (
                          <>
                            {linkLabel(`footer.columns.${col.key}.links.${l.key}`, l.fallback)}
                            {l.beta && (
                              <Badge shape="pill" tone="accent" appearance="soft" size="xs" className="uppercase tracking-[0.06em] ring-1 ring-inset ring-accent-200">
                                {t('footer.beta')}
                              </Badge>
                            )}
                          </>
                        );
                        const shared = 'inline-flex items-center gap-2 text-body-sm';
                        return l.href ? (
                          <a href={localize(l.href)} className={`${shared} text-fg-secondary transition-colors hover:text-fg`}>
                            {inner}
                          </a>
                        ) : (
                          <span className={`${shared} text-fg-tertiary`}>{inner}</span>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Markets + legal disclaimer */}
        <div className="border-t border-stroke-subtle py-10 text-center">
          <p className="mx-auto max-w-2xl text-body-sm text-fg-secondary">
            {t('footer.markets.pre')}
            <span className="font-semibold text-fg">{t('footer.markets.list')}</span>
            {t('footer.markets.post')}
          </p>
          <p className="mx-auto mt-5 max-w-3xl text-body-2xs leading-relaxed text-fg-tertiary">
            {t('footer.disclaimer')}
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-stroke-subtle py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-xs text-fg-tertiary">{t('footer.copyright')}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.key}>
                {l.href ? (
                  <a href={localize(l.href)} className="text-body-xs text-fg-tertiary transition-colors hover:text-fg">
                    {t(`footer.legal.${l.key}`)}
                  </a>
                ) : (
                  <span className="text-body-xs text-fg-tertiary">{t(`footer.legal.${l.key}`)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      </footer>
    </>
  );
}
