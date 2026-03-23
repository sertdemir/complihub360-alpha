```
---
title: Automation & Provider Flow
assignee: backend-specialist
status: doneting
---

# Ticket: Automation & Provider Flow
Setup n8n SLA Watchdog docs and Provider callback logic.

**Tasks:**
1. **n8n Webhook Documentation (`docs/n8n-sla-watchdog.md`)**
   - [x] Document `POST /n8n/engagement-created` payload and timing requirements (24h/48h SLAs).
2. **Provider Edge Functions (`/provider-confirm`, `/provider-reply`, `/provider-decline`)**
   - [x] Implement edge functions to handle magic link actions from Providers.

## Agent Result / Execution
Created `n8n-sla-watchdog.md` detailing the automated flow and SLAs. Implemented `provider-confirm`, `provider-reply`, and `provider-decline` Edge Functions using Deno and Supabase, which accept magic-links to update the DB status securely without complex auth states.

## Agent Audit Log
- [2026-03-23T22:20:00Z] **Antigravity**: Completed Edge Function magic links and SLA Watchdog docs. (Status: DONE)
