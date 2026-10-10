import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import { Button, outlineBrandClass } from '../ui/Button';
import type { BookingAcknowledgement, BookingFailure } from '../../api/bookings';

// ─── Bestaetigung vor der Buchung (Phase 4, Canvas-Wahl 1B) ──────────────────
// Je Absatz der Fassung eine Zeile mit Haken, sichtbar, bevor die Hand zum
// Knopf geht. DNA: „offen genannt" woertlich — was fliesst, dass der Anbieter
// nachfassen darf (auch wenn der Nutzer schweigt), dass die Buchung nichts
// kostet.
//
// Seit 2026-10-10 (Canvas-Wahl I2, Checklist v1.0) ist der Klick NICHT mehr
// die Bestaetigung: der Knopf oeffnet die Pruefung "Review what will be
// shared" mit einem eigenen Haekchen (SharingReview.tsx). 1B galt bis dahin
// bewusst ohne Checkbox; die Checkliste verlangt eine.

export function AcknowledgementList({ ack, className = '' }: { ack: BookingAcknowledgement | null; className?: string }) {
  const { t } = useTranslation('results');
  if (!ack) {
    return <p className={`text-body-3xs text-fg-tertiary ${className}`}>{t('schedule.ackLoading')}</p>;
  }
  return (
    <ul className={`flex flex-col gap-2.5 ${className}`} aria-label={t('schedule.ackLabel')}>
      {ack.lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <Check size={15} strokeWidth={2.4} className="mt-[3px] shrink-0 text-fg-brand" aria-hidden />
          <span className="text-body-3xs leading-relaxed text-fg-secondary">{line}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Nicht gebucht (F3, EN-Launch Schritt 2) ─────────────────────────────────
// Figma 3634:3181, abgenommen 09.10.2026; loest Canvas-Wahl 2A ab. Der
// abgenommene Zustand (Checklist v1.0 "Booking failed") gilt fuer jeden Grund:
// jeder Fehler der Buchungs-API liegt vor dem Insert, und der Insert ist das
// Teilen. Darunter als Liste, was NICHT passiert ist — das ist die Nachricht,
// die zaehlt. Der Grund steht als eine Zeile, wo er dem Nutzer etwas sagt
// (Termin weg, Fassung neu, Anbieter-Seite); die Aktion folgt dem Grund.
// Neutraler Kasten, kein Rot: dem Nutzer ist nichts passiert. Keine Schuld
// auf keiner Seite (DNA).

export function BookingFailureCard({ failure, onOtherProvider, onRetry, onReread, onPickSlot }: {
  failure: BookingFailure;
  /** Schliesst die Schublade und laesst die Liste stehen; fehlt er (eigene Seite), bleibt nur „erneut". */
  onOtherProvider?: () => void;
  onRetry: () => void;
  /** Fassung veraltet: Text neu laden, Zustand zuruecknehmen. */
  onReread: () => void;
  /** Slot vergeben: Termine neu laden, Auswahl loeschen. */
  onPickSlot: () => void;
}) {
  const { t, i18n } = useTranslation(['results', 'common']);
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';
  const k = failure.kind;
  const reason = k === 'slot_taken' ? t('schedule.fail.slot_taken.title')
    : k === 'acknowledgement_outdated' ? t('schedule.fail.acknowledgement_outdated.title')
    : k === 'not_completed' ? t('schedule.fail.reasonProvider')
    : null;
  const primary = k === 'slot_taken' ? { label: t('schedule.fail.pickOtherSlot'), onClick: onPickSlot }
    : k === 'acknowledgement_outdated' ? { label: t('schedule.fail.reread'), onClick: onReread }
    : k === 'not_completed' && onOtherProvider ? { label: t('schedule.fail.otherProvider'), onClick: onOtherProvider }
    : { label: t('common:states.actions.tryAgain'), onClick: onRetry };
  return (
    <div role="status" className="rounded-xl border border-stroke bg-surface px-[18px] py-4">
      <p className="flex items-center gap-2.5 text-body-sm font-bold text-fg">
        <Info size={16} className="shrink-0 text-fg-secondary" aria-hidden />
        {t('common:states.bookingFailed.heading')}
      </p>
      {reason && <p className="mt-1.5 text-body-3xs font-semibold leading-relaxed text-fg">{reason}</p>}
      <p className="mt-1.5 text-body-3xs leading-relaxed text-fg-secondary">{t('common:states.bookingFailed.message')}</p>
      <ul className="mt-3 flex flex-col gap-1.5 rounded-lg bg-brand-light px-3.5 py-3">
        {(['noBooking', 'nothingShared', 'kept'] as const).map((x) => (
          <li key={x} className="flex items-center gap-2 text-body-3xs text-fg">
            <Check size={14} strokeWidth={2.4} className="shrink-0 text-fg-brand" aria-hidden />
            {t(`schedule.fail.list.${x}`)}
          </li>
        ))}
      </ul>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button size="sm" type="button" onClick={primary.onClick}>{primary.label}</Button>
        <Button size="sm" variant="outline" className={outlineBrandClass} type="button" onClick={() => navigate(`/${locale}/contact`)}>
          {t('common:states.actions.contactSupport')}
        </Button>
      </div>
    </div>
  );
}
