# Deprecated migrations

- `20260323223000_create_engagement_requests_table.sql.deprecated` — v2 engagement schema drift
  (Backend-Konzil audit finding #2). On a fresh database its SELECT policy references the
  non-existent `session_id` column and fails with 42703. Superseded by
  `20260708000000_p0_engagement_consolidation.sql`. Never apply; kept for history only.
