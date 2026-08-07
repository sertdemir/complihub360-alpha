# Example: Build-Walkthrough

**User-Anfrage:** "Bau mir einen Empty-State für die ComplianceAreasPage, wenn noch keine Areas konfiguriert sind."

## Schritt 1: Pre-Flight (parallel)

```
- mcp__figma-desktop__get_metadata             → check: aktives File ist C360-DS?
- mcp__figma-desktop__get_variable_defs        → DS-Tokens
- Read GoogleDrive_Docs/Brand & Positioning Guide.md
- Read apps/vs1-demo/ui/tokens.json
- Read apps/vs1-demo/ui/components.json
- Glob apps/vs1-demo/ui/src/components/ui/**/*.tsx
- Read GoogleDrive_Docs/Dashboard Component System.md (Empty States Pattern)
- Read GoogleDrive_Docs/Detailed Personas & User Stories.md (Wer sieht den Empty?)
- Read apps/vs1-demo/ui/src/pages/ComplianceAreasPage.tsx
```

## Schritt 2: Analyse

- DS-Figma hat einen `EmptyState`-Pattern? → Wenn ja, übernehmen. Wenn nein → flag: "Sollte ins DS, baue inline mit Primitives."
- Im Code: gibt es schon einen Empty-State irgendwo (z.B. in Dashboard)? → wiederverwenden.
- Persona: Compliance Officer, der Areas anlegt — Next-Step muss klar sein ("Erste Compliance-Area anlegen").

## Schritt 3: Ausgabe (an User)

```
Vor dem Code: kurz mein Read.

DS-Check: Im C360-DS-Figma gibt es keinen dedizierten EmptyState — flagge ich als
"sollte rein". Wir bauen inline aus Card + Typography + Button + Lucide-Icon.

Persona: Compliance Officer. Empty-Reason: noch nichts konfiguriert. Next-Step muss
nicht erklärt werden ("Was sind Areas?"), sondern aktivieren ("Lege deine erste Area an").

Eine primäre Action ("Area anlegen"), keine sekundäre — wir haben nichts zu sekundär'n.
```

Dann Code:

```tsx
// apps/vs1-demo/ui/src/components/compliance-areas/ComplianceAreasEmpty.tsx
import { ShieldCheck, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';

export function ComplianceAreasEmpty({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col items-center gap-4 p-12 text-center">
      <ShieldCheck className="h-12 w-12 text-fg-muted" aria-hidden />
      <div className="space-y-1">
        <Typography variant="h3">{t('complianceAreas.empty.title')}</Typography>
        <Typography variant="body" className="text-fg-muted">
          {t('complianceAreas.empty.description')}
        </Typography>
      </div>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        {t('complianceAreas.empty.cta')}
      </Button>
    </Card>
  );
}
```

i18n-Strings (beide Sprachen):

```json
// public/locales/de/common.json
{
  "complianceAreas": {
    "empty": {
      "title": "Noch keine Compliance-Areas",
      "description": "Lege deine erste Area an, um Anforderungen zu strukturieren.",
      "cta": "Erste Area anlegen"
    }
  }
}
// public/locales/en/common.json
{
  "complianceAreas": {
    "empty": {
      "title": "No compliance areas yet",
      "description": "Create your first area to start structuring requirements.",
      "cta": "Create your first area"
    }
  }
}
```

Storybook:

```tsx
// ComplianceAreasEmpty.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComplianceAreasEmpty } from './ComplianceAreasEmpty';

const meta: Meta<typeof ComplianceAreasEmpty> = {
  component: ComplianceAreasEmpty,
};
export default meta;
export const Default: StoryObj<typeof ComplianceAreasEmpty> = {
  args: { onCreate: () => alert('create') },
};
```

## Schritt 4: Hinweise

- "EmptyState gehört ins DS-Figma — soll ich das als TODO loggen?"
- "Code-Connect-Stub kann ich anlegen, sobald die Komponente im DS landet."
