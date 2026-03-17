import * as React from 'react';

/**
 * StatusBadge Component
 * 
 * A neutral, structural-only badge component.
 * Design Policy: TBD. No specific colors or tokens used.
 */

interface StatusBadgeProps {
    label: string;
    status?: 'active' | 'inactive' | 'pending' | 'warning'; // Logical statuses, not visual
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label }) => {
    // Minimal utility classes for layout only: inline-flex, padding, rounded.
    // NO colors, NO shadows, NO branding.
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {label}
        </span>
    );
};
