# Dashboard-Audit v2 — Gap-Liste (User + Provider)

> **Stand:** 2026-08-04 · Audit beider Dashboards gegen die v2-Anforderungen (`user-flow-matchmaking-v2-spec.md`, `notifications-alerts-concept.md`, finale 8 Domains).
> **Methode:** 2 parallele Code-Audits (alle gerouteten User- + Provider-Screens, Shells, APIs, Legacy-Routen), konsolidiert.

---

## 0. Kernbefund

**Das v2-Backend existiert — beide Dashboards wissen nichts davon.**

| Ebene | Status |
|---|---|
| Migration `20260805000000_matchmaking_v2.sql` (`scheduling`, `reviews`, `providers.billing_model/pricing_table/pseudonym_label/…`) | ✅ vorhanden |
| API: `GET /provider/:key/detail` (monetarisiert) · `GET /provider/:key/slots` · `POST /scheduling` (Lead+Reveal) · `POST /provider/intake` (token-gated) | ✅ vorhanden |
| `ProviderMatchCard.tsx` (anonyme Card, Code-Mirror) | ✅ gebaut — **0 Verwendungen in `src/`** |
| **User-Dashboard-UI** | ❌ komplett v1 (Engagement/Magic-Link/SLA-Modell) |
| **Provider-Dashboard-UI** | ❌ komplett v1 (Requests/Confirm-Modell, alte €92-Billing) |

Beide Dashboards bilden einen Funnel ab, den v2 abgelöst hat. Kein einziger Aufruf von `scheduling`, `slots`, `/detail`, `pseudonym`, `billing_model` im gesamten Dashboard-Code (per Grep verifiziert).

---

## 1. Konsolidierte P0-Liste (nach Wirkung geordnet)

### Cluster A — Objektmodell: Requests → Buchungen
1. **User `dashboard/requests`** ([UserRequestsPage.tsx]) ist der v2-abgelöste Screen (Buckets confirm/replied/overdue, SLA-Footer). → ersetzen durch **„Termine/Buchungen"** auf `scheduling`-Basis. Sidebar-Eintrag + Live-Badge ([UserShell.tsx:38], Badge zählt `confirm/replied`).
2. **Provider `partner-dashboard/requests`** ([RequestsPage.tsx]) = altes Modell inkl. Confirm-Gate + `ANON_COMPANY`-Unlock-Logik ([api/requests.ts:35–45,94]) — v2 kennt keinen Confirm-Schritt: Buchung kommt fertig + bezahlt, Dossier sofort. → **`bookings`-Liste + Dossier-Ansicht** (`bookings/:id`). Fehlt auch im API: `GET /provider/:key/bookings`.
3. **ProviderShell** ([ProviderShell.tsx:22–45,59]): keine Nav für Termine/Kalender/Reviews; Badge zählt `awaiting-confirm`.

### Cluster B — Anonymität (Klarnamen vor Buchung)
4. **User-Seite:** Klarnamen in [api/requests.ts:114–130] (`PROVIDER_NAMES`-Map!), [UserHomePage.tsx:18–34], [SavedProvidersPage.tsx:15–20] (klarster Verstoß: gebookmarkte Klarnamen ohne Buchung), [WorkbenchPage.tsx:101–105], [UserNotificationsPage.tsx-Fixture] („Studio Bianchi … €6,500 fixed"), [ResultsRiskMap.tsx:122–126]. → Pseudonym + `ProviderMatchCard` einsetzen.
5. **Provider-Seite:** „Public identity" mit Klarname/Standort/Kanzleigröße ([CoveragePage.tsx:79–91], [SettingsPage.tsx:59–90]) → auf `pseudonym_label`/`region`/`active_since` umstellen. [PartnerProfile.tsx:68–73] zeigt sogar Kontaktpersonen-PII (Legacy, löschen).

### Cluster C — Domains (finale 8)
6. **UserShell `DOMAINS`** ([UserShell.tsx:66–73]) = alte 6 **inkl. `Full Support`**; DomainBar-Tabs ohne `onClick` → **gesamte Domain-Achse funktionslos, Workbench unerreichbar**.
7. **WorkbenchPage** ([WorkbenchPage.tsx:23–72,95–98]): `full-support`-Block raus, 3 neue Domains rein (Product Compliance, Logistics & Customs, Legal Advisory).
8. **Provider Coverage** ([CoveragePage.tsx:37–41]): nur 3 Domains (VAT/EPR/DAT), read-only. → 8 Domains + Toggle + Write-Pfad.
9. **Duplizierte `DOMAIN_KEY`-Map (5×)** → in ein `lib/domains.ts` konsolidieren (Slug ↔ Label ↔ i18n ↔ Icon). Fundstellen: SessionsPage:42, RequestQuoteModal:35, SessionActionsDrawer:27, DocUploadDrawer:35, WorkbenchPage:95 + `userws.json` `domain.*` (4 Sprachen).

### Cluster D — Provider-Selbstverwaltung (schwerste Provider-Lücke)
10. **Settings ohne v2-Felder** ([SettingsPage.tsx]): kein `billing_model`-Selektor, kein `pricing_table`-Editor, keine Anonym-Card-Felder, keine Kalender-/Verfügbarkeits-Pflege (nur binäres OOO). Braucht auch neuen API-Pfad `PATCH /provider/:key/profile` (bestehender PATCH akzeptiert nur `add_country`).

### Cluster E — Monetarisierung
11. **BillingPage** ([BillingPage.tsx:18–49]) zeigt alte €92/Confirm + €2/Click-Posten; die neuen Events `provider_detail_opened` (feuert bereits mit `billable:true`) und `provider_lead_charged` fehlen komplett. Preis-Hardcodes in 3 Ebenen + **widersprüchliche USD-Preise** im Onboarding ([ProviderOnboardingPage.tsx:337]).

### Cluster F — Intake statt Self-Registration
12. **Drei Self-Registration-Pfade** = v2-Verstoß (D7): `partner-onboarding` (6-Step-Wizard, kein Token, kein API-Call, Submit → direkt Dashboard), `ProvidersPage`/`RegisterSection` (öffentliche Akquise-Landing, laut Spec hinfällig), `RegisterPage` role=partner. → ersetzen durch **token-gated Intake-Route** (`POST /provider/intake` + „In Review"-Wartescreen); Vetting-Status (`partner_status`) im UI abbilden statt statischem „Verified"-Badge ([ProviderShell.tsx:151]).

### Cluster G — Watchdog/Events
13. **Beide Notification-Feeds** mappen nur 5 v1-Event-Typen ([api/notifications.ts:32–38], [NotificationsPage.tsx:34–47]); alle 12 v2-Lifecycle-Events (`scheduling_confirmed`, `reminder_24h/1h`, `outcome_check`, `review_request`, `no_show`, …) fielen als Roh-Debug-Text durch. Deep-Links zeigen nur auf Request-Threads.

### Cluster H — Session→Results-Bruch
14. **SessionsPage „Open"** ([SessionsPage.tsx:140]) verwirft die Session-ID und öffnet die statische `/results`-Fixture. → Session-ID durchreichen; **Session→Results-Surface** bauen (eine Surface, zwei Eingänge; Route-Slot `dashboard/sessions/:id` wird frei nach Legacy-Löschung).
15. **„Alerts/Calendar (Coming Soon)"** ([ComingSoonPage.tsx]) verspricht prä-Booking-Monitoring; unter v2 ist der Calendar-Slot die **Terminübersicht** — Slot besetzt, falsche Bedeutung.

---

## 2. Legacy-Löschliste (beide helle v0-Shells)

**User** ([App.tsx:164–168] + toter Import Z.27): `DossierDetail` (Platzhalter-Body, `alert()`-CTA), `KnowledgeCenter` (Dublette der Library), `UserWorkspace`, `UserMessages` (Klarnamen-Chat), `DashboardHome` (Wildcard-Fallback, hartcodierte `/de/`-Links — bricht Locales), `UserDossiers` (ungeroutet). Mitentfallend: `useDashboardStore`, `DashboardLayout`, `DashboardSidebar`.

**Provider** ([App.tsx:176–187]): `PartnerDashboardHome` (home-old **und** Wildcard-Fallback → auf `requests`/künftig `bookings` redirecten), `LeadInbox`, `LeadDetail` (strukturell brauchbare Dossier-Referenz, sonst löschen), `ActiveClients`, `PartnerProfile` (PII, P0).

---

## 3. Fehlende v2-Screens

**User:** F1 Termine/Buchungs-Liste (ersetzt Requests) · F2 Session→Results-Surface · F3 anonymes Listing (ProviderMatchCard einsetzen) · F4 Provider-Detail-Page (Client für `GET /detail`) · F5 Scheduling-UI (`GET /slots` → `POST /scheduling`) + Reveal-Bestätigung · F6 Review-Flow (Sterne+Kategorien, T+2h/T+3d/T+7d) · F7 Outcome-Check + 1-Klick-Re-Match · F8 Post-Booking-Monitoring (statt Coming-Soon) · F9 anonyme Merkliste.

**Provider:** P1 `bookings`-Liste (+ neuer API `GET /provider/:key/bookings`) · P2 Dossier je Lead (`bookings/:id`, Gegenstück zum User-Reveal fehlt im API) · P3 Pricing-Table-Editor + billing_model (+ `PATCH /provider/:key/profile`) · P4 Anonym-Card-Editor mit Live-Preview (ProviderMatchCard) · P5 Token-Intake-Route + In-Review-Screen · P6 Kalender-/Slot-Pflege · P7 Review-UI beidseitig (+ Review-API fehlt komplett) · P8 Billing v2 (Detail-Opens + Leads, No-Show-Kennzeichnung) · P9 Performance v2 (rating/completed_count/avg_response statt Confirm-KPIs) · P10 Vetting-Status · P11 tote Settings-Sections.

---

## 4. Empfohlene Umbau-Reihenfolge

1. **Fundament:** `lib/domains.ts` (finale 8) + UserShell-DomainBar verdrahten + Legacy-Routen löschen. *(klein, entsperrt alles)*
2. **Anonymität:** Klarnamen-Stellen auf Pseudonym/`ProviderMatchCard` umstellen. *(P0-Verstöße beseitigen)*
3. **Buchungs-Achse User:** F1 Termine-Liste + F5 Scheduling-Wiring + F2/F3/F4 Session→Results→Detail. *(der v2-Kernflow in Code)*
4. **Buchungs-Achse Provider:** `GET /bookings`-API + P1/P2 Liste+Dossier + Shell-Nav.
5. **Selbstverwaltung + Billing:** P3/P4 Settings-Editoren, P8 Billing v2, P10 Vetting-Status.
6. **Intake:** P5 Token-Route, Self-Registration-Pfade entfernen (mit Marketing-Routen-Cleanup aus Spec §11 P5).
7. **Watchdog + Reviews:** Event-Mapping (beide Feeds), F6/F7/P7 Review+Outcome, F8 Monitoring.
8. **Performance/Politur:** P9, tote Links/Buttons, `activeDomain`-Fake-Zustände.

---

## 5. Figma-Hinweis

Die Figma-Dashboards (Page „Dashboards", vollständig per alter Anforderungslage gebaut) erben dieselben inhaltlichen Gaps: alte 6 Domains inkl. Full Support, Request-/Confirm-Modell, Klarnamen-Provider-Karten, €92-Billing. **Empfehlung:** Figma nicht flächig nachziehen, sondern pro Umbau-Schritt (Reihenfolge oben) Screen für Screen — Code und Figma gemeinsam pro Schritt (Parität-Regel), beginnend mit den neuen Screens (Termine-Liste, Dossier, Settings-Editoren), für die es noch gar keine Vorlage gibt.
