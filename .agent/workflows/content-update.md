---
description: Content update workflow — triggers when features, rules, or integrations change
---

# /content-update — Content Sync Workflow

When a **platform feature**, **compliance rule**, **partner integration**, or **new market** is added/updated, this workflow ensures all relevant content pages are updated accordingly.

## Content Page Registry

| Route | File | Content Type | Update Trigger |
|-------|------|-------------|----------------|
| `/platform` | `PlatformPage.tsx` | Technical capabilities | New AI features, privacy updates, matching rules |
| `/solutions` | `SolutionsPage.tsx` | Audience storytelling | New use cases, outcome metrics, persona changes |
| `/compliance` | `ComplianceAreasPage.tsx` | Regulatory knowledge | New compliance area, regulation change, new market |
| `/resources` | `ResourcesPage.tsx` | Stories + Guides | New case study, whitepaper, guide, rule change |

## Steps

### 1. Identify Affected Pages

Based on the change type, determine which pages need updates:

- **New feature** → Platform + Solutions (relevant audience)
- **New compliance rule** → Compliance Areas + Resources (new guide)
- **New market/country** → Platform (Coverage) + Compliance Areas (market badges)
- **New partner integration** → Platform (Partners) + Resources (story)
- **New case study** → Resources (Customer Stories)
- **Wizard update** → Compliance Areas (coverage details) + Solutions (metrics)

### 2. Extract Updated Content

```bash
# Use NotebookLM to extract relevant content for the specific change
export PATH="$HOME/.local/bin:$PATH"
notebooklm use 2c11b1a9-9c72-48b3-9fb4-f0d99b501d04
notebooklm ask "<describe the specific change and ask for updated content for affected pages>" > /tmp/content_update.md
```

### 3. Update Affected Pages

For each affected page:

1. Open the page file
2. Locate the section/data array that needs updating
3. Add/modify the content based on the NotebookLM extraction
4. Ensure consistency with existing visual patterns (cards, diagrams, stats)

### 4. Resources Knowledge Base Entry

**MANDATORY:** Every significant change MUST produce a new entry in the Resources page:

- **Feature change** → Add a Guide entry in the `GUIDES` array in `ResourcesPage.tsx`
- **Regulation update** → Add a Whitepaper entry in the `GUIDES` array
- **New success outcome** → Add a Story entry in the `STORIES` array

Template for a new Guide entry:
```ts
{
  id: 'guide-N',
  title: '<descriptive title>',
  desc: '<2-sentence description>',
  category: '<Tax & VAT | EPR & Packaging | Data & Privacy | Corporate Structure>',
  categoryColor: '<matching color class>',
  readTime: '<N min read>',
  date: '<Month Year>',
  type: '<Guide | Whitepaper>',
}
```

### 5. Verify Build

```bash
// turbo
cd apps/vs1-demo/ui && npx tsc --noEmit && npm run build
```

### 6. Create Ticket

Create a ticket in `.tickets/done/` documenting:
- What changed
- Which pages were updated
- What new content was added to Resources
