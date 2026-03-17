import React from 'react';
import { Card } from './Card';
import { Typography } from './Typography';
import { Radio } from './Radio';
import { Checkbox } from './Checkbox';

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
  ({ className = '', title, description, icon, selected = false, type = 'radio', name, value = '', disabled = false, onSelect, ...props }, ref) => {
    
    const handleCardClick = () => {
      if (!disabled && onSelect) {
        onSelect(value);
      }
    };

    const InputComponent = type === 'radio' ? Radio : Checkbox;

    return (
      <Card
        ref={ref}
        onClick={handleCardClick}
        className={`relative flex items-start gap-4 p-5 transition-all cursor-pointer ${
          disabled 
            ? 'opacity-50 cursor-not-allowed bg-neutral-50 border-neutral-200'
            : selected 
              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 shadow-sm' 
              : 'border-neutral-200 bg-white hover:border-primary-300 hover:bg-neutral-50'
        } ${className}`}
        {...props}
      >
        <div className="pt-0.5">
            <InputComponent 
              name={name} 
              value={value} 
              checked={selected} 
              disabled={disabled} 
              readOnly 
              tabIndex={-1} 
              className="pointer-events-none" 
            />
        </div>
        <div className="flex flex-col gap-1">
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
        </div>
      </Card>
    );
  }
);
OptionCard.displayName = 'OptionCard';
