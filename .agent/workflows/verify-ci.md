---
description: Runs CI pipeline checks before push.
---

# verify-ci

1. System triggers `qa-master`.
2. `qa-master` announces `[ACTIVE AGENT: qa-master]`.
3. `qa-master` runs workspace typecheck (`npm run typecheck --if-present`).
4. `qa-master` runs workspace build (`npm run build --if-present`).
5. `qa-master` runs workspace tests (`npm run test --if-present`).
6. `qa-master` confirms no failing steps and produces the final QA wrap-up report to the user.
