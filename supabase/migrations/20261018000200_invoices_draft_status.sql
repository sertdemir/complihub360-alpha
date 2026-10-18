-- ─── B7: die Rechnung steht in der Datenbank, bevor Stripe sie finalisiert ───
--
-- Silent-Failure-Durchgang 2026-10-16, Befund B7: der Monatslauf legte die
-- Stripe-Rechnung an, finalisierte und verschickte sie — und schrieb die
-- eigene Zeile erst danach. Brach er dazwischen ab (Netz, Prozess), kannte
-- die Datenbank die Rechnung nicht, und der naechste Lauf stellte eine zweite
-- aus. Dazu brach ein aeusseres `catch {}` den Lauf fuer alle weiteren
-- Anbieter ab.
--
-- Jetzt schreibt der Lauf die Zeile direkt nach dem Stripe-Create als
-- `draft` (mit stripe_invoice_id) und hebt sie nach dem Finalisieren auf
-- `open`. Ein `draft` ohne Fortschritt nimmt der naechste Lauf wieder auf,
-- statt neu auszustellen. `draft` ist nie faellig: Kulanzfrist, Einzug und
-- Sperre lesen weiter nur `open`.

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'open', 'paid', 'failed', 'void'));

COMMENT ON COLUMN public.invoices.status IS
  'draft (B7): bei Stripe angelegt, noch nicht finalisiert — der naechste Monatslauf nimmt sie wieder auf. open: ausgestellt und faellig. paid, failed, void aus dem Stripe-Abgleich.';
