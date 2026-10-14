import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { cellActions, LicenceLine } from './AdminProviderReviewPage';

vi.mock('../../store/useAuthStore', () => ({ useAuthStore: () => ({ user: null }) }));

// R1 (Entscheidung b, Figma 3705:4311): in Steuer und Recht ist eine Zelle
// nur mit gepruefter Zulassung fuer genau dieses Land freigebbar.
const labels = (xs: ReturnType<typeof cellActions>) => xs.map(([l]) => l);

describe('cellActions', () => {
  it('offers Approve where no licence is needed', () => {
    expect(labels(cellActions('pending', { required: false, state: 'not_required', expires_at: null }))).toContain('Approve');
  });
  it('offers Approve with a reviewed licence', () => {
    expect(labels(cellActions('pending', { required: true, state: 'reviewed', expires_at: '2027-03-31' }))).toEqual(['Approve', 'Limit', 'Reject', 'Request']);
  });
  it('replaces Approve and Limit with "Request licence" when the licence is missing or expired', () => {
    for (const state of ['missing', 'expired'] as const) {
      const xs = labels(cellActions('pending', { required: true, state, expires_at: null }));
      expect(xs[0]).toBe('Request licence');
      expect(xs).not.toContain('Approve');
      expect(xs).not.toContain('Limit');
      expect(xs).toContain('Reject');
    }
  });
  it('keeps Pause on an approved cell whose licence has lapsed', () => {
    expect(labels(cellActions('approved', { required: true, state: 'expired', expires_at: '2026-01-31' }))).toEqual(['Request licence', 'Pause']);
  });
});

describe('LicenceLine', () => {
  it('names the country when the licence is missing', () => {
    render(<LicenceLine licence={{ required: true, state: 'missing', expires_at: null }} country="AT" locale="en" />);
    expect(screen.getByText('No reviewed licence for AT')).toBeInTheDocument();
  });
  it('says when no licence is needed', () => {
    render(<LicenceLine licence={{ required: false, state: 'not_required', expires_at: null }} country="DE" locale="en" />);
    expect(screen.getByText('No licence needed')).toBeInTheDocument();
  });
});
