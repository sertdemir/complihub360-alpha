# API Schemas Ultra Plus Plus

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
