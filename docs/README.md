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

## Rules

- No secrets are stored in this repository.
- All AI prompts must comply with vertex_prompt_spec.md.
- All services must comply with openapi.yaml and schema definitions.
- Any change requires version incrementing.
