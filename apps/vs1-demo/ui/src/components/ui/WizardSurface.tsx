import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Stepper, type StepperStep } from './Stepper';

// ─── Wizard Surface ───────────────────────────────────────────────────────────
// Compass "Wizard Surface" (744:2 / 751:903). Implements the brand-defining
// THREE-LAYER PETROL doctrine: a dark petrol outer shell (topbar + stepper rail,
// forced-dark chrome) wrapping a light inner content card (Plex-Serif headline +
// body + footer). Composes the Stepper primitive.
//
// Responsive: ≥lg → petrol shell with the stepper rail (vertical or horizontal).
// <lg → mobile wizard: gold linear progress bar on the petrol topbar + stacked
// full-width footer buttons (Compass "Wizard Surface Mobile" 762:1592).
// Works in light + dark page modes (the inner card follows the page mode; the
// chrome is always the dark petrol palette).

export interface WizardSurfaceProps {
  steps: StepperStep[];
  current: number;
  /** Eyebrow above the headline inside the content card (e.g. "Schritt 1 von 4"). */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Footer area — typically Back / Next buttons. */
  footer?: React.ReactNode;
  /** Stepper layout: rail (vertical, left) on lg, or horizontal on top. */
  stepperOrientation?: 'horizontal' | 'vertical';
  // ── Topbar (dark chrome) ──
  /** Brand logo slot, top-left of the petrol topbar. */
  logo?: React.ReactNode;
  /** Small uppercase eyebrow in the centered topbar (e.g. "AUDIT WIZARD"). */
  wizardEyebrow?: React.ReactNode;
  /** Centered topbar title (e.g. "DSGVO Audit Q4 2025"). */
  wizardTitle?: React.ReactNode;
  /** Close affordance, top-right. */
  onClose?: () => void;
  className?: string;
}

export function WizardSurface({
  steps,
  current,
  eyebrow,
  title,
  description,
  children,
  footer,
  stepperOrientation = 'vertical',
  logo,
  wizardEyebrow,
  wizardTitle,
  onClose,
  className,
}: WizardSurfaceProps) {
  const vertical = stepperOrientation === 'vertical';
  const total = steps.length;
  const hasTopbar = logo || wizardEyebrow || wizardTitle || onClose;

  return (
    // Outer petrol shell (always dark chrome). In dark page mode it deepens further.
    <div className={cn('overflow-hidden rounded-2xl bg-[#0F162A] shadow-lg dark:bg-[#0a1320]', className)}>
      {/* Topbar — forced dark chrome */}
      {hasTopbar && (
        <div className="dark flex items-center justify-between gap-4 px-5 py-4 lg:px-6">
          <div className="flex flex-1 items-center">{logo}</div>
          <div className="min-w-0 flex-1 text-center">
            {wizardEyebrow && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">{wizardEyebrow}</p>
            )}
            {wizardTitle && <p className="truncate text-sm font-semibold text-fg">{wizardTitle}</p>}
          </div>
          <div className="flex flex-1 justify-end">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close wizard"
                className="rounded-lg p-1.5 text-fg-tertiary transition-colors hover:bg-white/10 hover:text-fg"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile gold progress — below topbar, hidden on lg */}
      <div className="dark px-5 pb-4 lg:hidden">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-fg-tertiary">
          <span className="truncate">{steps[current]?.label}</span>
          <span className="shrink-0 pl-2">Step {current + 1} of {total}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent-500 transition-all"
            style={{ width: `${total > 0 ? ((current + 1) / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className={cn('px-4 pb-4 lg:px-6 lg:pb-6', vertical && 'lg:grid lg:grid-cols-[240px_1fr] lg:gap-2')}>
        {/* Stepper rail — desktop only (chrome) */}
        {vertical ? (
          <aside className="dark hidden p-4 lg:block">
            <Stepper steps={steps} current={current} orientation="vertical" />
          </aside>
        ) : (
          <div className="dark hidden px-2 pb-5 pt-1 lg:block">
            <Stepper steps={steps} current={current} orientation="horizontal" />
          </div>
        )}

        {/* Inner content card — follows the page mode (white in light, petrol in dark) */}
        <section className="flex min-h-[360px] flex-col rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-[#0A3A30] dark:bg-[#001C16] lg:p-8">
          <header>
            {eyebrow && (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-brand">{eyebrow}</p>
            )}
            <h2 className="font-serif text-[26px] font-bold leading-tight tracking-tight text-fg lg:text-[30px]">{title}</h2>
            {description && (
              <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-fg-secondary">{description}</p>
            )}
          </header>

          <div className="flex-1 py-6">{children}</div>

          {footer && (
            <footer className="mt-auto flex flex-col-reverse gap-3 border-t border-stroke pt-5 [&>*]:w-full sm:flex-row sm:items-center sm:justify-between sm:[&>*]:w-auto">
              {footer}
            </footer>
          )}
        </section>
      </div>
    </div>
  );
}
