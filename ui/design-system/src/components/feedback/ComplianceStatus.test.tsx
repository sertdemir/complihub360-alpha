import { render, screen } from '@testing-library/react';
import { ComplianceStatus } from './ComplianceStatus';
import { describe, it, expect } from 'vitest';

describe('ComplianceStatus', () => {
    it('renders high risk status correctly', () => {
        render(<ComplianceStatus level="high" />);
        expect(screen.getByText('High Risk')).toBeInTheDocument();
    });

    it('renders custom label', () => {
        render(<ComplianceStatus level="medium" label="Custom Status" />);
        expect(screen.getByText('Custom Status')).toBeInTheDocument();
    });
});
