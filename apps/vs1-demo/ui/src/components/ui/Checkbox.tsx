import React, { forwardRef, useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Checkbox ─────────────────────────────────────────────────────────────────
// Mirrors the Compass "Checkbox" (600:137). 20px box (sm 16 / lg 24), checked =
// petrol (bg/brand) + white check, indeterminate = dash, error/disabled. Real
// native input (peer pattern) — accessible, controlled or uncontrolled. Light + dark.

export type CheckboxSize = 'sm' | 'md' | 'lg';
const BOX: Record<CheckboxSize, number> = { sm: 16, md: 20, lg: 24 };
const TXT: Record<CheckboxSize, string> = { sm: 'text-[13px]', md: 'text-[14px]', lg: 'text-[15px]' };

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  error?: boolean;
  size?: CheckboxSize;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, size = 'md', indeterminate, disabled, ...props }, ref) => {
    const innerRef = useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
    useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);
    const s = BOX[size];
    const ic = Math.round(s * 0.7);
    return (
      <label className={cn('inline-flex items-center gap-2', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', className)}>
        <input type="checkbox" ref={innerRef} disabled={disabled} aria-invalid={error || undefined} className="peer sr-only" {...props} />
        <span
          style={{ width: s, height: s }}
          className={cn(
            'relative grid shrink-0 place-items-center rounded-[4px] border bg-surface text-white transition-colors',
            '[&_svg]:absolute [&_.chk]:opacity-0 peer-checked:[&_.chk]:opacity-100 [&_.ind]:opacity-0 peer-indeterminate:[&_.ind]:opacity-100',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-primary-500',
            error
              ? 'border-error-500'
              : 'border-stroke peer-checked:border-brand peer-checked:bg-brand peer-indeterminate:border-brand peer-indeterminate:bg-brand',
          )}
        >
          <Check className="chk" size={ic} strokeWidth={3} />
          <Minus className="ind" size={ic} strokeWidth={3} />
        </span>
        {label && <span className={cn('select-none text-fg', TXT[size])}>{label}</span>}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
