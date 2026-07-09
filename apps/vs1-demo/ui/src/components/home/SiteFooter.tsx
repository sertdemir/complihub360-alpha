import { Logo } from '../ui/Logo';

// ─── S10 — Site footer · Figma 1212:11 ──────────────────────────────────────
// Light four-column footer closing the landing page: brand + positioning, the
// link columns (with BETA tags), the markets-covered line, the not-a-law-firm
// disclaimer, and the legal bottom bar.

type Link = { label: string; href: string; beta?: boolean };
type Column = { title: string; links: Link[] };

const COLUMNS: Column[] = [
  {
    title: 'Platform',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Start Assessment', href: '#entry-door' },
      { label: 'Example Result', href: '#' },
      { label: 'For Providers', href: '/providers' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'VAT & Tax', href: '#' },
      { label: 'Product & Packaging', href: '#' },
      { label: 'Data Privacy', href: '#' },
      { label: 'Marketing & Advertising', href: '#' },
      { label: 'Corporate Structure', href: '#' },
      { label: 'Full Support', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Compliance News', href: '#', beta: true },
      { label: 'Knowledge Library', href: '#', beta: true },
      { label: 'Country Guides', href: '#' },
      { label: 'Tutorials', href: '#' },
      { label: 'Compliance Glossary', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Trust & Security', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Careers', href: '#' },
    ],
  },
];

const LEGAL: Link[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms (AGB)', href: '#' },
  { label: 'Impressum', href: '/imprint' },
  { label: 'Cookie Settings', href: '#' },
  { label: 'Sub-Processors', href: '#' },
];

export function SiteFooter() {
  // Locale-prefix internal links (/privacy → /de/privacy) so legal pages open
  // in the language the visitor is browsing in.
  const locale = window.location.pathname.match(/^\/([a-z]{2})(?=\/|$)/)?.[1] || 'en';
  const localize = (href: string) => (href.startsWith('/') ? `/${locale}${href}` : href);
  return (
    <footer className="border-t border-stroke-subtle bg-surface">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 lg:px-6">
        {/* Brand + link columns */}
        <div className="grid gap-10 py-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-fg-secondary">
              The orchestration layer between compliance complexity and operational reality.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[13px] font-semibold">
              <button type="button" className="text-fg">EN</button>
              <span className="text-fg-tertiary">·</span>
              <button type="button" className="text-fg-tertiary transition-colors hover:text-fg">DE</button>
            </div>
            <p className="mt-6 text-[12px] text-fg-tertiary">Not a law firm. We orchestrate verified specialists.</p>
          </div>

          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{col.title}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="inline-flex items-center gap-2 text-[14px] text-fg-secondary transition-colors hover:text-fg"
                      >
                        {l.label}
                        {l.beta && (
                          <span className="rounded-full bg-accent-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-accent-700 ring-1 ring-inset ring-accent-200">
                            Beta
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Markets + legal disclaimer */}
        <div className="border-t border-stroke-subtle py-10 text-center">
          <p className="mx-auto max-w-2xl text-[14px] text-fg-secondary">
            Markets we cover today:{' '}
            <span className="font-semibold text-fg">Germany · United Kingdom · Netherlands · France · Italy · Spain</span>. More
            countries rolling out through 2026.
          </p>
          <p className="mx-auto mt-5 max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">
            CompliHub360 is an orchestration platform — not a law firm. Legal, tax, and regulatory advice is delivered by
            Verified Partners under their own professional liability. We do not provide Rechtsberatung within the meaning
            of §§ RDG / StBerG.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-stroke-subtle py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-fg-tertiary">© 2026 CompliHub360.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.label}>
                <a href={localize(l.href)} className="text-[13px] text-fg-tertiary transition-colors hover:text-fg">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
