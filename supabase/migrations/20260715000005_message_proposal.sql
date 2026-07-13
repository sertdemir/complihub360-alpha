-- Wave B1 (Provider Flows §5): optional structured proposal attached to a
-- thread reply — price range, timeline, deliverables, engagement model.
-- Stored on the message so the proposal lives in the shared history.

ALTER TABLE public.engagement_messages ADD COLUMN IF NOT EXISTS proposal jsonb;
