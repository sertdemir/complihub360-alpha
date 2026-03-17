import React from 'react';
import { Typography } from './Typography';
import { Check } from 'lucide-react';

export type StepStatus = 'completed' | 'current' | 'upcoming';

export interface ProgressStep {
  id: string;
  title: string;
  status: StepStatus;
}

export interface ProgressSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: ProgressStep[];
  onStepClick?: (stepId: string) => void;
}

export const ProgressSidebar = React.forwardRef<HTMLDivElement, ProgressSidebarProps>(
  ({ className = '', steps, onStepClick, ...props }, ref) => {
    
    return (
      <div ref={ref} className={`flex flex-col gap-4 ${className}`} {...props}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="relative flex items-start group">
              {/* Vertical line connection */}
              {!isLast && (
                <div 
                  className={`absolute left-4 top-8 -ml-px h-full w-0.5 ${
                    step.status === 'completed' ? 'bg-primary-500' : 'bg-neutral-200'
                  }`} 
                  aria-hidden="true" 
                />
              )}

              {/* Status Icon Indicator */}
              <div 
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-medium 
                  ${step.status === 'completed' ? 'bg-primary-500 border-primary-500 text-white' : ''}
                  ${step.status === 'current' ? 'bg-white border-primary-500 ring-4 ring-primary-50' : ''}
                  ${step.status === 'upcoming' ? 'bg-white border-neutral-300' : ''}
                `}
              >
                {step.status === 'completed' ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span className={`text-ui-small font-medium ${step.status === 'current' ? 'text-primary-600' : 'text-neutral-500'}`}>
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Step Title */}
              <button 
                className="ml-4 mt-1 flex flex-col focus:outline-none text-left"
                onClick={() => onStepClick && onStepClick(step.id)}
                disabled={step.status === 'upcoming'}
              >
                <Typography 
                  variant="body" 
                  weight={step.status === 'current' ? 'semibold' : 'medium'}
                  className={`
                    ${step.status === 'completed' ? 'text-neutral-900' : ''}
                    ${step.status === 'current' ? 'text-primary-700' : ''}
                    ${step.status === 'upcoming' ? 'text-neutral-500 group-hover:text-neutral-600' : ''}
                  `}
                >
                  {step.title}
                </Typography>
              </button>
            </div>
          );
        })}
      </div>
    );
  }
);
ProgressSidebar.displayName = 'ProgressSidebar';
