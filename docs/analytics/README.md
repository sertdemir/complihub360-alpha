# Analytics Event Tracking

CompliHub360 alpha includes a minimal, zero-dependency product analytics layer designed to measure specific KPIs (e.g. users clicking the **Primary CTA**) directly in the internal database rather than relying on external product analytics vendors.

## Privacy & Governance

1. **No PII**: Events strictly capture user journeys (clicks, workflow steps) and *must not* include IP addresses, plaintext emails, or personal data.
2. **Anonymous Sessions**: A short-lived `sessionId` is generated in `sessionStorage` purely to tie discrete actions string together in a single usage session.

## Core Telemetry Events

The type definition standard limits the application to emitting only the following approved events:

- `search_submitted`
- `results_rendered`
- `secondary_clicked`
- `primary_clicked` *(Primary KPI)*
- `primary_request_submitted`
- `provider_confirmed`

## Implementation

### 1. Recording an Event (UI)

Import the tracking utility from the `api/analytics` module in the UI layer and wrap the interaction:

```typescript
import { trackEvent } from '../api/analytics';

function handlePrimaryClick() {
    // Fire-and-forget
    trackEvent('primary_clicked', { source: 'dashboard_header', label: 'Start Compliance Check' });
    
    // Continue normal business logic
    router.push('/check');
}
```

### 2. Ingestion Storage (API)

The `compliance-api` contains a generic `POST /api/events` route. Currently, for local development, events are pushed to an in-memory `eventStore` Array and securely output to standard out using the `structuredLog()` Observability framework.

## Verification

### Terminal Observation

While running `npm run dev:service` for `compliance-api`, triggers from the UI will result in an observability pipeline output like:

```json
{"timestamp":"2023-11-20T10:00:00.000Z","level":"info","message":"Analytics Event Processed","correlationId":"uuid","eventId":"uuid","eventName":"primary_clicked"}
```

### Manual cURL Trigger

```bash
curl -X POST http://localhost:3005/api/events \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: trace-abc-123" \
  -d '{"eventId":"event-1","timestamp":"2023-11-20T10:00Z","sessionId":"sess-1","correlationId":"trace-abc-123","eventName":"primary_clicked","properties":{"foo":"bar"}}'
```

Expect an HTTP `202 Accepted` response.
