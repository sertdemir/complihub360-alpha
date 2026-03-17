# Security Hardening Layer

This document outlines the zero-dependency security hardening measures implemented in the `complihub360-alpha` API (`@complihub/compliance-api`).

## Overview

The Security Hardening Layer provides basic protection against common vulnerabilities and abusive traffic patterns without relying on external npm packages like `express-rate-limit` or `helmet`.

## Protections Implemented

### 1. In-Memory Rate Limiting (Development Only)

To prevent accidental loops or basic flooding during development, an in-memory IP token bucket is used.

- **Limit**: 100 requests per minute per IP.
- **Behavior**: Exceeding the limit results in a `429 Too Many Requests` response.
- **Environment**: Only active when `NODE_ENV !== 'production'`. In production, rate limiting should be handled by a reverse proxy or API gateway.

### 2. Payload Size Limits

To mitigate denial-of-service (DoS) via massive payloads (e.g., billion laughs attack, large allocations), request streams are strictly bounded.

- **Limit**: 1MB max payload for `POST /api/compliance/check` and `POST /api/events`.
- **Behavior**: If the streamed data exceeds 1MB, the server immediately destroys the request and responds with `413 Payload Too Large`.

### 3. Request Validation

Incoming requests are scrubbed and validated before being passed to the `Task-Orchestrator` or `Policy-Engine`.

- **`tenantId`**: Must be a non-empty string.
- **`tags`**: If provided, must strictly be an array of strings.
- **Behavior**: Invalid requests are rejected early with a `400 Bad Request` and a `VALIDATION_ERROR` code.

### 4. Error Normalization & Stack Suppression

To prevent accidental information disclosure, all HTTP errors share a standard shape, and stack traces are suppressed in production modes.

- **Shape**:

  ```json
  {
    "errorCode": "string",
    "message": "string",
    "correlationId": "string"
  }
  ```

- **Behavior**: In `production`, internal errors (like agent crashes) will hide the raw `.message` and `.stack` under a generic `"Internal Server Error"` message in the HTTP response. The actual stack traces are securely written to the logs using `structuredLog`.

## Verification Steps (For QA-Sentinel)

### Validating Rate Limit

1. Establish `NODE_ENV` as `development` (which should be the default locally).
2. Tweak the max limit threshold to something small.

   ```sh
   export RATE_LIMIT_MAX=2
   npm run start --workspace=@complihub/compliance-api
   ```

3. Issue HTTP requests repeatedly in rapid succession:

   ```sh
   curl -X POST http://localhost:3005/api/compliance/check \
        -H "Content-Type: application/json" \
        -d '{"tenantId": "test-tenant"}'
   ```

4. Ascertain the 3rd request yields a `429 Too Many Requests` error containing the string `"errorCode":"RATE_LIMIT_EXCEEDED"`.

### Validating Production Mode Details Shielding

1. Setup the environment to strictly behave as production.

   ```sh
   export NODE_ENV=production
   npm run start --workspace=@complihub/compliance-api
   ```

2. Deliberately induce an internal error (e.g., submitting invalid JSON to a valid route):

   ```sh
   curl -X POST http://localhost:3005/api/compliance/check \
        -H "Content-Type: application/json" \
        -d '{"tenantId": '
   ```

3. Ascertain that the internal framework parsing error message is hidden and the response evaluates to `"message":"Internal Server Error"`.

### Validating Request Structure Validation

1. Hit an endpoint with an invalid schema. Let `tenantId` be empty or missing.

   ```sh
   curl -X POST http://localhost:3005/api/compliance/check \
        -H "Content-Type: application/json" \
        -d '{"appId": "some-app"}'
   ```

2. Verify: Server returns `400 Bad Request` with `errorCode` set to `"VALIDATION_ERROR"`.
