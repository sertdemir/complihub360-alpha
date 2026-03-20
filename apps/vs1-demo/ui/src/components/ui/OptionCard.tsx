import React from 'react';
import { Card } from './Card';
import { Typography } from './Typography';

export interface OptionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  type?: 'radio' | 'checkbox';
  name?: string;
  value?: string;
  disabled?: boolean;
  onSelect?: (value: string) => void;
}

export const OptionCard = React.forwardRef<HTMLDivElement, OptionCardProps>(
  ({ className = '', title, description, icon, selected = false, name, value = '', disabled = false, onSelect, ...props }, ref) => {
    
    const handleCardClick = () => {
      if (!disabled && onSelect) {
        onSelect(value);
      }
    };

    return (
      <Card
        ref={ref}
        onClick={handleCardClick}
        className={`relative flex flex-col gap-1 p-5 transition-all cursor-pointer ${
          disabled 
            ? 'opacity-50 cursor-not-allowed bg-neutral-50 border-neutral-200'
            : selected 
              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 shadow-sm' 
              : 'border-neutral-200 bg-white hover:border-primary-300 hover:bg-neutral-50'
        } ${className}`}
        {...props}
      >
        {selected && (
          <div className="absolute top-3 right-3">
            <span className="material-symbols-outlined text-primary-600 text-lg">check_circle</span>
          </div>
        )}
        {icon && (
          <div className="mb-1">
            {icon}
          </div>
        )}
        <Typography variant="body" weight="medium" className={selected ? 'text-primary-900' : 'text-neutral-900'}>
          {title}
        </Typography>
        {description && (
          <Typography variant="ui-small" className={selected ? 'text-primary-700' : 'text-neutral-600'}>
            {description}
          </Typography>
        )}
      </Card>
    );
  }
);
OptionCard.displayName = 'OptionCard';
