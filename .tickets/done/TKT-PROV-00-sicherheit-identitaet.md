---
title: "Provider Phase 0 — Sicherheit & Identität"
assignee: "Claude"
status: "done"
---

# Provider Phase 0 — Sicherheit & Identität

Erste Phase des Provider-Plans (Spec A *Provider Verification & Dashboard* +
Spec B *Pricing & Operations*, beide v1.0, 09/2026). Bevor Pläne, Lead-Bänder
oder Verifikations-Workflows gebaut werden, müssen zwei Türen zu, die heute
offen stehen.

## Objective

1. Der öffentliche Supabase-Key darf keine Anbieter-Identität liefern.
2. Anbieter-eigene API-Routen gehören den Mitgliedern des Anbieters — nicht
   jedem, der eingeloggt ist.
3. Bewertungen, die ins Ranking fließen, stammen nur aus echten, gehaltenen
   Buchungen.

## Befund (reproduziert, nicht vermutet)

| Lücke | Wirkung | Beleg |
|---|---|---|
| Policy `Providers are globally readable` (`USING (true)`) | `anon` liest Name, Website, Kontakt-E-Mail, Stripe-ID, USt-ID jedes Anbieters | als `SET ROLE anon` gegen die Test-DB: Zeile mit Name + E-Mail zurück |
| `matchable_provider_services` ohne `security_invoker` | View prüft gegen ihren Owner und umgeht RLS; trägt `provider_key` (aus Firmenname) | als `anon`: Zeile zurück |
| Keine Ownership auf `/api/v1/provider/:key/*` | Jeder Login ändert fremde Profile, liest fremde Leads samt Nutzer-E-Mails, öffnet fremde Stripe-Portale | 10 Tests rot bei abgeschaltetem Guard |
| `POST /reviews` ohne Buchungsbindung, `verified: true` fest | Rating (0.3 des Scores) per Fake-Account manipulierbar | alter Test hielt genau das fest |
| UI fest auf `DEMO_PROVIDER_KEY = 'dahlmann-cpa'` | jeder Partner-Login sah denselben Anbieter | — |

## Acceptance Criteria

- [x] Migration `20260922000000_close_provider_public_read.sql`: Policy weg, View `security_invoker` + `REVOKE` für `anon`/`authenticated`.
- [x] `provider_members` (Login → Anbieter, Rolle vorbereitet), Launch-Grenze ein Login je Anbieter per Unique-Index, deny-all RLS, Backfill nur bei eindeutiger E-Mail.
- [x] Test-Stub bildet Supabases Rollen und Default-Grants nach; `03_public_access_test.sql` fragt als `anon` und `authenticated` gegen echte Zeilen.
- [x] Ownership-Guard zentral vor der Routen-Kette (`providerAuth.ts`), Fremde bekommen 404.
- [x] `GET /api/v1/me/provider`, `POST /api/v1/admin/provider/:key/member`, Verknüpfung beim Intake mit Login.
- [x] `POST /reviews`: `booking_id` Pflicht, nur Beteiligte, erst nach dem Termin, einmal je Seite, Anbieter aus der Buchung; Aggregat nur aus buchungsgebundenen Bewertungen.
- [x] UI löst den Anbieter über `/me/provider` auf; Demo-Anbieter nur noch per `VITE_DEMO_PROVIDER_KEY` im Dev-Build; Mock-Modus bedient `/me/provider`.
- [x] OpenAPI ergänzt.

## DNA-Check

Betroffen: Ranking und Matching (Bewertungen fließen in den Score; Sichtbarkeit
der Provider-Identität), Provider-Policies (wer ein Konto bedient).

- **Wahrt es die Fairness zwischen Providern?** Ja — bisher konnte jeder mit
  einem Account das Rating eines Anbieters beliebig verschieben, eigenes nach
  oben, fremdes nach unten. Jetzt zählt nur, wer tatsächlich einen Termin
  hatte.
- **Stärkt es das Vertrauen der User, statt es auszugeben?** Ja — „Quality
  before brand recognition" (DNA §3) setzt voraus, dass die Identität vor der
  Buchung wirklich verborgen ist. Solange die Datenbank sie über den
  öffentlichen Key herausgab, war die Anonymität der Ergebnisliste nur
  Oberfläche.
- **Bekäme ein kleines Unternehmen denselben Respekt?** Ja — Leads, Nutzer-
  E-Mails und Rechnungen eines Anbieters sind nur noch für ihn selbst lesbar,
  unabhängig von Größe oder Plan.

Keine Copy, kein neuer Screen. Keine DNA-Spannung festgestellt.

## Nicht in diesem Ticket

- Opake öffentliche IDs statt `provider_key` auf den Karten, systemseitiges
  Pseudonym, `/detail` über das Sichtbarkeitsregister → Phase 3.
- Pricing v2 (Spec B) → Phase 1.
- Die Rate-Limit-Schlüsselung vertraut `x-forwarded-for` ungeprüft — separat
  zu klären, gehört nicht zur Anbieter-Identität.

## Verifikation

- `npm run db:test` → 4 Dateien, 70 Tests grün (vorher 58).
- `services/compliance-api`: 130 Tests grün (vorher 107); ohne Guard 10 rot.
- `npm run typecheck`, `npm run build`, `i18n:check`, `terminology:check` grün.
