import { useState } from 'react';
import { useParams } from 'react-router-dom';
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

// ─── User Dashboard · Domain Workbench (Tax & VAT) ────────────────────────────
// Mirrors "User Dashboard v1 · Tax & VAT domain (Desktop)" (2051:60): gauge
// header (risk / registration likelihood / EU exposure) · recommended next
// steps · threshold risk monitoring · recommended providers. This page is the
// TEMPLATE for all six domain workbenches — content comes from the fixture.

type DomainKey = 'tax-vat' | 'product-packaging' | 'data-privacy' | 'marketing-seo' | 'corporate-structure' | 'full-support';

const DOMAIN_META: Record<DomainKey, { name: string; riskSub: string; steps: { label: string; description?: string }[] }> = {
  'tax-vat': { name: 'Tax & VAT', riskSub: '€145k IT revenue', steps: [] },
  'product-packaging': {
    name: 'Product & Packaging', riskSub: 'LUCID · EPR',
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
    name: 'Marketing & SEO', riskSub: 'UWG · Werberecht',
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
  'full-support': {
    name: 'Full Support', riskSub: 'End-to-end',
    steps: [
      { label: 'Kick-off call with your partner', description: '2 verified partners match · DE-IT cross-border · avg. reply 18h' },
      { label: 'Partner maps all open obligations', description: 'Required before next sale to IT · Agenzia delle Entrate online flow' },
      { label: 'Monthly monitoring & filing', description: 'Q3 2026 deadline · 90 days before first shipment to IT' },
      { label: 'Set up quarterly OSS filing routine', description: 'OSS-DE handles EU-wide reporting · €10k cross-border threshold' },
    ],
  },
};

const STEPS = [
  { label: 'Engage a fiscal representative in Italy', description: '2 verified partners match · DE·IT cross-border · avg. reply 18h · See providers' },
  { label: 'Register for Italian VAT (Partita IVA)', description: 'Required before next sale to IT · official Agenzia delle Entrate flow · Open guide' },
  { label: 'Schedule EPR Italy registration', description: 'Q3 2026 deadline · 90 days before first shipment to IT · Add reminder' },
  { label: 'Set up quarterly OSS filing routine', description: 'OSS: DE handles EU-wide reporting · €10k cross-border threshold' },
];

const THRESHOLDS = [
  { country: 'IT', amount: '€145k', of: 'of €100k', status: 'HIGH', tone: 'error' as const, pct: 100, color: 'error' as const },
  { country: 'ES', amount: '€76k', of: 'of €100k', status: 'CAUTION', tone: 'warning' as const, pct: 76, color: 'warning' as const },
  { country: 'FR', amount: '€31k', of: 'of €100k', status: 'SAFE', tone: 'success' as const, pct: 31, color: 'brand' as const },
  { country: 'AT', amount: '€11k', of: 'of €100k', status: 'SAFE', tone: 'success' as const, pct: 11, color: 'brand' as const },
];

// key = provider_key in the DB (seeded on staging) — the FK the POST needs.
const PROVIDERS = [
  { key: 'studio-bianchi', country: 'IT', initials: 'SB', name: 'Studio Bianchi SRL', meta: 'Milano, IT', sub: 'Italian VAT registration + fiscal representation · DE·IT bilingual · avg. reply 18h · Request quote' },
  { key: 'schmidt-partner', country: 'DE', initials: 'EV', name: 'EU-wide VAT compliance · O…', meta: 'Hamburg, DE', sub: 'Schmidt & Partner · OSS/IOSS setup · 12 years cross-border tax · 8 EU offices' },
  { key: 'madrid-tax', country: 'ES', initials: 'MT', name: 'Madrid Tax Consulta…', meta: 'Madrid, ES', sub: 'Iberian VAT (ES/PT) · monthly filing · marketplace optimization · Request quote' },
];

export function WorkbenchPage() {
  const { domain } = useParams();
  const key = (domain && domain in DOMAIN_META ? domain : 'tax-vat') as DomainKey;
  const meta = DOMAIN_META[key];
  const steps = meta.steps.length ? meta.steps : STEPS;
  const [quoteFor, setQuoteFor] = useState<(QuoteProvider & { country: string }) | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  return (
    <UserShell activeDomain={meta.name}>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d4af37]/15 text-[16px] text-[#d4af37]">€</span>
            <div>
              <h1 className="font-serif text-[28px] font-bold leading-tight text-fg">
                {meta.name} <span className="text-fg-accent">exposure</span> overview.
              </h1>
              <p className="mt-0.5 text-[12px] text-fg-secondary">
                4 countries tracked · 3 sessions · 2 active requests · 4 documents missing · last refresh 2h ago
              </p>
            </div>
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-4">
            <a href="#" className="text-[12px] font-medium text-fg underline underline-offset-2">Refine existing</a>
            <Button size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>Upload document</Button>
            <Button size="sm">Start new</Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <KPICircleCard label="Compliance risk" value={82} valueLabel="HIGH" color="error" trend={{ value: meta.riskSub, direction: 'neutral' }} />
          <KPICircleCard label="Registration likelihood" value={85} valueLabel="85%" color="warning" trend={{ value: 'Mandatory in 2 markets', direction: 'neutral' }} />
          <KPICircleCard label="Total EU exposure" value={68} valueLabel="€280k" color="brand" trend={{ value: '4 active markets · projected Q4 2026', direction: 'neutral' }} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-fg">Recommended next steps <span className="text-fg-brand">4</span></h2>
                <a href="#" className="text-[12px] text-fg-secondary underline-offset-2 hover:underline">See full plan</a>
              </div>
              <Stepper orientation="vertical" size="sm" current={0} steps={steps} />
            </section>

            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-fg">Threshold risk monitoring</h2>
                <button type="button" onClick={() => setAlertsOpen(true)} className="text-[12px] text-fg-brand underline-offset-2 hover:underline">Configure alerts</button>
              </div>
              <Card styleVariant="filled" className="space-y-3.5 p-4">
                {THRESHOLDS.map((t) => (
                  <div key={t.country} className="flex items-center gap-3">
                    <span className="w-7 shrink-0 text-[12px] font-semibold text-fg">{t.country}</span>
                    <div className="min-w-0 flex-1">
                      <ProgressBar value={t.pct} size="sm" color={t.color} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[12px] font-medium text-fg">{t.amount}</span>
                    <span className="w-16 shrink-0 text-[10px] text-fg-tertiary">{t.of}</span>
                    <Tag tone={t.tone}>{t.status}</Tag>
                    <a href="#" className="shrink-0 text-[11px] text-fg-secondary underline-offset-2 hover:underline">Detail</a>
                  </div>
                ))}
                <p className="pt-1 text-[10px] text-fg-tertiary">● Safe (under threshold)  ● Caution (approaching)  ● High risk (exceeded)</p>
              </Card>
            </section>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold text-fg">Recommended providers <span className="text-fg-brand">3</span></h2>
              <a href="#" className="text-[12px] text-fg-secondary underline-offset-2 hover:underline">See all</a>
            </div>
            <div className="space-y-2.5">
              {PROVIDERS.map((p) => (
                <EntityCard
                  key={p.key}
                  avatar={<span className="grid h-9 w-9 place-items-center rounded-full bg-[#004d40]/40 text-[11px] font-bold text-[#2cc0ad]">{p.initials}</span>}
                  name={p.name}
                  badge={<Tag tone="brand">✓ PARTNER</Tag>}
                  meta={<span className="block text-[11px] leading-relaxed">{p.sub}</span>}
                  trailing={
                    <Button variant="accent" size="sm" onClick={() => setQuoteFor({ key: p.key, name: p.name, meta: p.meta, country: p.country })}>
                      Request quote
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
