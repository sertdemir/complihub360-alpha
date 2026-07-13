-- Wave B14: the requester can withdraw an open request. New terminal status
-- 'withdrawn' (user-initiated, vs. 'declined' which is provider-initiated).

ALTER TABLE public.engagement_requests DROP CONSTRAINT IF EXISTS engagement_requests_status_check;
ALTER TABLE public.engagement_requests
  ADD CONSTRAINT engagement_requests_status_check
  CHECK (status IN ('created', 'delivered', 'viewed', 'confirmed', 'replied', 'declined', 'expired', 'withdrawn'));
