# Observability Layer

This project implements a minimal, zero-dependency observability layer that propagates correlation IDs across the UI, service, and orchestration boundaries.

## Context Propagation

1. **UI Layer (`@complihub360/ui` & VS1)**:
   - Generates an `x-correlation-id` for every API call using `generateCorrelationId()`.
   - Captures the response correlation ID and surfaces it in error boundaries or console logs.

2. **Service Layer (`compliance-api`)**:
   - Middleware extracts `x-correlation-id` from the incoming request or generates a new one.
   - Attaches `x-correlation-id` to the HTTP response header.
   - Logs request lifecycle (start, duration) with `structuredLog()` using JSON-lines format.

3. **Orchestrator / Policy Engine (`task-orchestrator`)**:
   - `Orchestrator` includes the `correlationId` in context passed to the policy engine.
   - Decision outcomes (allowed / denied) and reasons are explicitly logged via `structuredLog()`.

## Log Format

Logs are emitted in standard, machine-readable JSON lines:

```json
{"timestamp":"2023-11-20T10:00:00.000Z","level":"info","message":"Compliance decision","correlationId":"uuid","tenantId":"default","decision":"allowed"}
```

## Verification / Testing

### Manual Testing with cURL

```bash
curl -X POST http://localhost:3005/api/compliance/check \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: test-corr-id-123" \
  -d '{"tenantId":"test-tenant","appId":"manual","title":"API Test","tags":["public"]}' -v
```

1. You should see `< x-correlation-id: test-corr-id-123` in the cURL response headers.
2. The `compliance-api` terminal should print JSON logs containing `test-corr-id-123`.

### Verifying the UI

1. Run `npm run dev` in `apps/vs1-demo/ui`.
2. Click the Compliance action button in the UI.
3. Open browser DevTools Network tab: Verify `x-correlation-id` goes out in Request Headers.
4. Verify the UI console prints the associated correlation ID upon success or failure.

## Troubleshooting

- If no correlation ID is found in the logs, ensure the node instance is running the updated built version of the packages (`npm run build`).
