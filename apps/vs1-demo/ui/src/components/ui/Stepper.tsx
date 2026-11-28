import React from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Stepper ──────────────────────────────────────────────────────────────────
// Mirrors the Compass "Step Horizontal/Vertical" (Progress 536:2). Used in the
// Wizard (5 steps) and Onboarding (6 steps). Completed = petrol + check, active =
// petrol + number (white) + ring, upcoming = neutral outline + muted number.
// Light + dark.
//
// variant="inline" (Compass "Step Inline", 2273:276, Canvas-Wahl 1A vom
// 2026-11-28): die Textzeile fuer kurze Ablaeufe ueber einem Blatt oder
// Formular — "1 ANMELDUNG ✓ › 2 BETA-VEREINBARUNG › 3 IHRE RISK MAP". Ohne
// Kreise und Verbinder, bricht auf schmalen Flaechen um. Der Stand haengt nie
// allein an der Farbe: erledigt traegt einen Haken, aktiv aria-current="step".

export type StepperSize = 'sm' | 'md' | 'lg';
type StepState = 'done' | 'active' | 'upcoming' | 'error' | 'disabled';

export interface StepperStep {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Override the derived state: `error` (red + ✕) or `disabled` (muted). */
  state?: 'error' | 'disabled';
}

export interface StepperProps {
  steps: StepperStep[];
  /** Zero-based index of the active step. Earlier steps render as completed. */
  current: number;
  orientation?: 'horizontal' | 'vertical';
  /** Indicator scale. Default = md. Ohne Wirkung bei variant="inline". */
  size?: StepperSize;
  /** circles = Kreise mit Verbindern (Standard) · inline = eine Textzeile. */
  variant?: 'circles' | 'inline';
  /** Nur inline: Schrittnummer vor dem Label. Aus, wenn das Label sie schon traegt. */
  numbered?: boolean;
  /** Name der Liste fuer Screenreader. */
  'aria-label'?: string;
  /** Nur inline: Name des Hakens ("erledigt"). Ohne ihn ist der Haken reine Zier. */
  doneLabel?: string;
  className?: string;
}

// Pixelwerte statt `h-10`: die spacing-Skala dieses Projekts ist ueberschrieben,
// 10 steht dort auf 64 px. `lg` rendert dadurch einen 64er-Kasten mit 15px-Text
// und sprengt die eigene Reihe (sm 24 → md 32 → lg 64). 40 setzt sie fort und
// ist zugleich die `md`-Stufe der Compass-Avatar-Skala (24/32/40/48/64).
const SIZE: Record<StepperSize, { box: string; text: string; icon: number; ring: string }> = {
  sm: { box: 'h-6 w-6 text-[11px]', text: 'text-[11px]', icon: 13, ring: 'ring-2' },
  md: { box: 'h-8 w-8 text-[13px]', text: 'text-[12px]', icon: 16, ring: 'ring-4' },
  lg: { box: 'h-[40px] w-[40px] text-[15px]', text: 'text-[14px]', icon: 20, ring: 'ring-4' },
};

function Indicator({ state, n, size }: { state: StepState; n: number; size: StepperSize }) {
  const sz = SIZE[size];
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold transition-colors',
        sz.box,
        state === 'done' && 'bg-brand text-fg-on-brand',
        state === 'active' && cn('bg-brand text-fg-on-brand ring-brand-light', sz.ring),
        state === 'upcoming' && 'border border-stroke text-fg-tertiary',
        state === 'error' && 'bg-red-500 text-white dark:bg-red-400',
        state === 'disabled' && 'border border-stroke text-fg-tertiary opacity-50',
      )}
    >
      {state === 'done' ? (
        <Check size={sz.icon} strokeWidth={3} />
      ) : state === 'error' ? (
        <X size={sz.icon} strokeWidth={3} />
      ) : (
        n
      )}
    </span>
  );
}

export function Stepper({
  steps,
  current,
  orientation = 'horizontal',
  size = 'md',
  variant = 'circles',
  numbered = true,
  'aria-label': ariaLabel,
  doneLabel,
  className,
}: StepperProps) {
  const stateOf = (i: number): StepState => {
    const override = steps[i]?.state;
    if (override) return override;
    return i < current ? 'done' : i === current ? 'active' : 'upcoming';
  };
  const sz = SIZE[size];

  if (variant === 'inline') {
    return (
      <ol
        aria-label={ariaLabel}
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-1 text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-tertiary',
          className,
        )}
      >
        {steps.map((s, i) => {
          const state = stateOf(i);
          const last = i === steps.length - 1;
          return (
            <React.Fragment key={i}>
              <li
                aria-current={state === 'active' ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1',
                  state === 'active' && 'text-brand',
                  state === 'error' && 'text-red-700 dark:text-red-400',
                  state === 'disabled' && 'opacity-60',
                )}
              >
                {numbered && <span>{i + 1}</span>}
                <span>{s.label}</span>
                {state === 'done' &&
                  (doneLabel ? (
                    <Check size={12} strokeWidth={3} role="img" aria-label={doneLabel} />
                  ) : (
                    <Check size={12} strokeWidth={3} aria-hidden />
                  ))}
                {state === 'error' && <AlertCircle size={12} strokeWidth={2.5} aria-hidden />}
              </li>
              {!last && <li aria-hidden>›</li>}
            </React.Fragment>
          );
        })}
      </ol>
    );
  }

  if (orientation === 'vertical') {
    return (
      <ol className={cn('flex flex-col', className)}>
        {steps.map((s, i) => {
          const state = stateOf(i);
          const last = i === steps.length - 1;
          return (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Indicator state={state} n={i + 1} size={size} />
                {!last && <span className={cn('my-1 w-0.5 flex-1 rounded', i < current ? 'bg-brand' : 'bg-stroke')} />}
              </div>
              <div className={cn('pb-6', last && 'pb-0')}>
                <p
                  className={cn(
                    'font-medium',
                    sz.text,
                    state === 'error' && 'text-red-600 dark:text-red-400',
                    state === 'disabled' && 'text-fg-tertiary opacity-60',
                    state === 'upcoming' && 'text-fg-tertiary',
                    (state === 'done' || state === 'active') && 'text-fg',
                  )}
                >
                  {s.label}
                </p>
                {s.description && <p className="mt-0.5 text-[12px] text-fg-secondary">{s.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn('flex items-start', className)}>
      {steps.map((s, i) => {
        const state = stateOf(i);
        const last = i === steps.length - 1;
        return (
          <li key={i} className={cn('flex items-start', !last && 'flex-1')}>
            <div className="flex flex-col items-center">
              <Indicator state={state} n={i + 1} size={size} />
              <span
                className={cn(
                  'mt-1.5 max-w-[110px] text-center font-medium',
                  sz.text,
                  state === 'error' && 'text-red-600 dark:text-red-400',
                  state === 'disabled' && 'text-fg-tertiary opacity-60',
                  state === 'upcoming' && 'text-fg-tertiary',
                  (state === 'done' || state === 'active') && 'text-fg',
                )}
              >
                {s.label}
              </span>
            </div>
            {!last && <span className={cn('mt-4 h-0.5 flex-1 rounded', i < current ? 'bg-brand' : 'bg-stroke')} />}
          </li>
        );
      })}
    </ol>
  );
}
