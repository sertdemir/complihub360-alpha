-- ════════════════════════════════════════════════════════════════════════════
-- Anbieter sind nicht mehr oeffentlich lesbar — und gehoeren jemandem
-- ════════════════════════════════════════════════════════════════════════════
--
-- Anlass (2026-09-22, Phase 0 des Provider-Plans): zwei Wege fuehrten mit dem
-- anon-Key aus dem Browser-Bundle direkt an die Identitaet jedes Anbieters.
--
--   1. Die Policy "Providers are globally readable" (init, 2026-03-04) gab
--      `SELECT ... USING (true)` auf die ganze Zeile: Name, Website,
--      Kontakt-E-Mail, Stripe-Kunden-ID, USt-ID. Aus der Zeit, als die
--      Ergebnisliste den Namen noch zeigte.
--   2. `matchable_provider_services` lief ohne security_invoker. Postgres
--      prueft eine View dann gegen ihren OWNER, und der Owner umgeht RLS —
--      der Kommentar in 20260920000000 nahm das Gegenteil an. Die View traegt
--      `provider_key`, und der wird aus dem Firmennamen gebildet.
--
-- Beides ist mit 03_public_access_test.sql als `anon` reproduziert worden,
-- bevor diese Migration existierte.
--
-- Beides widerspricht dem, was die Plattform verspricht: Anbieter sind vor der
-- Buchung anonym (Spec A §13, Spec B "Before booking"; DNA §3 "Quality before
-- brand recognition"). Eine Anonymitaet, die nur in der API gilt, waehrend die
-- Datenbank daneben alles herausgibt, ist keine.
--
-- ─── Warum das nichts bricht ───────────────────────────────────────────────
--
-- Weder die UI noch die Edge Functions lesen `providers` oder die View direkt
-- (geprueft: kein `.from('providers')` in apps/vs1-demo/ui, die Functions
-- nutzen die Service-Rolle). Die API spricht ueber die Service-Rolle und
-- umgeht RLS ohnehin. Wer die Tabelle bisher direkt las, las sie zu Unrecht.

-- 1. Die Tabelle: RLS ohne Lese-Policy = null Zeilen fuer anon/authenticated.
--    Die Admin-Update-Policy bleibt; sie greift nur mit role=admin im JWT.
DROP POLICY IF EXISTS "Providers are globally readable" ON public.providers;

-- 2. Die View: gegen den Aufrufer pruefen, und den Browser-Rollen zusaetzlich
--    das Recht entziehen. Doppelt, weil jede Ebene allein schon einmal
--    falsch angenommen wurde.
ALTER VIEW public.matchable_provider_services SET (security_invoker = true);
REVOKE ALL ON public.matchable_provider_services FROM anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Mitgliedschaft: welcher Login gehoert zu welchem Anbieter
-- ════════════════════════════════════════════════════════════════════════════
--
-- Bisher gab es diese Verbindung nicht. Jede Route /api/v1/provider/:key/*
-- verlangte nur einen gueltigen Login — irgendeinen. Wer eingeloggt war,
-- konnte fremde Profile aendern, fremde Leads lesen und das Stripe-Portal
-- fremder Anbieter oeffnen. Die UI war fest auf einen Demo-Anbieter verdrahtet.
--
-- Spec B: "Each provider account has one dashboard user". Spec A kennt
-- Admin und Team-Mitglied. Entscheidung (2026-09-22): zum Launch EIN Login je
-- Anbieter, aber die Struktur traegt Rollen, damit Teams spaeter ohne
-- Umbau kommen. Die Launch-Grenze ist ein Index, keine Spalte — wer Teams
-- freischaltet, loescht `provider_members_one_per_provider` und sonst nichts.

CREATE TABLE IF NOT EXISTS public.provider_members (
  provider_key text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'owner'
                           CHECK (role IN ('owner', 'admin', 'member')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_key, user_id)
);

-- Ein Login gehoert hoechstens zu einem Anbieter. Sonst waere offen, welches
-- Dashboard `/me/provider` meint.
CREATE UNIQUE INDEX IF NOT EXISTS provider_members_one_provider_per_user
  ON public.provider_members (user_id);

-- Launch-Grenze aus Spec B: ein Dashboard-User je Anbieter.
CREATE UNIQUE INDEX IF NOT EXISTS provider_members_one_per_provider
  ON public.provider_members (provider_key);

COMMENT ON TABLE public.provider_members IS
  'Login -> Anbieter. Grundlage der Ownership-Pruefung in der API (providerAuth.ts). '
  'Zum Launch genau ein Login je Anbieter (Index provider_members_one_per_provider).';

-- Deny-all: keine Policy. Nur die Service-Rolle liest, und die API entscheidet.
ALTER TABLE public.provider_members ENABLE ROW LEVEL SECURITY;

-- ─── Befuellung aus dem Bestand ────────────────────────────────────────────
-- Wo die Kontakt-E-Mail eines Anbieters genau einem Login entspricht, ist die
-- Zuordnung eindeutig. Mehrdeutiges bleibt leer und wird von Hand gesetzt —
-- lieber ein Anbieter ohne Login als einer mit dem falschen.
INSERT INTO public.provider_members (provider_key, user_id, role)
SELECT p.provider_key, u.id, 'owner'
FROM public.providers p
JOIN auth.users u ON lower(u.email) = lower(p.contact_email)
WHERE p.contact_email IS NOT NULL
  AND (SELECT count(*) FROM auth.users u2 WHERE lower(u2.email) = lower(p.contact_email)) = 1
  AND (SELECT count(*) FROM public.providers p2 WHERE lower(p2.contact_email) = lower(p.contact_email)) = 1
ON CONFLICT DO NOTHING;
