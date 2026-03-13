import React, { forwardRef } from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, error, disabled, ...props }, ref) => {
    
    // Hidden native input + styled wrapper
    return (
      <label className={`inline-flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}>
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            ref={ref}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div className={`
            w-5 h-5 rounded overflow-hidden flex items-center justify-center transition-colors border-medium 
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2
            ${error ? 'border-error-500' : 'border-neutral-300 peer-checked:border-primary-500'}
            bg-white peer-checked:bg-primary-500
          `}>
             <svg
              className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
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
Checkbox.displayName = 'Checkbox';
