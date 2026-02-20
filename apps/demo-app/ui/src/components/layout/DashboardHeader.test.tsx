import { render, screen } from '@testing-library/react';
import { DashboardHeader } from './DashboardHeader';
import { describe, it, expect } from 'vitest';

describe('DashboardHeader', () => {
    it('renders title correctly', () => {
        render(<DashboardHeader title="My Dashboard" />);
        expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        render(<DashboardHeader title="Title" description="Subtitle here" />);
        expect(screen.getByText('Subtitle here')).toBeInTheDocument();
    });
});
