-- VAT decision brief (docs/pricing/vat-decision-brief-2026-08.md, checklist #4):
-- the reverse-charge treatment of every provider invoice hinges on proving the
-- customer is a business. The VAT ID is that evidence, so it is collected at
-- intake and validated against VIES — result stored with a timestamp, because
-- "valid at some point" is worthless without knowing when.

alter table providers
    add column if not exists vat_id text,
    add column if not exists billing_country text,
    add column if not exists vat_id_status text
        check (vat_id_status in ('valid', 'invalid', 'unsupported', 'unavailable')),
    add column if not exists vat_id_checked_at timestamptz;

comment on column providers.vat_id is
    'Normalised EU VAT ID (e.g. DE811193231); B2B evidence for reverse charge';
comment on column providers.billing_country is
    'ISO country code used for invoicing / tax treatment';
comment on column providers.vat_id_status is
    'Last VIES result: valid | invalid | unsupported (non-EU) | unavailable (service down)';
comment on column providers.vat_id_checked_at is
    'When the VIES check ran — a check is a point-in-time statement, not a permanent fact';
