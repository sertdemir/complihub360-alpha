import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hilfe-Drawer · Ticket (V2, 11.10.2026) ──────────────────────────────────
// Ein Eingabefeld (die Nachricht): keine Zusammenfassung, der Satz steht am
// Feld (role="alert"), der Fokus geht hinein, der Knopf bleibt aktiv. Fehlt
// die Absender-Adresse, ist das ein Zustand: Knopf gesperrt, Grund daneben.

const h = vi.hoisted(() => ({ sendContact: vi.fn(), user: { email: 'p@firm.example' } as { email?: string } | null }));
vi.mock('../../api/contact', async (orig) => ({ ...(await orig<typeof import('../../api/contact')>()), sendContact: (...a: unknown[]) => h.sendContact(...a) }));
vi.mock('../../api/provider', () => ({
  fetchMyProvider: () => Promise.resolve({ name: 'Studio' }),
  fetchCoverage: () => Promise.resolve({ contact_email: null }),
}));
vi.mock('../../api/requests', () => ({ fetchProviderRequests: () => Promise.resolve([]) }));
vi.mock('../../store/useAuthStore', () => ({ useAuthStore: () => ({ user: h.user }) }));
vi.mock('../../lib/requestContext', () => ({ useRequestContext: () => ({ kontext: () => '' }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }) }));

import { HelpDrawer } from './ProviderDrawers';

const drawer = () => render(<MemoryRouter><HelpDrawer open onClose={() => {}} /></MemoryRouter>);
const send = () => screen.getByRole('button', { name: 'helpDrawer.send' });
const message = () => document.getElementById('help-message') as HTMLTextAreaElement;

describe('HelpDrawer · V2', () => {
  beforeEach(() => { h.sendContact.mockReset(); h.user = { email: 'p@firm.example' }; });

  it('zu kurze Nachricht: Satz am Feld, Fokus hinein, nichts geht ab', () => {
    drawer();
    expect(send()).toBeEnabled();
    fireEvent.change(message(), { target: { value: 'kurz' } });
    fireEvent.click(send());

    expect(screen.getByRole('alert')).toHaveTextContent('helpDrawer.messageTooShort');
    expect(message()).toHaveAttribute('aria-invalid', 'true');
    expect(message()).toHaveAttribute('aria-describedby', 'help-message-error');
    expect(message()).toHaveFocus();
    expect(h.sendContact).not.toHaveBeenCalled();
    // Ein Feld: keine Zusammenfassung.
    expect(screen.queryByText('common:states.formErrorSummary.heading')).not.toBeInTheDocument();
    expect(send()).toBeEnabled();
  });

  it('mit ausreichender Nachricht geht das Ticket ab', async () => {
    h.sendContact.mockResolvedValue({ reference: 'R-1', acknowledged: true });
    drawer();
    fireEvent.change(message(), { target: { value: 'Der Kalender laedt nicht.' } });
    fireEvent.click(send());
    await waitFor(() => expect(h.sendContact).toHaveBeenCalledWith(expect.objectContaining({ lane: 'partner', email: 'p@firm.example' })));
    expect(await screen.findByText('helpDrawer.sentTitle')).toBeInTheDocument();
  });

  it('ohne Absender-Adresse ist Senden ein gesperrter Zustand — mit Grund daneben', async () => {
    h.user = null;
    drawer();
    await waitFor(() => expect(screen.getByText('helpDrawer.noEmail')).toBeInTheDocument());
    expect(send()).toBeDisabled();
    expect(send()).toHaveAttribute('aria-describedby', 'help-no-sender');
  });
});
