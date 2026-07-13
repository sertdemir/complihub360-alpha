# Stripe-Anbindung (C3) — Setup-Anleitung

**Stand:** Die komplette Billing-Portal-Anbindung ist gebaut und deployed. Es fehlt
nur noch der Stripe-Account + API-Key. Ohne Key antwortet die API mit
`503 STRIPE_NOT_CONFIGURED` und die Billing-Seite zeigt einen Hinweis statt eines
toten Buttons.

## Was schon funktioniert

- `providers.stripe_customer_id` (Spalte, wird beim ersten Portal-Aufruf befüllt)
- `POST /api/v1/provider/:key/billing-portal`
  1. legt beim ersten Aufruf den Stripe-Customer an (Name + contact_email + `metadata[provider_key]`)
  2. erzeugt eine Billing-Portal-Session (`return_url` = /partner-dashboard/billing)
  3. Antwort: `{ url }` → FE leitet dorthin um
- „Update payment method" auf /billing ruft den Endpoint auf und redirectet
- Event `billing_portal_opened` im Event-Log

## Dein Schritt (einmalig, ~10 Minuten)

1. **Account**: [dashboard.stripe.com](https://dashboard.stripe.com) → Konto anlegen
   (Business: CompliHub360). Für Staging reicht der **Test-Modus** — keine
   Verifizierung nötig.
2. **API-Key holen**: Dashboard → Developers → API keys → **Secret key** des
   Test-Modus kopieren (beginnt mit `sk_test_…`).
3. **Billing-Portal aktivieren**: Dashboard → Settings → Billing → **Customer
   portal** → einmal „Save" klicken (Default-Konfiguration reicht; sonst kommt
   „No configuration provided").
4. **Key auf den VPS**:
   ```bash
   ssh -i ~/.ssh/complihub_vps root@76.13.159.221
   echo 'STRIPE_SECRET_KEY=sk_test_…' >> /docker/complihub-api/.env
   cd /docker/complihub-api && docker compose up -d --force-recreate api
   ```
   (`restart` reicht NICHT — env_file wird nur bei recreate neu gelesen.)
5. **Test**: Partner-Dashboard → Billing → „Update payment method" → du landest
   im Stripe-Portal (Test-Modus-Banner oben). In `providers.stripe_customer_id`
   steht danach die `cus_…`-ID.

## Später (Produktion)

- Live-Key statt Test-Key, gleiche Stelle.
- Invoices aus Stripe ziehen statt der geseedeten Tabelle (Webhook
  `invoice.finalized` → invoices-Tabelle) — separates Arbeitspaket.
