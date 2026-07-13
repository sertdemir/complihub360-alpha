# Interaction Wiring Map — jede Aktion, ihr Soll-Verhalten, ihre Welle

> Stand 2026-07-11 · Quelle für „Soll": GoogleDrive_Docs `User Flows (Complete)` / `Provider Flows (Complete)` / `Addendum — Dossier Handover (2026-07-10)` / Drawer-Direktive (Gap-Lists 2026-06-19) · Figma-Drawer auf Seite „Dashboards", Section `▣ DRAWERS`.
>
> **Status:** ✅ verdrahtet · 🟡 teilweise (Handler ohne echte Wirkung / Demo) · ⛔ Kulisse
> **Welle:** A = Akquise-Kreis · B = Drawer-Welle · C = Sekundäraktionen · D = Polish/Tooltips
> Regel aus der Drawer-Direktive: *jede* Edit-/Detail-/Configure-Aktion öffnet einen Drawer, nie eine neue Seite.

---

## 0. Bereits vollständig verdrahtet (Referenz)

| Bereich | Aktionen |
|---|---|
| Marketing/LP | Navigation, Sprachwechsel, Theme-Toggle, FAQ-Accordions, Domain-Side-Sheet (S4), Markets-Drawer, alle Scroll-/Hover-Reveals |
| Auth (Demo) | User-/Partner-Demo-Login, `?as=admin`, Redirects nach Rolle |
| Wizard-UI | Alle Schritte klickbar (Pre-Gate, 6 Kategorie-Flows), Overlay öffnen/schließen |
| User-WS | Sidebar/DomainBar-Navigation, Filter-Chips (Sessions, Requests, Library, Events), **Request quote → kompletter Funnel** |
| Provider-WS | Navigation, Filter-Chips, `?state=ooo/empty`-Demos, Daten via API |
| Magic-Link | verify → anonymisiertes Dossier → confirm/reply/decline → Unlock |
| Admin | Navigation, Overview + Events mit Live-Daten, Event-Filter |

---

## 1. WELLE A — Der Akquise-Kreis (Wizard-Ende → Registrierung)

Der im Spec definierte Kern-Funnel für Neukunden (User Flows §2–§8). Ohne ihn bleibt der Wizard eine Sackgasse und `requester_identity` im Dossier leer.

| # | Element / CTA | Ort | Ist | Soll (Spec) | Abhängigkeit |
|---|---|---|---|---|---|
| A1 | Wizard „Ergebnis anzeigen" (letzter Schritt) | Wizard-Flows | 🟡 zeigt Results mit Fixture | Session persistieren (`sessions`-Tabelle: answers, risk map, Gast-`session_id`) → Results aus echter Session | **Neue Tabelle `sessions`** + POST /api/v1/session |
| A2 | Primary CTA auf Partner-Card | ResultsRiskMap | ⛔ | EngagementModal (Light-Variante): Message + Email + Consent → optional Budget/Timeline/Größe → POST engagement mit `structured_answers` = Session-Daten + `session_id` (User Flows §6.2) | A1; verwaisten `EngagementModal.tsx` reaktivieren |
| A3 | Bestätigung „Track in dashboard" | Modal Step 3 | ⛔ | Registrierungs-CTA (User Flows §6.2/§8.1) → magic-link Auth, Account mit Session vorbefüllt (Wizard-Spec Z.59) | Echte Supabase-Auth |
| A4 | Registrierungs-Prompts im Wizard (4 Stellen) | Wizard | ⛔ | Email-only magic-link, kein Passwort (Wizard-Spec) | Echte Supabase-Auth |
| A5 | Secondary CTA (Affiliate) auf Non-Partner-Card | ResultsRiskMap | ⛔ | Neuer Tab + Affiliate-Tracking-Params, Event `secondary_clicked` (User Flows §7) | Tracking-Param-Schema |
| A6 | „PDF Report exportieren" | ResultsRiskMap | ⛔ | Gast-erlaubter PDF-Export (User Flows §9) | PDF-Renderer |
| A7 | Identity-Befüllung im Dossier-Unlock | Backend | 🟡 `null` | `requester_identity` = Account-Email/Firma nach A3 | A3 |

## 2. WELLE B — Die Drawer-Welle (Dashboards bedienbar machen)

Alle 16 Drawer existieren in Figma (Section `▣ DRAWERS`) und die `Drawer`-Komponente liegt in Storybook — es fehlt nur der Einbau. Priorisierung nach Produktwert:

### Provider-Workspace

| # | Auslöser | Ort | Ist | Soll → Drawer (Figma-Node) | Abhängigkeit |
|---|---|---|---|---|---|
| B1 | „Reply"-Action auf Request-Card | /requests | ⛔ | **Reply/Proposal-Drawer** (2649:2): Nachricht + optional Proposal (Preis/Timeline/Deliverables, Provider Flows §5) → POST provider/reply | Thread-/Proposal-Felder in API |
| B2 | „Open"-Action auf Request-Card | /requests | ⛔ | Request-Detail (Thread) — Drawer, zeigt Dossier + Verlauf | GET engagement/:id |
| B3 | Glocke (Topbar) | Shell | ✅ | Bell-Popover: Live-Unread-Badge, letzte 7 Events (unread-Dots), Mark all read (C1-Watermark), Deep-Link auf Thread, View all → /notifications | — |
| B4 | Topbar-Suche | Shell | ⛔ | **Search-Drawer** (2651:2) über Requests/Clients | GET requests?q= |
| B5 | „Add market" | /coverage | ⛔ | **Add-Market-Drawer** (2651:50) → PATCH provider coverage | PATCH providers |
| B6 | „View ranking impact" | /coverage, /performance | ⛔ | **Ranking-Impact-Drawer** (2653:50), read-only | — |
| B7 | Invoice-Row-Klick | /billing | ⛔ | **Invoice-Detail-Drawer** (2653:92) | invoices-Schema |
| B8 | „Change email" | /settings | ⛔ | **Change-Email-Drawer** (2652:234) mit Verify-Schritt | Echte Auth |
| B9 | Destruktive Aktionen | /settings | ⛔ | **Confirm-Drawer** (2651:90) | — |
| B10 | „Help & support" | Sidebar | ⛔ | **Help-Drawer** (2652:2) | — |

### User-Workspace

| # | Auslöser | Ort | Ist | Soll → Drawer (Figma-Node) | Abhängigkeit |
|---|---|---|---|---|---|
| B11 | „Open thread" auf Request-Card | /requests, Home | ⛔ | **Request-Thread-Drawer** (2654:2): Verlauf + Antworten | GET engagement/:id + Thread |
| B12 | Dokument-Upload-CTA | Workbench/Session | ⛔ | **Doc-Upload-Drawer** (2654:49) — **mit Consent-Checkbox → POST document/upload (API existiert komplett!)** | keine — API fertig ✔ |
| B13 | Session-Row „⋯"-Menü | /sessions | ⛔ | **Session-Actions-Drawer** (2654:89): rename/duplicate/archive | sessions-Tabelle (A1) |
| B14 | Request-Card „⋯" | /requests | ✅ | Request-Actions-Drawer: Remind (frische Magic-Links + Reminder-Mail + sla_reminder_sent), Withdraw (Status 'withdrawn', Tokens verbrannt, 2-Stufen-Confirm), Open thread; Gating auf offene Status | — |
| B15 | „Configure alerts" | Workbench, Notifications | ⛔ | **Configure-Alerts-Drawer** (Board 2073:164) | alert-prefs-Schema |
| B16 | Topbar-/Sidebar-Suche | Shell | ⛔ | **Search-Drawer** (2654:176) | Such-Endpoint |

## 3. WELLE C — Sekundäraktionen & Zustand

| # | Element | Ort | Ist | Soll | Abhängigkeit |
|---|---|---|---|---|---|
| C1 | „Mark all seen/read" | Provider /requests, /notifications | ✅ | `notification_reads`-Watermark pro Viewer-Key + GET/POST /api/v1/reads; Notifications-Chips + Sidebar-Badges + Requests-Banner live | — |
| C2 | Availability-Pill / „End early" (OOO) | Provider-Shell, /requests | 🟡 nur ?state-Demo | Toggle → PATCH provider availability + Banner echt | PATCH providers |
| C3 | „Update payment method" | /billing | ⛔ | Stripe-Portal-Link (Spec: Stripe-issued) | Stripe-Account (User-Schritt) |
| C4 | „Preview public profile" | /requests OOO-State | ⛔ | Route zur Public-Profile-Seite (C-4, einzige Full-Page-Ausnahme) | Seite bauen |
| C5 | „Replace" (Avatar), Settings-Rows | /settings | ⛔ | Upload/Drawer je Zeile | Storage |
| C6 | „Resume" / „Start new" / „Refine existing" | User Home, Workbench | ⛔ | Resume → letzte Session (A1); Start new/Refine → Wizard mit/ohne Vorbefüllung (User Flows §8.3) | A1 |
| C7 | „See full plan" / „See all" | Workbench | ⛔ | Expand inline bzw. Link auf Sessions/Provider-Liste | — |
| C8 | Exports „Download" | /exports | ⛔ | Datei-Download (PDF-Flow §9) | A6/PDF-Renderer |
| C9 | „Join early access" | Alerts/Calendar | ⛔ | Interest-Flag ins event_log | — |
| C10 | Admin „Open watchlist"/„Escalate"/„View" | /admin | ⛔ | Scroll zur Watchlist / Reminder-Trigger / Drawer mit Engagement-Detail | Reminder-Endpoint |
| C11 | Admin-Stubs (Providers/Security/Privacy/Alerts/Status) | /admin/* | 🟡 Stub | Verdrahten nach Figma-Vorlage (Seite „Admin") | security-Events, provider-GETs |
| C12 | Notification-Action-Links („Open RQ-… →") | beide Feeds | ✅ | Provider-Feed-Links + User-Feed-Karten navigieren zu ?thread=uuid (ThreadDrawer); User-Feed jetzt live mit eigenem Read-State (user-notifications) | — |

## 4. WELLE D — Polish

| # | Element | Soll |
|---|---|---|
| D1 | Filter-Chip-Zahlen (·3, ·2 …) + Banner-Counts | Live aus API-Daten berechnen (heute teils statisch aus Figma) |
| D2 | Tooltips | Komponente existiert in Storybook — einsetzen an KPI-Deltas, SLA-Timern, Ranking-Faktoren, gesperrten Feldern |
| D3 | „2 new requests"-Banner (Provider) | An echte neue Requests seit letztem Besuch koppeln (braucht C1) |
| D4 | Loading-/Skeleton-States | KPICard hat `loading` — bei API-Fetches nutzen statt Fixture-Blitz |

---

## 5. Empfohlene Reihenfolge & Warum

1. **B12 zuerst** (Doc-Upload-Drawer): einziger Posten ohne jede Abhängigkeit — die Upload-/Consent-/Redaction-API ist fertig und getestet, es fehlt nur UI. Macht gleichzeitig das Consent-Gate sichtbar.
2. **Welle A komplett** (A1–A7): schließt den Spec-Funnel, liefert `sessions`-Schema (das B13/C6 ohnehin brauchen) und echte Auth (die B8 braucht). Größter Produktwert.
3. **Welle B** in der Tabellen-Reihenfolge (B1/B2/B11 zuerst — Reply + Thread machen den Engagement-Loop beidseitig erlebbar).
4. **Welle C**, dann **D**.

Abhängigkeits-Kurzformel: `A1 (sessions) ← A2..A4, B13, C6` · `Echte Auth ← A3, A7, B8, C1` · `Thread-API ← B1, B2, B11, C12`.
