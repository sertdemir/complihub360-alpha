-- ════════════════════════════════════════════════════════════════════════════
-- ADR-0008, Wahl A2: der Weg zurueck nach einer gescheiterten Lead-Belastung
-- ════════════════════════════════════════════════════════════════════════════
--
-- Bis heute hob genau eine Sache den Grund `payment_failed` auf: ein ANDERES
-- Standard-Zahlungsmittel. `syncBillingReadiness` vergleicht
-- `last_payment_failure.payment_method_id` mit dem aktuellen Standard — ist es
-- dasselbe, bleibt die Buchung gesperrt. Fuer den Normalfall *Karte dauerhaft
-- ungueltig* ist das richtig (ADR-0005). Fuer den Fall *Karte war an einem Tag
-- nicht gedeckt* gab es keinen Ausgang ausser „neue Karte hinterlegen".
--
-- Beschlossen am 2026-10-10 (ADR-0008, Wahl A2): Der Anbieter kann die Pruefung
-- selbst anstossen. Ein SetupIntent ueber 0 EUR fragt die Bank, ob das Mittel
-- noch taugt; bestaetigt sie es, faellt `payment_failed` weg. Kein Automatiklauf
-- (A3) — bei einer Lead-Belastung ist nichts nachzuholen, nur freizugeben.
--
-- Was diese Migration anlegt:
--   1. billing_policy.recheck_max_per_24h — wie oft das angestossen werden darf
--   2. provider_payment_recheck          — jeder Versuch mit Ergebnis, append-only

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Die Obergrenze gehoert in die Konfiguration, nicht in den Quelltext
-- ════════════════════════════════════════════════════════════════════════════
--
-- Dieselbe Begruendung wie bei `cure_period_days` (20261007000000): ein Wert,
-- den der Anbieter spuert, gehoert versioniert und mit Begruendung abgelegt.
-- Die Vorgaenger-Migration liess die Spalte bewusst weg, weil A noch offen war
-- — „eine leere Spalte hier wuerde so aussehen, als waere die Entscheidung
-- schon gefallen". Jetzt ist sie gefallen, also kommt die Spalte.
--
-- `per_24h`, nicht `per_day`: gezaehlt wird ein ROLLENDES Fenster von 24
-- Stunden, kein Kalendertag. Der Unterschied ist genau die Falle, die uns bei
-- der Kulanzfrist schon einmal erwischt hat (Zeitstempel vs. Kalendertage):
-- ein Kalendertag haette dem Anbieter um 23:50 drei Versuche gegeben und um
-- 00:10 drei weitere, und „morgen wieder" waere je nach Zeitzone falsch
-- gewesen. Das rollende Fenster nennt dem Anbieter stattdessen einen echten
-- Zeitpunkt.

ALTER TABLE public.billing_policy
  ADD COLUMN IF NOT EXISTS recheck_max_per_24h integer
    CHECK (recheck_max_per_24h IS NULL OR recheck_max_per_24h BETWEEN 1 AND 20);

COMMENT ON COLUMN public.billing_policy.recheck_max_per_24h IS
  'ADR-0008, Wahl A2: so oft darf ein Anbieter die Pruefung seines Zahlungsmittels binnen 24 ROLLENDER Stunden selbst anstossen. Gezaehlt werden nur Versuche, die eine Antwort von Stripe bekamen (provider_payment_recheck) — eine Stripe-Stoerung geht nie auf das Konto des Anbieters. Ist der Wert NULL, greift RECHECK_MAX_FALLBACK_PER_24H im Code. Die Grenze ist nie ein Ausgang: ein anderes Zahlungsmittel im Portal wirkt sofort und zaehlt hier nicht mit.';

-- Version 1 bleibt, wie sie war: sie dokumentiert ADR-0006 und sonst nichts.
-- Eine Zahl dort nachzutragen hiesse, dem alten Beschluss eine Entscheidung
-- zuzuschreiben, die er nicht enthielt.
INSERT INTO public.billing_policy (version, cure_period_days, recheck_max_per_24h, effective_from, note) VALUES
  (2, 7, 3, DATE '2026-10-10',
   'ADR-0008, Wahl A2 (Nutzer, 2026-10-10). Kulanzfrist unveraendert bei 7 Tagen aus Version 1; neu die Obergrenze fuer die selbst angestossene Pruefung des Zahlungsmittels: 3 Versuche je 24 rollende Stunden. Drei, weil der Fall, den A2 loest, einer ist, der sich binnen eines Tages klaert — und weil wiederholte Pruefungen gegen eine ablehnende Karte bei den Kartennetzen auffallen. Wer mehr braucht, hinterlegt im Portal ein anderes Mittel; das wirkt sofort.')
ON CONFLICT (version) DO NOTHING;

COMMENT ON TABLE public.billing_policy IS
  'Konfigurierbare Abrechnungsgroessen mit Geldfolge, versioniert (Muster wie user_discount_policy). Die juengste Fassung mit effective_from <= heute gilt. Enthaelt nur, was entschieden ist: cure_period_days (ADR-0006 A2) und recheck_max_per_24h (ADR-0008 A2). Die reactivation rules aus Spec B ("Configurable items requiring final decision") bleiben offen und stehen hier nicht.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Jeder Versuch mit seinem Ergebnis
-- ════════════════════════════════════════════════════════════════════════════
--
-- Append-only, wie das Lead-Ledger: die Zeile entsteht NACH der Antwort von
-- Stripe und wird nie geaendert. Sie traegt zwei Lasten gleichzeitig:
--
--   * sie ist der Zaehler fuer das 24-Stunden-Fenster (zwei eq-Filter
--     genuegen, mehr kann der PostgREST-Helfer nicht), und
--   * sie ist die Spur, warum eine Sperre fiel oder blieb. Ohne sie waere
--     „die Karte wurde bestaetigt" eine Behauptung ohne Beleg.
--
-- `result` kennt nur zwei Werte, und das ist eine Entscheidung, keine
-- Unvollstaendigkeit: Ist Stripe nicht erreichbar, bekommt der Anbieter einen
-- Fehler zu sehen und es wird KEINE Zeile geschrieben. Eine Stoerung auf
-- unserer Seite darf sein Kontingent nicht verbrauchen.

CREATE TABLE IF NOT EXISTS public.provider_payment_recheck (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key       text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  payment_method_id  text,
  result             text        NOT NULL CHECK (result IN ('confirmed', 'declined')),
  reason             text,
  stripe_ref         text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.provider_payment_recheck IS
  'ADR-0008 A2: jede vom Anbieter selbst angestossene Pruefung seines Zahlungsmittels, mit dem Ergebnis von Stripe. Append-only. Zaehler fuer das 24-Stunden-Fenster (billing_policy.recheck_max_per_24h) und Beleg dafuer, warum der Grund payment_failed fiel oder blieb. Keine Zeile bei einer Stripe-Stoerung — die geht nicht auf das Kontingent des Anbieters.';

COMMENT ON COLUMN public.provider_payment_recheck.result IS
  'confirmed = die Bank hat das Mittel bestaetigt, der Grund payment_failed ist gefallen. declined = sie hat nicht bestaetigt (reason traegt den Grund, u. a. authentication_required: eine Bestaetigung, die off-session niemand geben kann).';

COMMENT ON COLUMN public.provider_payment_recheck.reason IS
  'Bei declined der normalisierte Grund aus ChargeFailureReason (card_declined, insufficient_funds, expired_card, authentication_required). Nie der Rohtext von Stripe — der gehoert ins Log, nicht in eine Tabelle, die eine Oberflaeche liest.';

CREATE INDEX IF NOT EXISTS provider_payment_recheck_provider_time
  ON public.provider_payment_recheck (provider_key, created_at DESC);

-- Lesen und schreiben darf der Server. Der Browser braucht die Zeilen nicht:
-- was die Abrechnungsseite zeigt, kommt aus der Antwort der Route.
ALTER TABLE public.provider_payment_recheck ENABLE ROW LEVEL SECURITY;
