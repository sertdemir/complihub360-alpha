-- ─── Anonymes Matching: ein opaker Schluessel und ein Register, das gelesen wird ─
--
-- Phase 3 des Provider-Plans. Grundlage: Spec A §13 (Sichtbarkeitsklassen),
-- §15 (Anonymous Match Card: "Do not show names, logos, ... unique wording or
-- other information that reasonably reveals identity before booking"),
-- DNA §3 ("Quality before brand recognition"), ADR-0004.
--
-- ─── Was bisher fehlte ───────────────────────────────────────────────────────
--
-- `provider_key` wird beim Intake aus dem Firmennamen gebildet
-- ("Testkanzlei Schmidt GmbH" → "testkanzlei-schmidt-gmbh") und steht in jeder
-- Antwort an den Nutzer: Suche, Detail, Buchung, Termine. Die Karte zeigt den
-- Klarnamen nicht — der Draht schon. Wer die Netzwerkkonsole oeffnet, weiss,
-- wer "Verified Provider B" ist. Die Anonymitaet war eine CSS-Eigenschaft.
--
-- Dazu: `provider_field_visibility` existiert seit dem 20.09., aber kein Code
-- liest es. Die API serialisiert nach handgeschriebenen Listen, und /detail
-- liefert Felder, die das Register als 'internal' fuehrt.
--
-- ─── Was hier liegt ──────────────────────────────────────────────────────────
--
-- 1. `providers.public_ref`: zwoelf Hex-Zeichen aus Zufall, eindeutig, nicht
--    ableitbar. Ab jetzt der einzige Anbieter-Bezeichner, der einen Nutzer
--    erreicht. `provider_key` bleibt der interne Schluessel und der Pfad der
--    Anbieter-eigenen Routen (Ownership-Guard).
-- 2. Register-Eintraege fuer die Felder, die seit dem Dossier (20260915) auf
--    dem Draht liegen, aber nie klassiert wurden — und zwei ausdrueckliche
--    'internal'-Eintraege, damit der Serializer `provider_key` und das
--    abgeloeste `pseudonym_label` nicht "vergessen" kann.
--
-- ─── Was hier bewusst NICHT liegt ────────────────────────────────────────────
--
-- Kein Trigger, der `pseudonym_label` leert, keine Spalte faellt. Der Titel
-- vor der Buchung entsteht ab jetzt in der API (anonymity.ts: Buchstabe je
-- Ergebnisliste plus Beschreibung aus freigegebenen Bereichen und Region).
-- `pseudonym_label` wird nicht mehr angenommen und nicht mehr gelesen; die
-- Spalte faellt mit `partner_status`, `categories` und `countries_supported`
-- in einem eigenen Schritt, sobald nichts mehr daran haengt.

-- ─── 1. public_ref ───────────────────────────────────────────────────────────
--
-- md5(random || clock) statt gen_random_bytes: braucht keine Extension, und
-- zwoelf Hex-Zeichen (48 Bit) reichen fuer ein Verzeichnis, das in Tausenden
-- zaehlt. Ein Konflikt scheitert am UNIQUE-Index — bei 48 Bit ist das ein
-- Ereignis, das der Trigger nie sehen wird, und wenn doch, sagt es die
-- Datenbank, statt still zu ueberschreiben.

CREATE OR REPLACE FUNCTION public.gen_public_ref() RETURNS text
LANGUAGE sql VOLATILE AS $$
  SELECT substr(md5(random()::text || clock_timestamp()::text || txid_current()::text), 1, 12)
$$;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS public_ref text;

-- Backfill: jeder bestehende Anbieter bekommt einen Ref, bevor die Spalte
-- Pflicht wird. Zeile fuer Zeile, damit clock_timestamp() je Aufruf variiert.
UPDATE public.providers SET public_ref = public.gen_public_ref() WHERE public_ref IS NULL;

ALTER TABLE public.providers
  ALTER COLUMN public_ref SET NOT NULL,
  ALTER COLUMN public_ref SET DEFAULT public.gen_public_ref();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'providers_public_ref_key') THEN
    ALTER TABLE public.providers ADD CONSTRAINT providers_public_ref_key UNIQUE (public_ref);
  END IF;
END $$;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_public_ref_shape CHECK (public_ref ~ '^[0-9a-f]{12}$') NOT VALID;
ALTER TABLE public.providers VALIDATE CONSTRAINT providers_public_ref_shape;

COMMENT ON COLUMN public.providers.public_ref IS
  'Opaker Anbieter-Bezeichner fuer alles, was ein Nutzer sieht (Suche, Detail, Buchung, Termine). Zufall, nicht aus dem Namen ableitbar. provider_key bleibt intern und fuer die Anbieter-eigenen Routen.';

-- ─── 2. Das Register wird vollstaendig ───────────────────────────────────────
--
-- Standard zu: ein Feld ohne Eintrag erscheint nirgends. Damit der Serializer
-- die Dossier-Felder ausgeben darf, muessen sie hier stehen. `confirmation_rate`
-- bleibt 'internal' (Ranking liest es, die Karte nicht — sie bekommt den Wert
-- ueber rank_basis als gerundete Aussage, nicht als Rohzahl aus der Zeile).

INSERT INTO public.provider_field_visibility (field_path, visibility_class, note) VALUES
  ('providers.public_ref',        'anonymous', 'Opaker Bezeichner, ersetzt provider_key auf dem Draht'),
  ('providers.services',          'anonymous', 'Freitext des Anbieters — laeuft durch den Identitaets-Scan'),
  ('providers.credentials',       'anonymous', 'Freitext des Anbieters — laeuft durch den Identitaets-Scan; keine Zertifikatslinks (§15)'),
  ('providers.excluded_services', 'anonymous', 'Freitext des Anbieters — laeuft durch den Identitaets-Scan'),
  ('providers.work_mode',         'anonymous', 'Freitext des Anbieters — laeuft durch den Identitaets-Scan'),
  ('providers.pricing_table',     'anonymous', 'Stufe 2 (Detail), Spec §5; Texte darin laufen durch den Scan'),
  ('providers.availability',      'anonymous', NULL),
  ('providers.provider_key',      'internal',  'Aus dem Firmennamen gebildet — nie an einen Nutzer'),
  ('providers.name',              'revealed',  'Klarname — Identitaetsmerkmal')
ON CONFLICT (field_path) DO UPDATE SET visibility_class = EXCLUDED.visibility_class, note = EXCLUDED.note;

-- Abgeloest: der Titel entsteht in der API. Das Feld bleibt, bis die
-- Altbestands-Spalten gemeinsam fallen.
UPDATE public.provider_field_visibility
   SET visibility_class = 'internal',
       note = 'Abgeloest (Phase 3): der Titel vor der Buchung entsteht in der API aus Buchstabe, Bereichen und Region. Wird nicht mehr angenommen und nicht mehr gelesen.'
 WHERE field_path = 'providers.pseudonym_label';

COMMENT ON TABLE public.provider_field_visibility IS
  'Feld → Sichtbarkeitsklasse (Spec §13). Seit Phase 3 liest anonymity.ts hieraus, welche Felder eine Antwort tragen darf; ein Feld ohne Eintrag gilt als "internal" und erscheint nirgends.';
