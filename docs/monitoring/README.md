# Monitoring & Alerting (MVP)

Minimal, zero-dependency monitoring implementation for `complihub360-alpha`.

## 1. Health Endpoints

The `compliance-api` exposes health check endpoints for k8s / ECS standard probing:

- **Liveness Probe: `GET /health`**
  - Quickly returns `{ "status": "up", "ok": true }` if the Node HTTP process can receive requests.
- **Readiness Probe: `GET /ready`**
  - Validates that internal dependencies (in our development case, the event & alert memory stores) are initialized out of memory space correctly before signaling traffic acceptance.
  
#### Testing

```bash
curl http://localhost:3005/health
curl http://localhost:3005/ready
```

## 2. Structured Error Logging

Using the `structuredLog` layer introduced by observability, errors now strictly provide context. When an exception falls out, you'll see a JSON line similar to:

```json
{"timestamp":"...","level":"error","message":"...","correlationId":"uuid","route":"/api/events","errorCode":"ERR_INGESTION_PAYLOAD","severity":"warn"}
```

## 3. Critical Flow Alerts

The system runs a **Critical Flow Monitor Loop** in the background. It is designed to find users who enter a critical flow but appear permanently stuck or have abandoned it.

**Definition of stuck:** A user fires the `primary_request_submitted` event but a corresponding `provider_confirmed` event with the same `sessionId` does not fire within `TIMEOUT_MS` (set to 30s locally for dev, 24 hours for production bounds).

### Simulating a stuck request locally

1. Ensure the service is running (`npm run dev:service`).
2. Post a `primary_request_submitted` event using `curl`. Note the `sessionId` `simulated-session`:

   ```bash
   curl -X POST http://localhost:3005/api/events \
     -H "Content-Type: application/json" \
     -H "x-correlation-id: trace-sim" \
     -d '{"eventId":"fake-1","timestamp":"2023-11-20T10:00Z","sessionId":"simulated-session","correlationId":"trace-sim","eventName":"primary_request_submitted","properties":{}}'
   ```

3. Wait 30 seconds.
4. Watch the `compliance-api` terminal. The monitor loop will fire and you will see:

   ```json
   {"timestamp":"...","level":"error","message":"ALERT: Critical Flow Stuck","correlationId":"uuid","severity":"high","errorCode":"ERR_FLOW_TIMEOUT","originEventId":"fake-1","sessionId":"simulated-session","timeoutMs":30000}
   ```
