---
title: Backend API & Database (Edge Functions & Migration)
assignee: backend-specialist
status: doing
---

# Ticket: Backend Edge Functions
Deploy API routes and SQL schema for the engagement flow.

**Tasks:**
1. **Supabase Edge Functions (`/search` and `/engagement`)**
   - Create edge functions to handle matching and db inserts.
2. **Postgres Schema Migration**
   - Create migration script `xxxx_create_engagement_requests_table.sql`.
   - Setup `EngagementRequest` table with `user_id`, `provider_key`, `country`, `category`, `structured_answers`, `message`, `status`, SLAs.

## Agent Result / Execution
*(To be filled by backend-specialist)*

## Agent Audit Log
- [$(date)] **Task-Master**: Created ticket (Status: waiting)
