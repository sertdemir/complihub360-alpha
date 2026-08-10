import { Logo } from '../ui/Logo';
import { Container } from '../ui/Container';

// ─── Footer ───────────────────────────────────────────────────────────────────
// Marketing site footer that closes both landing pages. Petrol surface with the
// inverse (on-petrol) stacked logo, gold-accented link columns and a bottom legal
// bar. Tokens only; content is prop-driven with sensible CompliHub defaults.

export interface FooterLink {
  label: string;
  href: string;
}
export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterProps {
  columns?: FooterColumn[];
  legal?: FooterLink[];
  /** Short blurb under the logo. */
  blurb?: string;
  /** Copyright owner (year is prefixed automatically). */
  owner?: string;
  year?: number;
  className?: string;
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Compliance areas', href: '/compliance' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Knowledge center', href: '/resources' },
      { label: 'Guides', href: '/resources/guides' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
];

const DEFAULT_LEGAL: FooterLink[] = [
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Imprint', href: '/legal/imprint' },
];

export function Footer({
  columns = DEFAULT_COLUMNS,
  legal = DEFAULT_LEGAL,
  blurb = 'Compliance, simplified — matched to the right expert across 27+ EU jurisdictions.',
  owner = 'CompliHub360',
  year = 2026,
  className,
}: FooterProps) {
  return (
    <footer className={`bg-brand text-fg-inverse ${className ?? ''}`}>
      <Container size="2xl">
        <div className="grid gap-10 py-14 md:grid-cols-12 md:py-16">
          {/* Brand */}
          <div className="md:col-span-4">
            <Logo lockup="stacked" tone="on-petrol" href="/" className="items-start" />
            <p className="mt-5 max-w-xs text-body-sm leading-relaxed text-white/70">{blurb}</p>
          </div>

          {/* Link columns */}
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-accent">{col.title}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-body-sm text-white/80 transition-colors hover:text-white">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom legal bar */}
        <div className="flex flex-col gap-4 border-t border-white/15 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-white/60">
            © {year} {owner}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legal.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="text-body-sm text-white/70 transition-colors hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
