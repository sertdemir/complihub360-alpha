# The Blueprint Scaffolder

This repository acts as the origin point (Mode B "Monorepo-per-app") for multi-app setups running off standard execution guardrails.

## Application Architecture Pipeline

A fundamental breakdown of the generated execution topology in a built app:

```text
 +---------------------------------------+
 |   Generated App Interface (UI/API)    |  <--  __APP_ID__ Source of Truth
 |   `apps/__APP_ID__/*`                 |       (Manifest driven context creation)
 +---------------------------------------+
                     |  TaskContext Factory
                     v
 +---------------------------------------+
 |          Task Orchestrator            |
 |   (Handles Middleware + Observables)  |
 +---------------------------------------+
          |                      |
          v                      v
 +------------------+   +------------------+
 | Policy Engine    |   | Agent Registry   |
 | (Evaluations)    |   | (Resolutions)    |
 +------------------+   +------------------+
```

## Creating A New App

Execute these steps precisely from the root directory to scaffold entirely new bounds natively recognized by `tsc`:

**Step 1:** Launch the App Bootstrapper
```bash
npm run create:app
```
Follow the simple terminal prompts to define your `appId` (kebab-case) and `appName` keys.

**Step 2:** Link the resulting workspace structure
The generator will map your new space into `package.json` workspaces automatically. Relink module dependencies.
```bash
npm install
```

**Step 3:** Run Quality Gates
Ensure the generated types validate inside the new app boundaries against the foundational packages.
```bash
npm run typecheck
npm run build
```

Your `__APP_ID__` ecosystem is now isolated, template-ready, and independently capable of running `PolicyContext` mandates without leaking identifiers!
