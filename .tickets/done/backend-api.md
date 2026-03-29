---
title: Backend API & Database (Edge Functions & Migration)
assignee: backend-specialist
status: done
---

# Ticket: Backend Edge Functions
Deploy API routes and SQL schema for the engagement flow.

**Tasks:**
1. **Supabase Edge Functions (`/search` and `/engagement`)**
   - [x] Create edge functions to handle matching and db inserts.
2. **Postgres Schema Migration**
   - [x] Create migration script `xxxx_create_engagement_requests_table.sql`.
   - [x] Setup `EngagementRequest` table with `user_id`, `provider_key`, `country`, `category`, `structured_answers`, `message`, `status`, SLAs.

## Agent Result / Execution
Created Postgres migration `20260323223000_create_engagement_requests_table.sql` with RLS configurations. Set up Deno Edge functions at `supabase/functions/search/index.ts` and `supabase/functions/engagement/index.ts` to handle provider matching and safe database insertion respectively.

## Agent Audit Log
- [2026-03-23T22:15:00Z] **Antigravity**: Created Migration and Edge functions. (Status: DONE)
