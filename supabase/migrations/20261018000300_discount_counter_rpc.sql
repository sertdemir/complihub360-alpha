-- ─── B9: Rabattzaehler atomar ────────────────────────────────────────────────
--
-- Silent-Failure-Durchgang 2026-10-16, Befund B9: der Zaehler der
-- Monatsrabatte wurde als Read-before-write hochgesetzt (Upsert mit dem im
-- Code berechneten Stand), und der Fehler dahinter verschwand in einem leeren
-- `catch`. Zwei parallele Buchungen konnten dieselbe Rabattstufe zweimal
-- vergeben und den Zaehler um eins zu niedrig hinterlassen.
--
-- Jetzt zaehlt die Datenbank: eine Funktion erhoeht atomar und gibt den neuen
-- Stand zurueck. Die API ruft sie ueber RPC (Service-Rolle); anon und
-- authenticated duerfen sie nicht ausfuehren.

CREATE OR REPLACE FUNCTION public.increment_discount_counter(
  p_provider_key text,
  p_cycle_start  date,
  p_increment    integer DEFAULT 1
) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.provider_discount_counter (provider_key, cycle_start, used, updated_at)
  VALUES (p_provider_key, p_cycle_start, GREATEST(p_increment, 0), now())
  ON CONFLICT (provider_key, cycle_start)
  DO UPDATE SET used = public.provider_discount_counter.used + GREATEST(p_increment, 0), updated_at = now()
  RETURNING used;
$$;

REVOKE ALL ON FUNCTION public.increment_discount_counter(text, date, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_discount_counter(text, date, integer) TO service_role;

COMMENT ON FUNCTION public.increment_discount_counter(text, date, integer) IS
  'B9: erhoeht provider_discount_counter.used atomar um p_increment (>= 0) und gibt den neuen Stand zurueck. Nur Service-Rolle.';
