import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BellPopover } from './BellPopover';

// ─── Partner-Glocke (Canvas A V2) ────────────────────────────────────────────
// Liest die eigene Post (nicht das Betriebsprotokoll), trennt „Needs you" von
// „For your information" nach der Lage, und „Mark all read" geht an /read.

const { fetchPartner, markRead } = vi.hoisted(() => ({ fetchPartner: vi.fn(), markRead: vi.fn().mockResolvedValue(1) }));
vi.mock('../../api/partnerNotifications', async (orig) => ({ ...(await orig<typeof import('../../api/partnerNotifications')>()), fetchPartnerNotifications: () => fetchPartner() }));
vi.mock('../../api/notifications', () => ({ markNotificationsRead: (...a: unknown[]) => markRead(...a) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }) }));

const N = (id: string, type: string, needsAction: boolean, unread = true) => ({
  id, type, payload: {}, createdAt: new Date().toISOString(), unread, needsAction, topic: 'billing', to: 'billing',
});

describe('BellPopover · Partner-Post', () => {
  beforeEach(() => { fetchPartner.mockReset(); markRead.mockClear(); });

  it('zeigt erst, was eine Handlung braucht, dann die Informationen', async () => {
    fetchPartner.mockResolvedValue([N('1', 'booking_created', false), N('2', 'payment_failed', true)]);
    render(<MemoryRouter><BellPopover unread={2} onAllRead={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'bell.aria' }));
    const needs = await screen.findByText('partnerNotif.needsYou');
    const info = screen.getByText('partnerNotif.forInfo');
    const pf = screen.getByText('partnerNotif.payment_failed.title');
    const bc = screen.getByText('partnerNotif.booking_created.title');
    // Reihenfolge im Dokument: Needs you → payment_failed → For your information → booking_created
    expect(needs.compareDocumentPosition(pf) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pf.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(info.compareDocumentPosition(bc) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('ohne Post: der leere Zustand, keine Gruppen', async () => {
    fetchPartner.mockResolvedValue([]);
    render(<MemoryRouter><BellPopover onAllRead={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'bell.aria' }));
    expect(await screen.findByText('partnerNotif.empty')).toBeInTheDocument();
    expect(screen.queryByText('partnerNotif.needsYou')).not.toBeInTheDocument();
  });

  it('„Mark all read" markiert ueber die eigene Post', async () => {
    fetchPartner.mockResolvedValue([N('1', 'booking_created', false)]);
    const onAllRead = vi.fn();
    render(<MemoryRouter><BellPopover unread={1} onAllRead={onAllRead} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'bell.aria' }));
    fireEvent.click(await screen.findByRole('button', { name: 'bell.markAllRead' }));
    await vi.waitFor(() => expect(onAllRead).toHaveBeenCalled());
    expect(markRead).toHaveBeenCalledWith({ all: true });
  });
});
