import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Logo } from '../ui/Logo';

// ─── WizardScreen — full-screen compliance-wizard chrome (mode-aware) ─────────
// Screens file "Wizard" page (1199:403). Topbar (logo + right slot) · horizontal
// step rail · centered body (eyebrow + serif title + subtitle + content) · footer
// (back + primary). Token-driven → renders correctly in light AND dark (.dark).

export interface WizardStep {
  label: string;
}

export interface WizardScreenProps {
  /** Step labels for the rail. Omit for the result page (no rail). */
  steps?: WizardStep[];
  /** Zero-based index of the active step. Earlier steps render as completed. */
  current?: number;
  stepLabel?: string; // e.g. "Step 3 of 4"
  /** Petrol eyebrow above the title (e.g. result page "YOUR RISK MAP"). */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Top-right area of the topbar (a link, or status + button). */
  topbarRight?: React.ReactNode;
  /** Footer left (usually a Back control). */
  footerLeft?: React.ReactNode;
  /** Footer right (primary CTA). */
  footerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function StepRail({ steps, current = 0 }: { steps: WizardStep[]; current?: number }) {
  return (
    <div className="mx-auto flex max-w-[640px] items-center">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'upcoming';
        return (
          <React.Fragment key={s.label}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'grid h-4 w-4 place-items-center rounded-full',
                  state === 'done' && 'bg-brand text-fg-on-brand',
                  state === 'active' && 'bg-brand text-fg-on-brand ring-4 ring-brand-light',
                  state === 'upcoming' && 'border border-stroke bg-surface',
                )}
              >
                {state === 'done' && <Check size={10} strokeWidth={3.5} />}
              </span>
              <span className={cn('text-[12px] font-semibold', state === 'upcoming' ? 'text-fg-tertiary' : 'text-fg')}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && <span className="mx-2 mb-5 h-px flex-1 bg-stroke" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function WizardScreen({
  steps,
  current = 0,
  stepLabel,
  eyebrow,
  title,
  subtitle,
  topbarRight,
  footerLeft,
  footerRight,
  children,
  className,
}: WizardScreenProps) {
  return (
    <div className={cn('flex min-h-[640px] flex-col bg-surface', className)}>
      {/* Topbar */}
      <header className="flex items-center justify-between border-b border-stroke px-6 py-4 lg:px-10">
        <Logo lockup="horizontal" tone="on-light" />
        {topbarRight && <div className="flex items-center gap-3">{topbarRight}</div>}
      </header>

      {/* Body — clips when height-constrained (phone viewport) so the footer stays
          pinned and overflowing content is cut, not pushed off. */}
      <main className="flex-1 overflow-hidden px-6 py-8 lg:px-10 lg:py-10">
        {steps && (
          <div className="mb-8">
            <StepRail steps={steps} current={current} />
          </div>
        )}
        <div className="mx-auto max-w-[760px] text-center">
          {stepLabel && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">{stepLabel}</p>
          )}
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-brand">{eyebrow}</p>
          )}
          <h1 className="mt-2 font-serif text-[2rem] font-bold leading-tight tracking-tight text-fg">{title}</h1>
          {subtitle && <p className="mx-auto mt-2 max-w-xl text-body leading-relaxed text-fg-secondary">{subtitle}</p>}
        </div>
        <div className="mx-auto mt-8 max-w-[960px]">{children}</div>
      </main>

      {/* Footer */}
      {(footerLeft || footerRight) && (
        <footer className="flex items-center justify-between border-t border-stroke px-6 py-4 lg:px-10">
          <div>{footerLeft}</div>
          <div>{footerRight}</div>
        </footer>
      )}
    </div>
  );
}

// Selectable option card used by Markets / Operations / Domains steps.
export function WizardOptionCard({
  icon,
  title,
  desc,
  selected,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  desc?: React.ReactNode;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        selected
          ? 'border-stroke-brand bg-brand-light/60 ring-1 ring-stroke-brand'
          : 'border-stroke bg-surface hover:border-stroke-strong',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {icon && <span className="text-fg-brand">{icon}</span>}
        <span className="ml-auto flex items-center gap-1.5 text-fg-tertiary">
          {selected && <Check size={15} strokeWidth={2.5} className="text-fg-brand" />}
        </span>
      </div>
      <p className="mt-2 text-[15px] font-semibold text-fg">{title}</p>
      {desc && <p className="mt-0.5 text-[12px] text-fg-secondary">{desc}</p>}
    </div>
  );
}
