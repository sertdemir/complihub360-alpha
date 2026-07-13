# Stripe-Anbindung (C3) — Setup-Anleitung

**Stand (2026-07-13):** LIVE auf Staging über eine anonyme **Stripe-Sandbox**
(Account `acct_1Tspe4PiuS3HfybD`, Restricted Key auf dem VPS in
`/docker/complihub-api/.env`). „Update payment method" auf /billing öffnet das
echte Stripe-Portal (Branding „CompliHub360 — Partner Billing"). Der Customer
`dahlmann-cpa` → `cus_UsbYmsQbvZ8Tqk` wurde automatisch angelegt.

⚠️ **Die Sandbox läuft am 2026-07-20 ab**, wenn sie nicht vorher in einen echten
Stripe-Account überführt wird („claimen"). Die Claim-URL liegt NICHT im Repo —
Claude hat sie in der Session; alternativ `stripe sandbox claim` mit dem Key.

## Was schon funktioniert

- `providers.stripe_customer_id` (Spalte, wird beim ersten Portal-Aufruf befüllt)
- `POST /api/v1/provider/:key/billing-portal`
  1. legt beim ersten Aufruf den Stripe-Customer an (Name + contact_email + `metadata[provider_key]`)
  2. erzeugt eine Billing-Portal-Session (`return_url` = /partner-dashboard/billing)
  3. Antwort: `{ url }` → FE leitet dorthin um
- „Update payment method" auf /billing ruft den Endpoint auf und redirectet
- Event `billing_portal_opened` im Event-Log

## Dein Schritt (einmalig, ~5 Minuten): Sandbox claimen

1. Claim-URL öffnen (von Claude in der Session ausgegeben) → mit deinem
   Stripe-Login (oder neuem Konto, Business: CompliHub360) bestätigen.
   Danach gehört die Sandbox inkl. Portal-Konfiguration + Customer deinem Account
   und läuft nicht mehr ab.
2. Fertig — Keys und Konfiguration bleiben gültig, nichts weiter nötig.

**Best Practices (bereits umgesetzt):** Restricted Key (`rk…`) statt Secret Key ·
Key nur in der VPS-.env (nicht im Repo) · Portal-Konfiguration per API angelegt
(`bpc_1TsqL5PiuS3HfybDMKRcsmzO`).

## Später (Produktion)

- Live-Key statt Test-Key, gleiche Stelle.
- Invoices aus Stripe ziehen statt der geseedeten Tabelle (Webhook
  `invoice.finalized` → invoices-Tabelle) — separates Arbeitspaket.
