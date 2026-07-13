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
import { fetchInvoices, openBillingPortal, euro, type Invoice } from '../../api/billing';

// ─── Provider /billing ────────────────────────────────────────────────────────
// Mirrors "Provider Dashboard v1 · /billing (Desktop · payment-failed)"
// (1911:370): payment-failed banner · 4 month KPIs · invoice history table.
// B7: rows come from the invoices table; a row click opens the detail drawer.

const FIXTURE: Invoice[] = [
  { id: 'f-026', invoice_number: 'INV-026', period: '2026-05', amount_cents: 216400, currency: 'EUR', status: 'failed',
    issued_at: '2026-06-01', due_at: '2026-06-15', paid_at: null,
    line_items: [
      { label: 'Confirmed engagements', qty: 22, unit_cents: 9200, amount_cents: 202400 },
      { label: 'Affiliate clicks', qty: 70, unit_cents: 200, amount_cents: 14000 },
    ] },
  { id: 'f-025', invoice_number: 'INV-025', period: '2026-04', amount_cents: 189200, currency: 'EUR', status: 'paid',
    issued_at: '2026-05-01', due_at: '2026-05-15', paid_at: '2026-05-03',
    line_items: [
      { label: 'Confirmed engagements', qty: 19, unit_cents: 9200, amount_cents: 174800 },
      { label: 'Affiliate clicks', qty: 72, unit_cents: 200, amount_cents: 14400 },
    ] },
  { id: 'f-024', invoice_number: 'INV-024', period: '2026-03', amount_cents: 152400, currency: 'EUR', status: 'paid',
    issued_at: '2026-04-01', due_at: '2026-04-15', paid_at: '2026-04-02',
    line_items: [
      { label: 'Confirmed engagements', qty: 16, unit_cents: 9200, amount_cents: 147200 },
      { label: 'Affiliate clicks', qty: 26, unit_cents: 200, amount_cents: 5200 },
    ] },
  { id: 'f-023', invoice_number: 'INV-023', period: '2026-02', amount_cents: 173200, currency: 'EUR', status: 'paid',
    issued_at: '2026-03-01', due_at: '2026-03-15', paid_at: '2026-03-02',
    line_items: [
      { label: 'Confirmed engagements', qty: 18, unit_cents: 9200, amount_cents: 165600 },
      { label: 'Affiliate clicks', qty: 38, unit_cents: 200, amount_cents: 7600 },
    ] },
  { id: 'f-022', invoice_number: 'INV-022', period: '2026-01', amount_cents: 160800, currency: 'EUR', status: 'paid',
    issued_at: '2026-02-01', due_at: '2026-02-15', paid_at: '2026-02-01',
    line_items: [
      { label: 'Confirmed engagements', qty: 17, unit_cents: 9200, amount_cents: 156400 },
      { label: 'Affiliate clicks', qty: 22, unit_cents: 200, amount_cents: 4400 },
    ] },
];

const STATUS_META: Record<Invoice['status'], { labelKey: string; tone: 'success' | 'error' | 'warning' | 'neutral' }> = {
  paid: { labelKey: 'billing.statusPaid', tone: 'success' },
  failed: { labelKey: 'billing.statusFailedGrace', tone: 'error' },
  open: { labelKey: 'billing.statusOpen', tone: 'warning' },
  void: { labelKey: 'billing.statusVoid', tone: 'neutral' },
};

export function BillingPage() {
  const { t } = useTranslation('providerws');
  const { data: invoices } = useApiData(fetchInvoices, FIXTURE);
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
  const kpis = [
    { label: t('billing.kpiThisMonth'), value: '€1,438', trend: { value: '—', direction: 'neutral' as const, label: t('billing.kpiThisMonthTrend') } },
    { label: t('billing.kpiLastInvoice'), value: latest ? euro(latest.amount_cents) : '—',
      trend: latest?.status === 'failed'
        ? { value: '↘', direction: 'down' as const, label: `${latest.invoice_number} · ${t('billing.kpiPaymentFailed')}` }
        : { value: '—', direction: 'neutral' as const, label: latest ? `${latest.invoice_number} · ${latest.status}` : '' } },
    { label: t('billing.kpiNextInvoice'), value: '2026-08-01', trend: { value: '—', direction: 'neutral' as const, label: t('billing.kpiMonthlyFirst') } },
    { label: t('billing.kpiYtd'), value: euro(ytd), trend: { value: '↗', direction: 'up' as const, label: t('billing.kpiAcrossMonths', { count: invoices.length }) } },
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
          <p className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] text-fg-secondary">{portalNote}</p>
        )}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((k) => (
            <KPICard key={k.label} label={k.label} value={k.value} trend={k.trend} />
          ))}
        </div>

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
                  <TR key={inv.id} className="cursor-pointer transition-colors hover:bg-white/[0.04]" onClick={() => setDetail(inv)}>
                    <TD bold>{inv.invoice_number}</TD>
                    <TD>{inv.period}</TD>
                    <TD numeric>{euro(inv.amount_cents)}</TD>
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
