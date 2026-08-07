# Example: Brainstorm-Walkthrough

**User-Anfrage:** "Lass uns brainstormen über den Onboarding-Flow für neue Compliance-Officer."

## Schritt 1: Pre-Flight

```
- mcp__figma-desktop__get_metadata
- Read GoogleDrive_Docs/Brand & Positioning Guide.md
- Read GoogleDrive_Docs/Executive Product Vision.md
- Read GoogleDrive_Docs/Detailed Personas & User Stories.md     ← KERN
- Read GoogleDrive_Docs/Jobs To Be Done Framework.md            ← KERN
- Read GoogleDrive_Docs/Wizard Component System.md
- Read GoogleDrive_Docs/User Flows (Complete).md
- Read apps/vs1-demo/ui/tokens.json
```

## Schritt 2: Frame the Problem

> Bevor wir Optionen werfen — Persona + JTBD verifizieren:
>
> **Persona** (aus Personas-Doc): Compliance Officer, mittleres Unternehmen, kommt aus Excel.
> **JTBD**: "When ich neu mit CompliHub starte, will ich in unter 15 Minuten meine erste
> Audit-Area aufsetzen, damit ich Vertrauen ins Tool gewinne und Vorgesetztem zeigen kann,
> dass es funktioniert."
>
> Der Erfolgs-Indikator ist Trust + erste Wins-Schnell. NICHT Feature-Discovery.

## Schritt 3: Optionen mit Pro/Contra

### Option A — Wizard "Getting Started" (klassisch, 5 Steps)

- Step 1: Account-Setup → Step 2: Erste Area → Step 3: Erste Anforderung → Step 4: Erste
  Evidence-Quelle → Step 5: Done.
- **Pro:** Klar, low-friction, nutzt existierendes Wizard-System (siehe Component System Doc).
- **Contra:** Lineare Wizards fühlen sich "kindergartig" an für erfahrene Compliance-Profis.

### Option B — Empty-State-driven Discovery (LinkedIn-Style)

- Kein Wizard. User landet im Dashboard mit gezielten Empty-States, die ihn führen
  ("Lege deine erste Area an" → "Füge erste Anforderung hinzu" → ...).
- **Pro:** Realistisch, fühlt sich wie Tool an, nicht wie Onboarding. Skippable.
- **Contra:** Ohne Lead-by-Hand-Komponente kann der User abdriften. Risk of Abandon ohne
  ersten Win.

### Option C — Template-Quickstart

- Auswahl: "ISO 27001", "GDPR", "SOC 2" → Tool legt Vor-Konfiguriertes Set an Areas an, User
  passt nur an.
- **Pro:** Erster Win in 2 Minuten, nicht 15. Demo-tauglich für Vorgesetzte.
- **Contra:** Templates müssen gepflegt werden (Content-Effort). User kennt das Tool nicht
  von innen, weil viel pre-baked ist.

### Option D — Hybrid: Template + Geführte Anpassung

- User wählt Template → 3-Step-Wizard zur Anpassung an eigenes Unternehmen → Dashboard mit
  Empty-States für die nächsten Schritte.
- **Pro:** Quick-Win + Verständnis + skippable.
- **Contra:** Komplexer in der Implementation.

## Schritt 4: Empfehlung

> **Empfehlung: Option D (Hybrid).**
>
> Begründung:
> - JTBD verlangt schnellen ersten Win → Templates liefern das (vs. A/B).
> - Persona kommt aus Excel → braucht Verständnis, nicht nur Resultate. 3-Step-Anpassung
>   gibt ihm das Tool-Modell, ohne 5 Schritte zu zwingen.
> - Wir haben das `ProgressSidebar`/Wizard-System schon im DS — Re-Use, kein Neubau.
> - Empty-State-Pattern danach (Option B) skaliert für alle weiteren Aktionen, nicht nur
>   Onboarding. Konsistent.
>
> Implementations-Reihenfolge wenn du ja sagst:
> 1. Template-Datenmodell + 1 Template als POC (z.B. ISO 27001).
> 2. 3-Step-Anpassungs-Wizard (Firmenname, Scope, erstes Audit-Datum).
> 3. Dashboard-Empty-States für nächste Aktionen.
>
> Was ich NICHT empfehle: Option A allein. Lineare Wizards für Compliance-Pros wirken
> patronizing. Option C allein blockiert tieferes Lernen.

## Schritt 5: Open Questions an User

> Bevor wir starten:
> 1. Welches Template als POC? ISO 27001, GDPR oder SOC 2?
> 2. Wie viele Templates sind realistisch in v1 (1, 3, oder "Custom"-Option ab Tag 1)?
> 3. Sollen Templates aus GoogleDrive_Docs gepflegt werden oder im Code (Seed-Daten)?
