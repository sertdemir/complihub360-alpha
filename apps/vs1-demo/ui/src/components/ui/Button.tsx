import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth = false, children, disabled, ...props }, ref) => {
    
    const baseClasses = 'inline-flex items-center justify-center font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md';
    
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-body', // 32px height, 16px text per guidelines
      md: 'h-10 px-4 text-body', // 40px height, 16px text
      lg: 'h-12 px-6 text-body', // 48px height, 16px text
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-primary-500',
      secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:bg-neutral-300 focus:ring-neutral-500',
      outline: 'border-medium border-neutral-300 bg-transparent text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 focus:ring-neutral-500',
      ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 focus:ring-neutral-500',
      danger: 'bg-error-500 text-white hover:bg-error-700 active:bg-error-800 focus:ring-error-500',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    const combinedClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`.trim();

    return (
      <button ref={ref} disabled={disabled} className={combinedClasses} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
