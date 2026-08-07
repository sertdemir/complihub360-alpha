# Critique-Heuristiken — CompliHub360 UX/UI

Beim Review oder Build gehst du diese Liste durch. Findings mit Severity:
🔴 Blocker · 🟡 Should-fix · 🟢 Nice-to-have

## 1. Brand-Konsistenz

- Voice & Tone aus `GoogleDrive_Docs/Brand & Positioning Guide.md` eingehalten? (Mikrocopy passt zu Brand?)
- Keine Mall-of-AI-Formulierungen ("Effortlessly streamline your...").
- Deutsche Strings sind nicht 1:1 aus dem Englischen übersetzt — natürliche dt. Formulierung.

## 2. Design-System-Compliance (gegen C360 Figma-DS)

- Existiert die verwendete Komponente im **C360-Design-System-Figma**? Wenn nicht: ist das eine begründete Komposition aus Primitives oder eine ungeflaggte Eigenschöpfung?
- Tokens im Code matchen Figma-Variables? (`get_variable_defs` cross-checken). Drift → flaggen.
- Wird existierende `Button`, `Card`, `OptionCard`, `Input`, `Checkbox`, `Radio`, `Typography`, `ProgressSidebar`, `ProTipCard` verwendet, statt neu zu bauen?
- shadcn/Radix-Pattern eingehalten? (`asChild`, `cn()` aus `@/lib/utils`, Variants via `class-variance-authority`)
- Icons: ausschließlich `lucide-react`. Kein Heroicons, kein FontAwesome, keine eigenen SVGs für gängige Icons.

## 3. Tokens — Hard Rule

🔴 Blocker, wenn im Code:
- Hex-Farben (`#fafafa`, `rgb(...)`) statt Tailwind-Klassen mit Token-Refs.
- Pixel-Spacings (`mt-[13px]`, `p-[7px]`) statt Tailwind-Scale (`mt-3`, `p-2`).
- Eigene `border-radius`-Werte statt Token-Radii.
- Eigene Shadows statt Elevation-Tokens.

## 4. State-of-the-Art SaaS-Patterns

- **Visuelle Hierarchie**: Eine klare primäre Action pro View. Nicht 3 gleichwertige Buttons.
- **Empty States**: definiert? Mit klarem Next-Step (CTA), nicht nur "Keine Daten."
- **Loading States**: Skeletons für > 300ms Loads, Spinner nur für < 300ms. Optimistic UI wo sinnvoll (z.B. Toggle).
- **Error States**: actionable. "Etwas ist schiefgegangen" allein ist 🔴. Was kann der User tun?
- **Success Feedback**: kurz, nicht-blockierend (Toast statt Modal), unter 3 Sekunden auto-dismiss.
- **Motion**: `framer-motion` sparsam und purposeful. Easing aus Token-System. Keine Bouncy-Spring-Animationen für Enterprise-Compliance-Tool.
- **Typografie**: max. 3 Schriftgrößen pro View. Hierarchie durch Größe + Gewicht, nicht Farbe.
- **Dichte**: Nicht zu lufig, nicht erdrückend. Compliance-User scannen Daten — ausreichend Information-Density.

## 5. Accessibility (WCAG 2.1 AA Minimum)

- Color-Contrast 4.5:1 für Body-Text gegen Dark-Theme `#09090b` Canvas. 3:1 für > 18pt.
- Alle interaktiven Elemente: `aria-label` oder sichtbares Label, `:focus-visible`-Style, Tastatur-erreichbar.
- Touch-Targets ≥ 44×44px auf Mobile.
- Form-Inputs mit `<label>` (kein Placeholder-as-Label).
- Kein reines Farbsignal (rot = Fehler) — immer + Icon oder Text.
- Modals: Focus-Trap, ESC schließt, Focus kehrt zurück zum Trigger.
- Screen-Reader-only-Text (`sr-only`) für Icon-only-Buttons.

## 6. i18n (de + en, beides Pflicht)

- Alle User-facing-Strings in `public/locales/de/common.json` + `en/common.json`.
- Keine String-Konkatenation für übersetzten Text — `t('key', { vars })` mit Interpolation.
- Plurale via i18next-Plural-Forms, nicht eigene Logik.
- Datums-/Zahlen-Formatierung locale-aware (`Intl.DateTimeFormat`, `Intl.NumberFormat`).
- Strings sollten in beiden Sprachen ähnliche Länge haben — Layout muss stretchbar sein.

## 7. Performance & Code-Qualität

- `React.memo` / `useMemo` / `useCallback` nur wo messbar — nicht prophylaktisch überall.
- Zustand-Stores nur für GLOBALEN State. Local State bleibt local (`useState`).
- Keine Inline-Funktion-Props in Listen-Render-Schleifen (ohne `useCallback`).
- Charts: `recharts` über existierende `chart.tsx`-Wrapper. Keine eigenen Chart-Komponenten.
- Bundle: keine schweren Libs (Moment, Lodash full-import) — `date-fns` und gezielte Lodash-Imports.
- Bilder: optimiert, mit `loading="lazy"` für Non-LCP.

## 8. Forms & Wizards (häufige Patterns in CompliHub)

- Wizard mit `ProgressSidebar` aus `src/components/ui/`.
- Felder: Inline-Validation nach `onBlur`, nicht bei jedem Keystroke.
- Required-Felder klar markiert (Asterisk + Hinweis "* Pflichtfeld").
- Submit-Button disabled solange invalid + klare Fehlerliste oben.
- Erfolgs-Confirmation mit Next-Action-CTA, nicht Sackgasse.
- Bei langen Formularen: Auto-Save oder klare "Verlässt-Warnung".

## 9. Storybook-Coverage (Build-Modus)

- Jede neue Komponente bekommt `*.stories.tsx`.
- Story für Default-State, Loading, Error, Empty, Disabled.
- a11y-Addon ist installiert — Stories müssen ohne a11y-Violations sein.

## 10. Code-Connect (Figma-Sync)

- Wenn die Komponente im DS-Figma existiert: `*.figma.tsx`-Mapping anlegen, damit Figma-zu-Code-Sync funktioniert (`@figma/code-connect` ist installiert).
- Pattern: bestehende `Button.figma.tsx`, `Card.figma.tsx` etc. als Vorlage nehmen.

## Severity-Beispiele

- 🔴 Blocker: Hex-Farben, kein i18n, kein Empty-State, < 4.5:1 Kontrast, Tastatur-Falle.
- 🟡 Should-fix: Kein Loading-Skeleton, neuer Button statt `Button`-Komponente, Inline-Style statt Token, fehlendes Code-Connect für DS-Komponente.
- 🟢 Nice-to-have: Stärkere Mikrocopy, kleinere Motion-Tweaks, zusätzliche Storybook-Variant.
