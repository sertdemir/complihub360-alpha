import yaml
import os

openapi_path = "docs/api/openapi.yaml"
schemas_path = "docs/api/api_schemas_ultra_plus_plus.md"

# Generate new OpenAPI
openapi_content = """openapi: 3.0.0
info:
  title: CompliHub360 API
  description: API for CompliHub360 platform (Architecture Sync)
  version: 1.0.0
servers:
  - url: http://localhost:8080/api/v1
    description: Local development server
paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ok

  /search:
    post:
      summary: Search and Wizard endpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [country, query]
              properties:
                country:
                  type: string
                query:
                  type: string
                structured_answers:
                  type: object
      responses:
        '200':
          description: Results
          content:
            application/json:
              schema:
                type: object

  /engagement:
    post:
      summary: Create an engagement request
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [provider_key, message, country]
              properties:
                provider_key:
                  type: string
                message:
                  type: string
                structured_answers:
                  type: object
                country:
                  type: string
      responses:
        '200':
          description: Engagement created

  /engagement/{id}:
    get:
      summary: Get engagement status
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Status retrieved

  /provider/magic/{token}:
    get:
      summary: Provider magic link auth
      parameters:
        - in: path
          name: token
          required: true
          schema:
            type: string
      responses:
        '200':
          description: OK

  /provider/confirm:
    post:
      summary: Confirm engagement
      responses:
        '200':
          description: Confirmed

  /provider/reply:
    post:
      summary: Reply to engagement
      responses:
        '200':
          description: Replied

  /provider/decline:
    post:
      summary: Decline engagement
      responses:
        '200':
          description: Declined

  /document/upload:
    post:
      summary: Upload a raw document
      responses:
        '200':
          description: Uploaded

  /document/request-ai:
    post:
      summary: Request AI processing for a document
      responses:
        '200':
          description: Processed
"""

# Generate new Schemas Markdown
schemas_md = """# API Schemas Ultra Plus Plus

## Introduction

This document defines the advanced "Ultra Plus Plus" data schemas for high-fidelity compliance tracking and cross-service communication.

## Schema Definitions

### 1. User

```typescript
interface User {
  id: string; // UUIDv4
  email: string;
  role: 'guest' | 'registered' | 'admin';
  country_context: string;
  consent_flags: {
    allowAI: boolean;
  };
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
```

### 2. Provider

```typescript
interface Provider {
  provider_key: string;
  name: string;
  website_url: string;
  partner_status: 'active' | 'inactive' | 'downgraded';
  countries_supported: string[];
  languages: string[];
  categories: string[];
  sla_target_confirm_hours: number;
  sla_target_reply_hours: number;
  breach_count: number;
  createdAt: string;
  updatedAt: string;
}
```

### 3. EngagementRequest

```typescript
interface EngagementRequest {
  id: string; // UUIDv4
  user_id: string;
  provider_key: string;
  country: string;
  category: string;
  structured_answers: Record<string, any>;
  message: string;
  status: 'created' | 'delivered' | 'confirmed' | 'replied' | 'declined' | 'expired';
  sla_confirm_deadline: string;
  sla_reply_deadline: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. Proposal (Optional)

```typescript
interface Proposal {
  id: string;
  engagement_id: string;
  price_range: string;
  timeline: string;
  deliverables: string;
  attachment_url: string;
  createdAt: string;
}
```

### 5. Document

```typescript
interface Document {
  id: string;
  owner_id: string;
  classification: 'public' | 'internal' | 'sensitive' | 'restricted';
  country_policy: string;
  raw_path: string;
  sanitized_path: string;
  sanitized_ready: boolean;
  ai_allowed: boolean;
  createdAt: string;
}
```

### 6. Cross-Service Event Envelope

Standard envelope for all extensive message bus events. Typical events: `search_submitted`, `wizard_run_clicked`, `primary_clicked`, `primary_request_submitted`, `provider_confirmed`, `provider_replied`, `sla_breached`.

```typescript
interface EventEnvelope<T> {
  eventId: string;
  traceId: string;
  source: string; // Service Name
  timestamp: number; // Unix Epoch
  payload: T;
  securityContext: {
    tenantId: string;
    actorId: string;
    scopes: string[];
  };
}
```

## Versioning Strategy

- strict semantic versioning
- backward compatibility required for 'Plus' tier schemas
"""

with open(openapi_path, "w") as f:
    f.write(openapi_content)

with open(schemas_path, "w") as f:
    f.write(schemas_md)

print("Schemas updated.")
