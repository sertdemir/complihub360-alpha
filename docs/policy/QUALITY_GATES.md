# Quality Gates & CI

**Enforced By**: QA/Release Sentinel / GitHub Actions

All code merged into the `main` branch must pass strict quality gates via the `.github/workflows/ci.yml` pipeline.

## 1. Mandatory PR Gates

A Pull Request **MUST NOT** be merged unless the following gates pass:

- **Typecheck**: `npm run typecheck --workspaces --if-present` (Zero `tsc` errors).
- **Build**: `npm run build --workspaces --if-present` (Vite & tsc builds successful).
- **Test**: `npm run test --workspaces --if-present` (All unit and integration tests passing).
- **Lint**: `npm run lint --workspaces --if-present` (Pending standard integration).

## 2. Coverage Policy

- **Packages Layer**: `packages/*` and `services/*` **SHOULD** maintain a light test coverage footprint specifically for business logic (Policy execution, Routing, Parsers).
- **UI Layer**: UI testing (`ui/*`) is currently optional but **SHOULD** cover complex state interactions (Hooks, Reducers).

## 3. CI Resilience

- **MUST** build project references topographically (`tsc -b`) before running independent workspace typechecks to prevent `Cannot find module` definition errors.
- **MUST** utilize GitHub Actions caching (`actions/setup-node@v4` with `cache: 'npm'`) to speed up executions.
