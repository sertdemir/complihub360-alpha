import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SavedProvidersPage } from './SavedProvidersPage';

// ─── Saved Providers · Handover 1.0 §5 "Add to Selection" ────────────────────
// Ehrlich in jedem Zustand: leer, nicht ladbar, nicht mehr verfuegbar.
// Anonym bis zur Buchung; die Liste oeffnet kein Detail (das waere billable).

const { fetchSavedProviders, forgetProvider } = vi.hoisted(() => ({ fetchSavedProviders: vi.fn(), forgetProvider: vi.fn() }));
vi.mock('../../api/savedProviders', () => ({
  fetchSavedProviders: (...a: unknown[]) => fetchSavedProviders(...a),
  forgetProvider: (...a: unknown[]) => forgetProvider(...a),
}));
vi.mock('../../components/user/UserShell', () => ({ UserShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../components/user/PartnerDrawer', () => ({
  PartnerDrawer: ({ open, startAt, provider }: { open: boolean; startAt: string; provider: { title: string } | null }) =>
    open ? <div role="dialog">{`drawer:${startAt}:${provider?.title}`}</div> : null,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
}));

const SAVED = {
  available: true, public_ref: 'a1b2c3d4e5f6', title: 'Verified Provider A', letter: 'A', descriptor: 'Tax and VAT · Berlin',
  area_codes: ['tax-vat'], descriptor_region: 'Berlin', specializations: ['VAT & OSS'], markets: ['DE'], completed_count: 12,
  avg_response_hours: 4, billing_model: 'project', price_range: null, timeline_days: { min: 5, max: 12 },
  saved_at: '2026-10-21T10:00:00Z', session_id: null,
};

const page = () => render(<MemoryRouter><SavedProvidersPage /></MemoryRouter>);

describe('SavedProvidersPage', () => {
  beforeEach(() => { fetchSavedProviders.mockReset(); forgetProvider.mockReset(); });

  it('leer: sagt, wie man merkt, und fuehrt zu den Risk Maps', async () => {
    fetchSavedProviders.mockResolvedValue([]);
    page();
    expect(await screen.findByText('savedProviders.emptyTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'savedProviders.emptyCta' })).toBeInTheDocument();
  });

  it('nicht ladbar: eigener Hinweis mit Wiederholen, keine leere Liste', async () => {
    fetchSavedProviders.mockRejectedValueOnce(new Error('500')).mockResolvedValue([]);
    page();
    expect(await screen.findByText('savedProviders.loadFailedBody')).toBeInTheDocument();
    expect(screen.queryByText('savedProviders.emptyTitle')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'savedProviders.retry' }));
    expect(await screen.findByText('savedProviders.emptyTitle')).toBeInTheDocument();
  });

  it('Liste: anonymer Titel, Buchen oeffnet die Terminwahl, Details das Profil', async () => {
    fetchSavedProviders.mockResolvedValue([SAVED]);
    page();
    expect(await screen.findByText('Verified Provider A')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'card.book' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('drawer:termin:Verified Provider A');
  });

  it('nicht mehr verfuegbar: sagt es und laesst sich entfernen', async () => {
    fetchSavedProviders.mockResolvedValue([{ available: false, public_ref: 'b2c3d4e5f6a1', saved_at: '2026-10-20T10:00:00Z' }]);
    forgetProvider.mockResolvedValue(undefined);
    page();
    expect(await screen.findByText('savedProviders.unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'savedProviders.remove' }));
    await waitFor(() => expect(forgetProvider).toHaveBeenCalledWith('b2c3d4e5f6a1'));
    expect(screen.queryByText('savedProviders.unavailable')).not.toBeInTheDocument();
  });

  it('Entfernen scheitert: der Eintrag kommt zurueck, mit Hinweis', async () => {
    fetchSavedProviders.mockResolvedValue([SAVED]);
    forgetProvider.mockRejectedValue(new Error('500'));
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'savedProviders.remove' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('savedProviders.removeFailed');
    expect(screen.getByText('Verified Provider A')).toBeInTheDocument();
  });

  it('nicht mehr verfuegbar, Entfernen scheitert: Hinweis auch auf dieser Karte', async () => {
    fetchSavedProviders.mockResolvedValue([{ available: false, public_ref: 'b2c3d4e5f6a1', saved_at: '2026-10-20T10:00:00Z' }]);
    forgetProvider.mockRejectedValue(new Error('500'));
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'savedProviders.remove' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('savedProviders.removeFailed');
    expect(screen.getByText('savedProviders.unavailable')).toBeInTheDocument();
  });

  it('ohne Ref kein Entfernen-Knopf, der nur lokal wirken wuerde', async () => {
    fetchSavedProviders.mockResolvedValue([{ available: false, public_ref: null, saved_at: '2026-10-20T10:00:00Z' }]);
    page();
    expect(await screen.findByText('savedProviders.unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'savedProviders.remove' })).not.toBeInTheDocument();
  });

  it('scheitert A, waehrend B geloescht wird, kommt nur A zurueck', async () => {
    const B = { ...SAVED, public_ref: 'f6e5d4c3b2a1', title: 'Verified Provider B', letter: 'B', saved_at: '2026-10-19T10:00:00Z' };
    fetchSavedProviders.mockResolvedValue([SAVED, B]);
    let failA: (e: Error) => void = () => {};
    forgetProvider.mockImplementation((ref: string) => (ref === SAVED.public_ref ? new Promise((_, rej) => { failA = rej; }) : Promise.resolve()));
    page();
    const [removeA, removeB] = await screen.findAllByRole('button', { name: 'savedProviders.remove' });
    fireEvent.click(removeA);
    fireEvent.click(removeB);
    await waitFor(() => expect(forgetProvider).toHaveBeenCalledTimes(2));
    failA(new Error('500'));
    expect(await screen.findByRole('alert')).toHaveTextContent('savedProviders.removeFailed');
    expect(screen.getByText('Verified Provider A')).toBeInTheDocument();
    expect(screen.queryByText('Verified Provider B')).not.toBeInTheDocument();
  });
});
