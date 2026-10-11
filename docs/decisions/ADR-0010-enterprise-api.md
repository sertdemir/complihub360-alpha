# ADR-0010: Enterprise-API — gehashte Schlüssel, Scopes vom Team, Pull-Feed, Limit je Client, nur nach Offenlegung

**Status:** PROPOSED (Entscheidungen 1–6 zur Bestätigung durch den Nutzer; Backend umgesetzt)
**Date:** 2026-10-11
**Bezug:** *Provider Dashboard Pricing & Operations Implementation Specification* v1.0 („Spec B") — „Global enterprise API" (Eligibility and activation, Permitted API capabilities, Prohibited API access, API events), „API and Integration Terms", Recommended build order Nr. 9 · [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) §1 (We do not create needs), §3, §6 · ADR-0004 (Offenlegung erst nach der Buchung) · ADR-0005 (`shared_fields` als Grenze dessen, was fließt) · ADR-0009 (Analytics-Tiefe ohne Vorteil) · `TKT-PROV-15`
**Offene Plan-Entscheidung Nr. 7** (API-Gebühren, Rate Limits, Auth) wird hiermit vorgeschlagen.

## Context

Spec B sieht für den Tarif Global eine Enterprise-API vor — nicht automatisch, sondern nach Antrag und Freigabe durch das Team. Erlaubt sind freigegebene Leads nach der Buchung, Ereignisse (Buchung, Verschiebung, Absage, Anwesenheit, Guthaben, Verifizierung, Zahlung), das Zurückschreiben eines Lead-Status, Rechnungen und Guthaben, Verfügbarkeit nur nach eigener Freigabe. Verboten sind Nutzerdaten vor der Buchung, Daten anderer Anbieter, Massen-Export und jeder Einfluss auf das Ranking. Credentials sind scoped und werden nur als Hash gespeichert; jeder Aufruf wird protokolliert; das Team kann sperren und widerrufen.

Bis Phase 7 gab es nur den einen Server-Key (`x-api-key`) für Admin-Aufrufe und Nutzer-JWTs. Für Anbieter-Integrationen (CRM, Kalender, Abrechnung) fehlte ein Ausweis, der weniger darf als ein Login.

## Decision

1. **Auth = Bearer-API-Schlüssel, nur Hash gespeichert.** `Authorization: Bearer chk_live_<48 hex>`. Die Datenbank hält den SHA-256-Hash und ein Präfix (`chk_live_ab12…`) zur Anzeige; der Klartext steht genau einmal in der Antwort auf `POST …/api-access/key`. Vergleich in konstanter Zeit. Kein OAuth in der Beta — ein Schlüssel reicht für Server-zu-Server, und eine Autorisierungs-Oberfläche für Dritte wäre eine zweite Produktfläche.

2. **Scopes vergibt das Team.** `leads:read`, `leads:write`, `events:read`, `billing:read`, `availability:write`. Der Anbieter beantragt die ersten vier; `availability:write` gibt es nur auf Freigabe des Teams, weil es den Buchungskalender aus einem fremden System steuert. Ein Aufruf ohne Scope antwortet 403 `API_SCOPE_FORBIDDEN` mit dem fehlenden Scope — keine stille Teilmenge.

3. **Ereignisse als Pull-Feed.** `GET /ext/events?since=&limit=` liest den vorhandenen `event_log` auf den Anbieter gefiltert und übersetzt interne Typen in die zehn Spec-B-Namen (`booking.created` … `payment.failed`). `data` trägt je Typ eine feste Feldliste — nie E-Mail, Name, Nutzer-ID. Webhooks kommen später: ein Pull-Feed braucht keine Zustellgarantie, keine Signatur, keine Wiederholungslogik, und die Integration kann ab einem Zeitstempel nachholen.

4. **Rate Limit je Client, Vorgabe 120/min.** Festes Fenster je Minute, konfiguriert vom Team (1–10 000). Jede Antwort trägt `X-RateLimit-Limit/-Remaining/-Reset`; darüber 429 mit `Retry-After`. Der Zähler lebt im Prozess — ausreichend für einen Server, für mehrere Instanzen später ein gemeinsamer Zähler (offen).

5. **Gebühren nur als Notiz.** Spec B erlaubt eine Implementierungsgebühr. Sie wird bei der Freigabe als `fee_note` festgehalten und manuell abgerechnet; nichts berechnet automatisch, nichts erscheint auf dem Nutzer-Draht.

6. **Lebenszyklus.** `requested` (Anbieter, mit Zweck, Kontakt, Scopes, Annahme der API-Bedingungen `api-terms-v1`) → `approved` (Team: Scopes, Limit, Gebühren-Notiz) → `active` (Anbieter erzeugt den Schlüssel selbst) → `suspended` (Team, **mit Grund**, den der Anbieter liest; reinstate möglich) / `revoked` (Anbieter oder Team; danach neuer Antrag möglich) / `rejected` (Team, **mit Begründung**). Fällt das Abo unter Global, bleibt der Client gespeichert und die API antwortet 403 `API_NOT_ELIGIBLE` — kein stilles Löschen, kein Datenverlust beim Rückweg.

7. **Nur `/ext/*`, nur der eigene Anbieter, nur nach Offenlegung.** Ein API-Schlüssel ist kein Login: er erreicht ausschließlich `/api/v1/ext/*` (403 `API_ROUTE_FORBIDDEN` sonst) und läuft nicht in die JWT- oder Server-Key-Kette. Leads sind Buchungen mit `identity_revealed`; `contact` trägt nur die Felder aus `shared_fields` (ADR-0005), alles andere null. Fremde oder nicht offengelegte Buchungen antworten 404, nicht 403. Seiten sind auf 100 begrenzt, Cursor `next_since`.

8. **Protokoll je Aufruf, 90 Tage.** `api_request_log` (Client, Route, Methode, Status, Dauer, Korrelation, IP) — kein Body, kein Schlüssel. Der Wächter löscht Zeilen älter als 90 Tage.

9. **Tarif-Gate ohne Angebot.** `GET /provider/:key/api-access` antwortet jedem Mitglied `eligible` aus `plan_catalog.api_eligible`; Essential und Growth bekommen beim Antrag 403 `API_NOT_ELIGIBLE` mit einem Satz, ohne Upgrade-Hinweis. Die Oberfläche zeigt den Abschnitt nur bei `eligible` (DNA §1: we do not create needs).

## Consequences

- Neue Tabellen `api_clients`, `api_request_log`; `scheduling` + `ext_status`, `ext_status_at` (Vertriebsstatus des CRM — die Plattform liest ihn nur). Deny-all RLS, Zugriff nur über die API.
- `index.ts` bekommt vor der JWT-Kette einen eigenen Auth-Zweig für `chk_live_`; `providerAuth.ts` kennt `api-access` und `api-access/key`.
- Zwei Benachrichtigungen an den Anbieter (`api_access_decided` mit `approved|rejected`, `api_access_suspended` mit Grund); Anträge erzeugen `admin_alert`.
- Ereignisse im `event_log`: `api_access_requested/approved/rejected/suspended/reinstated/revoked`, `api_key_issued/rotated`, `api_client_updated`, `lead_ext_status_set`.
- `TickSummary` + `apiRequestLogPruned`.

## DNA-Filter

- **Always on your side:** Sperre und Ablehnung tragen immer einen Grund, den der Anbieter liest. Die Rotation lässt den alten Schlüssel 24 h weiterlaufen, damit eine Integration nicht ausfällt.
- **We do not create needs:** Essential und Growth sehen die Funktion nicht und bekommen beim Aufruf einen sachlichen Satz, keinen Verkaufstext. Kein Upgrade-CTA an der API-Fläche.
- **Trust:** Kein Nutzerdatum vor der Offenlegung, keine fremden Anbieter, kein Massen-Export, kein Klartext in der Datenbank. Protokoll ohne Inhalte.
- **Respekt unabhängig vom Wert:** Rate Limit und Scopes sind Konfiguration je Client, kein Tarif-Merkmal innerhalb von Global.

## Offen

- Webhooks (Signatur, Wiederholung) als zweiter Zustellweg.
- Gemeinsamer Rate-Limit-Zähler bei mehreren API-Instanzen.
- `availability:write`-Routen (`PATCH /ext/availability`) — Scope ist angelegt, Route folgt nach erstem Bedarf.
- Assessment-Zusammenfassung am Lead (Spec B „with assessment summary") — wartet auf eine festgelegte, nutzer-freigegebene Form.
