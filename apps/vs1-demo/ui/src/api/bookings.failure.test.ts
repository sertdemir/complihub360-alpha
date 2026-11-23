import { describe, it, expect } from 'vitest';
import { ApiError } from './client';
import { bookingFailureFrom } from './bookings';

// ─── Warum eine Buchung nicht zustande kam ───────────────────────────────────
// Die Oberflaeche unterscheidet nur die Faelle, in denen der Nutzer etwas
// anderes tun kann. Neu am 23.11.2026: die fehlende Beta-Vereinbarung
// (409 AGREEMENT_REQUIRED) — das Netz hinter dem Gate.

const err = (errorCode: string, extra: Record<string, unknown> = {}) => new ApiError('nope', 409, 'corr-1', undefined, { errorCode, ...extra });

describe('bookingFailureFrom', () => {
  it('AGREEMENT_REQUIRED: eigene Art, mit der geltenden Fassung', () => {
    expect(bookingFailureFrom(err('AGREEMENT_REQUIRED', { agreement: 'beta', current_version: 'beta-2026-11' })))
      .toEqual({ kind: 'agreement_required', currentVersion: 'beta-2026-11' });
  });

  it('AGREEMENT_REQUIRED ohne Fassung bleibt dieselbe Art', () => {
    expect(bookingFailureFrom(err('AGREEMENT_REQUIRED'))).toEqual({ kind: 'agreement_required', currentVersion: null });
  });

  it('die bestehenden Arten bleiben, was sie waren', () => {
    expect(bookingFailureFrom(err('ACKNOWLEDGEMENT_OUTDATED', { current_version: 'booking-ack-v2' }))).toEqual({ kind: 'acknowledgement_outdated', currentVersion: 'booking-ack-v2' });
    expect(bookingFailureFrom(err('SLOT_TAKEN'))).toEqual({ kind: 'slot_taken' });
    expect(bookingFailureFrom(err('PROVIDER_PAUSED'))).toEqual({ kind: 'not_completed' });
    expect(bookingFailureFrom(err('SOMETHING_ELSE'))).toEqual({ kind: 'generic' });
    expect(bookingFailureFrom(new Error('offline'))).toEqual({ kind: 'generic' });
  });
});
