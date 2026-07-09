import { ProviderShell } from '../../components/provider/ProviderShell';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { KPICard } from '../../components/ui/Cards';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Tag } from '../../components/ui/Tag';

// ─── Provider /billing ────────────────────────────────────────────────────────
// Mirrors "Provider Dashboard v1 · /billing (Desktop · payment-failed)"
// (1911:370): payment-failed banner · 4 month KPIs · invoice history table.
// Design fixture data until the billing API lands.

const KPIS = [
  { label: 'THIS MONTH (RUNNING)', value: '€1,438', trend: { value: '—', direction: 'neutral' as const, label: '14 confirms + 17 clicks' } },
  { label: 'LAST INVOICE', value: '€2,164', trend: { value: '↘', direction: 'down' as const, label: 'INV-026 · payment FAILED' } },
  { label: 'NEXT INVOICE', value: '2026-06-01', trend: { value: '—', direction: 'neutral' as const, label: 'in 15 days' } },
  { label: 'YTD', value: '€8,920', trend: { value: '↗', direction: 'up' as const, label: 'across 5 months' } },
];

const INVOICES = [
  { id: 'INV-026', period: '2026-05', total: '€2,164', status: 'failed · grace', tone: 'error' as const, actions: 'Update payment · Retry' },
  { id: 'INV-025', period: '2026-04', total: '€1,892', status: 'paid', tone: 'success' as const, actions: 'Download PDF · View' },
  { id: 'INV-024', period: '2026-03', total: '€1,524', status: 'paid', tone: 'success' as const, actions: 'Download PDF · View' },
  { id: 'INV-023', period: '2026-02', total: '€1,732', status: 'paid', tone: 'success' as const, actions: 'Download PDF · View' },
  { id: 'INV-022', period: '2026-01', total: '€1,608', status: 'paid', tone: 'success' as const, actions: 'Download PDF · View' },
];

export function BillingPage() {
  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">Billing</h1>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">
            Stripe-issued invoices · monthly on the 1st · pricing: €92 per confirm + €2 per affiliate click + €0 subscription.
          </p>
        </div>

        <Banner
          status="error"
          title="Payment failed on INV-026 · 5 days grace remaining"
          action={<Button size="sm" variant="danger">Update payment method</Button>}
        >
          Stripe returned 'insufficient_funds' on 2026-05-28. Retry or update your payment method to avoid workspace lock.
        </Banner>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {KPIS.map((k) => (
            <KPICard key={k.label} label={k.label} value={k.value} trend={k.trend} />
          ))}
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">Invoice history</h2>
            <p className="mt-0.5 text-[12px] text-fg-tertiary">Last 6 months · click any row for PDF + line items</p>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Invoice</TH>
                <TH>Period</TH>
                <TH numeric>Total</TH>
                <TH>Status</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {INVOICES.map((inv) => (
                <TR key={inv.id}>
                  <TD bold>{inv.id}</TD>
                  <TD>{inv.period}</TD>
                  <TD numeric>{inv.total}</TD>
                  <TD><Tag tone={inv.tone}>{inv.status}</Tag></TD>
                  <TD className="text-fg-secondary">{inv.actions}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>
      </div>
    </ProviderShell>
  );
}
