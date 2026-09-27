---
title: "Provider Phase 3 — Anonymes Matching"
assignee: "Claude"
status: "done"
---

# Provider Phase 3 — Anonymes Matching

Vierte Phase des Provider-Plans (Spec A §13, §14, §15; DNA §3 „Quality
before brand recognition"; [ADR-0004](../../docs/decisions/ADR-0004-anonymity-public-ref-and-title.md)).
Nutzer-Entscheidungen 2026-09-27: Titel = **Buchstabe plus Beschreibung** ·
Scan **blockiert und benennt** · Prioritätsanteil = **Verifikationstiefe**.

Backend, Canvas, Figma und lokale UI nach dem UI-Workflow (Canvas → Figma →
lokal; Staging nach dem Review des Nutzers). Canvas:
https://claude.ai/artifact/NhkK1DvuT6wEr6WF9oGECE

**Erledigt 2026-09-27:** Backend PR #219 (Squash `578a34d8`, Staging-Migration
`provider_anonymity` per Supabase-MCP eingespielt), UI PR #223 (Squash
`bb55d655`). Offen bleibt der Staging-Rollout der UI (Stufe 4) nach dem Review.

## Objective

1. Kein Nutzer sieht vor der Buchung einen Bezeichner, aus dem sich der
   Anbieter ableiten lässt — auch nicht im JSON.
2. Der Titel vor der Buchung kommt aus dem System, nicht vom Anbieter.
3. Welche Felder eine Antwort trägt, entscheidet das Register, nicht der
   Handler.
4. Freitexte mit Identität werden beim Schreiben blockiert und benannt,
   beim Lesen maskiert.
5. Das Ranking kennt keinen `partner_status` mehr; die Reihenfolge ist
   über Fakten erklärbar.

## Acceptance Criteria

### Backend

- [x] Migration `20260928000000_provider_anonymity.sql`: `providers.public_ref`
  (zwölf Hex-Zeichen, UNIQUE, CHECK, Backfill, Default), Register-Einträge
  für die Dossier-Felder, `provider_key` und `pseudonym_label` ausdrücklich
  `internal`. pgTAP `06_provider_anonymity_test.sql` (12 Checks).
- [x] `anonymity.ts` (rein, 24 Tests): `serializeProvider`, `publicTitle`
  (A..Z, AA), `identityScan` / `maskIdentity` / `scanFields`,
  `verificationDepth`, `rankBasis`.
- [x] `POST /search`: Titel, Beschreibung, `rank_basis`; Priorität =
  Verifikationstiefe; `is_verified` = View-Treffer; kein `provider_key`,
  kein `pseudonym_label`, kein `partner_status` im Scorer.
- [x] `/p/:ref/(detail|slots|reviews|website)` statt `/provider/:key/…`;
  Detail liest Register und View, maskiert Freitexte, ohne
  `confirmation_rate` / `countries_supported`; Bewertungstexte maskiert.
- [x] `POST /scheduling` nimmt `public_ref`; matchbar UND zahlungsbereit,
  sonst 409 `BILLING_NOT_READY`. `GET /bookings` trägt `public_ref`,
  `provider_descriptor`, `identity_revealed`.
- [x] Benachrichtigungen an Nutzer tragen `providerRef` statt `providerKey`.
- [x] Scan an den Schreibrouten: Intake, `PATCH /profile`,
  `PATCH /application`, `POST/PATCH /services` → 422 `IDENTITY_IN_TEXT`
  mit `findings[{field,type,match,index}]`. `pseudonym_label` wird ignoriert.
- [x] Reviewer-Dossier trägt `identity_findings` (Altbestand, keine Sperre).
- [x] Tests: Leak-Guard über sechs Antworten, Neutralität für Plan und
  `partner_status`, Reihenfolge nach Verifikationstiefe, Ref-Auflösung
  (unbekannt, sprechend, alter Pfad → 404), Scan je Typ, 409 Billing.
- [x] Typen (`AnonProviderCard`, `AnonProviderDetail`, `RankBasis`,
  `IdentityFinding`, `PublicTitle`), OpenAPI, ADR-0004, Korrektur in
  `docs/backlog/user-flow-matchmaking-v2-spec.md` §5/§6.

### UI (Canvas-Wahl 2026-09-27: 1A · 2B · 3B · 4B)

- [x] Figma-Seite „Anonymes Matching (Phase 3)" (Node 3464:12771) mit vier
  Frames: Ergebnisliste 3464:12772, Schublade Profil 3464:12773, Schublade
  Gebucht 3464:12774, Termine 3464:12775; Uptake-Notiz 3468:833 (Monogram,
  RankBasisRow, AnonNotice, RevealCard).
- [x] Clients auf `public_ref`, `title`, `letter`, `descriptor`, `rank_basis`;
  Routen `p/:ref`, `p/:ref/schedule`; Karten (1A Monogramm, 2B zwei
  Gruppen), Schublade (3B Petrol-Kasten, Rang-Gruppe mit „Plan oder
  Zahlung: nie", 4B Offenlegungskarte), Detailseite, Termine (Herkunfts-
  zeile), Benachrichtigungen (`providerRef`, nie angezeigt).
- [x] Verified-Marke an `is_verified` statt an Position 1; die Pille entfällt
  auf der Karte (steckt im Titel).
- [x] Anbieterseite: Pseudonym-Feld raus (Settings, Intake), Vorschau „So
  erscheinen Sie vor der Buchung", 422 `IDENTITY_IN_TEXT` als Satz mit
  Fundstelle (`identityHintFrom`), `ApiError.body` trägt den Fehlerkörper.
- [x] Locales en/de/es/tr (`matchBasis.groupFit`, `rankBasis.*`,
  `anonNotice.*`, `reveal.*`, `termine.origin`, `settings.preview*`,
  `intake.titleNote`, `identity.*`), Mock-Modus auf `/p/:ref/…`,
  Storybook-only `ProviderMatchCard` und `RiskMapResult` gelöscht.
- [x] API-Nachtrag: `maskDossier` maskiert auch Objektfelder
  (`services[{title,includes}]`, `credentials[{label,note}]`).
- [x] Screenshots Ergebnisliste, Schublade (Profil, Gebucht), Termine,
  Detail, Einstellungen im Mock-Modus.

## Nicht in diesem Ticket

Merkliste (Entscheidung 2026-09-22 bleibt) · Affiliate-Link · Entfernen der
Spalten `partner_status`, `categories`, `countries_supported`,
`pseudonym_label` · `PartnerApplyPage` als öffentlicher Einstieg ·
Staging-Rollout der UI (Stufe 4).

## DNA-Check

Betroffen: Ranking und Matching, Copy, Provider-Policies. Voller Filter
gegen KN-BRAND-001 im ADR-0004; hier die Punkte, die im Code sichtbar sind:

- **Fairness zwischen Providern:** `publicTitle()` kennt keinen Anbieter,
  nur Position, Bereiche und Region. `verificationDepth()` kennt keinen
  Plan, keine Größe, kein Alter. Der Neutralitäts-Test hält beides fest.
- **Erklärbarkeit statt Behauptung:** `rank_basis` trägt Fakten mit
  Zählern (4/4 unabhängig geprüft, 96 % bestätigt, 4,8 aus 12), keine
  Gewichte und keine zweite Prozentzahl.
- **Kommunizieren wir ehrlich, ohne Angst:** Die 422-Antwort sagt „Please
  keep these texts free of names, domains and registration numbers — they
  stay anonymous until booking" und nennt Feld und Stelle. Kein „Verstoß",
  kein „gesperrt". Die Buchung sagt 409 mit Grund statt still 404.
- **Zugang zum Menschen:** Blockieren statt still maskieren, damit der
  Anbieter weiß, was ankommt; der Reviewer sieht Altbestands-Funde und
  kann nachfragen, statt dass ein Filter still entscheidet.
- **Privacy:** Der Scan ist Regex und feste Listen, kein LLM; kein Freitext
  erreicht einen AI-Endpoint.
