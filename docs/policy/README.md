# CompliHub360 Governance & Policy Overview

**Status**: ❄️ **FROZEN**  
**Enforced By**: Agentic Review Ecosystem (Design-Policy-Governor, Task-Orchestrator, QA-Sentinel, Repo-Engineer).

Welcome to the central governance hub. Every agent, developer, and script operating within the CompliHub360 Alpha monorepo **MUST** adhere to the rules defined in this directory.

## Core Documents

- 🎨 [Design Policy (Neutral Mode)](./DESIGN_POLICY.md)
- 🏗️ [Architecture Guardrails](./ARCHITECTURE_GUARDRAILS.md)
- 💻 [Coding Standards](./CODING_STANDARDS.md)
- 🛡️ [Quality Gates](./QUALITY_GATES.md)
- 🚀 [Release Process](./RELEASE_PROCESS.md)
- 📝 [Definition of Done](./DEFINITION_OF_DONE.md)
- 🔪 [Vertical Slice Rules](./VS_RULES.md)

---

## 🚦 The 1-Pager "Do / Don't" Master Checklist

Review this checklist before opening any Pull Request or asking an Agent to implement a feature.

### 🎨 Design & UI

- ✅ **DO**: Use grayscale (`slate-950`, `white/5`) for structural backgrounds and panels.
- ✅ **DO**: Use semantic colors (Red, Green, Yellow, Blue) purely for status indicators.
- ✅ **DO**: Respect the 4px/8px spacing rhythm (`p-2`, `p-4`, `gap-2`).
- ❌ **DON'T**: Inject arbitrary "Brand Colors" outside of designated status contexts.
- ❌ **DON'T**: Build custom complex components if generic atomic primitives (`Button`, `Card`) exist.

### 🏗️ Architecture & Code

- ✅ **DO**: Define shared interfaces in `@complihub360/types` first.
- ✅ **DO**: Build a dedicated API client method in `src/api/*` for UI-to-Backend calls.
- ✅ **DO**: Keep `policy-engine` pure and side-effect free.
- ❌ **DON'T**: Call `fetch()` inline directly inside a React component.
- ❌ **DON'T**: Use the `any` type in TypeScript without an eslint-disable comment explaining why.
- ❌ **DON'T**: Create circular dependencies between workspace packages.

### ⚙️ Workflow & Quality

- ✅ **DO**: Build features strictly as "Vertical Slices" (End-to-End).
- ✅ **DO**: Ensure `npm run typecheck` and `npm run build` pass from the root folder.
- ❌ **DON'T**: Merge PRs if the CI Pipeline (`ci.yml`) fails.
- ❌ **DON'T**: Consider a feature "Done" if it lacks an end-to-end demo flow.
