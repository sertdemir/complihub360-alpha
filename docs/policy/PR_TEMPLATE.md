# Pull Request Template

**Enforced By**: Repo-Engineer / Reviewers

*This template outlines the required information for any PR submitted to the CompliHub360 Alpha repository.*

## Description

[Briefly describe the context and reason for these changes.]

## Related Issue / Vertical Slice

[Link to the GitHub issue or Vertical Slice documentation (e.g., VS1, VS2) this PR addresses.]

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 🎨 UI/UX Neutral Mode implementation
- [ ] 🏗️ Architecture / Refactoring

## Governance Checklist

- [ ] **Design Policy**: Conforms to "Neutral UI Mode" (no illegal brand colors, adheres to spacing primitives).
- [ ] **Architecture**: Uses `packages/types` for contracts. No direct UI `fetch()` calls. No circular dependencies.
- [ ] **Coding Standards**: Strict TS. No `any` without lint-disable justification.
- [ ] **Quality Gates**: Locally passed `npm run build && npm run typecheck`.
- [ ] **Definition of Done**: A demo flow is verifiable. Tests are updated/included.

## Reviewer Notes

[Any specific areas you want reviewers to focus on?]
