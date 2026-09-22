import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { KPICard } from '../../components/ui/Cards';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Tag } from '../../components/ui/Tag';
import { InvoiceDetailDrawer } from '../../components/provider/InvoiceDetailDrawer';
import { useApiData } from '../../lib/useApiData';
import { fetchInvoices, fetchBillingPreview, openBillingPortal, money, type Invoice, type BillingPreview } from '../../api/billing';

// ─── Provider /billing ────────────────────────────────────────────────────────
// Mirrors "Provider Dashboard v1 · /billing (Desktop · payment-failed)"
// (1911:370): payment-failed banner · 4 month KPIs · invoice history table.
// B7: rows come from the invoices table; a row click opens the detail drawer.

const FIXTURE: Invoice[] = [
  { id: 'f-026', invoice_number: 'INV-026', period: '2026-05', amount_cents: 216400, currency: 'EUR', status: 'failed',
    issued_at: '2026-06-01', due_at: '2026-06-15', paid_at: null,
    line_items: [
      { label: 'Booking leads', qty: 22, unit_cents: 9200, amount_cents: 202400 },
      { label: 'Profile detail opens', qty: 70, unit_cents: 200, amount_cents: 14000 },
    ] },
  { id: 'f-025', invoice_number: 'INV-025', period: '2026-04', amount_cents: 189200, currency: 'EUR', status: 'paid',
    issued_at: '2026-05-01', due_at: '2026-05-15', paid_at: '2026-05-03',
    line_items: [
      { label: 'Booking leads', qty: 19, unit_cents: 9200, amount_cents: 174800 },
      { label: 'Profile detail opens', qty: 72, unit_cents: 200, amount_cents: 14400 },
    ] },
  { id: 'f-024', invoice_number: 'INV-024', period: '2026-03', amount_cents: 152400, currency: 'EUR', status: 'paid',
    issued_at: '2026-04-01', due_at: '2026-04-15', paid_at: '2026-04-02',
    line_items: [
      { label: 'Booking leads', qty: 16, unit_cents: 9200, amount_cents: 147200 },
      { label: 'Profile detail opens', qty: 26, unit_cents: 200, amount_cents: 5200 },
    ] },
  { id: 'f-023', invoice_number: 'INV-023', period: '2026-02', amount_cents: 173200, currency: 'EUR', status: 'paid',
    issued_at: '2026-03-01', due_at: '2026-03-15', paid_at: '2026-03-02',
    line_items: [
      { label: 'Booking leads', qty: 18, unit_cents: 9200, amount_cents: 165600 },
      { label: 'Profile detail opens', qty: 38, unit_cents: 200, amount_cents: 7600 },
    ] },
  { id: 'f-022', invoice_number: 'INV-022', period: '2026-01', amount_cents: 160800, currency: 'EUR', status: 'paid',
    issued_at: '2026-02-01', due_at: '2026-02-15', paid_at: '2026-02-01',
    line_items: [
      { label: 'Booking leads', qty: 17, unit_cents: 9200, amount_cents: 156400 },
      { label: 'Profile detail opens', qty: 22, unit_cents: 200, amount_cents: 4400 },
    ] },
];

// Design fixture for the current-cycle preview (Pricing v2, ADR-0003):
// Growth, zwei rabattierte Leads verbraucht, einer offen.
const PREVIEW_FIXTURE: BillingPreview = {
  period: '2026-09',
  currency: 'USD',
  subscription: {
    plan_code: 'growth', label: 'Growth', cadence: 'monthly', status: 'active',
    current_period_start: '2026-09-01', current_period_end: '2026-10-01',
    monthly_cents: 9900, annual_cents: 99000, category_allowance: 5, analytics_level: 'enhanced', api_eligible: false,
  },
  discount: { pct: 10, count: 3, used: 2, remaining: 1, cycle_start: '2026-09-01' },
  leads: { count: 2, standard_cents: 24800, discount_cents: 2480, final_cents: 22320 },
  credit_balance_cents: 0,
  lines: [{ label: 'Growth · monthly · 2026-09', qty: 1, unit_cents: 9900, amount_cents: 9900 }],
  total_cents: 32220,
  pricing: {
    plans: [
      { code: 'essential', label: 'Essential', monthly_cents: 5900, annual_cents: 59000, currency: 'USD', category_allowance: 1, lead_discount_pct: 0, lead_discount_count: 0 },
      { code: 'growth', label: 'Growth', monthly_cents: 9900, annual_cents: 99000, currency: 'USD', category_allowance: 5, lead_discount_pct: 10, lead_discount_count: 3 },
      { code: 'global', label: 'Global', monthly_cents: 18900, annual_cents: 189000, currency: 'USD', category_allowance: null, lead_discount_pct: 15, lead_discount_count: 6 },
    ],
    bands: [
      { band: 1, label: 'Focused', fee_cents: 9900, currency: 'USD' },
      { band: 2, label: 'Core', fee_cents: 14900, currency: 'USD' },
      { band: 3, label: 'Advanced', fee_cents: 29900, currency: 'USD' },
      { band: 4, label: 'Strategic', fee_cents: 49900, currency: 'USD' },
    ],
  },
};

const STATUS_META: Record<Invoice['status'], { labelKey: string; tone: 'success' | 'error' | 'warning' | 'neutral' }> = {
  paid: { labelKey: 'billing.statusPaid', tone: 'success' },
  failed: { labelKey: 'billing.statusFailedGrace', tone: 'error' },
  open: { labelKey: 'billing.statusOpen', tone: 'warning' },
  void: { labelKey: 'billing.statusVoid', tone: 'neutral' },
};

export function BillingPage() {
  const { t } = useTranslation('providerws');
  const { data: invoices } = useApiData(fetchInvoices, FIXTURE);
  const { data: preview } = useApiData(fetchBillingPreview, PREVIEW_FIXTURE);
  const [detail, setDetail] = useState<Invoice | null>(null);
  // C3: "Update payment method" → Stripe billing portal; honest note until
  // STRIPE_SECRET_KEY lands on the API.
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalNote, setPortalNote] = useState('');
  const updatePayment = async () => {
    setPortalBusy(true); setPortalNote('');
    try {
      const target = await openBillingPortal();
      if (target === 'not-configured') {
        setPortalNote(t('billing.portalNotConfigured'));
      } else {
        window.location.href = target;
      }
    } catch {
      setPortalNote(t('billing.portalUnavailable'));
    }
    setPortalBusy(false);
  };

  const latest = invoices[0];
  const failed = invoices.find((i) => i.status === 'failed');
  const ytd = invoices.filter((i) => i.period.startsWith('2026')).reduce((n, i) => n + i.amount_cents, 0);
  const cur = preview.currency;
  const planLabel = preview.subscription
    ? `${preview.subscription.label} · ${t(preview.subscription.cadence === 'annual' ? 'billing.planCadenceAnnual' : 'billing.planCadenceMonthly')}`
    : t('billing.planNone');
  const kpis = [
    { label: t('billing.kpiThisMonth'), value: money(preview.total_cents, cur),
      trend: { value: '—', direction: 'neutral' as const, label: t('billing.kpiThisMonthUsage', { leads: preview.leads.count, remaining: preview.discount.remaining }) } },
    { label: t('billing.kpiLastInvoice'), value: latest ? money(latest.amount_cents, latest.currency) : '—',
      trend: latest?.status === 'failed'
        ? { value: '↘', direction: 'down' as const, label: `${latest.invoice_number} · ${t('billing.kpiPaymentFailed')}` }
        : { value: '—', direction: 'neutral' as const, label: latest ? `${latest.invoice_number} · ${latest.status}` : '' } },
    { label: t('billing.kpiNextInvoice'), value: '2026-08-01', trend: { value: '—', direction: 'neutral' as const, label: t('billing.kpiMonthlyFirst') } },
    { label: t('billing.kpiYtd'), value: money(ytd, latest?.currency ?? cur), trend: { value: '↗', direction: 'up' as const, label: t('billing.kpiAcrossMonths', { count: invoices.length }) } },
  ];

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('billing.title')}</h1>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">
            {t('billing.subtitle')}
          </p>
        </div>

        {failed && (
          <Banner
            status="error"
            title={t('billing.paymentFailedBanner', { invoice: failed.invoice_number })}
            action={<Button size="sm" variant="danger" onClick={updatePayment} disabled={portalBusy}>{portalBusy ? '…' : t('billing.updatePaymentMethod')}</Button>}
          >
            {t('billing.paymentFailedBody')}
          </Banner>
        )}
        {portalNote && (
          <p className="rounded-lg border border-elevate/10 bg-elevate/[0.04] px-4 py-3 text-[12px] text-fg-secondary">{portalNote}</p>
        )}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((k) => (
            <KPICard key={k.label} label={k.label} value={k.value} trend={k.trend} />
          ))}
        </div>

        {/* Laufender Zyklus (Pricing v2, ADR-0003): Abo-Zeile des Monats plus
            die Lead-Belastungen des Zyklus aus dem Ledger — Standard, Rabatt,
            Endbetrag, wie Spec B es verlangt. */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-fg">{t('billing.currentPeriodTitle', { period: preview.period })}</h2>
              <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('billing.currentPeriodHint')}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-fg-tertiary">{t('billing.planLabel')}: <span className="font-semibold text-fg">{planLabel}</span></p>
              {preview.discount.count > 0 && (
                <p className="text-[12px] text-fg-brand">{t('billing.discountRemaining', { remaining: preview.discount.remaining, count: preview.discount.count, pct: preview.discount.pct })}</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-stroke bg-surface-secondary/40">
            {preview.lines.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-fg-tertiary">{t('billing.currentPeriodEmpty')}</p>
            ) : preview.lines.map((l) => (
              <div key={l.label} className="flex items-center justify-between border-b border-stroke px-5 py-3 text-[13px] last:border-b-0">
                <span className="min-w-0 truncate text-fg-secondary">{l.label}</span>
                <span className="ml-4 shrink-0 tabular-nums text-fg">{l.qty} × {money(l.unit_cents, cur)} = <span className="font-semibold">{money(l.amount_cents, cur)}</span></span>
              </div>
            ))}
            {preview.leads.count > 0 && (
              <div className="flex items-center justify-between border-b border-stroke px-5 py-3 text-[13px]">
                <span className="min-w-0 truncate text-fg-secondary">{t('billing.leadsLine', { count: preview.leads.count, discount: money(preview.leads.discount_cents, cur) })}</span>
                <span className="ml-4 shrink-0 tabular-nums text-fg"><s className="text-fg-tertiary">{money(preview.leads.standard_cents, cur)}</s> <span className="font-semibold">{money(preview.leads.final_cents, cur)}</span></span>
              </div>
            )}
            <div className="flex items-center justify-between px-5 py-3 text-[13px]">
              <span className="font-semibold text-fg">{t('billing.currentPeriodTotal')}</span>
              <span className="font-bold tabular-nums text-fg-accent">{money(preview.total_cents, cur)}</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">{t('billing.historyTitle')}</h2>
            <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('billing.historyHint')}</p>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t('billing.colInvoice')}</TH>
                <TH>{t('billing.colPeriod')}</TH>
                <TH numeric>{t('billing.colTotal')}</TH>
                <TH>{t('billing.colStatus')}</TH>
                <TH>{t('billing.colActions')}</TH>
              </TR>
            </THead>
            <TBody>
              {invoices.map((inv) => {
                const m = STATUS_META[inv.status];
                return (
                  <TR key={inv.id} className="cursor-pointer transition-colors hover:bg-elevate/[0.04]" onClick={() => setDetail(inv)}>
                    <TD bold>{inv.invoice_number}</TD>
                    <TD>{inv.period}</TD>
                    <TD numeric>{money(inv.amount_cents, inv.currency)}</TD>
                    <TD><Tag tone={m.tone}>{t(m.labelKey)}</Tag></TD>
                    <TD className="text-fg-secondary">{inv.status === 'failed' ? t('billing.rowActionFailed') : t('billing.rowActionView')}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </section>
      </div>
      <InvoiceDetailDrawer invoice={detail} onClose={() => setDetail(null)} />
    </ProviderShell>
  );
}
