---
title: "Install Claude Code"
assignee: "repo-master"
status: "done"
---

# Install Claude Code

## Objective

Install the `@anthropic-ai/claude-code` CLI tool globally as requested by the user.

## Acceptance Criteria

- [x] `claude` CLI is available globally
- [x] No sudo is used

## Agent Result / Execution

- Installed via `npm install -g @anthropic-ai/claude-code`
- Verified by running `claude --version`, output: `2.1.78 (Claude Code)`

## Agent Audit Log
- [2026-03-18T15:08:41+01:00] **Task-Master**: Created ticket. (Status: doing)
- [2026-03-18T15:08:45+01:00] **repo-master**: Executed `npm install -g @anthropic-ai/claude-code` and `claude --version`. (Status: done)
- [2026-03-18T15:08:45+01:00] **Task-Master**: Verified success. Moved ticket to done. (Status: done)
