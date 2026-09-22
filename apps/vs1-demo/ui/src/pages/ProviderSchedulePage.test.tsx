import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderSchedulePage } from './ProviderSchedulePage';

// ─── Buchung · abgenommener Zustand "Booking processing" ─────────────────────
// Die Checklist v1.0 gibt fuer die laufende Buchung Ueberschrift und Text vor
// und verlangt dazu: "No action; prevent duplicate submission." Der Wortlaut
// selbst liegt bei `npm run copy:check`; hier geht es nur darum, dass die
// Flaeche ihn waehrend der Anfrage ueberhaupt zeigt — und danach nicht mehr.

// vi.mock wird ueber die Imports gehoben — was die Fabrik braucht, muss mit.
const { SLOT, createBooking } = vi.hoisted(() => ({
  SLOT: '2026-10-01T09:00:00.000Z',
  createBooking: vi.fn(),
}));

vi.mock('../api/bookings', () => ({
  fetchSlots: vi.fn().mockResolvedValue([SLOT]),
  createBooking: (...a: unknown[]) => createBooking(...a),
}));
// t() gibt den Schluessel zurueck: geprueft wird die Verdrahtung, nicht die Copy.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/en/provider/test-kanzlei/book?slot=${encodeURIComponent(SLOT)}`]}>
      <Routes>
        <Route path="/:locale/provider/:key/book" element={<ProviderSchedulePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const HEADING = 'common:states.bookingProcessing.heading';
const MESSAGE = 'common:states.bookingProcessing.message';

describe('ProviderSchedulePage · Booking processing', () => {
  // Geschweifte Klammern mit Absicht: mockReset() gibt die Mock-Funktion
  // zurueck, und eine Funktion als Rueckgabe eines Hooks nimmt vitest als
  // Aufraeumschritt — es ruft also createBooking() auf und wartet auf dessen
  // Promise, die im zweiten Test absichtlich nie aufloest.
  beforeEach(() => {
    createBooking.mockReset();
  });

  it('zeigt den Zustand erst, wenn gebucht wird', () => {
    renderPage();
    expect(screen.queryByText(HEADING)).not.toBeInTheDocument();
  });

  it('zeigt Ueberschrift und Text der Vorlage als Status und sperrt den Knopf', async () => {
    createBooking.mockReturnValue(new Promise(() => {})); // Anfrage bleibt offen
    renderPage();
    const knopf = screen.getByRole('button', { name: 'schedule.confirmCta' });
    fireEvent.click(knopf);

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(HEADING);
    expect(status).toHaveTextContent(MESSAGE);
    expect(knopf).toBeDisabled();
  });

  it('nimmt den Zustand nach einem Fehler zurueck und sagt, dass nicht gebucht wurde', async () => {
    createBooking.mockRejectedValue(new Error('500'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'schedule.confirmCta' }));

    await waitFor(() => expect(screen.getByText('schedule.failed')).toBeInTheDocument());
    expect(screen.queryByText(HEADING)).not.toBeInTheDocument();
  });
});
