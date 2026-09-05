import { useTranslation } from 'react-i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { euro, type Invoice } from '../../api/billing';

// ─── Invoice-Detail drawer (Figma 2653:92 · wiring map B7) ───────────────────
// Line items + totals for one invoice. Stripe-issued rows (monthly billing
// run) link out to the hosted pay page and the PDF; legacy seeded rows keep
// the honest disabled state.

const STATUS_TONE: Record<Invoice['status'], 'success' | 'error' | 'warning' | 'neutral'> = {
  paid: 'success',
  failed: 'error',
  open: 'warning',
  void: 'neutral',
};

// api-derived status → display label mapping (defaultValue = raw status).
const STATUS_KEY: Record<Invoice['status'], string> = {
  paid: 'invoiceDetail.statusPaid',
  failed: 'invoiceDetail.statusFailed',
  open: 'invoiceDetail.statusOpen',
  void: 'invoiceDetail.statusVoid',
};

function day(iso?: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—';
}

export function InvoiceDetailDrawer({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const { t } = useTranslation('providerws');
  return (
    <Drawer
      open={!!invoice}
      onClose={onClose}
      side="right"
      size="md"
      eyebrow={t('invoiceDetail.eyebrow')}
      title={invoice?.invoice_number ?? t('invoiceDetail.fallbackTitle')}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {invoice?.hosted_invoice_url ? (
            <>
              <a href={invoice.invoice_pdf ?? invoice.hosted_invoice_url} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">{t('invoiceDetail.downloadPdf')}</Button>
              </a>
              <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer">
                <Button variant="accent" size="sm">
                  {invoice.status === 'open' ? t('invoiceDetail.payAtStripe') : t('invoiceDetail.viewAtStripe')}
                </Button>
              </a>
            </>
          ) : (
            <>
              <p className="text-[11px] leading-snug text-fg-tertiary">{t('invoiceDetail.pdfNote')}</p>
              <Button variant="secondary" size="sm" disabled>{t('invoiceDetail.downloadPdf')}</Button>
            </>
          )}
        </div>
      }
    >
      {invoice && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={STATUS_TONE[invoice.status]}>{t(STATUS_KEY[invoice.status], { defaultValue: invoice.status })}</Tag>
            <span className="text-[12px] text-fg-tertiary">{t('invoiceDetail.period', { period: invoice.period })}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { k: t('invoiceDetail.issued'), v: day(invoice.issued_at) },
              { k: t('invoiceDetail.due'), v: day(invoice.due_at) },
              { k: t('invoiceDetail.paid'), v: invoice.status === 'paid' ? day(invoice.paid_at) : '—' },
            ].map((m) => (
              <div key={m.k} className="rounded-lg border border-elevate/10 bg-elevate/[0.03] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{m.k}</p>
                <p className="mt-0.5 text-[13px] font-medium text-fg">{m.v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03]">
            <p className="border-b border-elevate/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">
              {t('invoiceDetail.lineItems')}
            </p>
            {invoice.line_items.map((li) => (
              <div key={li.label} className="flex items-baseline justify-between gap-3 border-b border-elevate/5 px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-fg">{li.label}</p>
                  <p className="mt-0.5 text-[11px] text-fg-tertiary">{li.qty} × {euro(li.unit_cents)}</p>
                </div>
                <p className="shrink-0 text-[13px] font-semibold text-fg">{euro(li.amount_cents)}</p>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-elevate/10 px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-fg-secondary">{t('invoiceDetail.total')}</p>
              <p className="text-[16px] font-bold text-fg">{euro(invoice.amount_cents)}</p>
            </div>
          </div>

          {invoice.status === 'failed' && (
            <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] leading-relaxed text-error-500">
              {t('invoiceDetail.failedNote')}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-fg-tertiary">
            {t('invoiceDetail.pricingNote')}
          </p>
        </div>
      )}
    </Drawer>
  );
}
