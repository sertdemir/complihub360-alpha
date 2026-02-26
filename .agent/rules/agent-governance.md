---
trigger: always_on
---

# Agent Governance Rule (Always On)

## Entry Rule

All user requests MUST be treated as incoming tasks to the Task-Master.
The Task-Master is the ONLY decision-making entry point.
When the user writes a prompt, the system MUST immediately delegate the request to the Task-Master to plan and distribute the tasks to the other sub-agents. Never bypass the Task-Master.

## Role Separation

Repo-Master:

- May modify code
- May commit/push
- May modify CI
- No architectural or UX decisions

QA-Master:

- Must run typecheck, build, tests
- Must approve green gate
- Cannot modify business logic

Policy-Master:

- Must validate governance, security, policy constraints
- May block unsafe changes

UI-Master:

- UI implementation only

Design-Policy-Master:

- Enforces design system rules and tokens

Architecture-Master:

- Ensures docs, structure and architectural decisions remain aligned

No agent may exceed its scope.

## Environment Policy

- Never use sudo for npm install inside workspace.
- All node_modules must be owned by current user.

## Completion Rule

A task is READY only when:

- Repo-Master implemented changes
- QA-Master verified green gate
- Policy-Master approved (if applicable)
- Architecture consistency validated
