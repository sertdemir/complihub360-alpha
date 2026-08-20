import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { RequestQuoteModal, type QuoteProvider } from '../../components/user/RequestQuoteModal';
import { DocUploadDrawer } from '../../components/user/DocUploadDrawer';
import { ConfigureAlertsDrawer } from '../../components/user/ConfigureAlertsDrawer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { KPICircleCard } from '../../components/ui/KPICircleCard';
import { Stepper } from '../../components/ui/Stepper';
import { ProgressBar } from '../../components/ui/Progress';
import { EntityCard } from '../../components/ui/Cards';
import { Tag } from '../../components/ui/Tag';
import { DOMAIN_I18N_KEY } from '../../lib/domains';

// ─── User Dashboard · Domain Workbench (Tax & VAT) ────────────────────────────
// Mirrors "User Dashboard v1 · Tax & VAT domain (Desktop)" (2051:60): gauge
// header (risk / registration likelihood / EU exposure) · recommended next
// steps · threshold risk monitoring · recommended providers. This page is the
// TEMPLATE for all six domain workbenches — content comes from the fixture
// (step/provider rows are demo data and stay untranslated).

type DomainKey = 'tax-vat' | 'product-packaging' | 'data-privacy' | 'marketing-seo' | 'corporate-structure' | 'product-compliance' | 'logistics-customs' | 'legal-advisory';

const DOMAIN_META: Record<DomainKey, { name: string; riskSub: string; steps: { label: string; description?: string }[] }> = {
  'tax-vat': { name: 'Tax & VAT', riskSub: '€145k IT revenue', steps: [] },
  'product-packaging': {
    name: 'EPR & Packaging', riskSub: 'LUCID · EPR',
    steps: [
      { label: 'Register with LUCID (Germany)', description: '2 verified partners match · DE-IT cross-border · avg. reply 18h' },
      { label: 'Join a CONAI consortium (Italy)', description: 'Required before next sale to IT · Agenzia delle Entrate online flow' },
      { label: 'File annual packaging declaration', description: 'Q3 2026 deadline · 90 days before first shipment to IT' },
      { label: 'Set up quarterly OSS filing routine', description: 'OSS-DE handles EU-wide reporting · €10k cross-border threshold' },
    ],
  },
  'data-privacy': {
    name: 'Data & Privacy', riskSub: 'GDPR · DSGVO',
    steps: [
      { label: 'Appoint an EU representative (Art. 27)', description: '2 verified partners match · DE-IT cross-border · avg. reply 18h' },
      { label: 'Publish a GDPR-compliant DPA', description: 'Required before next sale to IT · Agenzia delle Entrate online flow' },
      { label: 'Run an Art. 30 records audit', description: 'Q3 2026 deadline · 90 days before first shipment to IT' },
      { label: 'Set up quarterly OSS filing routine', description: 'OSS-DE handles EU-wide reporting · €10k cross-border threshold' },
    ],
  },
  'marketing-seo': {
    name: 'Marketing Compliance', riskSub: 'UWG · Werberecht',
    steps: [
      { label: 'Review health & comparative claims', description: '2 verified partners match · DE-IT cross-border · avg. reply 18h' },
      { label: 'Add influencer-disclosure policy', description: 'Required before next sale to IT · Agenzia delle Entrate online flow' },
      { label: 'Audit price & promo wording', description: 'Q3 2026 deadline · 90 days before first shipment to IT' },
      { label: 'Set up quarterly OSS filing routine', description: 'OSS-DE handles EU-wide reporting · €10k cross-border threshold' },
    ],
  },
  'corporate-structure': {
    name: 'Corporate & Structure', riskSub: 'Niederlassung',
    steps: [
      { label: 'Assess permanent-establishment risk', description: '2 verified partners match · DE-IT cross-border · avg. reply 18h' },
      { label: 'Choose a holding structure', description: 'Required before next sale to IT · Agenzia delle Entrate online flow' },
      { label: 'Register a local branch (IT)', description: 'Q3 2026 deadline · 90 days before first shipment to IT' },
      { label: 'Set up quarterly OSS filing routine', description: 'OSS-DE handles EU-wide reporting · €10k cross-border threshold' },
    ],
  },
  'product-compliance': {
    name: 'Product Compliance', riskSub: 'CE · GPSR',
    steps: [
      { label: 'Verify CE-marking scope for your products', description: '2 verified partners match · DE-IT cross-border · avg. reply 18h' },
      { label: 'Compile the technical documentation file', description: 'Required before next sale to IT · EU market-surveillance ready' },
      { label: 'Appoint an EU responsible person (GPSR)', description: 'Q3 2026 deadline · 90 days before first shipment to IT' },
      { label: 'Set up conformity re-checks per product change', description: 'Applies to every SKU revision · EU-wide' },
    ],
  },
  'logistics-customs': {
    name: 'Logistics & Customs', riskSub: 'Zoll · Intrastat',
    steps: [
      { label: 'Register an EORI number', description: '2 verified partners match · DE-IT cross-border · avg. reply 18h' },
      { label: 'Classify goods (HS/TARIC codes)', description: 'Required before next cross-border shipment' },
      { label: 'Set up Intrastat reporting', description: 'Monthly filing above the movement threshold' },
      { label: 'Review Incoterms & customs valuation', description: 'Applies to marketplace + D2C shipments · EU-wide' },
    ],
  },
  'legal-advisory': {
    name: 'Legal Advisory', riskSub: 'Verträge · AGB',
    steps: [
      { label: 'Review terms & conditions for the target market', description: '2 verified partners match · DE-IT cross-border · avg. reply 18h' },
      { label: 'Localize imprint & consumer-rights notices', description: 'Required before next sale to IT' },
      { label: 'Check distance-selling & withdrawal rules', description: 'Q3 2026 deadline · consumer-protection scope' },
      { label: 'Set up a contract-review routine', description: 'Supplier + marketplace agreements · EU-wide' },
    ],
  },
};

const STEPS = [
  { label: 'Engage a fiscal representative in Italy', description: '2 verified partners match · DE·IT cross-border · avg. reply 18h · See providers' },
  { label: 'Register for Italian VAT (Partita IVA)', description: 'Required before next sale to IT · official Agenzia delle Entrate flow · Open guide' },
  { label: 'Schedule EPR Italy registration', description: 'Q3 2026 deadline · 90 days before first shipment to IT · Add reminder' },
  { label: 'Set up quarterly OSS filing routine', description: 'OSS: DE handles EU-wide reporting · €10k cross-border threshold' },
];

// Real thresholds (jurisdiction_facts / EY guide 03-2026): the EU distance-
// selling threshold is €10k EU-WIDE (cumulative, not per country) — the EU row
// aggregates IT €145k + ES €76k + FR €31k + AT €11k. UK: GBP 90k registration
// threshold. US: USD 100k/200-transaction economic nexus per state (Wayfair).
const THRESHOLDS = [
  { country: 'EU', amount: '€263k', limit: '€10k', status: 'HIGH', tone: 'error' as const, pct: 100, color: 'error' as const },
  { country: 'UK', amount: '£78k', limit: '£90k', status: 'CAUTION', tone: 'warning' as const, pct: 87, color: 'warning' as const },
  { country: 'US', amount: '$57k', limit: '$100k', status: 'SAFE', tone: 'success' as const, pct: 57, color: 'brand' as const },
];

const THRESHOLD_STATUS_KEY: Record<string, string> = { HIGH: 'statusHigh', CAUTION: 'statusCaution', SAFE: 'statusSafe' };

// Canonical English domain label → userws translation key (display only —
// DOMAIN_META.name stays canonical for routing / activeDomain matching / API).
const DOMAIN_KEY = DOMAIN_I18N_KEY;

// key = provider_key in the DB (seeded on staging) — the FK the POST needs.
const PROVIDERS = [
  { key: 'studio-bianchi', country: 'IT', initials: 'SB', name: 'Verifizierte Steuerkanzlei · Norditalien', meta: 'Norditalien', sub: 'Italian VAT registration + fiscal representation · DE·IT bilingual · avg. reply 18h · Request quote' },
  { key: 'schmidt-partner', country: 'DE', initials: 'EV', name: 'Verifizierte Steuerberatung · Norddeutschland', meta: 'Norddeutschland', sub: 'OSS/IOSS setup · 12 years cross-border tax · 8 EU offices' },
  { key: 'madrid-tax', country: 'ES', initials: 'MT', name: 'Verifizierter Tax-Spezialist · Spanien', meta: 'Spanien', sub: 'Iberian VAT (ES/PT) · monthly filing · marketplace optimization · Request quote' },
];

export function WorkbenchPage() {
  const { domain, locale = 'en' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('userws');
  const key = (domain && domain in DOMAIN_META ? domain : 'tax-vat') as DomainKey;
  const meta = DOMAIN_META[key];
  const steps = meta.steps.length ? meta.steps : STEPS;
  const domainDisplay = DOMAIN_KEY[meta.name] ? t(`domain.${DOMAIN_KEY[meta.name]}`) : meta.name;
  const [quoteFor, setQuoteFor] = useState<(QuoteProvider & { country: string }) | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  return (
    <UserShell activeDomain={meta.name}>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-accent/15 text-[16px] text-fg-accent">€</span>
            <div>
              <h1 className="font-serif text-[28px] font-bold leading-tight text-fg">
                <Trans t={t} i18nKey="workbench.title" values={{ domain: domainDisplay }} components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
              </h1>
              <p className="mt-0.5 text-[12px] text-fg-secondary">
                {t('workbench.sub')}
              </p>
            </div>
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-4">
            <button type="button" onClick={() => navigate(`/${locale}/wizard?refine=1`)} className="text-[12px] font-medium text-fg underline underline-offset-2">{t('workbench.refineExisting')}</button>
            <Button size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>{t('workbench.uploadDocument')}</Button>
            <Button size="sm" onClick={() => navigate(`/${locale}/wizard`)}>{t('workbench.startNew')}</Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <KPICircleCard label={t('workbench.kpiRisk')} value={82} valueLabel={t('workbench.kpiRiskValue')} color="error" trend={{ value: meta.riskSub, direction: 'neutral' }} />
          <KPICircleCard label={t('workbench.kpiLikelihood')} value={85} valueLabel="85%" color="warning" trend={{ value: t('workbench.kpiLikelihoodTrend'), direction: 'neutral' }} />
          <KPICircleCard label={t('workbench.kpiExposure')} value={68} valueLabel="€280k" color="brand" trend={{ value: t('workbench.kpiExposureTrend'), direction: 'neutral' }} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-fg">{t('workbench.nextSteps')} <span className="text-fg-brand">4</span></h2>
                <a href="#" className="text-[12px] text-fg-secondary underline-offset-2 hover:underline">{t('workbench.seeFullPlan')}</a>
              </div>
              <Stepper orientation="vertical" size="sm" current={0} steps={steps} />
            </section>

            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-fg">{t('workbench.thresholdMonitoring')}</h2>
                <button type="button" onClick={() => setAlertsOpen(true)} className="text-[12px] text-fg-brand underline-offset-2 hover:underline">{t('workbench.configureAlerts')}</button>
              </div>
              <Card styleVariant="filled" className="space-y-3.5 p-4">
                {THRESHOLDS.map((row) => (
                  <div key={row.country} className="flex items-center gap-3">
                    <span className="w-7 shrink-0 text-[12px] font-semibold text-fg">{row.country}</span>
                    <div className="min-w-0 flex-1">
                      <ProgressBar value={row.pct} size="sm" color={row.color} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[12px] font-medium text-fg">{row.amount}</span>
                    <span className="w-16 shrink-0 text-[10px] text-fg-tertiary">{t('workbench.ofLimit', { limit: row.limit })}</span>
                    <Tag tone={row.tone}>{t(`workbench.${THRESHOLD_STATUS_KEY[row.status]}`)}</Tag>
                    <a href="#" className="shrink-0 text-[11px] text-fg-secondary underline-offset-2 hover:underline">{t('workbench.detail')}</a>
                  </div>
                ))}
                <p className="pt-1 text-[10px] text-fg-tertiary">{t('workbench.legend')}</p>
              </Card>
            </section>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold text-fg">{t('workbench.recommendedProviders')} <span className="text-fg-brand">3</span></h2>
              <a href="#" className="text-[12px] text-fg-secondary underline-offset-2 hover:underline">{t('shared.seeAll')}</a>
            </div>
            <div className="space-y-2.5">
              {PROVIDERS.map((p) => (
                <EntityCard
                  key={p.key}
                  avatar={<span className="grid h-9 w-9 place-items-center rounded-full bg-[#004d40]/40 text-[11px] font-bold text-fg-brand">{p.initials}</span>}
                  name={p.name}
                  badge={<Tag tone="brand">✓ PARTNER</Tag>}
                  meta={<span className="block text-[11px] leading-relaxed">{p.sub}</span>}
                  trailing={
                    <Button variant="accent" size="sm" onClick={() => setQuoteFor({ key: p.key, name: p.name, meta: p.meta, country: p.country })}>
                      {t('workbench.requestQuote')}
                    </Button>
                  }
                  interactive
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <DocUploadDrawer open={uploadOpen} onClose={() => setUploadOpen(false)} domainLabel={meta.name} />
      <ConfigureAlertsDrawer open={alertsOpen} onClose={() => setAlertsOpen(false)} />
      {quoteFor && (
        <RequestQuoteModal
          provider={quoteFor}
          country={quoteFor.country}
          category={key === 'tax-vat' ? 'vat' : key.replace(/-/g, '_')}
          domainLabel={meta.name}
          onClose={() => setQuoteFor(null)}
        />
      )}
    </UserShell>
  );
}
