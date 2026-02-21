# Release Process & Versioning

**Enforced By**: QA-Sentinel / Release-Manager

This document governs how the CompliHub360 monorepo elements are versioned and released.

## 1. Monorepo Versioning

- **MUST** utilize Semantic Versioning (SemVer) for `packages/*` and `services/*`.
- **MUST** track versions symmetrically across the monorepo initially (e.g., all packages bumped to `0.2.0` simultaneously) unless a discrete package diverges heavily.

## 2. Breaking Changes

- **MUST** trigger a MAJOR version bump (e.g., `0.2.0 -> 1.0.0`) if a shared contract in `packages/types` is radically altered or an API route in `services/*` breaks backward compatibility.
- **MUST** communicate breaking changes in the PR description explicitly.

## 3. Changelog Maintenance

- **SHOULD** maintain a minimal internal changelog leveraging Git commit history.
- **MUST** tag `main` branch commits with the corresponding release version (e.g., `git tag v0.2.0`).
- **MUST** ensure PR titles follow conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`) to automate changelog generation.
