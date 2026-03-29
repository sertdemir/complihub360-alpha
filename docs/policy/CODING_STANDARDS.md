# Coding Standards

**Enforced By**: Repo-Engineer / Linters

## 1. TypeScript Strictness

- **MUST** enable `strict: true` in `tsconfig.base.json`.
- **MUST NOT** use `any` unless absolutely necessary (e.g., third-party untyped library). If used, it **MUST** include an `// eslint-disable-next-line` comment with a justification.
- **SHOULD** prefer `unknown` over `any` for untrusted data boundaries, forcing runtime validation.
- **MUST** define explicit return types for all exported library functions and API handlers.

## 2. Context typed objects

- Execution context and meta-data layers must be rigorously typed.
- **MUST** use structured interfaces containing at least:
  - `tenantId: string`
  - `appId: string`
  - `correlationId: string`
  - `requestId: string`
- **MUST NOT** pass untyped "blob" objects across service boundaries.

## 3. Error Handling

- **MUST** return structured `ExecutionResult` types from Agents/Orchestrators instead of throwing raw exceptions when dealing with operational failures.
- **MUST** throw `Error` only for unrecoverable runtime crashes.

## 4. File Structure & Imports

- **MUST** use path aliases (e.g., `@/components/Button`) inside UI projects instead of deep relative paths (`../../../../components/Button`).
- **SHOULD** export public module APIs explicitly through an `index.ts` file (Barrel pattern).
