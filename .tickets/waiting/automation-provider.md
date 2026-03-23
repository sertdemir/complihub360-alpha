---
title: Automation & Provider Flow
assignee: backend-specialist
status: waiting
---

# Ticket: Automation & Provider Flow
Setup n8n SLA Watchdog docs and Provider callback logic.

**Tasks:**
1. **n8n Webhook Documentation (`docs/n8n-sla-watchdog.md`)**
   - Document `POST /n8n/engagement-created` payload and timing requirements (24h/48h SLAs).
2. **Provider Edge Functions (`/provider-confirm`, `/provider-reply`, `/provider-decline`)**
   - Implement edge functions to handle magic link actions from Providers.

## Agent Result / Execution
*(To be filled by backend-specialist)*

## Agent Audit Log
- [$(date)] **Task-Master**: Created ticket (Status: waiting)
