import { render, screen, fireEvent } from '@testing-library/react';
import { RiskTable, RiskRow } from './RiskTable';
import { describe, it, expect, vi } from 'vitest';

const mockRisks: RiskRow[] = [
    { id: '1', description: 'Risk A', category: 'Cat A', date: '2024-01-01' },
    { id: '2', description: 'Risk B', category: 'Cat B', date: '2024-01-02' },
    { id: '3', description: 'Risk C', category: 'Cat C', date: '2024-01-03' },
];

describe('RiskTable', () => {
    it('renders table header', () => {
        render(<RiskTable risks={[]} />);
        expect(screen.getByText('Risk Register')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('renders exactly 3 rows', () => {
        render(<RiskTable risks={mockRisks} />);
        expect(screen.getByText('Risk A')).toBeInTheDocument();
        expect(screen.getByText('Risk B')).toBeInTheDocument();
        expect(screen.getByText('Risk C')).toBeInTheDocument();
    });

    it('renders export button and handles click', () => {
        const handleExport = vi.fn();
        render(<RiskTable risks={mockRisks} onExport={handleExport} />);

        const exportBtn = screen.getByText('Export CSV');
        expect(exportBtn).toBeInTheDocument();

        fireEvent.click(exportBtn);
        expect(handleExport).toHaveBeenCalledTimes(1);
    });

    it('renders empty state', () => {
        render(<RiskTable risks={[]} />);
        expect(screen.getByText('No risks found.')).toBeInTheDocument();
    });
});
