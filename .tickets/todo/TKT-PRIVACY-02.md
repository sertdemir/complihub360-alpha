---
title: "Fix node_modules EPERM & Complete QA for Privacy Pipeline"
assignee: "QA-Master"
status: "todo"
---

# TKT-PRIVACY-02: Fix node_modules EPERM & Complete QA for Privacy Pipeline

## Objective

The verification gates for the Privacy Pipeline implementation (TKT-PRIVACY-01) failed due to host-level permission issues (`EPERM`) on the `node_modules` and `.npm` cache directories, which are currently owned by `root`.

We need to resolve these host permission issues and re-run the verification gates (`typecheck`, `build`, `test`) to ensure the Redaction Service and Privacy Automation Contracts are functioning correctly.

## Acceptance Criteria

- [ ] Clear `.npm` cache and fix host permissions (`sudo chown -R 501:20 "/Users/salurdesign/.npm"` or similar).
- [ ] Remove and cleanly reinstall `node_modules` across workspaces.
- [ ] Pass `npm run typecheck` across all workspaces.
- [ ] Pass `npm run build` across all workspaces.
- [ ] Pass `npm run test --if-present --workspaces` successfully (specifically for the newly created `@complihub360/redaction` service).

## Design / Tech Details

- **Environment Policy**: "Never use sudo for npm install inside workspace. All node_modules must be owned by current user."
- **Next Steps**: Once the host environment is fixed, `/fix-loop` or `/verify-privacy` should be triggered to execute the pipeline.

## Agent Result / Execution

[ACTIVE AGENT: Task-Master]

- Created this ticket as a follow-up since the previous ticket is blocked from being merged/done due to CI/QA failure.

## Agent Audit Log

- [2026-03-03T23:05:00] **Task-Master**: Created ticket for QA-Master (Status: TODO)
