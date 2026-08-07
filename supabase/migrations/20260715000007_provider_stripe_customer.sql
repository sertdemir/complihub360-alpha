-- Wave C3: Stripe billing-portal link. Each provider maps to one Stripe
-- customer; created lazily on the first portal request once STRIPE_SECRET_KEY
-- is configured.

ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS stripe_customer_id text;
