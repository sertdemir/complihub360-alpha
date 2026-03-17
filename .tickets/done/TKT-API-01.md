---
status: todo
assignee: Architecture-Master
dependencies: []
---

# TKT-API-01: Update API Contracts & Data Models

## Description

The current `openapi.yaml` and `api_schemas_ultra_plus_plus.md` do not match the NotebookLM requirement document "API Contracts & Data Model". The API must reflect the full orchestration lifecycle.

## Requirements

1. Update `docs/api/openapi.yaml` to include:
   - `POST /api/v1/search`
   - `POST /api/v1/engagement`
   - `GET /api/v1/engagement/:id`
   - `GET /api/v1/provider/magic/:token`
   - `POST /api/v1/provider/confirm|reply|decline`
   - `POST /api/v1/document/upload`
   - `POST /api/v1/document/request-ai`
2. Update Data Models to include:
   - `User`, `Provider`, `EngagementRequest`, `Proposal`, `Document`
3. Ensure Event Model matches (e.g. `search_submitted`, `primary_clicked`).

## Expected Outcome

The `docs/` folder reflects the updated architecture. The Repo-Master can then build the models.

## Agent Audit Log
