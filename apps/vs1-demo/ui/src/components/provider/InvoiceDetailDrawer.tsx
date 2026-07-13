import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { euro, type Invoice } from '../../api/billing';

// ─── Invoice-Detail drawer (Figma 2653:92 · wiring map B7) ───────────────────
// Line items + totals for one invoice. PDF download arrives with the Stripe
// portal (C3) — the button says so instead of pretending.

const STATUS_TONE: Record<Invoice['status'], 'success' | 'error' | 'warning' | 'neutral'> = {
  paid: 'success',
  failed: 'error',
  open: 'warning',
  void: 'neutral',
};

function day(iso?: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—';
}

export function InvoiceDetailDrawer({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  return (
    <Drawer
      forceDark
      open={!!invoice}
      onClose={onClose}
      side="right"
      size="md"
      eyebrow="INVOICE"
      title={invoice?.invoice_number ?? 'Invoice'}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-[11px] leading-snug text-fg-tertiary">PDF download arrives with the Stripe portal (C3).</p>
          <Button variant="secondary" size="sm" disabled>Download PDF</Button>
        </div>
      }
    >
      {invoice && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={STATUS_TONE[invoice.status]}>{invoice.status}</Tag>
            <span className="text-[12px] text-fg-tertiary">Period {invoice.period}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { k: 'Issued', v: day(invoice.issued_at) },
              { k: 'Due', v: day(invoice.due_at) },
              { k: 'Paid', v: invoice.status === 'paid' ? day(invoice.paid_at) : '—' },
            ].map((m) => (
              <div key={m.k} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{m.k}</p>
                <p className="mt-0.5 text-[13px] font-medium text-fg">{m.v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03]">
            <p className="border-b border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">
              Line items
            </p>
            {invoice.line_items.map((li) => (
              <div key={li.label} className="flex items-baseline justify-between gap-3 border-b border-white/5 px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-fg">{li.label}</p>
                  <p className="mt-0.5 text-[11px] text-fg-tertiary">{li.qty} × {euro(li.unit_cents)}</p>
                </div>
                <p className="shrink-0 text-[13px] font-semibold text-fg">{euro(li.amount_cents)}</p>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-white/10 px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-fg-secondary">Total</p>
              <p className="text-[16px] font-bold text-fg">{euro(invoice.amount_cents)}</p>
            </div>
          </div>

          {invoice.status === 'failed' && (
            <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] leading-relaxed text-error-500">
              Payment failed — retry or update your payment method in Billing to avoid a workspace lock.
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-fg-tertiary">
            Pricing model: €92 per confirmed engagement · €2 per affiliate click · €0 subscription.
          </p>
        </div>
      )}
    </Drawer>
  );
}
