-- ─── Die Kulanzfrist bekommt einen Ort ──────────────────────────────────────
--
-- Spec A §21.1 spricht von einer "configured cure period". Konfiguriert war sie
-- nie: `billingReadiness` setzte den Grund `overdue_invoice`, sobald `due_at`
-- verstrichen war, und der Anbieter nahm in derselben Sekunde keine Buchungen
-- mehr an. Null Tage waren kein Beschluss, sondern das, was herauskommt, wenn
-- niemand etwas einträgt.
--
-- Beschlossen am 2026-10-07 (ADR-0006, Wahl A2): sieben Tage. Zusammen mit den
-- 14 Tagen Zahlungsziel sind das 21 Tage ab Rechnungsstellung.
--
-- Warum eine Tabelle und keine Konstante: dieselbe Begründung wie bei
-- `user_discount_policy` — der Wert hat Geldfolge, also gehört er versioniert
-- und mit Begründung abgelegt, nicht in einen Quelltext, den ein Deploy
-- austauscht. Eine Zeile je Fassung, die jüngste bereits geltende zählt.
--
-- Was hier NICHT steht: `failed-payment retry` und `reactivation rules` aus
-- derselben Spec-B-Liste ("Configurable items requiring final decision"). Die
-- sind unentschieden und bekommen je eine eigene Vorlage — eine leere Spalte
-- hier würde so aussehen, als wäre die Entscheidung schon gefallen.

CREATE TABLE IF NOT EXISTS public.billing_policy (
  version            integer     PRIMARY KEY,
  cure_period_days   integer     NOT NULL CHECK (cure_period_days BETWEEN 0 AND 90),
  effective_from     date        NOT NULL DEFAULT current_date,
  note               text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_policy IS
  'Konfigurierbare Abrechnungsgroessen mit Geldfolge, versioniert (Muster wie user_discount_policy). Die juengste Fassung mit effective_from <= heute gilt. Enthaelt bewusst NUR, was entschieden ist; failed-payment retry und reactivation rules aus Spec B bleiben offen und stehen hier nicht.';

COMMENT ON COLUMN public.billing_policy.cure_period_days IS
  'Spec A §21.1 "configured cure period": so viele Tage nach invoices.due_at sperrt eine offene Rechnung die BUCHUNG noch nicht. Ab Tag 1 sieht der Anbieter den Hinweis, ab Tag cure_period_days + 1 greift der Grund overdue_invoice. Die SICHTBARKEIT beruehrt das nie (Spec A §14) — billing_ready ist kein Filter in matchable_provider_services.';

INSERT INTO public.billing_policy (version, cure_period_days, effective_from, note) VALUES
  (1, 7, DATE '2026-10-07',
   'ADR-0006, Wahl A2 (Nutzer, 2026-10-07). Sieben Tage nach Faelligkeit; mit 14 Tagen Zahlungsziel sind das 21 Tage ab Rechnungsstellung. Vorher stand die Frist faktisch auf null, ohne dass das je beschlossen wurde.')
ON CONFLICT (version) DO NOTHING;

-- Lesen darf der Server; die Tabelle traegt keine Anbieterdaten, aber sie ist
-- auch nichts, was ein Browser braucht.
ALTER TABLE public.billing_policy ENABLE ROW LEVEL SECURITY;
