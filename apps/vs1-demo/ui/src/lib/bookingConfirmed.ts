import type { NavigateFunction } from 'react-router-dom';
import type { BookingConfirmation } from '../api/bookings';

// ─── Buchung bestaetigt (E3) — der Weg auf die eigene Seite ───────────────────
// Die Bestaetigung ist eine eigene Seite (Canvas-Wahl E3, 09.10.2026). Die
// Antwort der Buchung reist im Router-State mit; zusaetzlich liegt sie fuer
// die Dauer des Tabs im sessionStorage, damit ein Neuladen die Seite nicht
// leert. Kein Server-Abruf: die Antwort IST die Quelle (Name, Kontakt, was
// geteilt wurde) — eine zweite Quelle koennte etwas anderes sagen.

export interface BookingConfirmedState {
  confirmation: BookingConfirmation;
  provider: { letter: string; title: string };
  sessionLabel: string | null;
  /** Die Nachricht, wie sie gesendet wurde — sie steht in der geteilten Liste. */
  message: string;
}

const KEY = (id: string) => `ch360_booking_confirmed_${id}`;

export function goToBookingConfirmed(navigate: NavigateFunction, locale: string, state: BookingConfirmedState) {
  try { sessionStorage.setItem(KEY(state.confirmation.booking.id), JSON.stringify(state)); } catch { /* kein Speicher: nur Router-State */ }
  navigate(`/${locale}/dashboard/booking/${state.confirmation.booking.id}`, { state });
}

export function readBookingConfirmed(id: string, routerState: unknown): BookingConfirmedState | null {
  const s = routerState as BookingConfirmedState | null;
  if (s?.confirmation?.booking?.id === id) return s;
  try {
    const raw = sessionStorage.getItem(KEY(id));
    return raw ? (JSON.parse(raw) as BookingConfirmedState) : null;
  } catch {
    return null;
  }
}
