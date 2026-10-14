// ─── Der Satz am Feld (Regel V2, abgenommen 11.10.2026) ──────────────────────
// Gegenstueck zu FormErrorSummary: dieselbe Meldung steht direkt unter dem
// Feld, mit der id `${id}-error`, auf die das Feld per aria-describedby zeigt.
//
// - Formular mit EINEM Eingabefeld: keine Zusammenfassung — der Satz am Feld
//   traegt dann selbst role="alert" (`alert`).
// - Formular mit ZWEI oder mehr Feldern: der Satz am Feld ohne role, die
//   Zusammenfassung ueber dem Absende-Knopf meldet sich als alert.
//
// Referenz: pages/ContactPage.tsx, pages/PartnerApplyPage.tsx.

export function FieldError({ id, message, alert = false, className = '' }: {
  /** id des Feldes (oder der Gruppe); der Satz bekommt `${id}-error`. */
  id: string;
  message?: string | null;
  /** true bei Formularen mit nur einem Feld (keine Zusammenfassung). */
  alert?: boolean;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      id={`${id}-error`}
      role={alert ? 'alert' : undefined}
      className={`mt-1.5 text-body-3xs leading-snug text-error-700 dark:text-red-300 ${className}`}
    >
      {message}
    </p>
  );
}

/** aria-invalid + aria-describedby fuer ein Feld oder eine Gruppe mit Fehler. */
export function errorAria(id: string, hasError: boolean) {
  return hasError ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};
}

/** Rahmen und Flaeche eines fehlerhaften Feldes — wie auf der Bewerbungsseite.
 *  Mit `!`: die Feld-Klassen der Seiten (border-stroke, bg-surface, focus:…)
 *  stehen im CSS spaeter und gewaennen sonst — der Rahmen bliebe grau. */
export const FIELD_ERROR_CLASS = ' !border-error-500 !bg-error-bg focus:!ring-error-500/40 dark:!bg-red-500/10';
