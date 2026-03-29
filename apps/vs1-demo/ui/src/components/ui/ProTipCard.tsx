import React from 'react';
import { Lightbulb, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Typography } from './Typography';

export type ProTipVariant = 'primary' | 'accent' | 'warning' | 'error' | 'success';

export interface ProTipCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  variant?: ProTipVariant;
  icon?: React.ReactNode;
}

export const ProTipCard = React.forwardRef<HTMLDivElement, ProTipCardProps>(
  ({ className = '', title, description, variant = 'accent', icon, ...props }, ref) => {
    
    // Determine default icon if not provided
    const getDefaultIcon = () => {
      switch (variant) {
        case 'success': return <CheckCircle className="w-5 h-5 text-success-600" />;
        case 'warning': return <AlertTriangle className="w-5 h-5 text-warning-600" />;
        case 'error': return <AlertTriangle className="w-5 h-5 text-error-600" />;
        case 'primary': return <Info className="w-5 h-5 text-primary-600" />;
        case 'accent':
        default:
          return <Lightbulb className="w-5 h-5 text-accent-600" />;
      }
    };

    const variantStyles: Record<ProTipVariant, string> = {
      primary: 'bg-primary-50 border-primary-200',
      accent: 'bg-accent-50 border-accent-200',
      warning: 'bg-warning-50 border-warning-200',
      error: 'bg-error-50 border-error-200',
      success: 'bg-success-50 border-success-200',
    };

    const combinedClasses = `flex gap-3 p-4 rounded-xl border-medium ${variantStyles[variant]} ${className}`;

    return (
      <div ref={ref} className={combinedClasses} {...props}>
        <div className="shrink-0 pt-0.5">
          {icon || getDefaultIcon()}
        </div>
        <div className="flex flex-col gap-1">
          <Typography variant="body" weight="semibold" className="text-neutral-900">
            {title}
          </Typography>
          <Typography variant="ui-small" className="text-neutral-700">
            {description}
          </Typography>
        </div>
      </div>
    );
  }
);
ProTipCard.displayName = 'ProTipCard';
