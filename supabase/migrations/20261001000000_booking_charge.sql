-- ════════════════════════════════════════════════════════════════════════════
-- Provider Phase 4: Buchung → Bestaetigung → Belastung → Offenlegung
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B "Booking confirmation and data handover" (Schritte 1–6), "Mandatory
-- CompliHub360 user discount", Spec A §20/§21.1, ADR-0005. Entscheidungen des
-- Nutzers vom 2026-10-01: sofort belasten (PaymentIntent off-session), Karte
-- ueber das Billing-Portal mit Readiness-Sync in der API, Fehlerfall ohne
-- Buchung.
--
-- Was diese Migration anlegt:
--   1. booking_acknowledgements  — der Text, den der Nutzer vor der Buchung
--                                   bestaetigt, versioniert, je Sprache
--   2. user_discount_policy      — die 10 % fuer den Nutzer als Konfiguration
--   3. lead_proposal_reports     — die Selbstauskunft des Anbieters
--                                   („Angebot erstellt · Rabatt gezeigt")
--   4. scheduling                — Version, Ledger-Verknuepfung, Rabatt-Stand,
--                                   ein bestaetigter Termin je Slot
--   5. providers                 — wann zuletzt geprueft, letzte gescheiterte
--                                   Belastung
--
-- Was sie bewusst NICHT tut: provider_lead_ledger anfassen. Das Ledger ist
-- append-only (20260923000000) und muss VOR der Buchung existieren, weil die
-- Ledger-ID der Idempotency-Key der Belastung ist. Deshalb zeigt kuenftig die
-- Buchung auf das Ledger (scheduling.lead_ledger_id), nicht umgekehrt.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Die Bestaetigung des Nutzers — Text als Konfiguration
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B: "The user confirms the booking and acknowledgement version" und
-- "Record the exact user acknowledgement and policy version accepted at
-- booking." Eine Fassung hat EINE Versionskennung fuer alle Sprachen; der
-- Nutzer bestaetigt die Kennung, die Sprache steht daneben. Aendert sich der
-- Text, kommt eine neue Zeile je Sprache mit neuem effective_from; alte
-- Fassungen bleiben, weil Buchungen auf sie verweisen.
--
-- `shared_fields` steht AM TEXT, nicht im Code: der Test „Data minimization"
-- der Acceptance-Checklist vergleicht scheduling.shared_fields mit dem, was
-- der Nutzer gesehen hat — und das ist diese Liste.

CREATE TABLE IF NOT EXISTS public.booking_acknowledgements (
  version        text        NOT NULL,
  language       char(2)     NOT NULL,
  body           text        NOT NULL,
  shared_fields  text[]      NOT NULL,
  effective_from date        NOT NULL DEFAULT current_date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (version, language),
  CHECK (cardinality(shared_fields) > 0)
);

COMMENT ON TABLE public.booking_acknowledgements IS
  'Der Text, den der Nutzer vor der Buchung bestaetigt (Spec B "just-in-time acknowledgement"). Eine Versionskennung fuer alle Sprachen; neue Fassung = neue Zeilen mit neuem effective_from. Oeffentlich lesbar: es ist Rechtstext, kein Geheimnis.';

INSERT INTO public.booking_acknowledgements (version, language, body, shared_fields, effective_from) VALUES
  ('booking-ack-v1', 'en',
   E'With this booking, the provider''s name and contact details become visible to you, and the provider receives your company name, your e-mail address and your message.\n\nThe provider may contact you about this request — including scheduling, a proposal and reasonable follow-up — even if you cancel, do not attend or stop responding. Marketing on other topics requires your separate permission.\n\nYou receive a 10 % discount on the provider''s professional fees for this request because you booked through CompliHub360. The booking itself costs you nothing.',
   ARRAY['email', 'company_name', 'message'], DATE '2026-10-01'),
  ('booking-ack-v1', 'de',
   E'Mit dieser Buchung werden Name und Kontakt des Anbieters fuer Sie sichtbar; der Anbieter erhaelt Ihren Firmennamen, Ihre E-Mail-Adresse und Ihre Nachricht.\n\nDer Anbieter darf Sie zu diesem Anliegen kontaktieren — zu Terminen, einem Angebot und angemessenen Rueckfragen — auch wenn Sie absagen, nicht erscheinen oder nicht mehr antworten. Werbung zu anderen Themen braucht Ihre gesonderte Erlaubnis.\n\nSie erhalten 10 % Rabatt auf das Honorar des Anbieters fuer dieses Anliegen, weil Sie ueber CompliHub360 buchen. Die Buchung selbst kostet Sie nichts.',
   ARRAY['email', 'company_name', 'message'], DATE '2026-10-01'),
  ('booking-ack-v1', 'es',
   E'Con esta reserva, el nombre y los datos de contacto del proveedor pasan a ser visibles para usted, y el proveedor recibe el nombre de su empresa, su direccion de correo electronico y su mensaje.\n\nEl proveedor puede contactarle sobre esta solicitud — citas, una propuesta y consultas razonables — aunque usted cancele, no asista o deje de responder. La publicidad sobre otros temas requiere su permiso por separado.\n\nUsted recibe un 10 % de descuento sobre los honorarios del proveedor para esta solicitud porque reserva a traves de CompliHub360. La reserva en si no le cuesta nada.',
   ARRAY['email', 'company_name', 'message'], DATE '2026-10-01'),
  ('booking-ack-v1', 'tr',
   E'Bu rezervasyonla saglayicinin adi ve iletisim bilgileri sizin icin gorunur olur; saglayici sirket adinizi, e-posta adresinizi ve mesajinizi alir.\n\nSaglayici bu talep hakkinda sizinle iletisime gecebilir — randevular, bir teklif ve makul takip sorulari dahil — iptal etseniz, katilmasaniz veya yanit vermeyi kesseniz bile. Baska konulardaki reklamlar icin ayri izniniz gerekir.\n\nCompliHub360 uzerinden rezervasyon yaptiginiz icin bu talep icin saglayicinin ucretlerinde % 10 indirim alirsiniz. Rezervasyonun kendisi size hicbir sey maliyet getirmez.',
   ARRAY['email', 'company_name', 'message'], DATE '2026-10-01')
ON CONFLICT (version, language) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Die 10 % fuer den Nutzer — Policy, nicht Hardcoding
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B: "Every matched provider must provide a fixed 10% discount ...
-- regardless of provider subscription." und "The precise duration and
-- treatment of recurring services must remain policy-configurable until legal
-- review is complete." Genau das steht hier: Prozent, Umgang mit wieder-
-- kehrenden Leistungen (offen = 'undecided', Entscheidung Nr. 6 des Plans),
-- gueltig ab.

CREATE TABLE IF NOT EXISTS public.user_discount_policy (
  version              integer     PRIMARY KEY,
  pct                  integer     NOT NULL CHECK (pct BETWEEN 0 AND 100),
  recurring_treatment  text        NOT NULL DEFAULT 'undecided'
                                   CHECK (recurring_treatment IN ('undecided', 'first_invoice_only', 'all_invoices')),
  effective_from       date        NOT NULL DEFAULT current_date,
  note                 text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_discount_policy IS
  'Der Pflichtrabatt fuer Nutzer, die ueber CompliHub360 gebucht haben (Spec B "Mandatory user discount"). Versioniert; die Buchung traegt die Version, die zu ihrem Zeitpunkt galt. recurring_treatment bleibt ''undecided'' bis zur Rechtspruefung (Plan, Entscheidung Nr. 6).';

INSERT INTO public.user_discount_policy (version, pct, recurring_treatment, effective_from, note) VALUES
  (1, 10, 'undecided', DATE '2026-10-01',
   'Spec B v1.0: 10 % auf das Honorar des Anbieters fuer die gebuchte Leistung, unabhaengig vom Plan. Behoerdengebuehren, Steuern und echte Durchlaufkosten ausgenommen. Umgang mit wiederkehrenden Leistungen offen.')
ON CONFLICT (version) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Die Selbstauskunft des Anbieters zum Rabatt
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B: "Require the provider to confirm whether a proposal was issued and
-- whether the 10% discount was shown." Eine Zeile je Buchung; der Anbieter
-- darf korrigieren (Upsert), die Historie steht im event_log. Eigene Tabelle,
-- nicht Spalten an scheduling: das ist eine Aussage des Anbieters, kein
-- Buchungsfakt.

CREATE TABLE IF NOT EXISTS public.lead_proposal_reports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       uuid        NOT NULL UNIQUE REFERENCES public.scheduling(id),
  provider_key     text        NOT NULL REFERENCES public.providers(provider_key),
  proposal_issued  boolean     NOT NULL,
  discount_shown   boolean     NOT NULL,
  discount_pct     integer     CHECK (discount_pct BETWEEN 0 AND 100),
  policy_version   integer     REFERENCES public.user_discount_policy(version),
  note             text,
  reported_by      uuid,
  reported_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT discount_shown OR proposal_issued)
);

CREATE INDEX IF NOT EXISTS lead_proposal_reports_provider_idx
  ON public.lead_proposal_reports (provider_key, reported_at DESC);

COMMENT ON TABLE public.lead_proposal_reports IS
  'Selbstauskunft des Anbieters je bezahltem Lead: Angebot erstellt? 10 % ausgewiesen? (Spec B). Ein Rabatt kann nicht gezeigt worden sein, wenn es kein Angebot gab — der CHECK haelt das fest.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Die Buchung traegt, was sie bestaetigt und was sie gekostet hat
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.scheduling
  ADD COLUMN IF NOT EXISTS acknowledgement_version      text,
  ADD COLUMN IF NOT EXISTS lead_ledger_id               uuid REFERENCES public.provider_lead_ledger(id),
  ADD COLUMN IF NOT EXISTS user_discount_pct            integer CHECK (user_discount_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS user_discount_policy_version integer REFERENCES public.user_discount_policy(version);

COMMENT ON COLUMN public.scheduling.acknowledgement_version IS
  'Welche Fassung aus booking_acknowledgements der Nutzer mit dieser Buchung bestaetigt hat (Spec B: "Record the exact user acknowledgement and policy version accepted at booking").';
COMMENT ON COLUMN public.scheduling.lead_ledger_id IS
  'Die Ledger-Zeile der Belastung fuer diesen Lead. Die Richtung ist bewusst so: das Ledger existiert VOR der Buchung (Idempotency-Key der Belastung) und ist append-only, kann also keine booking_id nachtragen. provider_lead_ledger.booking_id bleibt bei Buchungs-Charges NULL.';
COMMENT ON COLUMN public.scheduling.user_discount_pct IS
  'Der Nutzerrabatt, der fuer diesen Lead galt — eingefroren zum Buchungszeitpunkt, damit eine spaetere Policy-Aenderung laufende Mandate nicht beruehrt.';

COMMENT ON COLUMN public.provider_lead_ledger.booking_id IS
  'Bei Buchungs-Charges (Phase 4) NULL: die Verknuepfung laeuft ueber scheduling.lead_ledger_id, weil die Ledger-Zeile vor der Buchung geschrieben wird und append-only ist. Belegt nur bei Korrekturen, die sich auf eine bestehende Buchung beziehen.';

-- Ein bestaetigter Termin je Anbieter und Slot. Die API prueft das vor der
-- Belastung; dieser Index ist die Garantie dahinter, wenn zwei Buchungen im
-- selben Augenblick ankommen. Verliert eine, wird ihre Belastung erstattet.
CREATE UNIQUE INDEX IF NOT EXISTS scheduling_confirmed_slot_uq
  ON public.scheduling (provider_key, slot_start)
  WHERE status = 'confirmed';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Zahlungsbereitschaft: wann geprueft, was zuletzt scheiterte
-- ════════════════════════════════════════════════════════════════════════════
--
-- billing_ready und billing_block_reasons gibt es seit 20260920000000 — gesetzt
-- hat sie bis heute niemand. Phase 4 setzt sie aus Stripe und Datenbank
-- (Portal-Rueckweg, Watcher). Zwei Spalten kommen dazu: wann zuletzt
-- geprueft, und die letzte gescheiterte Belastung (damit `payment_failed`
-- mit einer ANDEREN Karte verschwindet, mit derselben nicht).

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS billing_synced_at     timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_failure  jsonb;

COMMENT ON COLUMN public.providers.billing_block_reasons IS
  'Offene Punkte aus dem Billing-Gate (Spec §21.1): no_payment_method, incomplete_billing_info, inactive_subscription, withdrawn_authorization, overdue_invoice, account_paused — und seit Phase 4 payment_failed (letzte Belastung mit dem aktuellen Zahlungsmittel gescheitert).';
COMMENT ON COLUMN public.providers.billing_synced_at IS
  'Wann die Zahlungsbereitschaft zuletzt aus Stripe und Datenbank berechnet wurde (Portal-Rueckweg oder Watcher).';
COMMENT ON COLUMN public.providers.last_payment_failure IS
  '{at, payment_method_id, reason, ledger_id} der letzten gescheiterten Lead-Belastung. Der Grund payment_failed gilt, solange dieses Zahlungsmittel das Default-Zahlungsmittel bleibt.';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Zugriff
-- ════════════════════════════════════════════════════════════════════════════
--
-- Alles deny-all (RLS an, keine Policies, nur der Service-Role-Schluessel der
-- API) — bis auf den Bestaetigungstext: den liest die Oberflaeche VOR dem
-- Login-Kontext der Buchung, und er enthaelt nichts, was nicht ohnehin auf
-- dem Bildschirm steht.

ALTER TABLE public.booking_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_discount_policy      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_proposal_reports     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acknowledgement text is public" ON public.booking_acknowledgements;
CREATE POLICY "Acknowledgement text is public" ON public.booking_acknowledgements
  FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.booking_acknowledgements TO anon, authenticated;

REVOKE ALL ON public.user_discount_policy  FROM anon, authenticated;
REVOKE ALL ON public.lead_proposal_reports FROM anon, authenticated;
