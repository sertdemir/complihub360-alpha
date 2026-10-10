import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BookingConfirmedView, useSharedRows } from '../../components/user/SharingReview';
import { readBookingConfirmed } from '../../lib/bookingConfirmed';
import { UserShell } from '../../components/user/UserShell';

// ─── Buchung bestaetigt (E3) ──────────────────────────────────────────────────
// Figma 3634:3117, Canvas-Wahl E3 (09.10.2026): eigene Seite in der Shell,
// links Zustand, Termin und der Anbieter mit Namen, rechts, was geteilt wurde.
// Die Daten kommen aus der Antwort der Buchung (lib/bookingConfirmed). Ohne sie
// — fremder Tab, abgelaufene Sitzung — geht es zu den Terminen, wo die
// Buchung steht; eine leere Bestaetigung waere keine.

export function BookingConfirmedPage() {
  const { id = '', locale = 'en' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const sharedRows = useSharedRows();
  const state = readBookingConfirmed(id, location.state);
  if (!state) return <Navigate to={`/${locale}/dashboard/termine`} replace />;
  const { confirmation, provider, sessionLabel, message } = state;
  const topic = confirmation.booking.topic
    ? { area: confirmation.booking.topic.area_code, markets: confirmation.booking.topic.countries }
    : null;
  // B1: die Bestaetigung zeigt, was die Buchung festgehalten hat — den
  // Schnappschuss vom Server, nicht eine neue Lesung im Browser.
  const snap = confirmation.booking.shared_snapshot ?? null;
  const rows = sharedRows(confirmation.booking.shared_fields ?? ['email', 'company_name', 'message'], {
    message: snap ? snap.message ?? '' : message,
    topic: snap?.topic ? { area: snap.topic.area_code, markets: snap.topic.countries } : topic,
    preview: snap,
  });
  return (
    <UserShell>
    <div className="mx-auto w-full max-w-[1104px] py-6 lg:py-10">
      <BookingConfirmedView
        confirmation={confirmation}
        provider={provider}
        sessionLabel={sessionLabel}
        rows={rows}
        onViewProfile={() => navigate(`/${locale}/p/${confirmation.booking.public_ref}`)}
        onViewBooking={() => navigate(`/${locale}/dashboard/termine`)}
      />
    </div>
    </UserShell>
  );
}
