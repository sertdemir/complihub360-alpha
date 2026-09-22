---
title: "Provider Phase 2 — Onboarding und Verifikation (Backend)"
assignee: "Claude"
status: "review"
---

# Provider Phase 2 — Onboarding und Verifikation

Dritte Phase des Provider-Plans (Spec A *Provider Verification and Dashboard
Implementation Specification* v1.0, §4–§9, §21.1, §23, §25). Canvas-Abnahme
2026-09-22: **1B** Dossier mit Kapiteln · **2B** Leistung als Stamm, Länder
als Zeilen · **3A** Nachweis-Checkliste je Typ · **4A** Zusammenfassung →
Annahme je Dokument → Einreichen · **5B** Freigabematrix · **6A** Prüf-Queue
als Tabelle · **7A** Split-View · **8A** Matrix mit Zell-Aktionen und
Gate-Leiste.

Dieser PR ist der **Backend-Teil**. Die UI folgt nach dem UI-Workflow
(Figma → lokal → Staging), sobald der Figma-Connector verbunden ist.

## Objective

1. Ein Anbieter kann sich vollständig bewerben: Rechtsform, Leistungen je
   Land, Nachweise als Datei oder Registerabfrage, versionierte Annahmen —
   und einreichen, sobald nichts mehr fehlt.
2. Nachweise liegen in einem **privaten Bucket** mit signierten URLs; kein
   Dokument geht durch die API, keine URL wird gespeichert.
3. Ein Reviewer prüft Angabe neben Nachweis, entscheidet **je Leistung ×
   Land** und aktiviert das Konto nur durch ein serverseitiges Gate, das
   sagt, was fehlt.
4. Jede Entscheidung steht in einem **append-only Protokoll** mit Vorher,
   Nachher, Grund und Prüfer.
5. Abgelaufene Nachweise wirken von selbst: Vorwarnung, Ablauf,
   Reverifizierungsfrist.

## Acceptance Criteria

- [x] Migration `20260924000000_provider_onboarding.sql`: Bucket
  `provider-evidence` (privat, PDF/PNG/JPEG, 20 MB), Datei-Spalten an
  `provider_evidence` (`upload_confirmed`), `provider_evidence_requests`,
  `provider_review_log` (append-only, SQLSTATE 23001), Trigger für
  `lifecycle_status_since`, `notifications.subject` kennt `provider`.
- [x] pgTAP `05_provider_onboarding_test.sql` (16 Checks); Stub kennt
  `storage.buckets`.
- [x] `storage.ts`: signierte Upload-/Download-URLs und Objektprüfung über die
  Storage-REST-API mit Service-Rolle.
- [x] `verificationRules.ts` (rein, 27 Tests): `requiredEvidence`,
  `evidenceChecklist`, `submitValidation`, `activationGate`,
  `transitionAllowed`, `serviceStatusFromCoverage`.
- [x] `providerApplication.ts`: `GET/PATCH /provider/:key/application`,
  `POST/PATCH/DELETE /services[/:id]`, `PUT /services/:id/coverage`,
  `POST /evidence/upload-url`, `POST /evidence/:id/confirm`,
  `POST /evidence/registry`, `POST /agreements`, `POST /submit`,
  `GET /verification`. Kategorie-Kontingent aus `billing.ts` beim Anlegen
  einer Leistung (422 `CATEGORY_ALLOWANCE`).
- [x] `providerReview.ts`: `GET /admin/review/queue`, `GET /admin/review/:key`,
  `GET …/gate`, `POST …/evidence/:id`, `POST …/coverage/:id`,
  `POST …/lifecycle`, `POST …/request`, `DELETE …/request/:id`. Nur
  Admin-JWT oder Server-Key.
- [x] `OWN_PROVIDER_ROUTE` deckt alle neuen Anbieter-Routen (Ownership-Test
  über 21 Routen). `GET /admin/stats` ist jetzt Admin-only (Befund).
- [x] `runEvidenceTick` im Watcher: Vorwarnung 30 Tage, `expired`,
  `reverification_due` mit 14 Tagen Frist; Marker je Nachweis.
- [x] Notify-Typen `verification_*`, `evidence_expiring`;
  `sendVerificationMail` (info_requested, activated) in en/de/es/tr.
- [x] Typen in `packages/types/src/provider.ts`; OpenAPI für alle Routen.
- [x] `api.test.ts`: 20 neue Tests (Dossier, Kontingent, Upload-Flow,
  Registerabfrage, Annahmen, Submit-Validierung, Queue, Dossier-Download,
  Zell-Aktion, Nachfrage → Confirm, Gate je Bedingung, Transitions, Watcher).

## DNA-Check

Betroffen: Provider-Policies (Pflichtnachweise, Freigabe, Gate), Copy
(Fehlermeldungen, Benachrichtigungen, Mails), Registrierung/Gating
(Einreichen).

- **Fairness zwischen Providern:** Die Checkliste hängt an den Leistungen
  und Ländern, nie am Plan oder an der Größe — `requiredEvidence()` kennt
  keinen Anbieter. Regulierte Bereiche (Steuer, Recht) brauchen eine
  Zulassung je Land; alle anderen nicht mehr als Registerauszug,
  Versicherung, Vertretung. Das Gate ist für jeden gleich.
- **Kommunizieren wir ehrlich, ohne Angst:** Kein Countdown, keine
  Frist im Betreff. Die Mails sagen, was fehlt und wo, und dass ein
  Mensch antwortet. Die Vorwarnung zum Ablauf ist eine Information mit
  Datum. `INCOMPLETE` und `GATE_NOT_MET` nennen jeden fehlenden Punkt
  einzeln statt „abgelehnt".
- **Zugang zum Menschen:** Jede Ablehnung und jede Nachfrage braucht
  einen Grund, den der Anbieter liest (400 ohne Grund). Das Verification
  Center zeigt die Historie — was entschieden wurde und warum, nicht wer.
- **Ohne Transaktion dieselbe Entscheidung:** Ohne Abo wird beim
  Eintragen nicht gesperrt; der Anbieter kann sein Dossier füllen, bevor
  er zahlt. Billing ist eine Gate-Bedingung (Spec §21.1), kein Filter
  für die Sichtbarkeit — die View bleibt unberührt.
- **Datensparsamkeit:** USt-ID per Registerabfrage statt Dokument;
  Vertretungsidentität als Registerprüfung vorgesehen (Prüfdienst
  später), bis dahin entscheidet der Reviewer am Registerauszug. Ein
  VIES-Ausfall wird nie als Ablehnung gespeichert.

Keine DNA-Spannung festgestellt. Hinweis für die Zukunft: die bestehenden
Review-Mails (`warning_provider`, `downgraded_provider` in `mailer.ts`)
drohen mit Herabstufung und duzen — außerhalb dieses Tickets, aber ein
Kandidat für dieselbe Überarbeitung.

## Nicht in diesem Ticket

- UI (Dossier, Verification Center, Queue, Prüfung) → UI-Workflow Stufe 2–4.
- Change Control mit Fristen (Spec §18) → Phase 6; Änderungen an
  Rechtsform werden bis dahin nur protokolliert.
- Prüfdienst für die Identität der vertretungsberechtigten Person.
- Storage-Policies für Browser — bewusst keine; Zugang nur über signierte
  URLs.
- Migration und Bucket auf Staging einspielen (per Supabase-MCP nach dem
  Merge; der Deploy-Workflow spielt keine Migrationen ein).

## Verifikation

- `npm run db:test` → 6 Dateien, 114 Tests.
- `compliance-api`: 211 Tests (27 Regeln, 20 Phase 2).
- `typecheck`, `lint`, `build`.
