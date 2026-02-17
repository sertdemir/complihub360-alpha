# API Schemas Ultra Plus Plus

## Introduction

This document defines the advanced "Ultra Plus Plus" data schemas for high-fidelity compliance tracking and cross-service communication.

## Schema Definitions

### 1. Unified Compliance Node (UCN)

The fundamental unit of tracking within the system.

```typescript
interface UnifiedComplianceNode {
  id: string; // UUIDv4
  parentId?: string;
  type: 'REGULATION' | 'CONTROL' | 'POLICY' | 'EVIDENCE';
  status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
  metadata: Record<string, any>;
  version: number;
  lastUpdated: string; // ISO-8601
}
```

### 2. Cross-Service Event Envelope

Standard envelope for all extensive message bus events.

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
