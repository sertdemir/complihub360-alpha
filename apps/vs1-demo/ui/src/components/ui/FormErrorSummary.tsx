import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── Fehler-Zusammenfassung (H2, EN-Launch Schritt 2) ─────────────────────────
// Figma 3634:3437, Canvas-Wahl H2 (09.10.2026): die Zusammenfassung steht am
// Absende-Knopf, dort, wo der Nutzer gerade gehandelt hat; der Fokus geht aufs
// erste fehlerhafte Feld (Checklist v1.0: "Error summaries link or move focus
// to the first invalid field."). Ueberschrift und Satz sind die abgenommene
// Copy (common:states.formErrorSummary). Jede Zeile springt in ihr Feld.
//
// Der Knopf bleibt dabei immer aktiv. Ein grauer Knopf, der nicht sagt, was
// fehlt, war genau das Muster, das diese Komponente abloest.

export interface FormError {
  /** id des Feldes (oder einer Gruppe) — Ziel des Sprungs. */
  id: string;
  label: string;
  message: string;
}

/** Fokus auf ein Feld; bei einer Gruppe auf ihr erstes bedienbares Element. */
export function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const target = el.matches('input, textarea, select, button')
    ? el
    : el.querySelector<HTMLElement>('input, textarea, select, button') ?? el;
  target.focus();
  target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}

export function FormErrorSummary({ errors, className = '' }: { errors: FormError[]; className?: string }) {
  const { t } = useTranslation(['common']);
  if (!errors.length) return null;
  return (
    <div role="alert" className={`rounded-lg border border-error-500/60 bg-error-bg px-4 py-3 dark:bg-red-500/10 ${className}`}>
      <p className="flex items-center gap-2 text-body-sm font-bold text-fg">
        <AlertCircle size={16} className="shrink-0 text-error-700 dark:text-red-300" aria-hidden />
        {t('common:states.formErrorSummary.heading')}
      </p>
      <p className="mt-1 text-body-3xs leading-relaxed text-fg-secondary">{t('common:states.formErrorSummary.message')}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {errors.map((e) => (
          <li key={e.id} className="text-body-3xs leading-relaxed">
            <button
              type="button"
              onClick={() => focusField(e.id)}
              className="font-semibold text-error-700 underline underline-offset-2 hover:no-underline dark:text-red-300"
            >
              {e.label}
            </button>
            <span className="text-fg-secondary"> — {e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
