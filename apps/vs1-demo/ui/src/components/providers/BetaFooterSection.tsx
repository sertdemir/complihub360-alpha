import { useTranslation } from 'react-i18next';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from './SectionHeading';

// ─── S9 — Newsletter + Footer (Provider) · Figma 1784:1713 ────────────────────
// Light "Partner Brief" newsletter band + the full light footer (nav columns,
// markets, legal disclaimer, bottom bar). Not a law firm — orchestration only.
// Copy lives in the 'providersLp' namespace (footer.*).

const NAV_COLUMNS: { key: string; links: { key: string; beta?: boolean }[] }[] = [
  {
    key: 'platform',
    links: [{ key: 'howItWorks' }, { key: 'startAssessment' }, { key: 'exampleResult' }, { key: 'forProviders' }],
  },
  {
    key: 'solutions',
    links: [
      { key: 'vatTax' },
      { key: 'productPackaging' },
      { key: 'dataPrivacy' },
      { key: 'marketingAdvertising' },
      { key: 'corporateStructure' },
      { key: 'fullSupport' },
    ],
  },
  {
    key: 'resources',
    links: [
      { key: 'complianceNews', beta: true },
      { key: 'knowledgeLibrary', beta: true },
      { key: 'countryGuides' },
      { key: 'tutorials' },
      { key: 'glossary' },
    ],
  },
  {
    key: 'company',
    links: [{ key: 'about' }, { key: 'trustSecurity' }, { key: 'contact' }, { key: 'careers' }],
  },
];

const LEGAL_KEYS = ['privacy', 'terms', 'impressum', 'cookies', 'subProcessors'] as const;

export function BetaFooterSection() {
  const { t } = useTranslation('providersLp');

  return (
    <footer id="footer">
      {/* Newsletter band */}
      <section className="bg-neutral-50 py-20 lg:py-24">
        <Container size="lg">
          <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <SectionEyebrow tone="neutral">{t('footer.newsletter.eyebrow')}</SectionEyebrow>
            <Typography variant="h2" weight="semibold" className="!text-[1.9rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.25rem]">
              {t('footer.newsletter.title.pre')} <GoldWord>{t('footer.newsletter.title.gold')}</GoldWord>
              {t('footer.newsletter.title.post')}
            </Typography>
            <p className="text-base leading-relaxed text-neutral-600">{t('footer.newsletter.lead')}</p>
            <div className="mt-2 flex w-full max-w-md items-stretch gap-2">
              <div className="flex-1">
                <Input type="email" placeholder={t('footer.newsletter.emailPlaceholder')} />
              </div>
              <Button>{t('footer.newsletter.subscribe')}</Button>
            </div>
            <p className="text-[12px] text-neutral-500">{t('footer.newsletter.privacyNote')}</p>
            <a href="#register" className="mt-2 text-[14px] font-semibold text-primary-600 hover:text-primary-700">
              {t('footer.newsletter.applyLink')}
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
              <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-neutral-600">{t('footer.brandTagline')}</p>
              <p className="mt-4 text-[13px] font-medium text-neutral-700">
                <span className="text-neutral-900">EN</span> · <span className="text-neutral-500">DE</span>
              </p>
              <p className="mt-4 text-[12px] text-neutral-500">{t('footer.brandDisclaimer')}</p>
            </StaggerItem>

            {/* Nav columns */}
            {NAV_COLUMNS.map((col) => (
              <StaggerItem key={col.key}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t(`footer.nav.${col.key}.title`)}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.key}>
                      <a href="#" className="inline-flex items-center gap-2 text-[14px] text-neutral-700 hover:text-primary-600">
                        {t(`footer.nav.${col.key}.${l.key}`)}
                        {l.beta && (
                          <span className="rounded bg-accent-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent-800">
                            {t('footer.betaBadge')}
                          </span>
                        )}
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
              {t('footer.marketsPre')}{' '}
              <span className="font-semibold text-neutral-900">{t('footer.marketsList')}</span>
              {t('footer.marketsPost')}
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-[12px] leading-relaxed text-neutral-500">{t('footer.legalDisclaimer')}</p>
          </div>
        </Container>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-neutral-200 bg-white py-5">
        <Container size="2xl">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[13px] text-neutral-500">{t('footer.copyright')}</p>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {LEGAL_KEYS.map((l) => (
                <li key={l}>
                  <a href="#" className="text-[13px] text-neutral-500 hover:text-primary-600">{t(`footer.legal.${l}`)}</a>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </div>
    </footer>
  );
}
