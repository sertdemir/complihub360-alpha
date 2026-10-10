import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Kalender-Abschnitt (Canvas A1 · B3 · C2 · D1) ───────────────────────────

const api = vi.hoisted(() => ({ fetchCalendar: vi.fn(), startCalendarConnect: vi.fn(), disconnectCalendar: vi.fn() }));
vi.mock('../../api/calendar', () => api);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o && 'email' in o ? `${k}|${o.email}` : k), i18n: { resolvedLanguage: 'de' } }),
}));

import { CalendarPanel } from './CalendarPanel';
import { ApiError } from '../../api/client';

let search = '';
function Probe() { search = useLocation().search; return null; }
const onConfirm = vi.fn();
const at = (url = '/de/partner-dashboard/settings') => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/:locale/partner-dashboard/settings" element={<><CalendarPanel onConfirm={onConfirm} /><Probe /></>} /></Routes>
  </MemoryRouter>,
);
const assign = vi.fn();

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  onConfirm.mockReset();
  assign.mockReset();
  Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true });
});

describe('CalendarPanel', () => {
  it('nicht verbunden: sagt, was wir tun, nennt Nylas, startet die Anmeldung', async () => {
    api.fetchCalendar.mockResolvedValue({ configured: true, connected: false, email: null });
    api.startCalendarConnect.mockResolvedValue('https://api.eu.nylas.com/v3/connect/auth?state=x');
    at();
    expect(await screen.findByText('settings.calendar.body')).toBeInTheDocument();
    expect(screen.getByText('settings.calendar.nylasNote')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /settings\.calendar\.connect/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://api.eu.nylas.com/v3/connect/auth?state=x'));
    expect(api.startCalendarConnect).toHaveBeenCalledWith('de');
  });

  it('verbunden: Adresse, Trennen nur ueber die Bestaetigung', async () => {
    api.fetchCalendar.mockResolvedValue({ configured: true, connected: true, email: 'k@x.de' });
    api.disconnectCalendar.mockResolvedValue(undefined);
    at();
    expect(await screen.findByText('settings.calendar.connectedAs|k@x.de')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'settings.calendar.disconnect' }));
    expect(api.disconnectCalendar).not.toHaveBeenCalled();
    const spec = onConfirm.mock.calls[0][0];
    expect(spec).toMatchObject({ title: 'settings.calendar.confirmTitle', consequence: 'settings.calendar.confirmConsequence' });
    await spec.onConfirm();
    expect(api.disconnectCalendar).toHaveBeenCalled();
  });

  it('nicht eingerichtet: kein Knopf; 503 beim Start schaltet dorthin um', async () => {
    api.fetchCalendar.mockResolvedValue({ configured: false, connected: false, email: null });
    at();
    expect(await screen.findByText('settings.calendar.unavailableTitle')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /settings\.calendar\.connect/ })).not.toBeInTheDocument();
  });

  it('503 beim Start: „Noch nicht verfuegbar“ statt Fehler', async () => {
    api.fetchCalendar.mockResolvedValue({ configured: true, connected: false, email: null });
    api.startCalendarConnect.mockRejectedValue(new ApiError('nope', 503, 'ref'));
    at();
    fireEvent.click(await screen.findByRole('button', { name: /settings\.calendar\.connect/ }));
    expect(await screen.findByText('settings.calendar.unavailableTitle')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('Status nicht ladbar: Satz und Erneut versuchen', async () => {
    api.fetchCalendar.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ configured: true, connected: false, email: null });
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'settings.calendar.retry' }));
    expect(await screen.findByText('settings.calendar.body')).toBeInTheDocument();
  });

  it('Rueckkehr: Meldung im Abschnitt, Parameter weg aus der URL', async () => {
    api.fetchCalendar.mockResolvedValue({ configured: true, connected: true, email: 'k@x.de' });
    at('/de/partner-dashboard/settings?calendar=connected');
    expect(await screen.findByText('settings.calendar.returnedOkTitle')).toBeInTheDocument();
    await waitFor(() => expect(search).toBe(''));
  });

  it('Rueckkehr gescheitert: Meldung, und der Weg zum Verbinden bleibt', async () => {
    api.fetchCalendar.mockResolvedValue({ configured: true, connected: false, email: null });
    at('/de/partner-dashboard/settings?calendar=failed');
    expect(await screen.findByText('settings.calendar.returnedFailTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings\.calendar\.connect/ })).toBeInTheDocument();
  });
});
