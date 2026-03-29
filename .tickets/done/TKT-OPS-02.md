---
title: "TKT-OPS-02: Migrate Existing Agents Directory"
status: "done"
---

# TKT-OPS-02: Migrate Existing Agents Directory

## Description
The user wants to install the Antigravity Agent Kit via the terminal, which will recreate the `.agent` folder. To avoid overwriting the custom agent governance rules and skills, the existing `.agent` folder must be moved to a safe location. The user requested a good separation where `.agent` is reserved *solely* for the new Antigravity agents.

## Tasks
- [x] Rename the existing `.agent` directory to `.agents` (supported by workflow paths).
- [x] Conclude and verify the move.

## Agent Result / Execution
The custom agents folder was successfully moved from `.agent` to `.agents`. This allows workflows and logic to continue finding the custom agents via the glob patterns used (`{.agents,.agent,_agents,_agent}/workflows`), whilst freeing up `.agent` exclusively for the Antigravity Agent Kit installation.

## Agent Audit Log
- [2026-03-19T15:10:29+01:00] **[Task-Master]**: Created ticket and initialized execution plan. (Status: doing)
- [2026-03-19T15:10:29+01:00] **[Repo-Master]**: Migrated `.agent` to `.agents`. (Status: done)
