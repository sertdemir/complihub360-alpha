import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type { ConfirmSpec } from '../../components/provider/ConfirmDrawer';

// ─── Partner-Einstellungen ehrlich (Canvas A1 · B2 · C2 · D1, 10.10.2026) ────
// Bis hierher: Firmierung, Bio und Avatar fest im Code, sieben Menuekarten
// (vier ohne Abschnitt), „Pausieren" nur im Browser, „Loeschen" ohne Folge.
// Jeder Test hat seine Gegenprobe: was vorher stand, steht nicht mehr da.

const api = vi.hoisted(() => ({
  fetchCoverage: vi.fn(),
  setAvailability: vi.fn(),
  fetchApplication: vi.fn(),
  sendContact: vi.fn(),
}));

vi.mock('../../api/provider', () => ({
  AVAILABILITY_EVENT: 'ch360:availability',
  fetchCoverage: () => api.fetchCoverage(),
  setAvailability: (s: string) => api.setAvailability(s),
  updateMatchmakingProfile: vi.fn(),
}));
vi.mock('../../api/application', () => ({ fetchApplication: () => api.fetchApplication() }));
vi.mock('../../api/contact', () => ({
  CONTACT_INBOX: null,
  sendContact: (p: unknown) => api.sendContact(p),
  failureOf: (e: { status?: number }) => (e?.status === 503 ? 'unavailable' : 'network'),
}));
vi.mock('../../api/client', () => ({ identityHintFrom: () => null }));
vi.mock('../../components/provider/ProviderShell', () => ({ ProviderShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../components/provider/CalendarPanel', () => ({ CalendarPanel: () => <div>calendar</div> }));
vi.mock('../../components/provider/ChangeEmailDrawer', () => ({ ChangeEmailDrawer: () => null }));
vi.mock('../../components/contact/SendStates', () => ({ InboxAddress: () => null }));
// Der Drawer selbst hat eigene Tests; hier zaehlt, was die Seite ihm uebergibt.
vi.mock('../../components/provider/ConfirmDrawer', () => ({
  ConfirmDrawer: ({ spec, onClose }: { spec: ConfirmSpec | null; onClose: () => void }) => spec && (
    <div role="dialog">
      <p>{spec.consequence}</p>
      <button type="button" onClick={async () => { await spec.onConfirm(); onClose(); }}>{`confirm:${spec.confirmLabel}`}</button>
    </div>
  ),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'de' } }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

import { SettingsPage } from './SettingsPage';

const COVERAGE = { provider_key: 'nordkanzlei', contact_email: 'post@nordkanzlei.example', availability: 'available', pricing_table: [] };
const APPLICATION = { provider: { provider_key: 'nordkanzlei', name: 'Nordkanzlei Partnerschaft mbB', website_url: 'https://nordkanzlei.example' } };

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.fetchCoverage.mockResolvedValue(COVERAGE);
  api.fetchApplication.mockResolvedValue(APPLICATION);
  Element.prototype.scrollIntoView = vi.fn();
});

describe('SettingsPage · B2 · Identitaet aus der Bewerbung', () => {
  it('zeigt Firmierung und Website aus der Bewerbung, nicht die fest eingetragene Kanzlei', async () => {
    render(<SettingsPage />);
    expect(await screen.findByText('Nordkanzlei Partnerschaft mbB')).toBeInTheDocument();
    expect(screen.getByText('https://nordkanzlei.example')).toBeInTheDocument();
    expect(screen.queryByText(/Schmidt & Partner/)).not.toBeInTheDocument();
    expect(screen.queryByText('DC')).not.toBeInTheDocument();
    expect(screen.queryByText(/Steuerberatungskanzlei · Hamburg/)).not.toBeInTheDocument();
  });

  it('sagt, wenn die Bewerbung nicht ladbar ist, und laedt auf Wunsch erneut', async () => {
    api.fetchApplication.mockRejectedValueOnce(new Error('down')).mockResolvedValue(APPLICATION);
    render(<SettingsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'common:states.actions.tryAgain' }));
    expect(await screen.findByText('Nordkanzlei Partnerschaft mbB')).toBeInTheDocument();
  });
});

describe('SettingsPage · A1 · Menue nur auf echte Abschnitte', () => {
  it('nennt sechs Abschnitte, jeder hat ein Ziel auf der Seite', async () => {
    const { container } = render(<SettingsPage />);
    const nav = await screen.findByRole('navigation', { name: 'settings.navLabel' });
    const items = Array.from(nav.querySelectorAll('button')).map((b) => b.textContent);
    expect(items).toEqual(['settings.navCalendar', 'settings.navMatchmaking', 'settings.navAfterBooking', 'settings.navContactEmail', 'settings.navAvailability', 'settings.navWorkspace']);
    for (const id of ['calendar', 'matchmaking', 'after-booking', 'contact-email', 'availability', 'workspace']) {
      expect(container.querySelector(`#settings-${id}`)).not.toBeNull();
    }
    expect(screen.queryByText(/sectionSecurity|sectionTeam|sectionIntegrations/)).not.toBeInTheDocument();
  });
});

describe('SettingsPage · C2 · Pausieren speichert wirklich', () => {
  it('schaltet availability auf ooo und zeigt danach den pausierten Zustand', async () => {
    api.setAvailability.mockResolvedValue(undefined);
    render(<SettingsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'settings.pauseButton' }));
    expect(screen.getByText('settings.pauseConfirmConsequence')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'confirm:settings.pauseConfirmLabel' }));
    await waitFor(() => expect(api.setAvailability).toHaveBeenCalledWith('ooo'));
    expect(await screen.findByText('settings.pausedBannerTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'settings.resume' })).toBeInTheDocument();
  });

  it('meldet ein gescheitertes Speichern und bleibt beim alten Status', async () => {
    api.setAvailability.mockRejectedValue(new Error('500'));
    render(<SettingsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'settings.pauseButton' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm:settings.pauseConfirmLabel' }));
    expect(await screen.findByText('settings.availabilityFailed')).toBeInTheDocument();
    expect(screen.queryByText('settings.pausedBannerTitle')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'settings.pauseButton' })).toBeInTheDocument();
  });

  it('uebernimmt den Zustand aus der Kopfzeile', async () => {
    render(<SettingsPage />);
    await screen.findByRole('button', { name: 'settings.pauseButton' });
    window.dispatchEvent(new CustomEvent('ch360:availability', { detail: 'ooo' }));
    expect(await screen.findByText('settings.pausedBannerTitle')).toBeInTheDocument();
  });
});

describe('SettingsPage · D1 · Loeschung als Anfrage', () => {
  it('schickt die Anfrage an unser Postfach und sagt erst danach, dass sie da ist', async () => {
    api.sendContact.mockResolvedValue({ acknowledged: true });
    render(<SettingsPage />);
    await screen.findByText('Nordkanzlei Partnerschaft mbB');
    expect(screen.queryByText('settings.deleteSent')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'settings.deleteButton' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm:settings.deleteConfirmLabel' }));
    expect(await screen.findByText('settings.deleteSent')).toBeInTheDocument();
    expect(api.sendContact).toHaveBeenCalledWith(expect.objectContaining({
      lane: 'privacy', email: 'post@nordkanzlei.example', name: 'Nordkanzlei Partnerschaft mbB',
      message: expect.stringContaining('nordkanzlei'),
    }));
  });

  it('nicht eingerichtet: kein „ist bei uns", sondern der Grund und erneut senden', async () => {
    api.sendContact.mockRejectedValue({ status: 503 });
    render(<SettingsPage />);
    await screen.findByText('Nordkanzlei Partnerschaft mbB');
    fireEvent.click(await screen.findByRole('button', { name: 'settings.deleteButton' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm:settings.deleteConfirmLabel' }));
    expect(await screen.findByText('settings.deleteFailedTitle')).toBeInTheDocument();
    expect(screen.getByText('settings.deleteFailed.unavailable')).toBeInTheDocument();
    expect(screen.queryByText('settings.deleteSent')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common:contactSend.retry' })).toBeInTheDocument();
  });

  it('ohne bekannte Kontaktadresse ist die Anfrage gesperrt — kein Versand ohne Absender', async () => {
    api.fetchCoverage.mockRejectedValue(new Error('down'));
    render(<SettingsPage />);
    expect(await screen.findByRole('button', { name: 'settings.deleteButton' })).toBeDisabled();
  });
});
