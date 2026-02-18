import { render, screen } from '@testing-library/react';
import { RiskOverviewPanel, RiskItem } from './RiskOverviewPanel';
import { describe, it, expect } from 'vitest';

const mockRisks: RiskItem[] = [
    { id: '1', title: 'Data Breach Vulnerability', severity: 'critical' },
    { id: '2', title: 'Outdated Certificate', severity: 'medium', description: 'SSL cert expires in 30 days' },
];

describe('RiskOverviewPanel', () => {
    it('renders title', () => {
        render(<RiskOverviewPanel risks={mockRisks} />);
        expect(screen.getByText('Risk Overview')).toBeInTheDocument();
    });

    it('renders risk items correctly', () => {
        render(<RiskOverviewPanel risks={mockRisks} />);
        expect(screen.getByText('Data Breach Vulnerability')).toBeInTheDocument();
        expect(screen.getByText('[CRITICAL]')).toBeInTheDocument();
    });

    it('renders empty state', () => {
        render(<RiskOverviewPanel risks={[]} />);
        expect(screen.getByText('No risks identified.')).toBeInTheDocument();
    });
});
