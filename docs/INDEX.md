# Documentation Index & Structure

**Date:** 2026-02-18
**Keeper:** Knowledge-Librarian

## 1. Current Manifest

| Path | Description | Status |
| :--- | :--- | :--- |
| `README.md` | Project entry point | Active |
| `ai/vertex_prompt_spec.md` | Vertex AI Prompt Specifications | Active |
| `api/openapi.yaml` | OpenAPI Specification | Active |
| `api/api_schemas_ultra_plus_plus.md` | Extended API Schemas | Active |
| `ui/StatusBadge.md` | Component Documentation | New |
| `architecture/` | Architecture Diagrams/Notes | Empty |
| `ops/` | Operational/Deployment Docs | Empty |
| `ranking/` | Ranking Algorithm Docs | Empty |

## 2. Proposed Restructuring

To maintain a clean "System Memory", we propose the following standard folders:

* **`docs/decisions/`**: Architecture Decision Records (ADRs).
  * *Action:* Create this directory for future governance decisions.
* **`docs/guides/`**: Developer onboarding and setup guides.
  * *Action:* Move setup instructions from `README.md` here if it grows too large.
* **`docs/specs/`**: Detailed feature specifications.
  * *Action:* Consider checking if `ai/` and `ranking/` belong here or stay top-level. (Stay top-level for now).

## 3. Immediate Actions

1. Adopt this `INDEX.md` as the source of truth for documentation discovery.
2. Populate `architecture/` with the "Bootstrap Plan" if applicable.
