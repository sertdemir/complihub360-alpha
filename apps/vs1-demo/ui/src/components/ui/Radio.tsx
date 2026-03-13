import React, { forwardRef } from 'react';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className = '', label, error, disabled, ...props }, ref) => {
    
    return (
      <label className={`inline-flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}>
        <div className="relative flex items-center justify-center">
          <input
            type="radio"
            ref={ref}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div className={`
            w-5 h-5 rounded-full flex items-center justify-center transition-colors border-medium 
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2
            ${error ? 'border-error-500' : 'border-neutral-300 peer-checked:border-primary-500'}
            bg-white
          `}>
             <div className="w-2.5 h-2.5 rounded-full bg-primary-500 opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {label && (
          <span className="text-body text-neutral-900 select-none">
            {label}
          </span>
        )}
      </label>
    );
  }
);
Radio.displayName = 'Radio';
