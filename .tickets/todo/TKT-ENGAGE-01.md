---
status: todo
assignee: Repo-Master
dependencies: [TKT-API-01]
---

# TKT-ENGAGE-01: Engagement Lifecycle & Provider Orchestration

## Description

The backend services completely lack the engagement model (EngagementRequest, Provider entities) and the SLA Tracker.

## Requirements

1. Implement the `lead-service` or update `compliance-api` to handle `EngagementRequest` entities.
   - Statuses: `created`, `delivered_to_provider`, `viewed`, `provider_confirmed`, `provider_replied`, `expired`
2. Implement Provider models and magic link generation:
   - Needs Signed, time-bound provider magic links.
3. Implement SLA tracking deadlines (`sla_confirm_deadline`, `sla_reply_deadline`).
4. Generate the corresponding audit trail events (e.g. `primary_request_submitted`, `provider_confirmed`, `sla_breached`).

## Expected Outcome

The `POST /engagement` endpoint creates leads, and the system can process provider confirmations via magic links tracking the required SLA.

## Agent Audit Log
