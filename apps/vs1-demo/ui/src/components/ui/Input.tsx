import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    
    // Standard text input styles with focus standard and error override
    const baseClasses = 'flex h-10 w-full rounded-md border-medium bg-white px-3 py-2 text-body file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors';
    
    const statusClasses = error 
      ? 'border-error-500 focus-visible:ring-error-500' 
      : 'border-neutral-300 focus-visible:ring-primary-500 focus-visible:border-primary-500';

    const combinedClasses = `${baseClasses} ${statusClasses} ${className}`.trim();

    return (
      <input
        className={combinedClasses}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
