import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartnerDrawer } from './PartnerDrawer';
import type { AnonProvider } from '../../api/search';

// ─── Schublade · nicht buchbarer Anbieter ────────────────────────────────────
// Nutzer-Entscheidung 2026-10-01: kein Knopf und keine Termine, wenn der
// Anbieter nicht gebucht werden kann. Die Detailseite hielt sich daran, die
// Schublade nicht (Testlauf Phase 4, 2026-10-09).

const { fetchProviderDetail, fetchSlots, fetchAcknowledgement } = vi.hoisted(() => ({
  fetchProviderDetail: vi.fn(),
  fetchSlots: vi.fn(),
  fetchAcknowledgement: vi.fn(),
}));

vi.mock('../../api/bookings', () => ({
  fetchProviderDetail: (...a: unknown[]) => fetchProviderDetail(...a),
  fetchSlots: (...a: unknown[]) => fetchSlots(...a),
  fetchAcknowledgement: (...a: unknown[]) => fetchAcknowledgement(...a),
  createBooking: vi.fn(),
  bookingFailureFrom: () => ({ kind: 'generic' }),
  newBookingRequestId: () => 'req-test-00000001',
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

const PROVIDER = {
  public_ref: 'a1b2c3d4e5f6', title: 'Verified Provider A', letter: 'A', descriptor: 'Tax and VAT · Norditalien',
  region: null, active_since: 2015, specializations: [], languages: [], rating: null, completed_count: null,
  avg_response_hours: 3, billing_model: 'project', is_verified: true, match: 100, match_tier: 'high',
} as unknown as AnonProvider;

const DETAIL = { services: [], excluded_services: [], markets: [], languages: [], work_mode: null, credentials: [], pricing_table: [] };

function renderDrawer() {
  return render(
    <MemoryRouter>
      <PartnerDrawer open onClose={() => {}} provider={PROVIDER} />
    </MemoryRouter>,
  );
}

describe('PartnerDrawer · Buchbarkeit', () => {
  beforeEach(() => {
    fetchProviderDetail.mockReset();
    fetchSlots.mockReset().mockResolvedValue([]);
    fetchAcknowledgement.mockReset().mockResolvedValue(null);
  });

  it('ohne Zahlungsbereitschaft: Hinweis statt Buchungsknopf', async () => {
    fetchProviderDetail.mockResolvedValue({ ...DETAIL, bookable_chargeable: false });
    renderDrawer();
    expect(await screen.findByText('detail.notBookableNote')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /detail\.bookCta/ })).not.toBeInTheDocument();
  });

  it('buchbar: der Knopf bleibt', async () => {
    fetchProviderDetail.mockResolvedValue({ ...DETAIL, bookable_chargeable: true });
    renderDrawer();
    expect(await screen.findByRole('button', { name: /detail\.bookCta/ })).toBeInTheDocument();
    expect(screen.queryByText('detail.notBookableNote')).not.toBeInTheDocument();
  });
});

// ─── Regel V2 (11.10.2026) · Termin waehlen ──────────────────────────────────
// Der Knopf war gesperrt, solange kein Termin gewaehlt war. Jetzt bleibt er
// aktiv: ein Klick ohne Termin sagt es an der Terminliste (role="alert") und
// setzt den Fokus auf den ersten Termin. Gesperrt bleibt er nur, solange die
// Bestaetigung laedt — das ist ein Ladezustand, kein Pruefergebnis.
describe('PartnerDrawer · Termin waehlen (V2)', () => {
  const SLOT = '2026-10-01T09:00:00.000Z';
  const ACK = { version: 'booking-ack-v1', language: 'en', body: 'a', sharedFields: ['email'], userDiscount: { pct: 10, policyVersion: 1 }, lines: ['a'] };

  beforeEach(() => {
    fetchProviderDetail.mockReset().mockResolvedValue({ ...DETAIL, bookable_chargeable: true });
    fetchSlots.mockReset().mockResolvedValue([SLOT]);
    fetchAcknowledgement.mockReset().mockResolvedValue(ACK);
  });

  async function toTermin() {
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: /detail\.bookCta/ }));
    // Im Termin-Schritt steht der Knopf erneut — aktiv, sobald die Bestaetigung da ist.
    const knopf = screen.getByRole('button', { name: /detail\.bookCta/ });
    await waitFor(() => expect(knopf).toBeEnabled());
    return knopf;
  }

  it('ohne Termin: Satz an der Terminliste, Fokus auf dem ersten Termin, keine Pruefung', async () => {
    const knopf = await toTermin();
    fireEvent.click(knopf);

    expect(screen.getByRole('alert')).toHaveTextContent('shared.pickSlotError');
    const gruppe = screen.getByRole('group', { name: 'schedule.title' });
    expect(gruppe).toHaveAttribute('aria-invalid', 'true');
    expect(gruppe).toHaveAttribute('aria-describedby', 'partner-slots-error');
    expect(gruppe.querySelector('button')).toHaveFocus();
    expect(screen.queryByRole('dialog', { name: /sharingReview/ })).not.toBeInTheDocument();
  });

  it('mit Termin verschwindet der Satz', async () => {
    const knopf = await toTermin();
    fireEvent.click(knopf);
    const gruppe = screen.getByRole('group', { name: 'schedule.title' });
    fireEvent.click(gruppe.querySelector('button')!);
    expect(screen.queryByText('shared.pickSlotError')).not.toBeInTheDocument();
  });

  it('solange die Bestaetigung laedt, bleibt der Knopf gesperrt (Ladezustand)', async () => {
    fetchAcknowledgement.mockReset().mockReturnValue(new Promise(() => {}));
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: /detail\.bookCta/ }));
    expect(screen.getByRole('button', { name: /detail\.bookCta/ })).toBeDisabled();
  });
});

// Beta-Testbuchung 23.10.2026: Karte "3 of 5", Schublade "5/7" — die Detail-
// Antwort zaehlt ueber alle Maerkte, die Suche nur den angefragten.
describe('PartnerDrawer · Nachweise wie auf der Karte', () => {
  const basis = (v: number, r: number) => ({
    verification: 'partial', verified_count: v, required_count: r, response_hours: null, confirmation_rate: null,
    rating: null, reviews_count: null, completed: null, bookings: null, incidents: null, window_days: null, neutral: [],
  });

  it('zeigt die Zahl aus der Suche, nicht die aus der Detail-Antwort', async () => {
    fetchProviderDetail.mockReset().mockResolvedValue({ ...DETAIL, rank_basis: basis(5, 7) });
    fetchSlots.mockReset().mockResolvedValue([]);
    fetchAcknowledgement.mockReset().mockResolvedValue(null);
    render(
      <MemoryRouter>
        <PartnerDrawer open onClose={() => {}} provider={{ ...PROVIDER, rank_basis: basis(3, 5) } as unknown as AnonProvider} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(fetchProviderDetail).toHaveBeenCalled());
    expect(await screen.findByText('3/5')).toBeInTheDocument();
    expect(screen.queryByText('5/7')).not.toBeInTheDocument();
  });

  // Beta-Testbuchung 23.10.2026: "Plan or payment · never" mit Strich las sich
  // wie ein fehlender Nachweis. Jetzt ein Satz mit Haken, ohne Wert daneben.
  it('Tarif-Zeile als Satz mit Haken, ohne "never"', async () => {
    fetchProviderDetail.mockReset().mockResolvedValue({ ...DETAIL, rank_basis: basis(3, 5) });
    fetchSlots.mockReset().mockResolvedValue([]);
    fetchAcknowledgement.mockReset().mockResolvedValue(null);
    render(
      <MemoryRouter>
        <PartnerDrawer open onClose={() => {}} provider={{ ...PROVIDER, rank_basis: basis(3, 5) } as unknown as AnonProvider} />
      </MemoryRouter>,
    );
    const zeile = (await screen.findByText('rankBasis.planIndependent')).closest('li')!;
    expect(zeile).toHaveTextContent('✓');
    expect(screen.queryByText('rankBasis.never')).not.toBeInTheDocument();
  });
});

// ─── Handover 1.0 §5 · "Book a Consultation" ─────────────────────────────────
// Der Knopf auf der Karte oeffnet die Schublade direkt im Termin-Schritt. Ist
// der Anbieter nicht buchbar, faellt sie ins Profil zurueck, das den Grund nennt.
describe('PartnerDrawer · startAt', () => {
  beforeEach(() => {
    fetchSlots.mockReset().mockResolvedValue([]);
    fetchAcknowledgement.mockReset().mockResolvedValue(null);
  });

  it('startAt="termin": die Terminwahl steht sofort', async () => {
    fetchProviderDetail.mockReset().mockResolvedValue({ ...DETAIL, bookable_chargeable: true });
    render(<MemoryRouter><PartnerDrawer open onClose={() => {}} provider={PROVIDER} startAt="termin" /></MemoryRouter>);
    expect(await screen.findByRole('group', { name: 'schedule.title' })).toBeInTheDocument();
  });

  it('nicht buchbar: zurueck ins Profil mit dem Hinweis, keine Terminwahl', async () => {
    fetchProviderDetail.mockReset().mockResolvedValue({ ...DETAIL, bookable_chargeable: false });
    render(<MemoryRouter><PartnerDrawer open onClose={() => {}} provider={PROVIDER} startAt="termin" /></MemoryRouter>);
    expect(await screen.findByText('detail.notBookableNote')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'schedule.title' })).not.toBeInTheDocument();
  });
});
