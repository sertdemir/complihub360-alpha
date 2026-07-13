import { apiFetch } from './client';
import { DEMO_PROVIDER_KEY } from './provider';

// ─── Billing API (wiring map B7) ─────────────────────────────────────────────
// Invoice history + line items. Stripe becomes the issuer once C3 lands; the
// rows and the pricing model (€92/confirm + €2/click) are real already.

export interface InvoiceLineItem {
  label: string;
  qty: number;
  unit_cents: number;
  amount_cents: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  period: string;
  amount_cents: number;
  currency: string;
  status: 'open' | 'paid' | 'failed' | 'void';
  line_items: InvoiceLineItem[];
  issued_at: string;
  due_at?: string | null;
  paid_at?: string | null;
}

export function euro(cents: number): string {
  return '€' + (cents / 100).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export async function fetchInvoices(providerKey: string = DEMO_PROVIDER_KEY): Promise<Invoice[]> {
  const res = await apiFetch<{ ok: boolean; invoices: Invoice[] }>(`/api/v1/provider/${providerKey}/invoices`);
  return res.invoices;
}
