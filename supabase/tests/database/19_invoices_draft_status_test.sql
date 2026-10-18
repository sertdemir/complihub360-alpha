-- ─── B7: Rechnung als Entwurf ────────────────────────────────────────────────
--
-- Gehoert zu 20261018000200_invoices_draft_status.sql. Geprueft wird:
--
--   1. `draft` ist ein gueltiger Status.
--   2. Der Katalog bleibt sonst geschlossen.
--   3. Der Entwurf wird zur offenen Rechnung (Update erlaubt).

begin;
select plan(3);

select lives_ok(
  $$ insert into public.invoices (provider_key, invoice_number, period, amount_cents, currency, status, stripe_invoice_id)
     values ('b7-kanzlei', 'in_b7_draft', '2026-10', 9900, 'USD', 'draft', 'in_b7_draft') $$,
  'Eine Rechnung darf als Entwurf stehen, sobald Stripe sie kennt');

select throws_ok(
  $$ insert into public.invoices (provider_key, invoice_number, period, amount_cents, currency, status)
     values ('b7-kanzlei', 'in_b7_bogus', '2026-10', 9900, 'USD', 'pending') $$,
  '23514', null, 'Nur die fuenf bekannten Zustaende');

select lives_ok(
  $$ update public.invoices set status = 'open', invoice_number = 'CH-0001', due_at = now() + interval '14 days'
     where stripe_invoice_id = 'in_b7_draft' $$,
  'Der Entwurf wird nach dem Finalisieren zur offenen Rechnung');

select * from finish();
rollback;
