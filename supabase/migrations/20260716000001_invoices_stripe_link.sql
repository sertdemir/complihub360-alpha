-- Stripe-Invoicing: link platform invoices to their Stripe counterparts.
-- hosted_invoice_url = Stripe's pay/view page, invoice_pdf = direct PDF link.
alter table public.invoices add column if not exists stripe_invoice_id text unique;
alter table public.invoices add column if not exists hosted_invoice_url text;
alter table public.invoices add column if not exists invoice_pdf text;
