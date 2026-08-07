import React from 'react';
import { cn } from '../../lib/utils';

// ─── FormLabel + FormField ────────────────────────────────────────────────────
// Mirrors the Compass "Form Label" (604:80) and "Form Field" (605:419). FormField
// composes a label, a control (children), and a helper/error message — the
// canonical onboarding / wizard / login field wrapper. Light + dark via tokens.

export type FieldSize = 'sm' | 'md' | 'lg';
const LABEL_TEXT: Record<FieldSize, string> = { sm: 'text-[13px]', md: 'text-[14px]', lg: 'text-[15px]' };

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  size?: FieldSize;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
}

export function FormLabel({ size = 'md', required, optional, disabled, className, children, ...rest }: FormLabelProps) {
  return (
    <label
      className={cn('inline-flex items-center gap-1 font-medium text-fg', LABEL_TEXT[size], disabled && 'opacity-60', className)}
      {...rest}
    >
      {children}
      {required && (
        <span className="text-error-500" aria-hidden="true">
          *
        </span>
      )}
      {optional && <span className="font-normal text-fg-tertiary">(optional)</span>}
    </label>
  );
}

export interface FormFieldProps {
  label?: React.ReactNode;
  /** Links the label + message to the control by id. */
  htmlFor?: string;
  size?: FieldSize;
  required?: boolean;
  optional?: boolean;
  /** Error message — overrides helper and styles the field as invalid. */
  error?: React.ReactNode;
  helper?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  size = 'md',
  required,
  optional,
  error,
  helper,
  disabled,
  className,
  children,
}: FormFieldProps) {
  const msgId = htmlFor ? `${htmlFor}-msg` : undefined;
  const message = error ?? helper;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <FormLabel htmlFor={htmlFor} size={size} required={required} optional={optional} disabled={disabled}>
          {label}
        </FormLabel>
      )}
      {children}
      {message && (
        <p id={msgId} className={cn('text-[12px] leading-snug', error ? 'text-error-700 dark:text-red-400' : 'text-fg-tertiary')}>
          {message}
        </p>
      )}
    </div>
  );
}
