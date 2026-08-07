-- Wave B7: provider invoices (Stripe-issued once C3 lands; seeded until then).
-- Amounts follow the pricing model: €92 per confirm + €2 per affiliate click.

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_key text NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  period text NOT NULL,                       -- 'YYYY-MM'
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL CHECK (status IN ('open', 'paid', 'failed', 'void')),
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  issued_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  due_at timestamp with time zone,
  paid_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_invoices_provider ON public.invoices(provider_key, period);

-- All access goes through the API (service role).
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
