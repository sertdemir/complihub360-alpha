# Backend-Konzil — Audit-Report

**Datum:** 2026-06-25  ·  **Methode:** Multi-Agent-Konzil (57 Agenten, adversarial verifiziert)  ·  **Frage:** Erfüllt das CompliHub360-*Backend* die dokumentierten Anforderungen und die Erwartungen des *Frontends*?

**Gesamturteil:** 34 % Erfüllung

> Das CompliHub360-Backend erfüllt die dokumentierten Anforderungen und die Frontend-Erwartungen NICHT in produktionsreifem Umfang: Es ist ein früher Prototyp mit reifem Datenmodell-/Orchestrierungs-Fundament, aber thin, teils widersprüchlicher Runtime, fehlenden Pflicht-Endpoints (document/upload, request-ai, provider/decline), ungesicherten Magic-Links und einer einzigen FE-Backend-Integration, die wegen Auth-, Proxy- und Schema-Konflikten aktuell nicht funktioniert.

Befund-Bilanz: **45 bestätigte Lücken** (9 critical · 23 high · 12 medium · 1 low), **1 widerlegt**.

---

## Executive Summary

Das CompliHub360-Backend ist ein früher Prototyp (Alpha) mit einem überraschend reifen Fundament — ein sauber geschichteter Task-Orchestrator mit Tenant-Isolation, ein deterministischer Policy-/AI-Gate, eine getestete Redaction-Library, ein pgvector-RAG-Store mit HNSW-Index und ein geseedetes AI-Governance-Schema. Dieser Reife steht eine dünne, teils widersprüchliche Laufzeit gegenüber: Drei der im Contract geforderten Pflicht-Endpoints (document/upload, document/request-ai, provider/decline) fehlen vollständig, sechs von acht Service-Modulen sind leere Hüllen, und von rund 80 katalogisierten Events werden nur drei tatsächlich geschrieben — der Haupt-KPI primary_clicked nie. Sicherheitsseitig ist die Provider-Magic-Link-Verifikation ein No-op ('mock logic: assume token is valid'), wodurch jede erratbare engagement-UUID fremde State-Transitions unter Service-Role auslöst — die schwerste, blockierende Lücke. Das Datenmodell leidet unter einer dreifach divergenten engagement_requests-Definition; konkret schreibt die Supabase-Edge-Funktion status='accepted', das den materialisierten v1-CHECK verletzt und jede Magic-Link-Bestätigung mit HTTP 500 quittiert. Die einzige echte Frontend-Backend-Integration (POST /api/compliance/check) ist gleich dreifach gebrochen — kein Auth-Header gegen ein JWT-erzwingendes Backend, ein Vite-Proxy auf Port 3001 gegen einen Service auf 3005, und keine committete .env-Vorlage. Alle übrigen Flows existieren nur als Frontend-Mocks oder als Backend-Endpoints ohne jeden Konsumenten, verteilt über zwei konkurrierende Backend-Surfaces ohne festgelegte Zielwahl. Mein Urteil: Das Backend erfüllt die Anforderungen und Frontend-Erwartungen derzeit nur zu etwa einem Drittel; es ist demo-fähig im Kern-Compliance-Check (sobald Auth/Proxy gefixt sind), aber für Beta sind die fünf P0-Maßnahmen — Magic-Link-Signierung, Schema-Konsolidierung, FE-Integration, Stack-Entscheidung und die Document-Privacy-Pipeline — zwingend zu schließen, bevor von Erfüllung gesprochen werden kann.

---

## Erfüllungsgrad je Dimension

| Dimension | Erfüllung | Kernbefund |
|---|---:|---|
| Requirements-Coverage | 35 % | Fundament vorhanden (task-orchestrator, policy-engine, compliance-engine, redaction-lib, RAG-RPC, AI-Governance-Schema), aber zentrale Pflicht-Endpoints fehlen komplett: POST /api/v1/document/upload, POST /api/v1/document/request-ai und POST /api/v1/provider/decline (alle in compliance-api 0 Treffer, verifiziert). Von ~80 katalogisierten Events werden nur 3 emittiert. SLA-Watchdog, Ranking, Retention, Proposal/Document-Entitäten sind nicht implementiert oder nur als toter Stub vorhanden. 6 von 8 Service-Modulen sind leere Hüllen (0 src-Dateien, verifiziert). |
| Frontend-Backend-Contract | 25 % | Nur EINE echte FE-Integration existiert (POST /api/compliance/check). Diese ist dreifach gebrochen: (1) FE sendet keinen Auth-Header, Backend erzwingt JWT/x-api-key → deterministischer 401; (2) Vite-Proxy zeigt auf 3001, Service bindet 3005 → ECONNREFUSED in Dev (beides verifiziert); (3) keine .env.example, Prod ohne Proxy. Alle übrigen Backend-Flows (engagement/provider/search) haben NULL FE-Konsumenten; zwei parallele Backend-Surfaces (services vs. Supabase) mit divergenten Pfaden/Verben, ohne dass eine Zielwahl getroffen wurde. |
| Datenmodell-Integritaet | 40 % | engagement_requests ist dreifach divergent definiert (v1-Migration vs. v2-Migration vs. packages/types), beide Migrationen nutzen CREATE TABLE IF NOT EXISTS → v1 materialisiert, v2-Body übersprungen, aber v2-Open-Insert-Policy WITH CHECK(true) wird gegen v1 angelegt (verifiziert). Pflicht-Entitäten Document, Proposal, MagicLinkToken existieren weder als Tabelle noch als Typ. CountryPolicy/AuditRecord nur als Code-Konstante bzw. fragmentiert. Reifes Teil: RAG-Vektorstore + HNSW-Index, AI-Governance-Registry mit Seed-Frameworks. |
| Security/Privacy/AI-Governance | 30 % | Kritischste Lücke: Provider-Magic-Links werden NIE signiert/verifiziert (Kommentar 'mock logic: assume token is valid', SERVICE_ROLE_KEY-Writes, GET-Mutationen) → jede erratbare engagement-UUID erlaubt fremde State-Transitions. Kein CSRF, kein Rate-Limiting auf Supabase-Edge-Funktionen, offene Insert-RLS. JWT-Verify ohne exp/nbf/alg-Check und non-constant-time-Vergleich. source_references[] für AI-Felder existiert nirgends. AI-Audit ist fail-open und wird zur Laufzeit nie aufgerufen. Document-Privacy-Gate (sanitized_ready/ai_allowed) ist toter, nicht verdrahteter Code. Positiv: deterministischer Privacy-Gate in policy-engine und Redaction-Lib existieren – nur nicht angeschlossen. |
| Business-Rules & Lifecycle | 30 % | Engagement-Lifecycle springt von created direkt auf confirmed/replied/declined; delivered/viewed/expired werden nie gesetzt. SLA-Reply-Frist hartkodiert +72h statt +48h (verifiziert, line 357); kein Breach-Detection, kein breach_count-Inkrement, kein Reminder-Cadence; der 'SLA Watchdog' pingt OpenAI statt Engagements zu prüfen; In-Memory-Monitor ist explizit disabled. Deterministisches Provider-Ranking fehlt (nur active+country-Filter, kein category-Match, kein Score, kein Sort). Status-Enum-Konflikt: Supabase provider-confirm schreibt 'accepted' (v2-only) → verletzt materialisierten v1-CHECK → HTTP 500 bei jeder Magic-Link-Bestätigung (verifiziert). |

---

## Kritische Lücken (blockierend)

### 1. Provider-Magic-Links sind unauthentifiziert und fälschbar (Token nie verifiziert)

**Impact:** Jeder Akteur, der eine engagement-UUID errät oder kennt, kann fremde Anfragen bestätigen/ablehnen/beantworten. Da die Supabase-Edge-Funktionen unter SERVICE_ROLE_KEY laufen (RLS-Bypass) und als state-ändernde GET-Endpoints ausgeführt werden, ist dies zusätzlich über Prefetch/CSRF auslösbar. Direkter Integritäts- und Vertrauensbruch im Kern des Marketplace-Lifecycles; macht jede SLA-/Revenue-Messung manipulierbar.

**Evidenz:**
- `supabase/functions/provider-confirm/index.ts:17 ('mock logic: assume token is valid for the id'), :20 update status='accepted' via SERVICE_ROLE_KEY`
- `supabase/functions/provider-reply/index.ts und provider-decline/index.ts: token gelesen, nie geprüft`
- `services/compliance-api/src/index.ts:378-383 (/api/v1/provider/magic/:token echo't Token ohne Lookup)`
- `Keine token_hash/magic_link-Tabelle in supabase/migrations (grep 0 Treffer)`

**Empfehlung:** MagicLinkToken-Tabelle (token_hash, engagement_id FK, expires_at 24h, used_at) anlegen; HMAC/JWT-signierte Token bei engagement-Creation ausgeben; in magic/confirm/reply/decline VOR jedem UPDATE Signatur+Expiry+Single-Use prüfen; state-ändernde GETs auf POST umstellen.

### 2. engagement_requests-Schema dreifach divergent; Edge-Function-Write verletzt materialisierten CHECK (HTTP 500)

**Impact:** Auf einer frischen DB materialisiert v1 (CHECK created|delivered|confirmed|replied|declined|expired). supabase/functions/provider-confirm schreibt status='accepted' (nur in der toten v2-Menge enthalten) → CHECK-Verletzung → HTTP 500; jede Provider-Bestätigung über die Edge-Funktion (der Pfad, an den ein FE realistisch anbinden würde) scheitert und wird nie persistiert. Zusätzlich wird die offene v2-Insert-Policy WITH CHECK(true) gegen die v1-Tabelle angelegt und unterläuft die own-row-Beschränkung.

**Evidenz:**
- `supabase/migrations/20260304000000_init_complihub.sql:57 (v1 CHECK)`
- `supabase/migrations/20260323223000_create_engagement_requests_table.sql:10 (v2 CHECK pending|accepted|declined), :24-26 (Anyone can create WITH CHECK(true))`
- `supabase/functions/provider-confirm/index.ts:20 (.update status='accepted')`
- `packages/types/src/engagement.ts:24 (dritte Variante mit 'viewed')`

**Empfehlung:** Auf EIN kanonisches Status-Vokabular (API-Contracts) konsolidieren, v2-Migration als ALTER umschreiben oder entfernen, offene Insert-Policy löschen, alle Writer (Edge-Funktionen + compliance-api) auf 'confirmed' statt 'accepted' normalisieren, Migrations-Test ergänzen.

### 3. Einzige FE-Backend-Integration ist nicht lauffähig (kein Auth + falscher Proxy-Port)

**Impact:** Der einzige echte FE-Call POST /api/compliance/check sendet keinen Authorization-/x-api-key-Header → Backend antwortet hart mit 401. Selbst ohne Auth-Problem zeigt der Dev-Proxy auf localhost:3001, während compliance-api auf 3005 bindet → ECONNREFUSED. In Prod fehlt jeder Proxy und es gibt keine .env.example. Ergebnis: Das Produkt hat de facto null funktionierende Frontend-Backend-Verbindung.

**Evidenz:**
- `apps/vs1-demo/ui/src/api/compliance.ts:6-16 (nur Content-Type + x-correlation-id, kein Auth)`
- `services/compliance-api/src/index.ts:78-79 (JWT/x-api-key-Gate, 401 sonst)`
- `apps/vs1-demo/ui/vite.config.ts:23 (proxy target http://localhost:3001)`
- `services/compliance-api/src/index.ts:495 (PORT default 3005)`

**Empfehlung:** Proxy-Target auf 3005 korrigieren (oder Service per PORT=3001 starten); echte Token-Quelle (Supabase-JWT nach echtem Login) oder im Dev x-api-key mitsenden bzw. den Check-Endpoint bewusst per Allowlist freigeben; .env.example mit VITE_API_URL committen.

### 4. Document-Privacy-Pipeline (Upload → Redaction → sanitized_ready → AI-Gate) end-to-end nicht funktionsfähig

**Impact:** Die zentrale Datenschutz-Zusage (AI sieht nie Rohdaten) ist nicht laufzeitwirksam: kein /document/upload, kein /document/request-ai, keine documents-Tabelle, keine raw_path/sanitized_path/ai_allowed-Spalten. Der deterministische AI-Gate (engine.ts) und die Redaction-Lib existieren, sind aber toter, nicht verdrahteter Code (intent='AI_PROCESSING' wird von keinem Aufrufer gesetzt). Aktuell kein exponiertes Leck (weil kein Upload-Pfad existiert), aber die Kernfunktion fehlt vollständig.

**Evidenz:**
- `grep 'document/upload|document/request-ai' in services/ + supabase/functions: 0 Treffer`
- `grep 'ai_allowed' in supabase/migrations: 0 Treffer`
- `packages/policy-engine/src/engine.ts:73-96 (Gate-Logik vorhanden, intent nie gesetzt)`
- `services/redaction/src/redact.ts (Lib produziert sanitized_ready, nirgends importiert)`

**Empfehlung:** documents-Entität + Migration anlegen; /document/upload (Raw-Vault + redactText) und /document/request-ai implementieren, wobei request-ai deterministisch verweigert solange sanitized_ready!=true ODER ai_allowed!=true; vorhandenen AI_PROCESSING-Gate via orchestrator.executeByIntent verdrahten.

### 5. Kein SLA-Lebenszyklus zur Laufzeit: keine Breach-Detection, kein breach_count, falsche Reply-Frist

**Impact:** Das deterministische SLA-Versprechen (Reminder 24h/36h, Breach 48h, breach_count-Inkrement, Downgrade-Trigger) ist nicht implementiert. Reply-Frist ist hartkodiert +72h statt +48h. Der 'Provider SLA Watchdog' pingt OpenAI statt Engagements zu prüfen; der einzige Monitor ist disabled und arbeitet in-memory. Geschriebene Deadline-Spalten sind tote Daten. Damit funktioniert weder Monitoring noch Conversion-/Revenue-Messung noch die Provider-Qualitätssteuerung.

**Evidenz:**
- `services/compliance-api/src/index.ts:357 (sla_reply_deadline +72h)`
- `services/compliance-api/src/index.ts:17 (Monitor-Aufruf auskommentiert)`
- `automations/n8n/provider-sla-watchdog.json (httpRequest an api.openai.com/v1/models)`
- `supabase/migrations/20260304000000_init_complihub.sql:36 (breach_count nie inkrementiert)`

**Empfehlung:** DB-gestützten Scheduler (n8n-Cron/Worker) bauen, der sla_*_deadline liest, Reminder 24h/36h sendet, bei 48h status='expired' setzt + breach_count inkrementiert + sla_breached-Event emittiert; Reply-Frist aus sla_target_reply_hours (48) ableiten; Watchdog-Inhalt durch echten Graph ersetzen.

---

## Coverage-Matrix (Contract-Endpoints & Entities)

| Anforderung | Status | Notiz |
|---|:--:|---|
| `POST /api/compliance/check` | 🟡 partial | Implementiert + gehärtet (Validierung, 100KB-Cap, Logging), aber FE-Call schlägt fehl (kein Auth → 401; Proxy 3001 vs Service 3005). Funktional am Backend, gebrochen am Contract. |
| `POST /api/v1/engagement` | 🟡 partial | compliance-api: erstellt Row mit status='created' + SLA-Deadlines (Reply +72h falsch) + 1 Event. Supabase-Variante: kein user_id/status/SLA, fügt session_id ein. Zwei divergente Surfaces, kein FE-Konsument. |
| `GET /api/v1/engagement/:id` | ❌ missing | Kein Status-/Proposal-Abruf-Endpoint in compliance-api oder Supabase vorhanden. |
| `GET /api/v1/provider/magic/:token` | 🔶 divergent | Echo't Token zurück ('Magic link verified') ohne Lookup/Expiry/Signatur. Sicherheitskritisch. |
| `POST /api/v1/provider/confirm` | 🔶 divergent | compliance-api schreibt 'confirmed' (v1-konform) ohne Token-Check. Supabase-Edge schreibt 'accepted' → CHECK-Verletzung/500. Keine Magic-Token-Verifikation. |
| `POST /api/v1/provider/reply` | 🟡 partial | Status-Update 'replied' + Event, aber keine Token-/Ownership-Prüfung, keine Proposal-Annahme/-Persistenz. |
| `POST /api/v1/provider/decline` | ❌ missing | In compliance-api gar nicht vorhanden. Supabase-Edge macht nur bare status='declined' ohne Reason-Capture, Token-Check oder Re-Routing. |
| `POST /api/v1/document/upload` | ❌ missing | Existiert nirgends (grep 0 Treffer). Keine documents-Tabelle. Einstiegspunkt der Privacy-Pipeline fehlt. |
| `POST /api/v1/document/request-ai (AI-Gate)` | ❌ missing | Kein HTTP-Endpoint. Gate-Logik in policy-engine vorhanden, aber toter Code (intent nie gesetzt). |
| `POST /api/v1/search (Ranking + RAG)` | 🟡 partial | compliance-api: deterministische Subdomains + RAG mit STUBBED Konstant-Embedding + active+country-Filter, KEIN category-Match/Score/Sort; overview_summary hartkodiert, articles/tips leer, keine source_references. Supabase: reiner Mock (2 Provider). |
| `event_log / Event-Sourcing` | 🟡 partial | Tabelle + Append-Only-RLS vorhanden; nur 3 von ~80 Events emittiert (primary_request_submitted, provider_confirmed, provider_replied). Supabase-Funktionen schreiben 0. primary_clicked (Haupt-KPI) wird nie erfasst. |
| `Entity User` | ✅ met | In Migration definiert (FK auth.users, role-CHECK, consent_flags jsonb). Im packages/types jedoch nicht als Typ vorhanden. |
| `Entity Provider` | ✅ met | Tabelle + packages/types-Typ vorhanden inkl. SLA-Targets, breach_count, partner_status. |
| `Entity EngagementRequest` | 🔶 divergent | Dreifach divergent (v1-Migration / v2-Migration / packages/types) mit kollidierenden Status-Enums; Schema-Drift via CREATE TABLE IF NOT EXISTS. |
| `Entity Document` | ❌ missing | Keine Tabelle, kein Typ; classification nur flüchtig in PrivacyFlags. |
| `Entity Proposal` | ❌ missing | Keine Tabelle, kein Typ, keine Logik; provider-reply nimmt kein Proposal entgegen. |
| `Entity MagicLinkToken` | ❌ missing | Keine Tabelle/Spalte/Typ; Token wird nie validiert. |
| `Entity CountryPolicy` | 🟡 partial | Nur Code-Konstante (countryMatrix.ts), nicht persistiert; Feldnamen weichen vom Contract ab (retentionDays vs retention_period). |
| `AuditRecord / Audit-Logging` | 🟡 partial | event_log teilweise befüllt (3 Events, actor_id gesetzt), aber kein einheitliches AuditRecord über alle kritischen Aktionen; Edge-Funktionen schreiben keinen Audit; ai_audit_logs zur Laufzeit nie geschrieben; storage-AuditLog ist console-Stub. |
| `AI-Governance-Registry` | 🟡 partial | Schema + 3 Seed-Frameworks vorhanden; ai_features/mapping ungeseedet und nirgends gelesen; Enforcement TS-hartkodiert, nicht registry-getrieben; governance-Package komplett unverdrahtet. |
| `Redaction-Pipeline / Vaults` | 🟡 partial | Redaction-Lib deterministisch implementiert + getestet, aber nie importiert; Raw-/Sanitized-Vault liefern MOCK-Daten; end-to-end nicht funktionsfähig. |
| `match_knowledge_chunks RPC (RAG)` | 🟡 partial | DB-RPC korrekt + HNSW-Index. Von compliance-api aufgerufen, aber mit Konstant-Embedding; von Supabase-search-Funktion nicht genutzt; keine Embedding-/Ingestion-Pipeline. |
| `Knowledge & Retention-Entities (NewsAlert/KnowledgeAsset/...)` | ❌ missing | Bewusst als Beta/queued nicht gebaut. Backlog. |

---

## Remediation-Backlog (priorisiert)

| Prio | Maßnahme | Aufwand | Begründung |
|:--:|---|:--:|---|
| P0 | Magic-Link-Token signieren, persistieren (token_hash/expires_at/used_at) und in confirm/reply/decline/magic VOR jedem UPDATE verifizieren; state-ändernde GETs auf POST umstellen | M (Token-Issuing + Tabelle + Verify-Pfad in 4 Funktionen) | Schließt die schwerste Sicherheitslücke (unauthentifizierte, fälschbare State-Transitions auf erratbarer UUID via SERVICE_ROLE). Voraussetzung für jegliche Marketplace-Integrität. |
| P0 | engagement_requests-Schema auf eine kanonische Definition konsolidieren (v2-Migration als ALTER/Entfernen, offene Insert-Policy löschen, alle Writer auf 'confirmed' normalisieren, Migrations-Test) | M | Behebt den CHECK-Verletzungs-/HTTP-500-Fehler bei jeder Edge-Function-Bestätigung und beseitigt die Schema-Drift, die alle Lifecycle-Writes unzuverlässig macht. |
| P0 | FE-Backend-Integration reparieren: Vite-Proxy auf 3005, Auth-Header (JWT/x-api-key) im compliance-Call, .env.example committen | S | Ohne diese drei Fixes funktioniert die einzige reale FE-BE-Verbindung weder in Dev (ECONNREFUSED) noch in Prod (401) — das Produkt ist sonst nicht demonstrierbar. |
| P0 | Auf EINEN kanonischen Backend-Stack pro Flow festlegen (services vs. Supabase-Edge) und Duplikate deprecaten | S (Entscheidung) + M (Umsetzung) | Zwei divergente Surfaces mit unterschiedlichen Pfaden/Verben/Status-Werten erzeugen beim FE-Anschluss zwangsläufig Mismatches; ohne Entscheidung sind alle weiteren Fixes doppelt zu pflegen. |
| P1 | Document-Entität + /document/upload + /document/request-ai implementieren und Redaction-Lib + AI-Gate (intent='AI_PROCESSING') verdrahten | L | Stellt die Kern-Privacy-Zusage (AI sieht nie Rohdaten) tatsächlich her und aktiviert den vorhandenen, aber toten Gate-Code. |
| P1 | DB-gestützten SLA-Watchdog bauen (Reminder 24h/36h, Breach 48h, breach_count++, sla_breached-Event); Reply-Frist auf 48h korrigieren; OpenAI-Ping-Watchdog ersetzen | L | Aktiviert deterministisches SLA-/Conversion-Monitoring und Provider-Qualitätssteuerung; ohne ihn sind geschriebene Deadlines tote Daten. |
| P1 | Deterministisches Provider-Ranking implementieren (Eligibility country+category, Partner-Boost, gewichteter Score, Sort, provider_ranked-Event) | M | Search liefert aktuell ungeordnete/gemockte Provider; Ranking ist Kern des Marketplace-Werts und Voraussetzung für die Results-Page. |
| P1 | Vollständiges Event-Set aus einem gemeinsamen Engagement-Service emittieren (inkl. primary_clicked, delivered, magiclink_opened, declined, sla_*); Proposal-Entität ergänzen | M | Haupt-KPI primary_clicked wird nie erfasst; ohne vollständiges Event-Log ist KPI-Aggregation und Audit unbrauchbar. Proposal fehlt für provider/reply. |
| P2 | JWT-Verify härten (exp/nbf/alg-Pinning, timingSafeEqual), RBAC-Rollen-Check, Rate-Limiting auf Supabase-Edge, CSRF/Origin-Checks; AI-Audit fail-closed reaktivieren und verdrahten | M | Schließt die zweite Ebene von Security-/Governance-Lücken; weniger akut als Magic-Link, aber vor Beta zwingend. |
| P2 | CountryPolicy + AuditRecord persistieren und als Source-of-Truth verankern; Retention-/Cleanup-Worker (Raw löschen, Sanitized aufbewahren) implementieren | M | Erfüllt GDPR-Retention/-Löschung und macht Country-Policy/Audit zur durchsetzbaren statt nur deklarierten Regel. |
| P3 | Knowledge & Retention-Entities (NewsAlert/KnowledgeAsset/UserContentSubscription/ContentEngagement) und Embedding-/Ingestion-Pipeline für knowledge_chunks spezifizieren; tote Code-Pfade (orphaned resultsService, doppelte AgentRegistry) bereinigen | L | Beta-Commitment bzw. Tech-Debt; nicht release-blockierend, aber für die nächste Ausbaustufe zu planen. |

---

## Widerlegter Befund (zur Fairness dokumentiert)

- **Provider-Felder provider_type und fee_model fehlen** (Datenmodell-Integritaet) — *widerlegt:* Der Befund ist faktisch falsch, weil seine Kernprämisse ("Contract 2.2 verlangt provider_type und fee_model") nicht zutrifft. Die tatsächliche Vertragsquelle — Abschnitt "2.2 Provider" in GoogleDrive_Docs/API Contracts & Data Model.md (Zeilen 36-51) und identisch im NotebookLM-Spiegel docs/notebooklm/api_contracts__data_model.md — listet GENAU 12 Provider-Felder und enthält WEDER provider_type NOCH fee_model. Die Vertragsfelder sind: provider_key, name, website_url, partner_status (active|inactive|downgraded), countries_supported[], languages[], categories[], sla_target_confirm_hours, sla_target_reply_hours, breach_count, created_at, updated_at.

Die Implementierung erfüllt diesen Vertrag exakt: Die providers-Tabelle (Migration 20260304000000_init_complihub.sql:26-39) und das Provider-Interface (packages/types/src/engagement.ts:1-14) bilden alle 12 Vertragsfelder 1:1 ab, inklusive partner_status mit dem exakten Enum. Es gibt also keine Lücke zwischen Contract und Code — der Befund konstruiert eine Anforderung, die der Contract gar nicht stellt.

Zwei Behauptungen des Befunds sind nachweislich falsch: (1) Die Felder provider_type/fee_model sind keine Vertragsfelder (refuted via Contract-Text). (2) "CTA-Gating stützt sich laut Contract auf provider_type" ist falsch — der Contract benennt in Abschnitt 5 ("Deterministic vs AI Fields") explizit partner_status (nicht provider_type) als deterministisches Feld, und das reale Backend (services/compliance-api/src/index.ts:467) gated die Provider-Auswahl korrekt über partner_status: 'active'. Die "non-partner"-Erwähnung in der Monetization-Doc ist ein Umsatz-/Produktstrategie-Konzept, kein Pflicht-Datenmodellfeld, und wird durch partner_status funktional abgedeckt.

Der grep-Nullbefund (provider_type/fee_model existieren nirgends im gesamten Repo) ist korrekt, beweist aber keine Lücke, sondern bestätigt nur, dass diese Nicht-Vertragsfelder zu Recht fehlen. Verdict: refuted — Code erfüllt den echten Contract vollständig.

---

## Alle bestätigten Befunde

### 1. 🔴 [CRITICAL] Engagement status enum is defined three conflicting ways; live status writes violate the canonical CHECK constraint
*Dimension:* Business-Rules & Lifecycle · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** A single canonical EngagementRequest lifecycle: created -> delivered(_to_provider) -> viewed -> provider_confirmed/confirmed -> provider_replied/replied | declined | expired (Anforderungs-Katalog businessRules 'Engagement status model', entity EngagementRequest; API Contracts §2.3). One status vocabulary shared by DB schema, edge functions, and shared types.
- **Ist:** Three divergent definitions exist: (1) v1 init migration CHECK(created|delivered|confirmed|replied|declined|expired); (2) v2 migration CHECK(pending|accepted|declined) with DEFAULT 'pending'; (3) packages/types defines (created|delivered|viewed|confirmed|replied|declined|expired). The supabase edge functions write status='accepted' (provider-confirm) and status='replied' (provider-reply), while services/compliance-api writes status='confirmed'/'replied'. 'accepted' is valid only under the v2 enum; 'confirmed'/'replied' only under v1. Because both migrations use CREATE TABLE IF NOT EXISTS, the earlier v1 table wins on a fresh DB, so a provider-confirm edge-function write of status='accepted' violates the live v1 CHECK constraint. No single source of truth exists.
- **Empfehlung:** Pick one canonical enum (the API-Contracts vocabulary: created|delivered|viewed|confirmed|replied|declined|expired), drop the conflicting v2 migration or rewrite it as an ALTER, and make ALL writers (both edge functions and services/compliance-api) use the same terminal values ('confirmed' not 'accepted'). Add a migration test asserting every status the code writes is a member of the CHECK set.
- **Evidenz:** `supabase/migrations/20260304000000_init_complihub.sql:57 — status ... check (status in ('created', 'delivered', 'confirmed', 'replied', 'declined', 'expired'))`; `supabase/migrations/20260323223000_create_engagement_requests_table.sql:10 — status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined'))`; `packages/types/src/engagement.ts:24 — status: 'created' | 'delivered' | 'viewed' | 'confirmed' | 'replied' | 'declined' | 'expired'`; `supabase/functions/provider-confirm/index.ts:20 — .update({ status: 'accepted' })`; `services/compliance-api/src/index.ts:394 — { status: 'confirmed', updated_at: ... }`

### 2. 🔴 [CRITICAL] No SLA breach detection, breach_count increment, or reminder cadence exists; the 'SLA Watchdog' workflow does not watch SLAs
*Dimension:* Business-Rules & Lifecycle · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** Reminder email at 24h, second at 36h, mark SLA breach if no action after 48h; breach_count is a deterministic counter incremented on each breach; sla_breached event emitted; /engagement/mark-breach and /provider/reminder endpoints (businessRules 'SLA - reminder policy', 'breach_count'; endpoints /engagement/check-confirm, /engagement/mark-breach, /provider/reminder; n8n engagement_watchdog / sla_breach_detector / sla_reminder workflows).
- **Ist:** providers.breach_count exists as a column defaulting to 0 but is never incremented anywhere. No code reads sla_confirm_deadline/sla_reply_deadline to detect a breach. There is no cron/scheduled job, no /mark-breach endpoint, no reminder logic at any interval. The in-memory monitor.ts that would flag unconfirmed flows is explicitly DISABLED (its startCriticalFlowMonitor call is commented out) and operates on in-memory arrays, not the DB. The n8n file named 'Provider SLA Watchdog' contains a cron that issues an HTTP GET to https://api.openai.com/v1/models — it pings an AI provider and never queries engagements, deadlines, or breach state. provider-confirm HTML claims 'your SLA timer is stopped' but no such logic exists.
- **Empfehlung:** Build a real scheduled SLA job (n8n cron or a worker) that queries engagement_requests where now() > sla_confirm_deadline/sla_reply_deadline and status is still pre-confirm, sends reminders at 24h/36h, sets status='expired' and increments providers.breach_count, and emits a sla_breached event at 48h. Replace the OpenAI-ping content of provider-sla-watchdog.json with the actual watchdog graph, or rename it to reflect what it does.
- **Evidenz:** `supabase/migrations/20260304000000_init_complihub.sql:36 — breach_count integer default 0 (grep shows zero increment sites in packages/services/supabase)`; `services/compliance-api/src/index.ts:17 — // startCriticalFlowMonitor(...) // Disabled for now as stores are in DB`; `services/compliance-api/src/monitor.ts:13-20 — operates on in-memory eventStore array, not the DB; never invoked`; `automations/n8n/provider-sla-watchdog.json:18-27 — 'Ping AI Provider' httpRequest to https://api.openai.com/v1/models; no engagement/deadline/breach node`; `supabase/functions/provider-confirm/index.ts:43 — HTML claims 'your SLA timer is stopped' with no backing logic`

### 3. 🔴 [CRITICAL] engagement_requests doppelt/divergent definiert (Schema-Drift)
*Dimension:* Datenmodell-Integritaet · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** Eine eindeutige Definition. Contract 2.3: Status created/delivered/confirmed/replied/declined/expired, FK user_id auf users, structured_answers NOT NULL, SLA-Deadline-Spalten.
- **Ist:** v1 (init:49-62) so. v2 (20260323223000:1-13): Status pending/accepted/declined, Spalte session_id, FK auth.users ON DELETE SET NULL, nullable, keine SLA-Spalten. Beide CREATE TABLE IF NOT EXISTS, daher gewinnt v1, v2-Body uebersprungen, aber v2-Policy Anyone can create WITH CHECK(true) gegen v1-Tabelle.
- **Empfehlung:** v2 als ALTER TABLE umschreiben oder kanonisch zusammenfuehren; Status-Enum, FK-Ziel, Nullability und SLA-Spalten mit Contract und packages/types abgleichen.
- **Evidenz:** `supabase/migrations/20260304000000_init_complihub.sql:49-71`; `supabase/migrations/20260323223000_create_engagement_requests_table.sql:1-26`

### 4. 🔴 [CRITICAL] Edge-Functions schreiben Status ausserhalb des CHECK-Constraints
*Dimension:* Datenmodell-Integritaet · *Status:* divergent · *Verdict:* adjusted

- **Erwartet:** Status, den der CHECK der materialisierten Tabelle akzeptiert; Contract-Bestaetigung confirmed.
- **Ist:** Nur EIN Writer verletzt den materialisierten CHECK: provider-confirm/index.ts:20 schreibt status='accepted', das in der toten v2-Menge ('pending','accepted','declined') liegt, aber NICHT im materialisierten v1-CHECK ('created','delivered','confirmed','replied','declined','expired') der Init-Migration. Die spaetere Migration 20260323223000 ist wegen CREATE TABLE IF NOT EXISTS ein No-Op und ersetzt den Constraint nicht. Folge: jede Provider-Bestaetigung via Magic-Link scheitert am CHECK und liefert HTTP 500; die Bestaetigung wird nie persistiert. Entgegen dem Befund sind provider-reply (status='replied') und compliance-api:392-394 (status='confirmed') beide constraint-konform mit v1 und brechen NICHT — die Contract-Bestaetigung 'confirmed' ist erfuellbar.
- **Empfehlung:** Einen Status-Lebenszyklus festlegen, CHECK daran ausrichten, alle Schreibstellen umstellen, accepted auf confirmed normalisieren.
- **Evidenz:** `supabase/functions/provider-confirm/index.ts:20`; `supabase/functions/provider-reply/index.ts:19`; `services/compliance-api/src/index.ts:392-394`

### 5. 🔴 [CRITICAL] FE-Compliance-Call sendet keine Auth, Backend erzwingt JWT/API-Key → deterministischer 401
*Dimension:* Frontend-Backend-Contract · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** Der einzige echte FE→BE-Call POST /api/compliance/check muss die vom Backend geforderte Authentifizierung mitliefern. Backend verlangt fuer alle Routen ausser /health & /ready einen gueltigen Supabase-JWT (Authorization: Bearer …) ODER x-api-key === env.API_KEY.
- **Ist:** runComplianceCheck (apps/vs1-demo/ui/src/api/compliance.ts:7-14) setzt ausschliesslich 'Content-Type' und 'x-correlation-id' — KEIN Authorization-, KEIN x-api-key-Header, keine credentials-Option. Das Backend (services/compliance-api/src/index.ts:79-124) prueft genau diese beiden Mechanismen und antwortet sonst hart mit 401 {errorCode:'UNAUTHORIZED'}. Der FE-Auth-Store (useAuthStore.ts) haelt nur localStorage-Flags und produziert kein Token, das gesendet werden koennte. Ergebnis: jeder produktive Aufruf scheitert mit 401; ComplianceCheckForm zeigt 'Missing or invalid Supabase JWT or API Key'.
- **Empfehlung:** FE so erweitern, dass es entweder einen echten Supabase-JWT (nach echtem Login) als 'Authorization: Bearer …' oder im Dev einen x-api-key mitschickt; alternativ den compliance-check-Endpoint bewusst als unauthentifiziert konfigurieren (z.B. Allowlist analog /health). Das aktuelle Mock-Auth-Modell (nur localStorage) muss durch eine Token-Quelle ersetzt werden, bevor der Call funktionieren kann.
- **Evidenz:** `apps/vs1-demo/ui/src/api/compliance.ts:7-14 (nur Content-Type + x-correlation-id im fetch-Header)`; `services/compliance-api/src/index.ts:79-124 (JWT/x-api-key-Gate, 401 wenn nicht authentifiziert)`; `apps/vs1-demo/ui/src/store/useAuthStore.ts (rein client-seitiger Login, kein Token erzeugt)`

### 6. 🔴 [CRITICAL] Required endpoint POST /api/v1/document/upload is completely missing
*Dimension:* Requirements-Coverage · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** API Contracts §3.4 requires POST /api/v1/document/upload to accept a file + owner context, store it in the Raw Vault, and start the redaction/privacy pipeline. This is the entry point for the entire Zone C->D->E document privacy flow.
- **Ist:** No such route exists in any backend surface. A repo-wide grep for 'document/upload', 'document-upload' and any document HTTP handler returns zero matches in services/ and supabase/functions/. services/compliance-api/src/index.ts only routes /api/compliance/check, /api/events, /api/v1/engagement, /api/v1/provider/magic|confirm|reply, /api/v1/search, /health, /ready, and a 404 fallback. No Document table exists in any migration.
- **Empfehlung:** Implement POST /api/v1/document/upload that persists a Document record (owner_id, classification, country_policy, raw_path, sanitized_path, sanitized_ready, ai_allowed) into a new documents table, stores the raw file in the Raw Vault, and triggers the redaction pipeline (wire in @complihub360/redaction). Add the Document entity to packages/types and a documents migration.
- **Evidenz:** `services/compliance-api/src/index.ts:151-492 (full route table; no document route)`; `Bash grep 'document/upload|document-upload|request-ai' across repo returned no matches`; `supabase/migrations/20260304000000_init_complihub.sql:1-102 (no documents table)`

### 7. 🔴 [CRITICAL] Required endpoint POST /api/v1/document/request-ai (deterministic AI gate) is missing at the HTTP layer; the gate logic exists but is unreachable
*Dimension:* Requirements-Coverage · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** API Contracts §3.4 requires POST /api/v1/document/request-ai that returns an AI result OR a deterministic denial, failing if sanitized_ready!=true OR ai_allowed!=true (and per business rule also classification/country/consent gating).
- **Ist:** No HTTP route exists for document/request-ai. The deterministic AI gate IS implemented in packages/policy-engine/src/engine.ts:73-96 (intent==='AI_PROCESSING' checks sanitized_ready, classification!=restricted, country allowAI, explicit consent), but it is dead code at runtime: a repo-wide grep shows no caller ever sets intent='AI_PROCESSING' or constructs privacyFlags. compliance-api never calls orchestrator.executeByIntent with that intent. So the gate can never fire in production.
- **Empfehlung:** Add POST /api/v1/document/request-ai that loads the Document, builds PrivacyFlags from its persisted sanitized_ready/classification/country_policy/consent, and dispatches via orchestrator.executeByIntent('AI_PROCESSING', ...) so the existing policy-engine gate is actually exercised; return the PolicyDecision reason as a deterministic denial.
- **Evidenz:** `services/compliance-api/src/index.ts:336-487 (v1 routes; no request-ai)`; `packages/policy-engine/src/engine.ts:73-96 (gate logic present)`; `Bash grep 'AI_PROCESSING|privacyFlags' shows only type definitions/auditLog action strings, no runtime construction or intent dispatch`

### 8. 🔴 [CRITICAL] Provider magic-link token verification is mocked, leaving provider confirm/reply effectively unauthenticated
*Dimension:* Requirements-Coverage · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** API Contracts §7 / Security & Privacy §8: provider magic links must be signed, time-bound (24h), single-use, with the token hash stored server-side and verified before any state transition. GET /api/v1/provider/magic/:token must perform real lookup/expiry/signature validation.
- **Ist:** services/compliance-api/src/index.ts:378-383 returns { ok:true, message:'Magic link verified', token } by echoing the token with no DB lookup, no expiry and no signature check. provider/confirm (384-408) and provider/reply (409-433) update engagement status by id with no token verification and no ownership check. The supabase Edge Functions provider-confirm/reply/decline are identical: comment at provider-confirm line 17 says 'mock logic: assume token is valid for the id' and they run under SERVICE_ROLE_KEY (bypassing RLS). No token column exists in any engagement_requests migration.
- **Empfehlung:** Add a signed time-bound token (HMAC/JWT) issued at engagement creation, persist its hash + expiry + single-use flag on the engagement row, and verify it in magic/confirm/reply/decline before any status mutation. Reject expired/used/forged tokens.
- **Evidenz:** `services/compliance-api/src/index.ts:378-383 (mock magic verify)`; `services/compliance-api/src/index.ts:384-433 (confirm/reply update by id, no token check)`; `supabase/functions/provider-confirm/index.ts:17-21`; `supabase/migrations/20260304000000_init_complihub.sql:49-62 (no token/token_hash column)`

### 9. 🔴 [CRITICAL] Provider-Magic-Links werden NICHT signiert/verifiziert — unauthentifizierte, fälschbare State-Transitions auf erratbarer UUID
*Dimension:* Security/Privacy/AI-Governance · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** Spec (securityRequirements + businessRule 'Magic link lifecycle'): Signierte, zeitgebundene Provider-Magic-Links; Ablauf-Fenster 24h; single-use; Token-Hash serverseitig gespeichert; bei Provider-Confirm/Reply/Decline muss das Token verifiziert werden. Entität MagicLinkToken { signed token, token hash, expiration, single-use flag, engagement_id }.
- **Ist:** Token wird in KEINER Code-Stelle verifiziert. supabase/functions/provider-confirm/index.ts Z.17 Kommentar 'Verify the secure token (mock logic: assume token is valid for the id)' und führt direkt ein UPDATE status='accepted' WHERE id=:id mit SERVICE_ROLE_KEY aus (RLS-Bypass). provider-reply (status='replied') und provider-decline (status='declined') identisch, ohne jede Token-Prüfung. compliance-api GET /api/v1/provider/magic/:token (index.ts Z.378-383) echo't das Token nur zurück ('Mock token verification'). Keine HMAC-, JWT-Signatur, kein token_hash-Spaltenname, keine Expiry, kein single-use, kein MagicLinkToken-Schema irgendwo (grep nach magic/hmac/token_hash/single-use liefert nur diese Stubs). Jeder, der eine engagement-UUID errät/kennt, kann eine fremde Anfrage bestätigen/ablehnen.
- **Empfehlung:** Magic-Links als HMAC-signierte oder JWT-Token mit engagement_id-Bindung, exp (24h) und single-use ausgeben; serverseitig token_hash + used_at + expires_at in einer Tabelle persistieren. In provider-confirm/reply/decline VOR jedem UPDATE: Signatur prüfen, Expiry prüfen, Single-Use (used_at IS NULL) prüfen und nach Verwendung invalidieren. Service-Role-Writes erst nach erfolgreicher Token-Verifikation.
- **Evidenz:** `supabase/functions/provider-confirm/index.ts:17-21 (mock-Kommentar + UPDATE status='accepted' .eq('id', id) mit SERVICE_ROLE_KEY Z.14-15)`; `supabase/functions/provider-reply/index.ts:7-20 (token gelesen, nie verifiziert; UPDATE status='replied')`; `supabase/functions/provider-decline/index.ts:7-21 (token gelesen, nie verifiziert; UPDATE status='declined')`; `services/compliance-api/src/index.ts:378-383 (/api/v1/provider/magic/:token -> 'Magic link verified' ohne Lookup)`; `grep magic/hmac/token_hash/single-use über supabase+services+packages: nur obige Stubs, keine Signatur-/Verifikationslogik`

### 10. 🟠 [HIGH] Transitional states 'delivered'/'viewed' and terminal 'expired' are never set by any code
*Dimension:* Business-Rules & Lifecycle · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** Lifecycle drives monitoring and conversion measurement; status must progress through created -> delivered(_to_provider) -> viewed before confirm, and unactioned engagements must transition to 'expired' after SLA breach (businessRules 'Engagement status model'; events engagement_delivered_to_provider, provider_magiclink_opened, provider_magiclink_expired).
- **Ist:** No code path ever sets status to 'delivered', 'viewed', or 'expired'. Engagement is inserted as 'created' (services/compliance-api) or DB-default 'pending'/'created' (edge function inserts no status at all), then jumps straight to confirmed/replied/declined on a provider action. There is no dispatch step that marks 'delivered', no magic-link-open handler that marks 'viewed', and no expiry job that marks 'expired'. grep across packages/services/supabase for these transitions returns nothing beyond the enum/type declarations.
- **Empfehlung:** Add a delivery step (set status='delivered' + emit engagement_delivered_to_provider when the provider magic link is dispatched), a view step on magic-link landing (status='viewed'), and an expiry transition driven by the SLA job (status='expired' once sla_reply_deadline passes with no provider action).
- **Evidenz:** `services/compliance-api/src/index.ts:355 — status: 'created' (only status ever assigned at create)`; `supabase/functions/engagement/index.ts:28-37 — insert omits status entirely (relies on DB default), never updates to delivered/viewed`; `grep -rn 'delivered'|'viewed'|'expired' over packages/services/supabase: only declarations in engagement.ts:24 and the v1 migration CHECK list — zero assignments`

### 11. 🟠 [HIGH] SLA deadlines are computed inconsistently and the reply window contradicts the spec (72h vs 48h)
*Dimension:* Business-Rules & Lifecycle · *Status:* divergent · *Verdict:* adjusted

- **Erwartet:** sla_confirm_deadline = +24h and sla_reply_deadline = +48h, computed deterministically at engagement creation; sla_timer_started fired (businessRules 'SLA - confirm deadline' / 'SLA - reply deadline'; providers default sla_target_reply_hours=48).
- **Ist:** SLA deadlines are computed inconsistently and the reply window violates the spec. (1) services/compliance-api/src/index.ts:356-357 hardcodes sla_confirm_deadline=+24h and sla_reply_deadline=+72h — the +72h reply window contradicts the spec's 48h (provider_flows_complete.md §6.1) and the DB default providers.sla_target_reply_hours=48, which is never read. (2) The live supabase edge function (supabase/functions/engagement/index.ts), wired to the n8n orchestration webhook, computes NO deadlines at all — it inserts only provider_key/country/category/structured_answers/message/session_id. (3) No 'sla_timer_started' event is ever emitted; the only events are primary_request_submitted/provider_confirmed/provider_replied. (4) Two migrations define conflicting engagement_requests schemas: the init migration (20260304) includes both SLA deadline columns and status set {created…expired}, while the v2 migration (20260323223000) omits both columns and uses status {pending,accepted,declined}. NOTE: the v2 migration uses CREATE TABLE IF NOT EXISTS and issues no DROP/ALTER — it does not literally 'drop' the columns; it defines a divergent schema, and the compliance-api deadline writes would only fail if the table were materialized from v2 rather than from init. (5) Additionally, the SLA watchdog (services/compliance-api/src/monitor.ts) never reads the persisted deadline columns or the provider's SLA targets — it uses a hardcoded in-memory 24h confirm timeout and never enforces the reply window — so the written deadlines are effectively dead data.
- **Empfehlung:** Compute deadlines from the provider's sla_target_confirm_hours/sla_target_reply_hours (24h/48h) rather than a hardcoded 72h, do it in the single canonical create path, emit a sla_timer_started event, and keep the deadline columns in the schema (remove the v2 DROP).
- **Evidenz:** `services/compliance-api/src/index.ts:356-357 — sla_confirm_deadline +24h; sla_reply_deadline: new Date(Date.now() + 72 * 60 * 60 * 1000) (72h, not 48h)`; `supabase/functions/engagement/index.ts:28-37 — insert has no sla_confirm_deadline / sla_reply_deadline`; `supabase/migrations/20260323223000_create_engagement_requests_table.sql:1-13 — v2 table omits both SLA deadline columns`; `supabase/migrations/20260304000000_init_complihub.sql:34-35 — providers.sla_target_confirm_hours=24 / sla_target_reply_hours=48 exist but are never read by deadline computation`

### 12. 🟠 [HIGH] Deterministic provider ranking order is not implemented
*Dimension:* Business-Rules & Lifecycle · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** Deterministic (non-AI) ranking: (1) eligibility filter on country+category, (2) partner boost (partners first within the relevant set), (3) quality adjustment; weighted score = Relevance + Quality + Marketplace Priority, sorted by total; provider_ranked event emitted (businessRules 'Ranking - deterministic order' / 'Ranking - weighted score'; event provider_ranked).
- **Ist:** No ranking exists. The supabase search edge function ignores the request body and returns two hardcoded mock providers with literal match scores (98/91). The services/compliance-api search selects providers WHERE partner_status='active' and filters by countries_supported.includes(country), but applies NO category filter, NO scoring, NO partner boost beyond the binary active filter, and NO sort/order — providers come back in arbitrary DB order. The only 'score'/'rank' logic in compliance-engine ranks compliance DOMAINS (TAX/PRODUCT/...), not providers. No provider_ranked event is ever emitted.
- **Empfehlung:** Implement a deterministic ranking function: eligibility filter on country AND category, then stable sort by (partner boost, quality metrics derived from confirm_rate/avg_confirm_time, marketplace priority), and emit a provider_ranked event with the resulting order so ranking is auditable and reproducible.
- **Evidenz:** `supabase/functions/search/index.ts:16-19 — hardcoded mockProviders with static match 98/91, body ignored`; `services/compliance-api/src/index.ts:466-472 — select providers {partner_status:'active'} then .filter(p => p.countries_supported.includes(country)); no category filter, no sort, no scoring`; `packages/compliance-engine/generator.ts:50-63 — score/sort applies to ComplianceDomain weighting, not providers`

### 13. 🟠 [HIGH] Event/audit log is missing the lifecycle and SLA events required for monitoring and conversion
*Dimension:* Business-Rules & Lifecycle · *Status:* partial · *Verdict:* confirmed

- **Erwartet:** Event-sourced lifecycle: search_submitted, engagement_created, engagement_delivered_to_provider, provider_magiclink_opened, sla_timer_started, provider_reminded, sla_breached, provider_declined, provider_ranked, provider_magiclink_expired all appended to the event log; audit logging of engagement creation, provider confirm, and SLA breach (events list; securityRequirements 'Audit logging of all critical actions'; businessRules event-sourced KPI tracking).
- **Ist:** Only services/compliance-api writes to event_log, and only three event types: 'primary_request_submitted' (on create), 'provider_confirmed', and 'provider_replied'. No 'search_submitted', 'engagement_created', 'engagement_delivered_to_provider', 'provider_magiclink_opened', 'sla_timer_started', 'provider_reminded', 'sla_breached', 'provider_declined', 'provider_ranked', or 'provider_magiclink_expired' is ever written. The decline path (services has no decline endpoint at all; the supabase edge provider-decline) writes the status but emits NOTHING to event_log. The supabase edge functions (engagement/confirm/reply/decline) — the path the frontend actually hits — write ZERO event_log rows; the n8n webhook fire mentions 'engagement_created' only as a webhook payload field, never persisted to event_log.
- **Empfehlung:** Emit the full set of lifecycle/SLA/audit events from a single shared engagement service (or DB triggers): search_submitted at search time, engagement_created + sla_timer_started at create, delivered/magiclink_opened on dispatch/landing, provider_declined on decline, sla_breached/provider_reminded from the SLA job, and provider_ranked at ranking time. Consolidate the two divergent backends (edge functions vs compliance-api) so events are not silently dropped on whichever path the frontend uses.
- **Evidenz:** `services/compliance-api/src/index.ts:364-367 — event_log insert type 'primary_request_submitted' (only on the /api/v1/engagement path)`; `services/compliance-api/src/index.ts:397-400 — 'provider_confirmed'; :422-425 — 'provider_replied' (the only other two writes)`; `supabase/functions/provider-decline/index.ts:17-21 — status update only, no event_log insert; no decline event anywhere`; `supabase/functions/engagement/index.ts:26-49 — inserts engagement_requests and fires n8n webhook, never writes event_log`; `supabase/migrations/20260304000000_init_complihub.sql:74-86 — event_log table + append-only RLS defined but no trigger backfills missing events`

### 14. 🟠 [HIGH] packages/types EngagementRequest passt zu keiner DB-Variante
*Dimension:* Datenmodell-Integritaet · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** Typ spiegelt reales DB-Schema (Status-Enum, Pflicht-/Optionalfelder).
- **Ist:** engagement.ts:24 deklariert Status viewed (in keinem CHECK); erzwingt nicht-optionale sla_*_deadline/user_id/message, obwohl v2 keine SLA-Spalten hat und die Edge-Function user_id nicht setzt; kein session_id im Typ, obwohl die Edge-Function es einfuegt.
- **Empfehlung:** Typ nach Schema-Konsolidierung neu fassen: viewed nur bei CHECK-Aufnahme, session_id ergaenzen, SLA-Felder optional markieren.
- **Evidenz:** `packages/types/src/engagement.ts:16-29`; `supabase/functions/engagement/index.ts:23-35`

### 15. 🟠 [HIGH] Entity Document fehlt vollstaendig (Tabelle und Typ)
*Dimension:* Datenmodell-Integritaet · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** Document mit classification (Public/Internal/Sensitive/Restricted), country_policy, raw_path, sanitized_path, sanitized_ready, ai_allowed (Contract 2.5).
- **Ist:** Keine documents-Tabelle in irgendeiner Migration, kein Document-Typ in packages/types. Storage fuehrt das Dokument nur als inline documentId string; classification nur fluechtig in PrivacyFlags (context.ts:12-17).
- **Empfehlung:** documents-Tabelle gemaess 2.5 und Document-Typ anlegen; ohne sie fehlt der AI-Gate-Regel (sanitized_ready und ai_allowed) die Datengrundlage.
- **Evidenz:** `packages/storage/src/rawVault.ts:1-8`; `packages/types/src/context.ts:12-17`; `supabase/migrations/20260304000000_init_complihub.sql:1-102`

### 16. 🟠 [HIGH] Entity Proposal fehlt vollstaendig
*Dimension:* Datenmodell-Integritaet · *Status:* missing · *Verdict:* adjusted

- **Erwartet:** Proposal mit engagement_id, price_range, timeline, deliverables, engagement_model, attachment_url (Contract 2.4).
- **Ist:** Die Proposal-Entitaet aus Contract 2.4 (engagement_id, price_range, timeline, deliverables, engagement_model, attachment_url) ist im Backend vollstaendig unimplementiert: keine proposals-Tabelle in irgendeiner Migration, kein Proposal-Typ in packages/types, keine Proposal-Logik in supabase/functions oder services. provider-reply/index.ts setzt lediglich status='replied'. KORREKTUR gegenueber dem Original-Befund: provider-reply nimmt KEIN proposal/attachment entgegen — der Endpoint liest ausschliesslich die Query-Parameter `id` und `token` (Zeilen 6-7), hat keinen Request-Body und keine Datei-Annahme. Die im Befund behauptete Inkonsistenz "Endpoint akzeptiert Proposal-Daten, persistiert sie aber nicht" existiert nicht; korrekt ist schlicht: der gesamte Proposal-Mechanismus (Annahme UND Persistenz) fehlt.
- **Empfehlung:** proposals-Tabelle (FK engagement_id) und Proposal-Typ anlegen; provider-reply um Proposal-Persistenz erweitern.
- **Evidenz:** `supabase/functions/provider-reply/index.ts:19`; `packages/types/src/engagement.ts:1-29`

### 17. 🟠 [HIGH] Entity MagicLinkToken fehlt; Token wird nie validiert
*Dimension:* Datenmodell-Integritaet · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** MagicLinkToken mit token_hash (serverseitig), expiry 24h, single-use flag, engagement_id (Security 8).
- **Ist:** Keine Token-Tabelle/-Spalte/-Typ. provider-confirm/reply/decline akzeptieren token-Param ohne Validierung (mock logic assume valid); jede geratene engagement-UUID erlaubt einen Status-Uebergang.
- **Empfehlung:** magic_link_tokens-Tabelle (token_hash, engagement_id FK, expires_at, used_at) und MagicLinkToken-Typ anlegen; Functions dagegen pruefen.
- **Evidenz:** `supabase/functions/provider-confirm/index.ts:20`; `supabase/functions/provider-decline/index.ts:19`

### 18. 🟠 [HIGH] Vite-Dev-Proxy zeigt auf Port 3001, compliance-api laeuft auf 3005 → lokal kein Backend erreichbar
*Dimension:* Frontend-Backend-Contract · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** Bei VITE_API_URL='' (Default) gehen FE-Requests relativ an /api/compliance/check und werden vom Dev-Proxy an den laufenden Backend-Port weitergereicht.
- **Ist:** vite.config.ts:20-28 proxyt '/api' auf 'http://localhost:3001'. Die compliance-api bindet aber auf PORT||3005 (services/compliance-api/src/index.ts:495). Es gibt im Repo keinen Service auf 3001 (Grep nach '3001' findet nur die vite.config-Zeile selbst). Im Standard-Dev-Setup (npm run dev:ui + dev:service) laeuft der Call damit gegen einen toten Port → ECONNREFUSED/502, der Endpoint wird nie getroffen.
- **Empfehlung:** Proxy-Target auf http://localhost:3005 korrigieren (oder compliance-api per PORT=3001 starten) und in package.json/README einheitlich festschreiben, damit Proxy-Ziel und tatsaechlicher Service-Port uebereinstimmen.
- **Evidenz:** `apps/vs1-demo/ui/vite.config.ts:20-28 (proxy '/api' → http://localhost:3001)`; `services/compliance-api/src/index.ts:495 (const PORT = process.env.PORT || 3005)`; `grep '3001' im Repo trifft nur vite.config.ts (kein Service auf 3001)`

### 19. 🟠 [HIGH] Backend-Engagement/Provider/Search-Endpoints existieren, aber kein Frontend ruft sie auf
*Dimension:* Frontend-Backend-Contract · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** Anforderungs-Katalog verlangt verdrahtete Flows: POST /api/v1/engagement (Primary CTA), GET/POST provider confirm/reply/decline (Magic-Link), POST /api/v1/search (Results-Bundle). Das FE sollte diese Endpoints konsumieren, damit Engagement-Lifecycle, Provider-Antworten und Suche real laufen.
- **Ist:** Grep ueber apps/vs1-demo/ui/src zeigt: kein FE-Code ruft /api/v1/*, keine Supabase-Functions, keine RPC. Stattdessen: Wizard→Results navigiert nur via router state (GenericWizardFlow.tsx:421, WizardFlowShell.tsx:129) und ResultsRiskMap rendert ausschliesslich location.state; EngagementModal.tsx submittet per setTimeout; Dashboards/Leads laufen ueber useDashboardStore (localStorage). Backendseitig existieren jedoch services /api/v1/engagement|provider/confirm|provider/reply|search (index.ts:336-487) und die Supabase-Functions engagement/search/provider-confirm|reply|decline — sie haben damit Null Frontend-Konsumenten.
- **Empfehlung:** FE-Client-Funktionen analog compliance.ts fuer engagement/provider/search anlegen und an Wizard-Completion, EngagementModal und Results-Seite verdrahten; dabei auf EINEN Backend-Stack (services ODER Supabase-Functions) festlegen, da beide parallel existieren.
- **Evidenz:** `Grep src: einziger fetch ist apps/vs1-demo/ui/src/api/compliance.ts:7 — kein /api/v1, kein supabase`; `apps/vs1-demo/ui/src/pages/wizard/GenericWizardFlow.tsx:421 + components/wizard/WizardFlowShell.tsx:129 (navigate('/results',{state}) statt Backend-Submit)`; `services/compliance-api/src/index.ts:336-487 (engagement/provider/search Routen ohne FE-Aufrufer)`; `supabase/functions/engagement/index.ts, supabase/functions/search/index.ts (ungenutzt vom FE)`

### 20. 🟠 [HIGH] Required endpoint POST /api/v1/provider/decline is missing in compliance-api
*Dimension:* Requirements-Coverage · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** API Contracts §3.3 / Provider Flows §4 Action C require POST /api/v1/provider/decline that accepts a reason (out of scope | capacity | incorrect country), sets status=declined and triggers alternative-provider suggestions.
- **Ist:** compliance-api implements provider/confirm and provider/reply but NOT provider/decline. The route table jumps from /api/v1/provider/reply (line 409) to /api/v1/search (line 434) with no decline handler; grep for 'decline' in compliance-api returns nothing. (A supabase Edge Function provider-decline exists but only does a bare status='declined' update with no token check, no reason capture, and no re-routing.)
- **Empfehlung:** Add POST /api/v1/provider/decline in compliance-api accepting { reason } with an enum check, writing status='declined' + a provider_declined event, and (at minimum) emitting the next-best-provider suggestion trigger. Capture the decline reason in the engagement_requests row.
- **Evidenz:** `services/compliance-api/src/index.ts:409-434 (reply route directly followed by search route; no decline)`; `Bash grep 'decline|declined' in services/compliance-api/src/index.ts returned no matches`; `supabase/functions/provider-decline/index.ts:17-21 (bare update, no reason, no re-routing)`

### 21. 🟠 [HIGH] No runtime SLA breach detection, reminder cadence, or breach_count increment
*Dimension:* Requirements-Coverage · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** Provider Flows §6.2 / Marketplace Ops §5.2: reminder email at 24h, second at 36h, mark SLA breach at 48h; breach_count incremented on each breach (sla_breached / /engagement/mark-breach). Endpoints /engagement/check-confirm, /engagement/mark-breach, /provider/reminder are required.
- **Ist:** Only static scaffolding exists. SLA deadlines are written at create-time but nothing monitors them: the only monitor (services/compliance-api/src/monitor.ts) operates on in-memory arrays and is explicitly disabled (index.ts line 17 comment 'Disabled for now as stores are in DB'). No cron/scheduled job, no breach_count increment, no reminder logic anywhere. Grep for 'mark-breach', 'check-confirm', 'provider/reminder' returns no matches. The supabase provider-confirm HTML claims 'your SLA timer is stopped' but no such logic exists.
- **Empfehlung:** Implement a DB-backed scheduled watchdog (n8n workflow or cron worker) that reads sla_confirm_deadline/sla_reply_deadline, sends reminders at 24h/36h, marks breaches at 48h, increments providers.breach_count, and emits sla_breached events. Expose /engagement/check-confirm, /engagement/mark-breach, /provider/reminder.
- **Evidenz:** `services/compliance-api/src/index.ts:17 (monitor call commented out)`; `services/compliance-api/src/monitor.ts:13-63 (in-memory only, never invoked)`; `Bash grep 'mark-breach|check-confirm|provider/reminder' returned no matches`; `supabase/functions/provider-confirm/index.ts:43 (HTML falsely claims SLA timer stopped)`

### 22. 🟠 [HIGH] Provider ranking / weighted matching is not implemented
*Dimension:* Requirements-Coverage · *Status:* partial · *Verdict:* confirmed

- **Erwartet:** API Contracts §5 / Provider Flows §8 / Search & Ranking §5-6: deterministic ranking — eligibility filter (country+category), partner boost, and weighted score (Relevance 0.6 + Quality 0.3 + Marketplace Priority 0.1) with sort by total score.
- **Ist:** compliance-api /api/v1/search (index.ts:434-487) only filters providers by partner_status='active' and country .includes(); there is NO category match, no partner boost ordering, no scoring, and no sort — grep for 'relevance|quality score|partner boost|ranking|.sort(' in the search path returns nothing. The supabase search Edge Function is a pure stub returning two hardcoded providers with literal match scores (98/91).
- **Empfehlung:** Implement the deterministic eligibility filter (country AND category) plus the weighted score (relevance/quality/priority) and sort, so search returns a ranked provider list rather than an unordered country-filtered set.
- **Evidenz:** `services/compliance-api/src/index.ts:466-473 (active+country filter only, no scoring/sort)`; `Bash grep for ranking/score/sort in search path returned no matches`; `supabase/functions/search/index.ts:16-21 (hardcoded mock providers)`

### 23. 🟠 [HIGH] Event model: only 3 of the required events are emitted; event_log is otherwise never written
*Dimension:* Requirements-Coverage · *Status:* partial · *Verdict:* adjusted

- **Erwartet:** API Contracts §4 / Product Overview §11: an event-sourced log with ~80 catalogued events including primary_clicked (main KPI), provider_declined, sla_breached, sla_timer_started, document_uploaded, sanitized_ready, ai_requested, provider_magiclink_opened/expired, proposal_submitted, etc., driving deterministic KPI tracking and audit trail.
- **Ist:** compliance-api writes exactly three event_log types at runtime: primary_request_submitted (index.ts:365), provider_confirmed (398), provider_replied (423). The /api/events ingestion endpoint (index.ts:304) could store more, but no client ever calls it, so the primary KPI primary_clicked is never recorded. The Supabase Edge Functions (provider-confirm/provider-reply/provider-decline/engagement) write NO event_log rows — they only mutate engagement_requests.status. No events exist for declines, SLA timers/breaches, magic-link opens, or document/AI steps, and the orchestrator emits nothing. Note (correcting the finding's evidence): an AIAuditLogger.logInteraction writer for ai_audit_logs DOES exist in packages/governance/ (the finding's grep only covered services/), but it is dead code — no runtime path invokes it (only UI marketing copy references the governance feature), so ai_audit_logs is indeed never written at runtime.
- **Empfehlung:** Emit the full deterministic event set from each lifecycle transition (creation, magic-open, confirm, reply, decline, sla_timer_started, sla_breached, document_uploaded, sanitized_ready, ai_requested) and centralize via a /events/log helper so KPI aggregation has complete data.
- **Evidenz:** `services/compliance-api/src/index.ts:365,398,423 (only 3 event types emitted)`; `Bash grep 'logInteraction|ai_audit_logs|AIAuditLogger' in services returned no matches`; `supabase/functions/* contain no event_log inserts`

### 24. 🟠 [HIGH] Required entities Proposal and Document are not modeled anywhere
*Dimension:* Requirements-Coverage · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** API Contracts §2.4 (Proposal: engagement_id, price_range, timeline, deliverables, engagement_model, attachment_url) and §2.5 (Document: owner_id, classification, country_policy, raw_path, sanitized_path, sanitized_ready, ai_allowed) must exist as persisted entities.
- **Ist:** Neither entity exists. No migration defines a proposals or documents table (grep for 'proposal'/'document'/'raw_path'/'sanitized_path'/'ai_allowed' in supabase/migrations returns nothing), and packages/types defines only Provider and EngagementRequest (engagement.ts) — no Proposal or Document interface. provider/reply therefore cannot attach a proposal, and there is no storage for document privacy metadata that the AI gate would read.
- **Empfehlung:** Add Proposal and Document entities to packages/types and corresponding migrations; wire Proposal into provider/reply and Document into the upload + request-ai endpoints.
- **Evidenz:** `Bash grep 'proposal' and document fields across *.ts/*.sql returned no entity definitions`; `supabase/migrations/20260304000000_init_complihub.sql:1-102 (only users/providers/engagement_requests/event_log/knowledge_chunks)`; `packages/types/src/engagement.ts:1-24 (only Provider + EngagementRequest)`

### 25. 🟠 [HIGH] Conflicting engagement_requests schema yields status values that violate the materialized CHECK constraint
*Dimension:* Requirements-Coverage · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** A single coherent engagement status model: created -> delivered(_to_provider) -> viewed -> provider_confirmed -> provider_replied | declined | expired (API Contracts §2.3). Versioned, migration-based schema with no drift (Deployment §6).
- **Ist:** engagement_requests is defined twice with divergent status enums. v1 (20260304000000) CHECK(created|delivered|confirmed|replied|declined|expired). v2 (20260323223000) CHECK(pending|accepted|declined) plus a session_id column, FK to auth.users, and an 'Anyone can create' WITH CHECK(true) insert policy. Both use CREATE TABLE IF NOT EXISTS, so on a fresh DB v1 wins. Yet the supabase Edge Functions write status='accepted' (v2-only) on confirm and the v2 'Anyone can create' policy is created against the v1 table. compliance-api writes status='confirmed'/'replied' (v1) AND inserts session_id (v2-only column, absent from v1) — so depending on which body materialized, at least one write violates the CHECK or references a missing column.
- **Empfehlung:** Consolidate to one engagement_requests definition matching the contract status enum, drop the duplicate migration (or convert to ALTER), remove the open WITH CHECK(true) insert policy, and align all writers (Edge Functions + compliance-api) to the single status vocabulary.
- **Evidenz:** `supabase/migrations/20260304000000_init_complihub.sql:49-62 (v1 status enum + no session_id)`; `supabase/migrations/20260323223000_create_engagement_requests_table.sql:1-26 (v2 status enum, session_id, open insert policy)`; `supabase/functions/provider-confirm/index.ts:19-21 (writes 'accepted')`; `services/compliance-api/src/index.ts:353-355 (inserts session_id? no — but provider-confirm/Edge insert session_id at functions/engagement/index.ts:23,34)`

### 26. 🟠 [HIGH] Redaction pipeline exists as a library but is never wired into the backend (document_uploaded -> sanitized_ready never runs)
*Dimension:* Requirements-Coverage · *Status:* partial · *Verdict:* confirmed

- **Erwartet:** Security & Privacy §4 / n8n Automation §4: on document_uploaded, store raw, detect PII, mask/remove, store sanitized copy, set sanitized_ready=true; if redaction fails, AI is blocked. AI may never see raw data.
- **Ist:** The deterministic redaction engine (services/redaction/src/redact.ts) is implemented and produces sanitized_ready + classification, but it is never imported by compliance-api or any Edge Function (grep for 'redact'/'@complihub360/redaction' in services/compliance-api/src and supabase/functions returns nothing). The storage vaults (packages/storage) return MOCK_RAW_DATA / MOCK_SANITIZED_DATA. With no upload endpoint, no documents table, and no caller, the upload->redaction->sanitized_ready->AI-gate chain is non-functional end-to-end.
- **Empfehlung:** Wire redactText into the document/upload handler, persist sanitized output to a real Sanitized Vault, set Document.sanitized_ready, and make request-ai read those persisted flags so the privacy chain is actually enforced.
- **Evidenz:** `services/redaction/src/redact.ts:9-68 (library produces sanitized_ready/classification)`; `Bash grep 'redact|@complihub360/redaction' in compliance-api/src and supabase functions returned no matches`; `packages/storage/src/rawVault.ts:26 + sanitizedVault.ts:23 (mock data)`

### 27. 🟠 [HIGH] source_references[] für AI-Felder existiert nicht — AI-Output ohne Quellenbindung
*Dimension:* Security/Privacy/AI-Governance · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** businessRule 'Deterministic vs AI fields' + 'AI output constraints': AI-Felder (overview_summary, risk_labels, tips) MÜSSEN immer source_references[] enthalten; AI-Ergebnis verwerfen, wenn references-Array leer; Output in striktes JSON-Schema geparst.
- **Ist:** source_references / sourceReferences / source_refs kommt im gesamten Code (packages, services, supabase, FE-src) NICHT vor (grep liefert null Treffer). services/compliance-api/src/index.ts /api/v1/search Z.476 setzt overview_summary auf einen hartkodierten String 'AI summary synthesized from knowledge chunks and deterministic engine rules.' ohne jegliche Referenzen; tutorials werden aus knowledge_chunks gemappt, aber ohne source_references-Feld; articles/tips sind leer. supabase/functions/search/index.ts liefert nur Mock-Provider, keinerlei AI-Felder/Referenzen. Es gibt keine Validierung, die ein AI-Ergebnis bei leeren Referenzen ablehnt.
- **Empfehlung:** ComplianceCheckResponse/Search-Response-Typen um source_references[] pro AI-Feld erweitern; im Orchestrator/Search-Pfad jedes AI-erzeugte Feld an die zugrundeliegenden knowledge_chunks (id/citation) binden und Antwort verwerfen/denyen, wenn references leer sind; striktes Zod/JSON-Schema-Parsing einführen.
- **Evidenz:** `grep -rn 'source_references|sourceReferences|source_refs' über packages/ services/ supabase/ apps/vs1-demo/ui/src: 0 Treffer`; `services/compliance-api/src/index.ts:476 (overview_summary hartkodierter Platzhalter, keine references)`; `services/compliance-api/src/index.ts:479-481 (tutorials ohne source_references; articles/tips leer)`; `supabase/functions/search/index.ts:16-21 (reine Mock-Provider, keine AI-Felder)`

### 28. 🟠 [HIGH] Document-Privacy-Gate (sanitized_ready & ai_allowed) nicht implementiert — weder Entität, Endpoint noch Laufzeit-Enforcement
*Dimension:* Security/Privacy/AI-Governance · *Status:* missing · *Verdict:* adjusted

- **Erwartet:** endpoint POST /api/v1/document/upload (Raw Vault + Redaction-Pipeline) und POST /api/v1/document/request-ai mit deterministischer Verweigerung, wenn sanitized_ready != true ODER ai_allowed != true. Document-Entität { raw_path, sanitized_path, sanitized_ready, ai_allowed, classification, country_policy }. n8n /n8n/ai-request prüft {sanitized_ready, ai_allowed, classification}.
- **Ist:** Das Document-Privacy-Gate ist als zusammenhängende Implementierung NICHT verdrahtet und NICHT laufzeitwirksam, existiert aber als design-stage Scaffolding (entgegen der Befund-Behauptung, es existiere praktisch nichts): (1) Keine documents-Entität/Migration, keine raw_path/sanitized_path/ai_allowed-Spalten — bestätigt. (2) Kein /api/v1/document/upload- und kein /document/request-ai-Endpoint in services/compliance-api/src/index.ts oder supabase/functions — bestätigt. (3) Laufzeit-Enforcement fehlt: Der einzige Gate-Code (packages/policy-engine/src/engine.ts:74) hängt an ctx.intent==='AI_PROCESSING', das kein Aufrufer setzt; der einzige .evaluate()-Konsument (compliance-api) übergibt einen TaskContext ohne intent/privacyFlags → toter Code. ABER es existieren ungenutzte, nicht verdrahtete Bausteine, die der Befund übersah: packages/storage/src/rawVault.ts + sanitizedVault.ts + auditLog.ts (Raw/Sanitized Vault + Audit als Stub-Interfaces, MOCK-Daten, 0 Aufrufer), packages/governance/src/privacy/ai-privacy-gate.ts (AIPrivacyGate, 0 Aufrufer) und packages/governance/privacy/policy-map.ts mit allowAI-Country-Policy. Auch n8n-Blueprints existieren (automations/n8n/{ai-processing-gate,upload-gate,redaction-service,retention-job}.json) — die ai-processing-gate.json prüft jedoch nur 'sanitized_storage_ref startsWith sanitized://', NICHT {sanitized_ready, ai_allowed, classification}, und ist an keinen Live-Trigger gebunden. Netto: Privacy-Gate-Mechanik vorhanden als nicht angeschlossene Stubs/Blueprints; es existiert kein produktiver Document-Upload/AI-Request-Datenpfad, der ohne dieses Gate Rohdaten an eine KI durchreichen würde — daher kein aktiv exponiertes Datenleck, sondern eine schwerwiegende Implementierungs-/Verdrahtungslücke (high statt critical).
- **Empfehlung:** Document-Entität mit raw_path/sanitized_path/sanitized_ready/ai_allowed/classification/country_policy anlegen; /document/upload (Raw Vault + Redaction) und /document/request-ai implementieren, wobei request-ai deterministisch verweigert, solange sanitized_ready!=true ODER ai_allowed!=true; den vorhandenen AI_PROCESSING-Gate aus engine.ts mit gesetztem intent und befüllten privacyFlags tatsächlich an diesen Endpoint anbinden.
- **Evidenz:** `Keine Migration definiert eine documents-Tabelle (supabase/migrations/* enthalten users, providers, engagement_requests, event_log, knowledge_chunks, ai_*; grep 'ai_allowed' -> 0 Treffer)`; `services/compliance-api/src/index.ts Routen: nur /api/compliance/check, /api/events, /api/v1/{engagement,provider/*,search} — kein document-Endpoint`; `services/redaction/src/redact.ts:65 (sanitized_ready nur Library-Return, keine Persistenz)`; `packages/policy-engine/src/engine.ts:74 (AI_PROCESSING-Gate) — Intent wird von keinem Aufrufer gesetzt; grep 'AI_PROCESSING' liefert nur diese Definition`

### 29. 🟠 [HIGH] Rate-Limiting fehlt auf den öffentlichen Supabase-Edge-Funktionen (search/engagement)
*Dimension:* Security/Privacy/AI-Governance · *Status:* partial · *Verdict:* confirmed

- **Erwartet:** securityRequirements: Rate Limiting auf /search und API; IP-Throttling.
- **Ist:** Rate-Limiting ist NUR in services/compliance-api/src/index.ts (in-memory Map, 100/60s, Z.12-14,126-149) und packages/policy-engine InMemoryLimiter vorhanden. Die öffentlich erreichbaren Supabase-Edge-Funktionen haben KEIN Rate-Limiting: supabase/functions/search/index.ts (unauthentifizierter Mock-Provider-Search) und supabase/functions/engagement/index.ts (Insert) sowie provider-confirm/reply/decline sind völlig ungedrosselt. Zudem ist der vorhandene Limiter in-memory/single-instance (nicht distributed) und greift in compliance-api erst nach der Auth, aber der Such-Pfad, den die Spec meint (/search), existiert in zwei Varianten, von denen die Supabase-Variante schutzlos ist.
- **Empfehlung:** Throttling auch auf Supabase-Edge-Funktionen erzwingen (z.B. via API-Gateway/Edge-Middleware oder zentralen Redis-basierten Limiter); den in-memory Limiter in compliance-api durch einen verteilten Store ersetzen, damit er über Instanzen hinweg hält.
- **Evidenz:** `supabase/functions/search/index.ts:1-31 (keine Rate-Limit-Logik, CORS '*')`; `supabase/functions/engagement/index.ts:1-61 (kein Throttling)`; `services/compliance-api/src/index.ts:12-14,126-149 (in-memory Limiter, single-instance)`

### 30. 🟠 [HIGH] Kein CSRF-Schutz; zustandsändernde Provider-Aktionen laufen über GET mit Service-Role
*Dimension:* Security/Privacy/AI-Governance · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** securityRequirements: CSRF protection on POST.
- **Ist:** Es gibt nirgends CSRF-Token-/Origin-Validierung. Schwerwiegender: die zustandsändernden Provider-Endpoints in Supabase (provider-confirm/reply/decline) sind GET-Endpoints, die per SERVICE_ROLE_KEY direkt den Status mutieren — damit über Prefetch/CSRF auslösbar, ohne dass CSRF-Schutz überhaupt greifen könnte. compliance-api nutzt zwar POST, hat aber ebenfalls keinen CSRF-/Origin-Check; CORS fällt außerhalb production sogar auf '*' zurück (index.ts Z.63-65).
- **Empfehlung:** Zustandsänderungen ausschließlich über POST/PUT mit verifiziertem Magic-Link-Token bzw. CSRF-Token + Origin/Referer-Check; die GET-basierten Provider-Mutationen auf POST mit signiertem Token umstellen.
- **Evidenz:** `supabase/functions/provider-confirm/index.ts:18-21 (GET mutiert status via SERVICE_ROLE)`; `supabase/functions/provider-decline/index.ts:17-21; provider-reply/index.ts:17-20 (GET-Mutationen)`; `services/compliance-api/src/index.ts:63-65 (CORS-Fallback '*' in non-production), keine CSRF-/Origin-Prüfung an POST-Routen`

### 31. 🟠 [HIGH] AI-Audit-Logging ist Fail-open und wird zur Laufzeit nie ausgeführt (ai_audit_logs bleibt leer)
*Dimension:* Security/Privacy/AI-Governance · *Status:* partial · *Verdict:* confirmed

- **Erwartet:** securityRequirements: Audit Logging aller kritischen Aktionen inkl. AI processing request; AI-Governance verlangt nachvollziehbare Logs (ISO 42001 / EU AI Act). Bei Audit-Fehler darf keine nicht-auditierbare AI-Aktion erfolgen (fail-closed).
- **Ist:** packages/governance/src/audit/ai-audit-logger.ts loggt zwar in ai_audit_logs, aber der fail-closed throw ist auskommentiert (Z.40) -> Fehler werden nur console.error't (fail-open). Schwerwiegender: AIAuditLogger.logInteraction / AIPrivacyGate.executeWithGovernance werden von KEINEM Endpoint aufgerufen (grep: nur Definitionen in packages/governance, kein Aufruf aus services/ oder supabase/). Damit schreibt die Laufzeit nie in ai_audit_logs; auch event_log wird von den Provider-Confirm/Reply/Decline-Edge-Funktionen nicht beschrieben.
- **Empfehlung:** fail-closed throw in AIAuditLogger reaktivieren; AIPrivacyGate.executeWithGovernance in den realen AI-/Such-Pfad einhängen, sodass jede AI-Inferenz vor Ausführung auditiert wird; Provider-State-Transitions in event_log/ai_audit_logs schreiben.
- **Evidenz:** `packages/governance/src/audit/ai-audit-logger.ts:37-41 (throw auskommentiert -> Fehler verschluckt)`; `packages/governance/src/privacy/ai-privacy-gate.ts:41-71 (executeWithGovernance) — grep zeigt keinen Aufrufer außerhalb des Pakets`; `supabase/functions/provider-confirm|reply|decline/index.ts: kein Insert in event_log/ai_audit_logs`

### 32. 🟠 [HIGH] Retention-Layer vollständig fehlend (keine Löschung Raw/Sanitized, keine Aufbewahrungs-Durchsetzung)
*Dimension:* Security/Privacy/AI-Governance · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** businessRule 'Retention & deletion' + otherRequirements: Raw-Dokumente nach Retention-Fenster löschen, Sanitized gemäß Country Policy aufbewahren; Engagement-Daten Aufbewahrungsfenster; User-Löschanfrage; n8n retention_enforcement / data_cleanup. Country Policy Matrix definiert retention_period pro Land.
- **Ist:** Es gibt keinerlei Retention-/Cleanup-Logik im Backend: grep nach retention/cleanup/data_cleanup/RETENTION_DELETION in supabase/migrations liefert 0 Treffer; kein Cron/Scheduled-Job, keine Löschfunktion. retentionDays existiert nur als statisches Feld in packages/policy-engine/src/countryMatrix.ts (Z.11-52) bzw. governance/regulatory-mapper, wird aber von keinem Lösch-/Aufbewahrungsprozess konsumiert. packages/storage RawVault/SanitizedVault/AuditLog sind reine Stubs (Mock-Daten), deleteRawDocument ist nicht angebunden.
- **Empfehlung:** Retention-Worker (n8n oder Scheduled Edge Function) implementieren, der retentionDays aus der Country Policy Matrix anwendet: Raw-Dokumente nach Ablauf löschen, Sanitized gemäß Policy aufbewahren, Engagement-Aufbewahrung durchsetzen und User-Löschanfragen verarbeiten; jede Löschung in ein unveränderliches Audit-Log schreiben.
- **Evidenz:** `grep retention/cleanup/RETENTION_DELETION über supabase/migrations: 0 Treffer`; `packages/policy-engine/src/countryMatrix.ts:10-52 (retentionDays nur statisch definiert)`; `packages/storage/src/auditLog.ts:4 (RETENTION_DELETION nur als Action-Typ, kein ausführender Code)`

### 33. 🟡 [MEDIUM] Entity CountryPolicy nicht persistiert (nur Code-Konstante)
*Dimension:* Datenmodell-Integritaet · *Status:* partial · *Verdict:* confirmed

- **Erwartet:** CountryPolicy mit country, retention_period, ai_eligibility, consent_requirements, data_residency_requirement (Security 6).
- **Ist:** Keine country_policy-Tabelle, kein gemeinsamer Typ. Nur hartcodiert in countryMatrix.ts (retentionDays/allowAI/requireExplicitConsent/dataResidencyReady), DE/EU/UK/US/CA/AU, ROW nur Fallback; kein FK.
- **Empfehlung:** Als country_policies-Tabelle plus Typ persistieren oder Code-only dokumentieren; Feldnamen (retention_period vs retentionDays, ai_eligibility vs allowAI) harmonisieren.
- **Evidenz:** `packages/policy-engine/src/countryMatrix.ts`; `supabase/migrations/20260304000000_init_complihub.sql:1-102`

### 34. 🟡 [MEDIUM] AuditRecord nicht abgebildet; Audit-Tabellen werden nie beschrieben
*Dimension:* Datenmodell-Integritaet · *Status:* partial · *Verdict:* adjusted

- **Erwartet:** AuditRecord mit actor, timestamp, event_type, payload_snapshot; Audit-Log aller kritischen Aktionen (Security 9).
- **Ist:** Audit-Logging ist vorhanden, aber fragmentiert und unvollstaendig — es gibt kein einheitliches zentrales AuditRecord-Modell ueber alle kritischen Aktionen. Konkret: (a) event_log (Migration 74-86) HAT actor_id+timestamp und wird von compliance-api bei State-Transitions provider_confirmed (Z.397) und provider_replied (Z.422) sowie bei primary_request_submitted (Z.364) und Analytics (Z.304, mit actor_id) tatsaechlich befuellt — die Behauptung 'State-Transitions befuellen nicht' ist also falsch. (b) ai_audit_logs WIRD beschrieben: packages/governance/src/audit/ai-audit-logger.ts:26 inserted (action, user_id, context_data, created_at), aufgerufen von AIPrivacyGate.executeWithGovernance — die Behauptung 'nie beschrieben' ist falsch; allerdings hat executeWithGovernance keine gefundenen Aufrufer (verdrahtet, aber nicht integriert). (c) Ein passender Typ existiert: AuditEvent (packages/storage/src/auditLog.ts) mit actor/timestamp/action/details, heisst nur nicht 'AuditRecord'; dessen AuditLog-Klasse ist jedoch ein nicht-persistierender Stub (console.log, queryEvents→[]) ohne Aufrufer. Reale Luecke: Die Supabase Edge Functions (engagement, provider-confirm/decline/reply) fuehren State-Transitions ohne jeglichen Audit-/event_log-Eintrag aus, der storage-AuditLog persistiert nichts, und es fehlt ein einheitliches AuditRecord ueber ALLE kritischen Aktionen (Security 9 nur teilweise erfuellt).
- **Empfehlung:** event_log als kanonische AuditRecord-Quelle festlegen, AuditRecord-Typ definieren, kritische Functions Audit schreiben lassen, actor_id fuellen.
- **Evidenz:** `supabase/migrations/20260304000000_init_complihub.sql:74-86`; `supabase/functions/engagement/index.ts:26-49`; `services/compliance-api/src/index.ts:364-367`

### 35. 🟡 [MEDIUM] SLA-Reply-Frist 72h statt 48h
*Dimension:* Datenmodell-Integritaet · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** sla_reply_deadline plus 48h (Provider Flows 6.1; sla_target_reply_hours DEFAULT 48).
- **Ist:** compliance-api:357 berechnet plus 72h; Confirm korrekt plus 24h; DB-Default 48 (init:35) ignoriert, Deadline 24h zu lang.
- **Empfehlung:** Reply-Deadline auf 48h korrigieren bzw. aus sla_target_reply_hours ableiten statt hartcodieren.
- **Evidenz:** `services/compliance-api/src/index.ts:356-357`; `supabase/migrations/20260304000000_init_complihub.sql:35`

### 36. 🟡 [MEDIUM] engagement Edge-Function setzt weder user_id noch status noch SLA-Deadlines
*Dimension:* Datenmodell-Integritaet · *Status:* partial · *Verdict:* confirmed

- **Erwartet:** user_id (aus JWT), deterministischer Anfangsstatus und SLA-Deadlines beim Anlegen (Contract 2.3).
- **Ist:** engagement:28-35 fuegt nur provider_key/country/category/structured_answers/message/session_id ein; user_id NULL, status CHECK-Default (v1 created vs v2 pending divergiert), SLA nicht berechnet; v1 structured_answers NOT NULL bricht Insert bei Auslassung.
- **Empfehlung:** user_id, Initialstatus und SLA-Deadlines deterministisch setzen; structured_answers absichern; mit Service-Layer vereinheitlichen.
- **Evidenz:** `supabase/functions/engagement/index.ts:23-35`; `supabase/migrations/20260304000000_init_complihub.sql:51-59`

### 37. 🟡 [MEDIUM] Keine .env/.env.example fuer VITE_API_URL committed
*Dimension:* Frontend-Backend-Contract · *Status:* missing · *Verdict:* adjusted

- **Erwartet:** Die einzige FE-Env-Variable VITE_API_URL sollte mit Beispielwert dokumentiert sein, damit der Compliance-Call in Dev/Prod gegen den korrekten Origin zeigt.
- **Ist:** In apps/vs1-demo/ui existiert keine .env oder .env.example, und repo-weit gibt es keine .env.example/Template. VITE_API_URL (die einzige FE-Env-Var und einziger API-Caller, compliance.ts:6/7) fällt auf '' zurück. Im Dev funktioniert das nur dank des Vite-Proxys (vite.config.ts: '/api' -> localhost:3001). In Prod fehlt jeder Proxy: Dockerfile.ui serviert die UI über server.js (reiner Static-Server mit SPA-Fallback, keine /api-Route), render.yaml deployed nur das Backend (eigener Origin/Port). Bei ungesetztem VITE_API_URL geht der same-origin POST /api/compliance/check ins Leere — server.js liefert wegen des SPA-Fallbacks index.html als HTTP 200 mit HTML-Body (NICHT 404), woraufhin res.json() wirft und der Compliance-Call fehlschlägt. Korrektur ggü. Befund: es ist kein 404, sondern ein 200/HTML -> JSON-Parse-Fehler; die Substanz (Call defekt in Prod ohne gesetzte Var, da FE/BE getrennte Origins und kein Prod-Proxy) bleibt korrekt. Die .env ist bewusst gitignored, daher ist eine committete .env.example mit dokumentiertem Beispielwert die richtige Abhilfe.
- **Empfehlung:** Eine .env.example mit VITE_API_URL=<backend-origin> hinzufuegen und das erwartete Verhalten (Dev-Proxy vs. absolute URL in Prod) in der README/Deployment-Doku festhalten.
- **Evidenz:** `apps/vs1-demo/ui/src/api/compliance.ts:6 (import.meta.env.VITE_API_URL || '')`; `Glob apps/vs1-demo/ui/.env* → keine Datei vorhanden`

### 38. 🟡 [MEDIUM] Zwei konkurrierende Backend-Surfaces fuer dieselben Flows (services vs. Supabase) mit divergenten Pfaden/Methoden
*Dimension:* Frontend-Backend-Contract · *Status:* divergent · *Verdict:* adjusted

- **Erwartet:** Pro Flow genau ein kanonischer Endpoint mit konsistentem Pfad und HTTP-Verb, an den das FE binden kann.
- **Ist:** Backend-Duplikation ist real und exakt wie beschrieben (engagement doppelt: Service POST /api/v1/engagement vs. Supabase POST /functions/v1/engagement, beide schreiben engagement_requests; provider confirm/reply als POST-JSON {engagementId} vs. Supabase GET ?id=&token= HTML; search real-hybrid vs. Supabase-Mock). ZWEI Präzisierungen: (1) Es GIBT ein kanonisches Soll — docs/api/openapi.yaml definiert die /api/v1-Service-Surface als Contract; nur die Service-Hälfte erfüllt ihn, die Edge-Funktionen weichen ab. (2) Die Provider-GET-Magic-Links sind laut docs/n8n-sla-watchdog.md absichtlich E-Mail-Landingpages für n8n (anderer Konsument, HTML per Design), also teils legitim getrennt statt rein konkurrierend. Die FE-Aussage stimmt sogar verschärft: Der EINZIGE FE-HTTP-Client (apps/vs1-demo/ui/src/api/compliance.ts) ruft ausschließlich /api/compliance/check; KEINE FE-Bindung an engagement/search/provider existiert (kein supabase-js, kein functions.invoke). Damit ist die Lücke LATENT (undefinierte Zielwahl + tote Duplikat/Mock-Endpunkte für eine spätere FE-Anbindung), kein aktuell brechender Live-Mismatch — daher medium.
- **Empfehlung:** Einen kanonischen Pfad pro Flow festlegen (Pfad + Verb), die Duplikate deprecaten/entfernen und im FE-API-Layer als einzige Quelle verankern, bevor verdrahtet wird — sonst entstehen beim Anschluss zwangslaeufig Pfad-/Methoden-Mismatches.
- **Evidenz:** `services/compliance-api/src/index.ts:336 (POST /api/v1/engagement), :384-433 (POST /api/v1/provider/confirm|reply mit body.engagementId)`; `supabase/functions/engagement/index.ts (POST /functions/v1/engagement), supabase/functions/provider-confirm/index.ts (GET ?id=&token=)`; `services/compliance-api/src/index.ts:434 (POST /api/v1/search) vs supabase/functions/search/index.ts (POST /functions/v1/search, Mock)`

### 39. 🟡 [MEDIUM] Engagement-Request-Shape: FE-Mock erzeugt Felder, die die Backend-Insert-Shape nicht kennt (session_id-/CTA-Divergenz)
*Dimension:* Frontend-Backend-Contract · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** Wenn der Engagement-Flow verdrahtet wird, muss das vom FE gesendete Objekt zur Insert-Shape des Ziel-Endpoints passen.
- **Ist:** Die FE-Engagement-Entitaeten sind lokal: EngagementModal.tsx liefert formData(name/email/…) an onSubmit (kein Backend-Mapping), und useDashboardStore.createLeadRequest erzeugt LeadRequest{sessionId,providerId,providerName,status:'new'|'viewed'|'accepted'|'declined',slaDeadline}. Backend-seitig erwartet services POST /api/v1/engagement {provider_key,country,category,structured_answers,message,user_id} und setzt status='created' (index.ts:347-360); die Supabase-Function inserted zusaetzlich session_id (functions/engagement/index.ts:23-36). Die FE-Lead-Felder (providerId/providerName/sessionId/status-Enum) und die EngagementModal-Felder (name/email) haben keinerlei Ueberlappung mit der Backend-Shape — ein direktes Verdrahten wuerde fehlende Pflichtfelder (provider_key/country/category) bzw. unbekannte Felder erzeugen.
- **Empfehlung:** Ein gemeinsames EngagementRequest-DTO (aus packages/types) als Contract definieren und sowohl EngagementModal/Wizard-Completion als auch den Ziel-Endpoint darauf mappen; die abweichenden FE-Lead-Felder explizit in dieses DTO ueberfuehren.
- **Evidenz:** `apps/vs1-demo/ui/src/components/EngagementModal.tsx (onSubmit(formData) name/email, setTimeout-Mock)`; `apps/vs1-demo/ui/src/store/useDashboardStore.ts (LeadRequest{sessionId,providerId,providerName,status,slaDeadline})`; `services/compliance-api/src/index.ts:347-360 (erwartet provider_key/country/category/structured_answers/message/user_id, status='created')`; `supabase/functions/engagement/index.ts:23-36 (insert provider_key/country/category/structured_answers/message/session_id)`

### 40. 🟡 [MEDIUM] SLA reply deadline computed as +72h instead of the required 48h
*Dimension:* Requirements-Coverage · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** Provider Flows §6.1 / Marketplace Ops §5.1: provider must reply within 48h (default v1); sla_reply_deadline must be computed deterministically as +48h.
- **Ist:** services/compliance-api/src/index.ts:357 sets sla_reply_deadline = now + 72*60*60*1000 (72h). The confirm deadline (+24h, line 356) is correct, but the reply deadline diverges from spec. providers.sla_target_reply_hours defaults to 48 in the schema, so the runtime value contradicts the stored target.
- **Empfehlung:** Change the reply-deadline math to +48h (or, better, read provider.sla_target_reply_hours from the providers row) so the deterministic SLA matches the spec and the stored target.
- **Evidenz:** `services/compliance-api/src/index.ts:357 (72h reply deadline)`; `services/compliance-api/src/index.ts:356 (24h confirm deadline, correct)`; `supabase/migrations/20260304000000_init_complihub.sql:35 (sla_target_reply_hours default 48)`

### 41. 🟡 [MEDIUM] supabase search Edge Function ignores its request and returns hardcoded mock providers
*Dimension:* Requirements-Coverage · *Status:* partial · *Verdict:* confirmed

- **Erwartet:** POST /api/v1/search (API Contracts §3.1) must run grounded retrieval/ranking and return { overview_summary, providers[], laws[], tutorials[], articles[], tips[] } based on country + structured_answers.
- **Ist:** supabase/functions/search/index.ts parses the body then ignores it, returning two static mock providers (Acme Compliance 98, Global Tax Partners 91) with no DB query, no RAG, no ranking. The match_knowledge_chunks RPC (20260305000000) is correctly implemented at the DB level but this Edge Function never calls it. (compliance-api's /api/v1/search is more complete but uses a stubbed constant 768-dim embedding and a hardcoded overview_summary, with articles/tips always empty.)
- **Empfehlung:** Either retire the supabase search stub in favor of compliance-api's hybrid search, and replace the constant embedding with a real embedding call so RAG returns grounded results; populate overview_summary/articles/tips per the response contract.
- **Evidenz:** `supabase/functions/search/index.ts:13-24 (parses body, returns mock)`; `supabase/migrations/20260305000000_rag_search_rpc.sql (RPC implemented but uncalled by this fn)`; `services/compliance-api/src/index.ts:448-449 (stubbed constant embedding), :476 (hardcoded overview_summary), :480-481 (empty articles/tips)`

### 42. 🟡 [MEDIUM] AI-Governance-Registry ist reines Schema ohne Enforcement und ohne Seeding der Features
*Dimension:* Security/Privacy/AI-Governance · *Status:* partial · *Verdict:* adjusted

- **Erwartet:** AI-Governance-Registry, die zur Laufzeit erzwungen wird: welche AI-Features welchem Framework (EU AI Act/ISO 42001) unterliegen, Risk-Level, requires_explicit_consent.
- **Ist:** Die Migration supabase/migrations/20260323000000_ai_governance_registry.sql legt 4 Tabellen + ai_risk_level-Enum an und seedet ausschliesslich 3 Frameworks (Z.85-88). ai_features und ai_feature_framework_compliance bleiben ungeseedet UND werden nirgends gelesen (grep auf "from('ai_features')" / "ai_feature_framework_compliance" = 0 Treffer ausserhalb der Migration). risk_level / requires_explicit_consent aus der DB-Registry werden zur Laufzeit nirgends erzwungen.

KORREKTUR ggü. Befund: Es existiert sehr wohl Governance-Code in packages/governance/ (vom Befund uebersehen): RegulatoryMapper.isFeatureAllowed/getRuleset (regulatory-mapper.ts), AIPrivacyGate.executeWithGovernance (ai-privacy-gate.ts), AIAuditLogger.logInteraction (ai-audit-logger.ts), evaluatePrivacyPolicy (policy-map.ts). Genau eine der vier Tabellen - ai_audit_logs - hat damit einen Schreibpfad (insert), d.h. die Registry ist nicht zu 100% "totes Datenmodell". 

ABER dieser Code entkraeftet den Befund nicht, sondern bestaetigt ihn: (1) Risk-Level/Consent-Regeln sind in TS-switch-Statements HARTKODIERT (EU/UK/US), nicht aus ai_features/ai_feature_framework_compliance gelesen - die DB-Registry ist also nicht Source of Truth fuer Enforcement. (2) Das gesamte governance-Package ist unverdrahtet: keine package.json, kein index/Barrel, KEIN einziger Importer und KEIN Caller in services/, apps/ oder anderen packages/ (grep auf executeWithGovernance/isFeatureAllowed/RegulatoryMapper/evaluatePrivacyPolicy ausserhalb der Definitionen = 0 Treffer). (3) Der Audit-Fail-Throw ist auskommentiert (ai-audit-logger.ts:39-40), Audit ist also best-effort. Netto: Registry-Schema ohne registry-getriebenes Enforcement + komplett toter Governance-Layer; Kerngehalt des Befunds steht. Severity bleibt medium (Compliance-/Governance-Luecke in Pre-Prod-Alpha, keine ausnutzbare Runtime-Schwachstelle).
- **Empfehlung:** Aktive AI-Features (LLM-Summary, Redaction, RAG) seeden und mit Frameworks verknüpfen; im AI-Pfad vor Inferenz die Registry konsultieren (is_active, risk_level != unacceptable, requires_explicit_consent) und Entscheidung in ai_audit_logs protokollieren.
- **Evidenz:** `supabase/migrations/20260323000000_ai_governance_registry.sql:17-36 (ai_features + mapping, ohne Seed)`; `supabase/migrations/20260323000000_ai_governance_registry.sql:85-88 (nur Frameworks geseedet)`; `kein Lesezugriff auf ai_features/ai_feature_framework_compliance in services/ oder supabase/functions (grep)`

### 43. 🟡 [MEDIUM] JWT-Verifikation prüft keine exp/nbf/alg-Claims und nutzt non-constant-time Vergleich
*Dimension:* Security/Privacy/AI-Governance · *Status:* partial · *Verdict:* confirmed

- **Erwartet:** JWT-Authentifizierung für registrierte Nutzer; scoped tokens; sichere Token-Validierung (Standard: Ablauf-/Algorithmus-Prüfung, timing-sicherer Vergleich).
- **Ist:** services/compliance-api/src/index.ts verifiziert nur die HMAC-SHA256-Signatur (Z.93-100) und vergleicht sie mit === (non-constant-time, Z.98). Es findet KEINE Prüfung von exp (Ablauf), nbf oder des alg-Header-Claims statt — ein abgelaufener Token wird akzeptiert; ohne alg-Pinning besteht Algorithmus-Confusion-Risiko. Zusätzlich existiert ein API_KEY-Fallback (Z.108-112), der bei gesetztem API_KEY jeden Request mit korrektem x-api-key ohne JWT durchlässt. Rollen-/RBAC-Prüfung (guest|registered|admin) findet in compliance-api nicht statt.
- **Empfehlung:** JWT-Payload dekodieren und exp/nbf validieren, alg auf HS256 pinnen, Signaturvergleich mit crypto.timingSafeEqual durchführen; Rollen-Claim auswerten und RBAC (guest/registered/admin) erzwingen; API_KEY-Fallback auf interne, klar abgegrenzte Server-zu-Server-Routen beschränken.
- **Evidenz:** `services/compliance-api/src/index.ts:93-100 (nur HMAC-Signaturvergleich, === non-constant-time, kein exp/nbf/alg-Check)`; `services/compliance-api/src/index.ts:108-112 (API_KEY-Fallback)`; `kein RBAC/Rollen-Check in compliance-api (keine auth.jwt()->>'role'-Auswertung wie in Supabase-RLS)`

### 44. 🟡 [MEDIUM] Vollständig offene Insert-RLS-Policy auf engagement_requests (v2-Migration)
*Dimension:* Security/Privacy/AI-Governance · *Status:* divergent · *Verdict:* confirmed

- **Erwartet:** RBAC/RLS: engagement own-row; keine PII-/Datenexposition; Datenminimierung; zero-trust intern.
- **Ist:** supabase/migrations/20260323223000_create_engagement_requests_table.sql:24-26 erstellt CREATE POLICY "Anyone can create engagement requests" FOR INSERT WITH CHECK (true) — fully-open Insert für jeden (auch anonyme) Rolle. Da die v2-Tabelle per CREATE TABLE IF NOT EXISTS gegen die bereits durch v1 (20260304000000) materialisierte Tabelle läuft, wird der Tabellenkörper übersprungen, die offene Policy jedoch trotzdem angelegt — die own-row-Beschränkung der v1-Policy wird damit unterlaufen.
- **Empfehlung:** Offene Insert-Policy entfernen; Insert auf authentifizierte Nutzer mit user_id = auth.uid() beschränken (oder serverseitig via geprüftem Service-Pfad). Migrations-Konflikt (v1 vs v2 engagement_requests) konsolidieren, damit Status-Enum und Policies eindeutig sind.
- **Evidenz:** `supabase/migrations/20260323223000_create_engagement_requests_table.sql:24-26 (WITH CHECK (true))`; `supabase/migrations/20260323223000_create_engagement_requests_table.sql:10 (status CHECK pending|accepted|declined — kollidiert mit v1 created|delivered|confirmed|replied|declined|expired)`

### 45. ⚪ [LOW] Knowledge-und-Retention-Entities fehlen vollstaendig
*Dimension:* Datenmodell-Integritaet · *Status:* missing · *Verdict:* confirmed

- **Erwartet:** NewsAlert, KnowledgeAsset, UserContentSubscription, ContentEngagement (Addendum 5.7).
- **Ist:** Keine als Tabelle oder Typ; Grep ueber packages und supabase/migrations: null Treffer. Als queued/Beta-commitment markiert, bewusst noch nicht gebaut.
- **Empfehlung:** Als Backlog markieren; vor Beta Tabellen und Typen gemaess 5.7 spezifizieren (Embedding-Bezug zu knowledge_chunks pruefen).
- **Evidenz:** `supabase/migrations/20260304000000_init_complihub.sql:1-102`; `packages/types/src/index.ts:24-30`
