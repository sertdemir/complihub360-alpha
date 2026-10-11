---
title: "Provider Phase 7 — Enterprise-API: api_clients, Scopes, gehashte Schlüssel, Rate Limits, Ereignis-Feed, Freigabe"
assignee: "Claude"
status: "doing"
---

# Provider Phase 7 — Enterprise-API

Achte Phase des Provider-Plans (Spec B „Global enterprise API": Eligibility
and activation, Permitted API capabilities, Prohibited API access, API
events; „API and Integration Terms"; Recommended build order Nr. 9).
Offene Entscheidung Nr. 7 des Plans (API-Gebühren, Rate Limits, Auth).

Grundsätze aus Spec B, die hier Code werden:

- Nur unter **Global**, und auch dann **nicht automatisch**: der Anbieter
  beantragt, das Team gibt frei (Use-Case, Felder, Auth, Rate Limit).
  Essential und Growth: nie — keine Vorschau, kein Upsell (DNA: we do not
  create needs).
- **Erlaubt:** freigegebene Leads nach der Buchung mit Assessment-Zusammenfassung;
  Ereignisse (Buchung, Verschiebung, Absage, Anwesenheit, Guthaben,
  Verifizierung, Zahlungsstatus); Lead-Status zurückschreiben; Rechnungen
  und Guthaben lesen; Verfügbarkeit nur nach eigener Freigabe.
- **Verboten:** Nutzerdaten vor der Buchung; Daten anderer Anbieter; Massen-
  Export (Seiten mit Obergrenze, Cursor).
- Scoped Credentials, nur als Hash gespeichert; Audit-Protokoll je Aufruf;
  Sperre und Widerruf durch das Team.

## Vorschlag der Entscheidungen (zur Bestätigung)

1. **Auth:** API-Schlüssel als Bearer-Token (`chk_live_…`), SHA-256-Hash in
   der Datenbank, einmal im Klartext gezeigt, Präfix sichtbar. Kein OAuth in
   der Beta.
2. **Scopes:** `leads:read`, `leads:write`, `events:read`, `billing:read`,
   `availability:write` (nur mit eigener Freigabe). Das Team vergibt sie bei
   der Freigabe.
3. **Ereignisse:** Pull-Feed `GET /api/v1/ext/events?since=…` mit den
   Spec-B-Namen (`booking.created` … `payment.failed`), aus `event_log` auf
   den Anbieter gefiltert. Webhooks später.
4. **Rate Limit:** je Client konfiguriert (Vorgabe 120/min), `429` mit
   `Retry-After` und `X-RateLimit-*`.
5. **Gebühren:** keine Automatik. Eine Implementierungsgebühr wird bei der
   Freigabe als Notiz festgehalten und manuell abgerechnet.
6. **Lebenszyklus:** Antrag → Freigabe → Schlüssel erzeugt der Anbieter selbst
   → aktiv; Sperre (Team), Widerruf (Anbieter oder Team). Fällt das Abo unter
   Global, antwortet die API 403 `API_NOT_ELIGIBLE`, der Client bleibt
   gespeichert.

## Umsetzung (Backend, 2026-10-11)

- Migration `20261012000000_enterprise_api.sql` + pgTAP `15_enterprise_api_test.sql`.
- `apiClients.ts` (rein) + `apiRoutes.ts` (Routen, Auth, Protokoll, Retention) +
  Auth-Zweig in `index.ts` (Bearer `chk_live_…` vor der JWT-Kette, nur `/ext/*`,
  Limit je Client, Protokollzeile je Aufruf) + Ownership-Regex + Watcher-Tick
  (Protokoll 90 Tage) + zwei Benachrichtigungen (`api_access_decided`,
  `api_access_suspended`).
- Admin-Aktionen: approve · reject (Begründung Pflicht) · suspend (Grund
  Pflicht) · reinstate · revoke · update.
- 14 API-Tests (Leak-Guards, Scopes, 429, Rotation, Widerruf, Abo unter Global).

## Acceptance Criteria

### Backend

- [x] Migration: `api_clients` (Antrag, Freigabe, Scopes, Rate Limit,
  Hash, Präfix, Sperre, Widerruf, Gebühren-Notiz, Terms-Version),
  `api_request_log` (Route, Methode, Status, Dauer, Korrelation; 90 Tage),
  `scheduling.ext_status` + `ext_status_at`. pgTAP.
- [x] `apiClients.ts`: Schlüssel erzeugen/hashen/prüfen, Scope-Prüfung,
  Rate-Limit-Fenster, Ereignis-Mapping intern → Spec B, Lead-Serializer
  (nur Felder nach Offenlegung). Unit-Tests.
- [x] Auth: `Authorization: Bearer chk_…` erkennt den Client, prüft Status,
  Global-Abo, Scope; 401/403 mit Code; Protokoll je Aufruf.
- [x] Routen `/api/v1/ext/*`: `me`, `leads`, `leads/:id` (PATCH), `events`,
  `invoices`, `credits`.
- [x] Anbieter-Routen: `GET/POST /provider/:key/api-access` (Antrag, Stand),
  `POST …/api-access/key` (Schlüssel erzeugen/rotieren, einmal im Klartext),
  `DELETE …/api-access` (Widerruf). Admin: `GET /admin/api-access`,
  `PATCH /admin/api-clients/:id` (approve/suspend/revoke, Scopes, Limit).
- [x] Typen, OpenAPI, ADR-0010, API-Tests (Leak-Guard: keine Nutzerdaten vor
  Offenlegung, keine fremden Anbieter, Essential/Growth 403).

### UI

- [ ] Canvas (vier Sektionen × drei Varianten): Zugang beantragen ·
  Schlüssel und Scopes · Ereignisse und Protokoll · Admin-Freigabe.
- [ ] Figma-Seite nach der Wahl des Nutzers.
- [ ] Lokal: Abschnitt/Seite im Partner-Dashboard (nur Global), Admin-Queue,
  Mock, Locales, Screenshots.
- [ ] Review des Nutzers → Staging (Migration per Supabase-MCP, Testlauf).

## DNA-Check

Betroffen: Monetarisierung und Gating (API nur Global, nur nach Freigabe —
kein Upsell auf Essential/Growth), Provider-Policies (Sperre mit Grund,
Widerruf), Privacy (keine Nutzerdaten vor Offenlegung, keine fremden
Anbieter, Hash statt Klartext). Voller Filter in ADR-0010.
