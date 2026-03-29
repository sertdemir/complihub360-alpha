# CompliHub360 Alpha – Knowledge Base

This folder defines the authoritative technical and AI specification for the platform.

## Core Specifications

### 1. API Definition (Authoritative for Backend & Services)

Path: docs/api/openapi.yaml  
Purpose: Defines all REST endpoints and service contracts.

### 2. Ultra++ Data Schemas (Authoritative for Event & Service Communication)

Path: docs/api/api_schemas_ultra_plus_plus.md  
Purpose: Defines cross-service schema contracts and event structures.

### 3. Vertex Prompt Specification (Authoritative for AI & Stitch Prompts)

Path: docs/ai/vertex_prompt_spec.md  
Purpose: Defines system instructions, model usage, output schemas, and AI behavior constraints.

## Platform Modules

### Observability

Path: [docs/observability/README.md](observability/README.md)  
Purpose: Distributed tracing and correlation ID propagation.

### Analytics

Path: [docs/analytics/README.md](analytics/README.md)  
Purpose: Zero-dependency product analytics and telemetry.

### Monitoring

Path: [docs/monitoring/README.md](monitoring/README.md)  
Purpose: Health endpoints, structured logging, and critical flow alerts.

## How to Run

### Development Servers

- **Run UI (VS1 Demo):**

  ```bash
  npm run dev:ui
  ```

- **Run API Service:**

  ```bash
  npm run dev:service
  ```

### Verifications & Tests

- **Run All Tests:**

  ```bash
  npm run test
  ```

- **Run Typecheck:**

  ```bash
  npm run typecheck
  ```

- **Run Build:**

  ```bash
  npm run build
  ```

## Rules

- No secrets are stored in this repository.
- All AI prompts must comply with vertex_prompt_spec.md.
- All services must comply with openapi.yaml and schema definitions.
- Any change requires version incrementing.
