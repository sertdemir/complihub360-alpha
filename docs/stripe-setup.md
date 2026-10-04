# Stripe-Anbindung (C3) — Setup-Anleitung

**Stand (2026-07-13):** LIVE auf Staging über eine anonyme **Stripe-Sandbox**
(Account `acct_1Tspe4PiuS3HfybD`, Restricted Key auf dem VPS in
`/docker/complihub-api/.env`). „Update payment method" auf /billing öffnet das
echte Stripe-Portal (Branding „CompliHub360 — Partner Billing"). Der Customer
`dahlmann-cpa` → `cus_UsbYmsQbvZ8Tqk` wurde automatisch angelegt.

✅ **Sandbox geclaimt (2026-07-13):** Die Sandbox gehört jetzt dem Stripe-Konto
des Users („Complihub360 Sandbox") und läuft nicht mehr ab. Verwaltung über
dashboard.stripe.com (Sandbox-Umschalter oben links).

## Was schon funktioniert

- `providers.stripe_customer_id` (Spalte, wird beim ersten Portal-Aufruf befüllt)
- `POST /api/v1/provider/:key/billing-portal`
  1. legt beim ersten Aufruf den Stripe-Customer an (Name + contact_email + `metadata[provider_key]`)
  2. erzeugt eine Billing-Portal-Session (`return_url` = /partner-dashboard/billing)
  3. Antwort: `{ url }` → FE leitet dorthin um
- „Update payment method" auf /billing ruft den Endpoint auf und redirectet
- Event `billing_portal_opened` im Event-Log

## Offene User-Schritte

Keine — Sandbox geclaimt, Integration läuft.

**Best Practices (bereits umgesetzt):** Restricted Key (`rk…`) statt Secret Key ·
Key nur in der VPS-.env (nicht im Repo) · Portal-Konfiguration per API angelegt
(`bpc_1TsqL5PiuS3HfybDMKRcsmzO`).

## Phase 4 (2026-10-01): Lead-Belastung bei der Buchung — Rechte des Restricted Key

`POST /scheduling` belastet seit Phase 4 die Karte des Anbieters mit einem
PaymentIntent off-session (ADR-0005). Dafür braucht der Restricted Key auf
Staging zusätzlich zu den bisherigen Rechten (Customers write, Invoices write,
Billing Portal write, Checkout Sessions write):

| Ressource | Recht | Wofür |
|---|---|---|
| PaymentIntents | **write** | die Belastung (`payment_intents`, `confirm=true`, `off_session=true`) |
| Customers | read (write ist schon da) | `GET customers/:id?expand[]=invoice_settings.default_payment_method` für die Zahlungsbereitschaft |
| Refunds | **write** | Kompensation, wenn der Buchungs-Insert nach dem Capture scheitert |
| Payment Methods | **read** | der Kunden-Aufruf expandiert `invoice_settings.default_payment_method`; ein Restricted Key darf nur expandieren, worauf er selbst Leserecht hat — ohne dieses Recht antwortet Stripe `permission_error`, und `billing/sync` meldet 502 (Befund Staging 2026-10-04) |

Ohne diese Rechte antwortet die erste Buchung 502 `BILLING_ERROR` (ehrlich,
aber rot) und `billing/sync` 502 `STRIPE_ERROR`. Der Schlüssel bleibt in der
VPS-`.env`; Änderung über das Stripe-Dashboard (Sandbox → Developers → API
keys → Restricted key bearbeiten), danach `docker compose up -d
--force-recreate` für den API-Container.

**Zahlungsmittel hinterlegen:** weiter über das Billing-Portal („Update payment
method"). Der Rückweg trägt `?from=portal`; die Abrechnungsseite ruft dann
`POST /provider/:key/billing/sync`, der die Zahlungsbereitschaft aus Stripe
und Datenbank setzt. Kein Webhook nötig. Hinweis: Karten aus dem Portal tragen
nicht zwingend ein off-session-Mandat; verlangt Stripe eine Authentifizierung,
zählt das als gescheiterte Belastung (`payment_failed`) — Testkarte 4242
funktioniert, `4000 0025 0000 3155` erzwingt den Fall.

## Invoicing (seit 2026-07-15 live)

**Monatslauf:** `POST /api/v1/admin/billing/run` (nur `x-api-key`, JWT-User → 403).
Body `{"period": "YYYY-MM", "dry_run": true|false}`; ohne period = laufender Monat.
Pro Provider und Periode entsteht EINE Stripe-Invoice (idempotent — zweiter Lauf
überspringt): €92 je Engagement, das in der Periode confirmed/replied wurde
(Invoice Items, `collection_method=send_invoice`, 14 Tage Ziel, Inline-Beträge —
kein Dashboard-Produkt nötig). Die invoices-Tabelle spiegelt Nummer, Summe,
`hosted_invoice_url` (Pay-Page) und `invoice_pdf`.

**Status-Rückfluss ohne Webhook:** Die Staging-Basic-Auth blockt Stripe-Callbacks,
deshalb synct `GET /provider/:key/invoices` offene Stripe-Invoices beim Abruf
(paid/void/uncollectible → Tabelle). Produktion ersetzt das durch den
`invoice.finalized`/`invoice.paid`-Webhook.

**Manueller Lauf (Staging):**

```bash
source .env.staging
curl -u "complihub:…" -X POST https://staging.complihub360.com/api/v1/admin/billing/run \
  -H 'Content-Type: application/json' -H "x-api-key: $STAGING_API_KEY" \
  -d '{"period":"2026-07"}'
```

## Später (Produktion)

- Live-Key statt Test-Key, gleiche Stelle.
- Webhook (`invoice.paid`/`invoice.finalized`) statt Sync-on-Read, sobald die
  API öffentlich erreichbar ist.
- Cron für den Monatslauf am 1. (Vormonat abrechnen) — braucht VPS-Crontab.
