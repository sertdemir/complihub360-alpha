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
  // Phase 4: die Seite laedt den Bestaetigungstext, bevor sie bucht.
  fetchAcknowledgement: vi.fn().mockResolvedValue({ version: 'booking-ack-v1', language: 'en', body: 'a\n\nb\n\nc', sharedFields: ['email'], userDiscount: { pct: 10, policyVersion: 1 }, lines: ['a', 'b', 'c'] }),
  createBooking: (...a: unknown[]) => createBooking(...a),
  bookingFailureFrom: () => ({ kind: 'generic' }),
}));
// t() gibt den Schluessel zurueck: geprueft wird die Verdrahtung, nicht die Copy.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
}));

function renderPage(extra = '') {
  return render(
    <MemoryRouter initialEntries={[`/en/p/a1b2c3d4e5f6/book?slot=${encodeURIComponent(SLOT)}${extra}`]}>
      <Routes>
        <Route path="/:locale/p/:ref/book" element={<ProviderSchedulePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const HEADING = 'common:states.bookingProcessing.heading';
const MESSAGE = 'common:states.bookingProcessing.message';

// I2 (2026-10-10): der Knopf oeffnet die Pruefung; gebucht wird erst mit
// Haekchen und "Confirm and Book".
async function openReview() {
  const knopf = screen.getByRole('button', { name: /detail\.bookCta/ });
  await waitFor(() => expect(knopf).toBeEnabled());
  fireEvent.click(knopf);
  return knopf;
}
function confirmAndBook() {
  fireEvent.click(screen.getByRole('checkbox', { name: 'common:states.sharingReview.confirmation' }));
  fireEvent.click(screen.getByRole('button', { name: 'common:states.sharingReview.confirmAndBook' }));
}

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
    // Phase 4: der Knopf oeffnet sich erst, wenn die Bestaetigung geladen ist.
    const knopf = await openReview();
    confirmAndBook();

    const status = (await screen.findAllByRole('status')).find((el) => el.textContent?.includes(HEADING));
    expect(status).toHaveTextContent(MESSAGE);
    expect(knopf).toBeDisabled();
  });

  it('bucht ohne Haekchen nicht — der Fehler steht am Haekchen, der Fokus auch', async () => {
    renderPage();
    await openReview();
    fireEvent.click(screen.getByRole('button', { name: 'common:states.sharingReview.confirmAndBook' }));
    expect(createBooking).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('results:sharing.confirmRequired');
    expect(screen.getByRole('checkbox', { name: 'common:states.sharingReview.confirmation' })).toHaveFocus();
  });

  it('nennt im Dialog, was geteilt wird — und das Thema, auch wenn die Seite es vorab nicht kennt', async () => {
    renderPage();
    await openReview();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('results:sharing.fields.email');
    expect(dialog).toHaveTextContent('results:sharing.fields.topic');
    expect(dialog).toHaveTextContent('results:sharing.topicUnspecified');
    expect(screen.getByRole('checkbox', { name: 'common:states.sharingReview.confirmation' })).not.toBeChecked();
  });

  it('nimmt den Zustand nach einem Fehler zurueck und sagt, dass nicht gebucht wurde', async () => {
    createBooking.mockRejectedValue(new Error('500'));
    renderPage();
    await openReview();
    confirmAndBook();

    // F3: der abgenommene Zustand und die Liste, was nicht passiert ist.
    await waitFor(() => expect(screen.getByText('common:states.bookingFailed.heading')).toBeInTheDocument());
    expect(screen.getByText('schedule.fail.list.nothingShared')).toBeInTheDocument();
    expect(screen.queryByText(HEADING)).not.toBeInTheDocument();
  });
});

// Befund Testlauf Phase 4 (2026-10-09): ohne Sitzung rechnet der Server mit
// allen Maerkten des Anbieters. Die Terminseite muss sie mitschicken.
describe('ProviderSchedulePage · Sitzung', () => {
  beforeEach(() => { createBooking.mockReset(); createBooking.mockReturnValue(new Promise(() => {})); });

  it('schickt die Sitzung aus ?session= mit', async () => {
    renderPage('&session=s-123');
    await openReview();
    confirmAndBook();
    await waitFor(() => expect(createBooking).toHaveBeenCalled());
    expect(createBooking.mock.calls[0][2]).toMatchObject({ sessionId: 's-123', acknowledgementVersion: 'booking-ack-v1' });
  });

  it('erfindet keine Sitzung, wenn keine da ist', async () => {
    renderPage();
    await openReview();
    confirmAndBook();
    await waitFor(() => expect(createBooking).toHaveBeenCalled());
    expect(createBooking.mock.calls[0][2].sessionId).toBeUndefined();
  });
});
