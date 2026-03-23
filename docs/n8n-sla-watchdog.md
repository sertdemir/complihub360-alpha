# n8n SLA Watchdog Workflow

This document outlines the n8n webhook and SLA timer configuration for the "Search-to-Unlock" orchestrator funnel.

## Trigger Payload

The `EngagementRequest` Edge Function triggers the following payload via `POST /n8n/engagement-created`:

```json
{
  "event": "engagement_created",
  "data": {
    "id": "uuid-of-request",
    "provider_key": "acme-compliance",
    "country": "DE, EU",
    "category": "Tax & VAT",
    "structured_answers": {
      "budget": "15k-50k",
      "timeline": "month"
    },
    "message": "We need help with VAT registration...",
    "session_id": "optional-anonymous-session-id"
  }
}
```

## n8n Flow Steps

1. **Webhook Node**: Receives the payload and immediately triggers the routing logic.
2. **Email Notification Node**: Sends the anonymized request to the `provider_key` email address. Includes "Magic Links" for immediate response:
   - Accept: `https://[SUPABASE-URL]/functions/v1/provider-confirm?id=[request-id]&token=[secure-token]`
   - Request Info: `https://[SUPABASE-URL]/functions/v1/provider-reply?id=[request-id]&token=[secure-token]`
   - Decline: `https://[SUPABASE-URL]/functions/v1/provider-decline?id=[request-id]&token=[secure-token]`
3. **Wait Node (24h)**: Pauses execution for 24 hours.
4. **Condition Node (Check Status)**:
   - Queries `GET /request-status?id=[request-id]` to check if status is still `pending`.
   - If `pending`: Proceeds to Reminder email.
   - If `accepted` or `declined`: Terminates branch.
5. **Reminder Node**: Sends a 24h reminder to the provider.
6. **Wait Node (24h)**: Pauses logic for another 24 hours.
7. **Condition Node (Check Status 48h)**: Checks status again.
8. **Re-routing Node (SLA Breach)**:
   - If still `pending`: Marks request as expired and re-routes the lead to the next best matched provider from the Search API.
