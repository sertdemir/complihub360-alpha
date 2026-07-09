import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from './SectionHeading';

// ─── S9 — Newsletter + Footer (Provider) · Figma 1784:1713 ────────────────────
// Light "Partner Brief" newsletter band + the full light footer (nav columns,
// markets, legal disclaimer, bottom bar). Not a law firm — orchestration only.

const NAV: { title: string; links: { label: string; beta?: boolean }[] }[] = [
  { title: 'Platform', links: [{ label: 'How it works' }, { label: 'Start Assessment' }, { label: 'Example Result' }, { label: 'For Providers' }] },
  { title: 'Solutions', links: [{ label: 'VAT & Tax' }, { label: 'Product & Packaging' }, { label: 'Data Privacy' }, { label: 'Marketing & Advertising' }, { label: 'Corporate Structure' }, { label: 'Full Support' }] },
  { title: 'Resources', links: [{ label: 'Compliance News', beta: true }, { label: 'Knowledge Library', beta: true }, { label: 'Country Guides' }, { label: 'Tutorials' }, { label: 'Compliance Glossary' }] },
  { title: 'Company', links: [{ label: 'About' }, { label: 'Trust & Security' }, { label: 'Contact' }, { label: 'Careers' }] },
];

const LEGAL = ['Privacy Policy', 'Terms (AGB)', 'Impressum', 'Cookie Settings', 'Sub-Processors'];

export function BetaFooterSection() {
  return (
    <footer id="footer">
      {/* Newsletter band */}
      <section className="bg-neutral-50 py-20 lg:py-24">
        <Container size="lg">
          <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <SectionEyebrow tone="neutral">Partner brief</SectionEyebrow>
            <Typography variant="h2" weight="semibold" className="!text-[1.9rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.25rem]">
              When demand opens, you'll be <GoldWord>first</GoldWord> to know.
            </Typography>
            <p className="text-base leading-relaxed text-neutral-600">
              One partner-brief per month. New jurisdictions joining Beta, upcoming demand spikes in markets we cover,
              regulatory shifts that affect your inbox. No promotional content.
            </p>
            <div className="mt-2 flex w-full max-w-md items-stretch gap-2">
              <div className="flex-1">
                <Input type="email" placeholder="you@yourcompany.com" />
              </div>
              <Button>Subscribe</Button>
            </div>
            <p className="text-[12px] text-neutral-400">We use your email only for the brief. Unsubscribe in one click. See our privacy policy.</p>
            <a href="#register" className="mt-2 text-[14px] font-semibold text-primary-600 hover:text-primary-700">
              Or apply for the Beta cohort →
            </a>
          </Reveal>
        </Container>
      </section>

      {/* Footer body */}
      <div className="border-t border-neutral-200 bg-white py-16">
        <Container size="2xl">
          <Stagger stagger={0.08} className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            {/* Brand */}
            <StaggerItem>
              <Logo lockup="horizontal" tone="on-light" />
              <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-neutral-600">
                The orchestration layer between compliance complexity and verified specialist capacity.
              </p>
              <p className="mt-4 text-[13px] font-medium text-neutral-700">
                <span className="text-neutral-900">EN</span> · <span className="text-neutral-400">DE</span>
              </p>
              <p className="mt-4 text-[12px] text-neutral-400">Not a law firm. We orchestrate verified specialists.</p>
            </StaggerItem>

            {/* Nav columns */}
            {NAV.map((col) => (
              <StaggerItem key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{col.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href="#" className="inline-flex items-center gap-2 text-[14px] text-neutral-700 hover:text-primary-600">
                        {l.label}
                        {l.beta && <span className="rounded bg-accent-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent-700">Beta</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </StaggerItem>
            ))}
          </Stagger>

          {/* Markets + legal */}
          <div className="mt-14 border-t border-neutral-200 pt-8 text-center">
            <p className="text-[14px] text-neutral-600">
              Markets we cover today:{' '}
              <span className="font-semibold text-neutral-900">Germany · United Kingdom · Netherlands · France · Italy · Spain</span>. More countries rolling out through 2026.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-[12px] leading-relaxed text-neutral-400">
              CompliHub360 is an orchestration platform — not a law firm. Legal, tax, and regulatory advice is delivered
              by Verified Partners under their own professional liability. We do not provide Rechtsberatung within the
              meaning of §§ RDG / StBerG.
            </p>
          </div>
        </Container>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-neutral-200 bg-white py-5">
        <Container size="2xl">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[13px] text-neutral-500">© 2026 CompliHub360.</p>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {LEGAL.map((l) => (
                <li key={l}>
                  <a href="#" className="text-[13px] text-neutral-500 hover:text-primary-600">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </div>
    </footer>
  );
}
