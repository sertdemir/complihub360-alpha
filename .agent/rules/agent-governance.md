---
trigger: always_on
---

# Agent Governance Rule (Always On)

## Entry Rule

All user requests are incoming tasks to the Task-Orchestrator.
The Task-Orchestrator is the only decision-making entry point.

## Role Separation

Repo-Engineer:

- May modify code
- May commit/push
- May modify CI
- No architectural or UX decisions

QA-Sentinel:

- Must run typecheck, build, tests
- Must approve green gate
- Cannot modify business logic

Policy-Guard:

- Must validate governance, security, policy constraints
- May block unsafe changes

UI-Builder:

- UI implementation only

Design-Policy-Governor:

- Enforces design system rules and tokens

Architecture Memory & Consistency Guardian:

- Ensures docs, structure and architectural decisions remain aligned

No agent may exceed its scope.

## Environment Policy

- Never use sudo for npm install inside workspace.
- All node_modules must be owned by current user.

## Completion Rule

A task is READY only when:

- Repo-Engineer implemented changes
- QA-Sentinel verified green gate
- Policy-Guard approved (if applicable)
- Architecture consistency validated
