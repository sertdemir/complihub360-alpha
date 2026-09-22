import { apiFetch } from './client';
import { myProviderKey } from './provider';

// ─── Billing API (wiring map B7) ─────────────────────────────────────────────
// Invoice history + line items (Stripe-issued) and the live preview of the
// running cycle under Pricing v2 (Spec B, ADR-0003, 2026-09-22).

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
  // Stripe-issued invoices (monthly billing run) carry the pay page + PDF.
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
}

// Betraege tragen ihre Waehrung mit: Abo und Leads laufen seit Pricing v2 in
// USD, Alt-Rechnungen aus Phase 1 stehen in EUR.
export function money(cents: number, currency: string = 'USD'): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export async function fetchInvoices(providerKey?: string): Promise<Invoice[]> {
  const res = await apiFetch<{ ok: boolean; invoices: Invoice[] }>(`/api/v1/provider/${providerKey ?? await myProviderKey()}/invoices`);
  return res.invoices;
}

// ─── Current-cycle preview (Pricing v2) ──────────────────────────────────────
// Spec B: "The dashboard must show allowance used, allowance remaining,
// standard fee, discount, and final charge." Plan, Rabattkontingent des
// laufenden Zyklus, Lead-Belastungen aus dem Ledger, Guthaben, Preisliste.
// Pure computation server-side; nothing here is a ranking input.
export type PlanCode = 'essential' | 'growth' | 'global';

export interface BillingPreview {
  period: string;
  currency: string;
  subscription: {
    plan_code: PlanCode; label: string; cadence: 'monthly' | 'annual'; status: string;
    current_period_start: string; current_period_end: string;
    monthly_cents: number; annual_cents: number; category_allowance: number | null;
    analytics_level: 'basic' | 'enhanced' | 'advanced'; api_eligible: boolean;
  } | null;
  discount: { pct: number; count: number; used: number; remaining: number; cycle_start: string };
  leads: { count: number; standard_cents: number; discount_cents: number; final_cents: number };
  credit_balance_cents: number;
  lines: InvoiceLineItem[];
  total_cents: number;
  pricing: {
    plans: Array<{ code: PlanCode; label: string; monthly_cents: number; annual_cents: number; currency: string; category_allowance: number | null; lead_discount_pct: number; lead_discount_count: number }>;
    bands: Array<{ band: 1 | 2 | 3 | 4; label: string; fee_cents: number; currency: string }>;
  };
}

export async function fetchBillingPreview(providerKey?: string): Promise<BillingPreview> {
  return apiFetch<BillingPreview & { ok: boolean }>(`/api/v1/provider/${providerKey ?? await myProviderKey()}/billing/preview`);
}

// ─── Stripe billing portal (wiring map C3) ───────────────────────────────────
// Resolves to the portal URL, or 'not-configured' while STRIPE_SECRET_KEY is
// missing on the API (503) — the page shows an honest note instead of a dead end.
export async function openBillingPortal(providerKey?: string): Promise<string | 'not-configured'> {
  try {
    const res = await apiFetch<{ ok: boolean; url: string }>(`/api/v1/provider/${providerKey ?? await myProviderKey()}/billing-portal`, {
      method: 'POST',
      body: '{}',
    });
    return res.url;
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 503) return 'not-configured';
    throw e;
  }
}
