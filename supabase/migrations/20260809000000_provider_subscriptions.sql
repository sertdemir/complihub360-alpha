-- Pricing Phase 1 (Beschluss 2026-08-09, docs/pricing/pricing-benchmarks-2026-08.md):
-- Provider-Abo 149 €/Monat oder 1.490 €/Jahr (2 Monate geschenkt). Der Plan wird
-- in Phase 1 vom Admin gesetzt (Provider werden offline/B2B verkauft, Abrechnung
-- per Stripe-Sammelrechnung, kein Self-Service-Checkout).

alter table providers
    add column if not exists subscription_plan text not null default 'none'
        check (subscription_plan in ('none', 'monthly', 'annual')),
    add column if not exists subscription_since timestamptz;

comment on column providers.subscription_plan is
    'Partner-Abo: none | monthly (149 €/M) | annual (1.490 €/J, Abrechnung im Jubiläumsmonat)';
comment on column providers.subscription_since is
    'Abo-Start; Basis für die Jahres-Abrechnung (Jubiläumsmonat) und die Aktiv-Prüfung';
