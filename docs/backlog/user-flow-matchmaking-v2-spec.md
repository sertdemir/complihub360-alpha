# User-Flow & Matchmaking v2 — Spec & Informationsarchitektur

> **Status:** Blueprint · **Beschlossen:** 2026-08-04 · **Supersedes:** ältere Flow-Annahmen (Results-Page-mit-Tabs, Guest-Engagement).
> Referenz-Memory: `project_user_flow_matchmaking_v2`. Quell-Docs: `GoogleDrive_Docs/User Flows (Complete).md`, `Search & Ranking Logic.md`, `Addendum — Dossier Handover & Anonymization (2026-07-10).md`.

---

## 1. Scope & Systemgrenze

CompliHub360 ist ein **kuratierter Matchmaking-Marktplatz**: Ein User (Firma) klärt per Wizard seinen Compliance-Bedarf, bekommt eine Risk Map und wird mit **anonymisierten, vorgeprüften Providern** zusammengebracht. Die Systemgrenze der Plattform endet mit dem **Scheduling**: sobald ein Termin gebucht ist, ist die Plattform-Aufgabe erledigt — danach läuft nur noch der **SLA-Watchdog** für Alerts.

**Die Website ist eine reine User-Surface.** Provider registrieren sich **nicht** über die Website — sie werden **offline/B2B über die Firma angeworben**, per **Intake-Link** erfasst und **manuell geprüft/abgenommen** (Richtlinien/Statuten), bevor sie freigeschaltet werden.

**In-Scope dieser Spec:** Landing → Wizard → Risk Map → Register-Gate → anonymes Provider-Listing → Provider-Detail → Scheduling, plus das Provider-Intake/Vetting und das Datenmodell/Backend, das diesen Flow trägt.

---

## 2. Verbindliche Entscheidungen (Foundation)

| # | Entscheidung | Wert |
|---|---|---|
| D1 | **Register-Gate** | Login-Wall: volle Risk Map + Provider-Liste erst nach Registrierung. |
| D2 | **Provider-Ranking** | **Scored**: Relevance 0.6 + Quality 0.3 + Partner-Priority 0.1. |
| D3 | **Anonymität** | **3-Stufen Progressive Disclosure** (Identität zuletzt, siehe §5). |
| D4 | **Scheduling** | **Nativ bei uns gebaut**, per API gegen Provider-Kalender synchronisiert. |
| D5 | **Monetarisierung** | Provider zahlt bei (a) Detail-Page-Open, (b) Scheduling = bezahlter Lead. |
| D6 | **Systemgrenze** | Nach Scheduling = raus; nur SLA-Watchdog bleibt aktiv. |
| D7 | **Provider-Akquise** | Offline/B2B über die Firma; Intake per Link + manuelles Vetting; keine Self-Registration. |
| D8 | **Landing** | Eine einzige userlastige Landingpage; Provider-Marketing-Landing hinfällig. |

---

## 3. End-to-End Flow-Map

```
[LANDING]  userlastig, Wizard-first CTA
   │  event: page_viewed
   ▼
[WIZARD]  AnimatedWizard: Markets → Operations → Domains → Review
   │  event: wizard_started, wizard_step_completed, wizard_run_clicked
   │  output: SearchProfile { country, markets[], operations, domains[], riskSignals[] }
   ▼
[RISK MAP · TEILANSICHT]  ungated — genug, um Wert zu zeigen, Rest verdeckt/teasered
   │  event: risk_map_partial_viewed
   ▼
◇ REGISTER-GATE ─── nicht registriert ──▶ [REGISTER/LOGIN] ──┐
   │  registriert                                            │
   ▼                                                         │
[RISK MAP · VOLL]  +  [PROVIDER-LISTING · anonym, Stufe 1] ◀─┘
   │  event: risk_map_full_viewed, provider_list_viewed, provider_card_viewed
   │  Ranking = Scored (D2); Karten anonym (Pseudonym, Attribute, Pricing-Range, Match-%)
   ▼
◇ Klick auf List-Item ─── $$$ MONETARISIERT (detail_opened) ───▶
[PROVIDER-DETAIL · Stufe 2]  tiefer, weiter anonym, Kalender-Vorschau
   │  event: provider_detail_opened  ← Abrechnungs-Trigger Provider
   ▼
◇ CTA „Termin buchen" ──▶ [SCHEDULING · nativ, Kalender-Sync]
   │  event: scheduling_started
   ▼
[SCHEDULING BESTÄTIGT]  ─── $$$ MONETARISIERT (scheduling_lead) ───▶
   │  event: scheduling_confirmed  ← bezahlter Lead
   │  Stufe 3: Provider-Identität + Kontakt werden enthüllt
   ▼
[HANDOFF]  Plattform-Aufgabe erledigt.
   └── SLA-Watchdog bleibt aktiv → ggf. Alerts (no-show, Termin-Reschedule, etc.)
```

---

## 4. Screen-by-Screen IA

### 4.1 Landing (1 Seite, userlastig)
- **Zweck:** User (Firma) sofort in einen von **zwei gleichwertigen Wegen** ziehen; Vertrauen + Kategorie-Verständnis in Sekunden.
- **Zwei Einstiege (Beschluss 2026-08-04):** (a) **Wizard starten** → geführte Fragen → Risk Map; (b) **Prosa-Search** → freies Eingabefeld („Beschreibe dein Anliegen…") → **Search-Result-Page** (nur Antworten, keine Risk Map, §4.1b). Beide prominent im Hero.
- **Blöcke:** Hero mit dem **Dual-Einstieg** (Prosa-Search-Input + „Wizard starten"-CTA) · Kurz-Erklärung „Wie es funktioniert" (Fragen → Risk Map → geprüfte Provider) · Trust-Sektion (verifiziert/anonym/neutral) · Domänen-Übersicht · sekundärer Wizard-CTA.
- **Provider-Hinweis:** höchstens dezenter Footer-Link „Sie sind Berater? → Kontakt" (führt zu Info/Kontakt, **nicht** zu Self-Registration; Akquise läuft über die Firma).
- **Marketing-Routen (Hybrid, §11 P5):** SEO-Seiten **behalten** (`countries`, `compliance`-areas, `resources`) mit jedem CTA → Wizard; provider-orientierte/redundante Seiten **löschen/redirecten** (`providers`, `advisory`, `solutions`, `platform`, `services`, `ai-governance`).

### 4.1b Search-Result-Page (Prosa-Search) — NEU 2026-08-04
- **Zweck:** Direkte Antwort auf eine frei formulierte Frage — **ohne** Risk Map, ohne Wizard-Framing, ohne Provider-Gating. „Nur die Antworten, die der User haben will."
- **Input:** Prosa-Query von der Landing (z. B. „Muss ich in Italien VAT zahlen, wenn ich über Amazon verkaufe?").
- **Inhalt:** AI-gegroundete Kurz-Antwort (mit Quellen) + relevante Pflichten/Gesetze + weiterführende Guides/Tutorials — alles quellen-verlinkt, keine erfundenen Claims. Optional Follow-up-Suchfeld.
- **Kein** Provider-Listing / keine Risk Map hier. **Brücken-Nudge** am Ende: „Für deine personalisierte Risk Map + passende Provider → Wizard starten."
- **Gast-fähig** (kein Register-Gate). Register erst beim Wechsel in Wizard-/Provider-Flow.
- Speist sich aus `POST /api/v1/search` (overview_summary + laws + tutorials/articles), **ohne** die Provider-/Risk-Map-Aufbereitung.

### 4.2 Wizard
- **Bestand:** `components/home/AnimatedWizard.tsx` (aktiv). Schritte Markets → Operations → Domains → Review. Erzeugt `SearchProfile`, navigiert zu `/results`.
- **Anpassung:** Output-`SearchProfile` muss vollständig genug sein, um `/search` + Ranking zu speisen (country, markets[], operations/businessModel, domains/categories[], riskSignals[]). Prüfen ob Felder reichen; ggf. minimal ergänzen.
- **Aufräumen:** `pages/wizard/*` + `flows/*` (totgelegt) entfernen.

### 4.3 Risk Map — Teilansicht (ungated)
- **Zweck:** Wert beweisen, bevor die Registrierung verlangt wird.
- **Sichtbar:** Kern-Risk-Summary (Gesamt-Risiko-Level, 1–2 Top-Obligations), abgeleitet aus dem SearchProfile via `/search` (laws/obligations).
- **Verdeckt/teasered:** restliche Obligations, Details, komplette Provider-Liste (Blur/Count-Teaser „12 geprüfte Provider gematcht").
- **Gate-CTA:** „Registrieren, um die volle Risk Map + passende Provider zu sehen."

### 4.4 Register-Gate
- **Trigger:** Übergang Teil- → Vollansicht.
- **Form:** minimal (E-Mail + Passwort / Magic-Link / OAuth). Nach Registrierung zurück zur vollen Risk Map **mit erhaltenem SearchProfile** (Session/`guest_key`-Anchoring existiert via `api/sessions.ts`).
- **Prinzip:** Registrierung ist der einzige Pflicht-Gate im Funnel; danach ist alles bis zum Detail-Open frei.

### 4.5 Risk Map — Voll + Provider-Listing (Stufe 1, anonym)
- **Layout:** volle Risk Map (alle Obligations, Empfehlungen, Quellen) + **Provider-Liste** (gescored sortiert).
- **List-Item (anonym, Stufe 1 — siehe §5):** Pseudonym-Label · Verified-Badge · Spezialisierung(en) · Länder · Sprachen · Rating · #Mandate · Ø-Antwortzeit · Confirmation-Rate · **Pricing-Range** · **Match-%**. **Kein** Name/Logo/Website.
- **CTA pro Item:** „Details ansehen" → löst den **monetarisierten** Detail-Open aus.
- **Empty/Edge:** keine Treffer → Filter lockern + „Full Support"-Empfehlung + Fallback (vgl. User Flows §11.1).

### 4.6 Provider-Detail-Page (Stufe 2, monetarisiert)
- **Monetarisierung:** Öffnen = `provider_detail_opened` = Abrechnungs-Event für den Provider (D5). Listing muss reich genug sein, dass der Open **qualifiziert** ist (kein Blind-Klick-Zwang — sonst Thumbtack-Falle).
- **Sichtbar (tiefer, weiter anonym):** detaillierte, anonymisierte Credentials/Zertifizierungen · verifizierte Review-Snippets · Leistungs-/Deliverable-Beschreibung · genaueres Pricing · **Kalender-Vorschau (Verfügbarkeit)** · „Verifiziert von CompliHub360".
- **Weiter verdeckt:** Name, Logo, Kontaktdaten, Website.
- **Primär-CTA:** „Termin buchen" → Scheduling.

### 4.7 Scheduling (nativ, Kalender-Sync)
- **Mechanik (D4):** native Slot-Auswahl auf unserer Seite; Verfügbarkeit kommt aus dem synchronisierten Provider-Kalender (API). Kein externer Calendly-Link (würde Anonymität brechen).
- **Schritte:** Slot wählen → (optional Kontext/Nachricht) → bestätigen.
- **Bei Buchung** (`scheduling_confirmed`) = **bezahlter Lead** (D5) · **beidseitiger Reveal**: User sieht Provider-Identität, Provider erhält das **Dossier (Risk Map + User-Kontakt)** · Kalendereintrag beidseitig. Provider zahlt bei Buchung **auch bei No-Show** (Mehrwert-Prinzip). Ab hier greift der Post-Handoff-Kommunikationsprozess → [notifications-alerts-concept.md](notifications-alerts-concept.md).

### 4.8 Handoff + SLA-Watchdog
- Nach Scheduling: Plattform ist raus. Bestätigungs-/Übersichts-View für den User (Termin, jetzt sichtbare Provider-Identität, Kontaktweg).
- **SLA-Watchdog** (bestehend, `services/compliance-api/watchers.ts`) bleibt aktiv für Alerts (z.B. Termin nicht bestätigt, Reschedule, no-show). Alert-Definitionen für den Post-Scheduling-Zustand → §11 offen.

---

## 5. Anonymitäts-Modell (3 Stufen)

| Attribut | Stufe 1 · Listing | Stufe 2 · Detail (bezahlt) | Stufe 3 · nach Scheduling |
|---|:---:|:---:|:---:|
| Pseudonym-Label | ✅ | ✅ | — |
| Spezialisierung / Kategorien | ✅ | ✅ (detailliert) | ✅ |
| Länder / Sprachen | ✅ | ✅ | ✅ |
| Rating / #Mandate / Ø-Antwortzeit / Confirmation-Rate | ✅ | ✅ | ✅ |
| Abrechnungs-Modell (Card) / volle Pricing-Tabelle (Detail) | ✅ Modell | ✅ + Tabelle | ✅ |
| Match-% | ✅ | ✅ | ✅ |
| Verified-Badge | ✅ | ✅ | ✅ |
| Anonymisierte Credentials/Zertifikate | — | ✅ | ✅ |
| Verifizierte Reviews | Snippet | ✅ | ✅ |
| Kalender-Verfügbarkeit | — | ✅ (Vorschau) | ✅ |
| **Name / Logo / Kontakt / Website** | ❌ | ❌ | ✅ |

**Trust-Guardrails:** „Identität & Qualifikation von CompliHub360 verifiziert", echte verifizierte Reviews, „unverbindliches Erstgespräch", kurze Erklärung *warum* anonym (neutrale Auswahl, Schutz vor Direktakquise). Kuratierte Anonymität = geprüfte Shortlist → erhöht Vertrauen.

---

## 6. Ranking / Scoring (D2)

`Total = 0.6·Relevance + 0.3·Quality + 0.1·Priority`, absteigend sortiert.
- **Relevance:** Country-Match · Kategorie-/Domänen-Spezialisierung · Branchen-/Kontext-Fit (aus SearchProfile).
- **Quality:** Ø-Antwortzeit · Confirmation-Rate · User-Rating · (SLA-Breach-Count negativ).
- **Priority:** `partner_status=active` Boost · ggf. Sponsored (später).
- **Deterministisch** (nicht AI): Sortierreihenfolge, Scores. AI nur für `overview_summary`/Tips (mit Quellen).
- **Match-%** = normalisierter Relevance-Anteil, user-facing.
- Provider mit Verfügbarkeit `ooo` / eingefrorenem Rank → nicht oder nachrangig gelistet (Feld existiert).

---

## 7. Datenmodell-Änderungen

**Bestand:** `providers` (partner_status, countries_supported[], categories[], languages[], sla_target_confirm_hours, sla_target_reply_hours, breach_count, availability), `engagement_requests`, `event_log`, `sessions`, `invoices`, `magic_link_tokens`, `documents`, `knowledge_chunks`.

**Neu / zu ergänzen:**
- `providers.billing_model` — Enum (abo | hourly | project | mixed …), vom Provider im Onboarding gesetzt, im Dashboard editierbar → erscheint auf der Card. Plus `providers.pricing_table` (jsonb, optional) — die volle Preisstruktur, nur auf der Detail-Page gezeigt. Plus provider-eingegebene Anonym-Attribute (pseudonym_label, region, active_since, specializations[], languages[], rating, completed_count, avg_response_hours).
- `provider_intake` / Vetting-Status — Intake-Formular-Payload (Zertifikate, Statuten-Bestätigung) + Status `submitted|in_review|approved|rejected`. Nur freigeschaltete (`approved` → `partner_status=active`) erscheinen im Listing.
- `provider_availability` / Kalender-Sync — Slots/Busy-Zeiten aus Provider-Kalender (API), plus Sync-Token/Provider-Kalender-Verknüpfung.
- `scheduling` (Bookings) — booking_id, provider_key, user_id, slot_start/end, status `confirmed|cancelled|completed|no_show`, reminder_flags, lead_charged bool.
- `reviews` — id, booking_id, from_role (user|provider), to_role, rating, categories[], text, verified bool, created_at. → speist Quality-/Lead-Quality-Score.
- **Event-Typen** (event_log): `provider_detail_opened`, `scheduling_started`, `scheduling_confirmed`, `provider_lead_charged`, `reminder_24h`, `reminder_1h`, `provider_cancelled`, `user_cancelled`, `user_rescheduled`, `outcome_check`, `review_request`, `review_submitted`, `no_show` (+ bestehende). Detail-Open + Scheduling triggern Provider-Billing. Vollständiger Kommunikations-Lifecycle → [notifications-alerts-concept.md](notifications-alerts-concept.md).

---

## 8. Backend-Endpoints

**Bestand (wiederverwenden):** `POST /api/v1/search` (Compliance-Engine→laws + RAG-Stub→tutorials + Country-Filter auf active Provider) · `POST /api/v1/engagement` + Magic-Link · `POST /api/v1/session` · `services/compliance-api/watchers.ts` (SLA).

**Neu / erweitern:**
- `POST /api/v1/search` → **Scoring/Ranking ergänzen** (§6), Provider anonymisiert + mit match_score zurückgeben, Pricing-Range mitliefern.
- `GET /api/v1/provider/:key/detail` → Stufe-2-Payload (anonym) + Kalender-Vorschau; **löst `provider_detail_opened` + Billing** aus (server-seitig, gegen Klick-Betrug absichern: pro User/Provider deduplizieren).
- `GET /api/v1/provider/:key/availability` → Slots aus Kalender-Sync.
- `POST /api/v1/scheduling` → Booking anlegen (`scheduling_started`); `POST /api/v1/scheduling/:id/confirm` → `scheduling_confirmed` + Billing-Lead + **Identitäts-Reveal** (Stufe 3, server-seitig zur Read-Zeit erzwungen).
- **Provider-Intake:** `POST /api/v1/provider/intake` (token-gated Link) → Formular-Payload speichern; Vetting-Übergänge admin-seitig.
- **Billing-Hook:** Detail-Open + Scheduling-Lead → bestehende Stripe-Provider-Verrechnung (`billing.ts`).

---

## 9. Monetarisierung

- **Event A · Detail-Open:** Provider zahlt pro qualifiziertem Detail-Open. Server-seitig deduplizieren (nicht pro Reload). Preis/Modell = Produkt-Entscheidung.
- **Event B · Scheduling-Lead:** Provider zahlt pro bestätigtem Termin (Haupt-Lead-Fee). Danach Systemgrenze.
- Beide Events → `event_log` + Verrechnung über bestehendes Provider-Stripe-Billing.
- **Guardrail:** Listing reich genug, dass Detail-Opens qualifiziert sind → Provider-ROI + geringe Churn.

---

## 10. Provider-Intake & Vetting (offline-first)

1. **Akquise** über die Firma (B2B/Sales), **nicht** über die Website.
2. Angeworbener Provider bekommt **Intake-Link** (token-gated) → Formular: Firmen-/Personendaten, Zertifizierungen, Spezialisierungen, Länder/Sprachen, Statuten-Bestätigung, Pricing-Range, Kalender-Verknüpfung.
3. Payload landet als **Paket** bei uns → **manuelles Vetting/Abnahme** (Richtlinien/Statuten-Test) → Status `approved|rejected`.
4. Bei `approved`: `partner_status=active`, Provider im Listing sichtbar, Zugang zum **Provider-Dashboard** (bestehend) für Pricing-/Kalender-/Verfügbarkeits-Settings.

---

## 11. Entscheidungen (2026-08-04) + Rest-Offenes

**Entschieden:**
1. **Risk-Map Teilansicht:** zeigt Gesamt-Risiko-Level + die **eine** wichtigste Obligation (Häppchen) + Provider-Teaser („X Provider gematcht"); Rest (Pflichten, Empfehlungen, Provider-Liste) geblurrt/gated.
2. **Pricing (angepasst 2026-08-04):** Auf der Card **KEIN konkreter Preis**, sondern das **Abrechnungs-Modell** (Enum: Abomodell / Stundenbasis / Projektbasiert / …), vom Provider im Onboarding gesetzt. Die **volle Pricing-Tabelle** (falls vorhanden) erscheint erst auf der **Detail-Page**. Alle Card-Felder = Provider-Onboarding-Eingabe.
3. **Detail-Open-Abrechnung:** **1× pro (user_id, provider_key) je 30-Tage-Fenster** (rollierend), server-seitig über `event_log` dedupliziert.
4. **Kalender-Sync-Technik:** **offen bis Phase 2** (Empfehlung: Aggregations-Layer Cal.com/Cronofy/Nylas statt eigenes Google-/MS-OAuth). Datenmodell mit Platzhalter bauen.
5. **Marketing-Routen:** **Hybrid** — SEO-Seiten behalten (countries, compliance-areas, resources), jeder CTA → Wizard; provider-orientierte/redundante Seiten löschen/redirecten (providers, advisory, solutions, platform, services, ai-governance).
6. **Post-Handoff-Kommunikation:** voller **Alert-/E-Mail-/Review-Prozess** — siehe [notifications-alerts-concept.md](notifications-alerts-concept.md). Watchdog schickt beidseitige Reminder, triggert beidseitige Reviews (→ Ranking), fängt No-Shows/Stornos ab; Admin behält Kontrolle via Cockpit.
7. **Reveal + Billing-Moment:** **bei Buchung** (`scheduling_confirmed`). Beidseitiger Reveal: User sieht Provider-Identität, Provider bekommt das **Dossier (Risk Map + User-Kontakt)**. Provider zahlt bei Buchung — **auch bei No-Show** (Mehrwert-Prinzip: er erhält immer die Lead-Daten). Kein Storno-Fenster.

**Rest-offen (nicht build-blockierend):** Kalender-Sync-Technik (P4, Phase 2) · Reminder-Offsets · Reschedule-Limit · Verifizierte-Review-Schwelle fürs Listing. Goodwill bei Provider-No-Show ist entschieden (kein Geld: Re-Match ODER CompliHub kontaktiert Provider + User-Review erzwingen).

---

## 12. Vorgeschlagene Build-Reihenfolge

1. **Design (Figma/Compass)** der neuen Screens: Landing · Risk-Map (Teil/Voll + Gate) · anonymes Listing · Detail-Page · Scheduling. → Figma↔Code-Parität-Regel beachten.
2. **Datenmodell/Backend (A):** `pricing_range` + Scoring in `/search` + Scheduling-Schema + Event-Typen + Detail-/Scheduling-Endpoints.
3. **FE-Flow (B):** Wizard→`/search`→echte Risk Map (Teil→Gate→Voll) → anonymes Listing → Detail → natives Scheduling → Handoff.
4. **Provider-Intake & Dashboard (C):** Intake-Link-Formular + Vetting-View + Pricing/Kalender-Settings.
5. **Aufräumen (D):** toter Wizard, Provider-Marketing-Landing, Marketing-Routen-Konsolidierung.
6. **Monetarisierung scharf schalten:** Billing-Hooks an Detail-Open + Scheduling-Lead.
