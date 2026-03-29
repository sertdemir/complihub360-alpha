---
description: Prepares project for production release.
---

# release

1. System triggers `task-master` to manage the release flow.
2. `task-master` delegates release verification to `qa-master`.
3. `qa-master` announces `[ACTIVE AGENT: qa-master]` and runs a full Verification (CI green, typecheck, build, tests).
4. `task-master` delegates version bump and changelog generation to `repo-master`.
5. `repo-master` announces `[ACTIVE AGENT: repo-master]` and executes the patch/minor bump.
6. `task-master` consolidates the agent wrap-up reports and confirms the final READY state.
