import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Stepper ──────────────────────────────────────────────────────────────────
// Mirrors the Compass "Step Horizontal/Vertical" (Progress 536:2). Used in the
// Wizard (5 steps) and Onboarding (6 steps). Completed = petrol + check, active =
// petrol + number (white) + ring, upcoming = neutral outline + muted number.
// Light + dark.

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
  /** Indicator scale. Default = md. */
  size?: StepperSize;
  className?: string;
}

const SIZE: Record<StepperSize, { box: string; text: string; icon: number; ring: string }> = {
  sm: { box: 'h-6 w-6 text-[11px]', text: 'text-[11px]', icon: 13, ring: 'ring-2' },
  md: { box: 'h-8 w-8 text-[13px]', text: 'text-[12px]', icon: 16, ring: 'ring-4' },
  lg: { box: 'h-10 w-10 text-[15px]', text: 'text-[14px]', icon: 20, ring: 'ring-4' },
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

export function Stepper({ steps, current, orientation = 'horizontal', size = 'md', className }: StepperProps) {
  const stateOf = (i: number): StepState => {
    const override = steps[i]?.state;
    if (override) return override;
    return i < current ? 'done' : i === current ? 'active' : 'upcoming';
  };
  const sz = SIZE[size];

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
