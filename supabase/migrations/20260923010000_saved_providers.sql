-- ════════════════════════════════════════════════════════════════════════════
-- Das Anbieter-Lesezeichen
-- ════════════════════════════════════════════════════════════════════════════
--
-- Grundlage: Entscheidung vom 2026-09-20 ("Exporte entfaellt, Anbieter bekommen
-- drei Zustaende", Nutzer-Wahl 1b/1c/1d). Dort steht als Bauliste: Lesezeichen
-- an drei Flaechen, eine Tabelle mit Zeilenschutz, zwei Endpunkte. Das hier ist
-- die Tabelle.
--
-- Die Flaeche `/dashboard/saved-providers` bleibt vorerst "In Vorbereitung".
-- Zustand 1c (ehrlicher Leerzustand) wird erst moeglich, wenn es ueberhaupt
-- etwas zu merken gibt — deshalb kommt das Lesezeichen zuerst und die Seite
-- danach.
--
-- ─── Gaeste duerfen merken ──────────────────────────────────────────────────
--
-- Dieselbe Verankerung wie bei `sessions`: entweder `user_id` (angemeldet) oder
-- `guest_key` (Zufallskennung des Clients). Bei der Registrierung uebernimmt
-- das Konto die Gast-Lesezeichen, genau wie es die Gast-Sitzungen uebernimmt
-- (adoption.ts).
--
-- Das ist keine Bequemlichkeit, sondern die DNA: ein Merken-Knopf, der zuerst
-- ein Konto verlangt, erzeugt Reibung an einer Stelle, an der der Nutzer noch
-- gar nichts von uns will. "Knowledge should come before sales." Wer sich
-- spaeter anmeldet, findet seine Merkliste vor; wer es nicht tut, hat sie
-- trotzdem, solange sein `guest_key` lebt.
--
-- ─── Woher gemerkt, bleibt dabei ────────────────────────────────────────────
--
-- `source` haelt fest, VON WO gemerkt wurde, `session_id` bei einem Treffer aus
-- der Risk Map zusaetzlich, AUS WELCHER. Die gefuellte Liste (Zustand 1d) soll
-- das zeigen — ein Lesezeichen ohne Herkunft ist in drei Wochen eine Zeile, zu
-- der niemand mehr weiss, warum sie da steht.
--
-- `ON DELETE SET NULL` auf der Sitzung: wird die Risk Map geloescht, bleibt das
-- Lesezeichen. Der Anbieter ist weiterhin gemerkt, nur die Herkunft ist fort.

CREATE TABLE IF NOT EXISTS public.saved_providers (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Genau einer von beiden traegt die Zeile (CHECK unten).
  user_id      uuid        REFERENCES public.users(id) ON DELETE CASCADE,
  guest_key    text,

  provider_key text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,

  -- Die drei Flaechen aus der Entscheidung vom 20.09.
  source       text        NOT NULL
                           CHECK (source IN ('risk_map', 'thread', 'provider_page')),
  session_id   uuid        REFERENCES public.sessions(id) ON DELETE SET NULL,

  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT saved_providers_owner CHECK (user_id IS NOT NULL OR guest_key IS NOT NULL)
);

-- Einmal merken heisst einmal gemerkt. Zwei Teil-Indizes statt eines
-- zusammengesetzten, weil NULL in einem UNIQUE nicht mit sich selbst
-- kollidiert — ohne das koennte derselbe Anbieter beliebig oft in derselben
-- Merkliste landen.
CREATE UNIQUE INDEX IF NOT EXISTS saved_providers_user_unique
  ON public.saved_providers (user_id, provider_key) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS saved_providers_guest_unique
  ON public.saved_providers (guest_key, provider_key) WHERE guest_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS saved_providers_user_idx
  ON public.saved_providers (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS saved_providers_guest_idx
  ON public.saved_providers (guest_key, created_at DESC) WHERE guest_key IS NOT NULL;

COMMENT ON TABLE public.saved_providers IS
  'Anbieter-Lesezeichen (Entscheidung 2026-09-20). Gast oder Konto, nie beides; bei der Registrierung uebernimmt das Konto die Gast-Zeilen wie bei sessions. source und session_id halten fest, woher gemerkt wurde.';
COMMENT ON COLUMN public.saved_providers.source IS
  'Von welcher Flaeche gemerkt: risk_map (Trefferliste), thread (Gespraech), provider_page (Anbieterseite). Steht so in der gefuellten Liste.';
COMMENT ON COLUMN public.saved_providers.session_id IS
  'Bei einem Treffer aus der Risk Map: aus welcher. ON DELETE SET NULL — stirbt die Sitzung, bleibt das Lesezeichen und verliert nur seine Herkunft.';

-- ─── RLS ────────────────────────────────────────────────────────────────────
--
-- Dieselbe Haltung wie bei `sessions`: eigene Zeile lesen darf, wer angemeldet
-- ist; alles andere laeuft ueber die Service-Rolle, weil die API nach
-- `guest_key` filtert und ein anon-Client diese Tabelle nie direkt anfassen
-- soll. Ein Lesezeichen verraet, welchen Anbieter jemand im Auge hat — das
-- gehoert niemandem ausser ihm.

ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own saved providers" ON public.saved_providers;
CREATE POLICY "Users can read own saved providers"
  ON public.saved_providers FOR SELECT
  USING (user_id IS NOT NULL AND auth.uid() = user_id);
