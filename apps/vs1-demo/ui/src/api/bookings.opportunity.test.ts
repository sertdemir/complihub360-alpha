import { describe, it, expect, vi } from 'vitest';

// Ohne Sitzung schickt die Buchung Bereich und Markt der Suche mit — sonst
// berechnet der Server alle Maerkte des Angebots (Testlauf Phase 4, 2026-10-09).
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('./client', async (orig) => ({ ...(await orig<typeof import('./client')>()), apiFetch }));

import { createBooking } from './bookings';

describe('createBooking · Opportunity', () => {
  it('traegt Bereich und Maerkte, wenn keine Sitzung da ist', async () => {
    await createBooking('a1b2c3d4e5f6', '2026-10-12T09:00:00.000Z', { acknowledgementVersion: 'booking-ack-v1', areaCode: 'tax-vat', countries: ['DE'] });
    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ area_code: 'tax-vat', countries: ['DE'] });
    expect(body.session_id).toBeUndefined();
  });

  it('laesst beides weg, wenn es fehlt', async () => {
    apiFetch.mockClear();
    await createBooking('a1b2c3d4e5f6', '2026-10-12T09:00:00.000Z', { acknowledgementVersion: 'booking-ack-v1', sessionId: 's1', countries: [] });
    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body.session_id).toBe('s1');
    expect('area_code' in body || 'countries' in body).toBe(false);
  });
});
