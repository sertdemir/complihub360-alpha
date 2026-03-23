# Implementation Plan: Search Results Page (ResultsOverview)

## Overview
Die Ergebnisseite (Search Results Page) am Ende der Wizards (`ResultsOverview.tsx`) soll dynamisch die Daten aus dem aufgenommenen Nutzerprofil (`searchProfile` aus dem React Router State) verarbeiten. Aktuell enthält die Seite noch viele hardcodierte Werte (z.B. AI Summary, Query, Provider). Ziel dieser Implementierung ist es, die Ergebnisseite auf die tatsächlichen Eingaben des Nutzers zuzuschneiden.

## Project Type
**WEB** (Primary Agent: `frontend-specialist`)

## Success Criteria
1. Die Seite `ResultsOverview.tsx` liest erfolgreich den State aus `useLocation()`.
2. Die UI (Query, "AI Summary", "Risk Level", Provider-Empfehlungen) ist dynamisch und reagiert auf die Eigenschaften des übergebenen Profils.
3. Struktur, Navigation (z.B. die Tabs) und Responsive Design funktionieren fehlerfrei.

## Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS
- **Routing:** react-router-dom (`useLocation` hook)
- **Data Management:** Entweder erweiterte Mock-Logik oder Supabase Backend-Anbindung (steht noch zur Klärung).

## File Structure
- `apps/vs1-demo/ui/src/pages/ResultsOverview.tsx` (MODIFY)
- `apps/vs1-demo/ui/src/services/resultsMockService.ts` (NEW - falls Mocking gewünscht)
- `apps/vs1-demo/ui/src/components/results/` (NEW - z.B. `ProviderList.tsx`, `AiSummaryCard.tsx` zur besseren Code-Kapselung)

## Task Breakdown

### Task 1: Routing & State Integration
- **Agent:** `frontend-specialist`
- **Skills:** `react-best-practices`, `clean-code`
- **INPUT:** `ResultsOverview.tsx`
- **OUTPUT:** Einbindung von `useLocation()`, Entgegennehmen von `state.searchProfile`. Implementierung eines Fallbacks, falls die Seite ohne Wizard-Durchlauf aufgerufen wird.
- **VERIFY:** Console-Log oder Debug-View auf der `/results`-Route zeigt das korrekte Profil-Objekt.

### Task 2: Data Service Setup (Mock / API)
- **Agent:** `frontend-specialist` oder `backend-specialist` (je nach Datenquelle)
- **Skills:** `clean-code`
- **INPUT:** `searchProfile` Interface / Daten, Supabase (optional)
- **OUTPUT:** Eine Service-Klasse/Funktion, die basierend auf dem Profil passende Empfehlungen, Gesetzestexte und Provider liefert (vorerst gemockt, falls es noch keine Endpoint-Logik gibt).
- **VERIFY:** TypeScript-Typisierung ist sauber, Daten werden korrekt und typensicher an die Views geliefert.

### Task 3: UI-Kapselung und Dynamisierung
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `tailwind-patterns`
- **INPUT:** Hardcodierte UI aus `ResultsOverview.tsx`
- **OUTPUT:** Auslagerung von Teilen wie der AI-Summary und der Provider-Liste in Sub-Komponenten (bessere Lesbarkeit). Mapping der dynamischen Service-Daten auf diese Komponenten.
- **VERIFY:** Tabs (Overview, Laws, Articles, Tips) schalten weich um und zeigen korrespondierenden Content an.

## Phase X: Verification
- [ ] Run `npm run lint` & `npx tsc --noEmit`
- [ ] Check console warnings (keine React key errors)
- [ ] No standard template layouts or forbidden styles (purple/violet)
- [ ] Manuell prüfen: Einmal den kompletten Wizard durchklicken und verifizieren, dass das Ergebnisbild stimmt.
