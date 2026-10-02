import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button } from '../ui/Button';
import type { BookingAcknowledgement, BookingFailure } from '../../api/bookings';

// ─── Bestaetigung vor der Buchung (Phase 4, Canvas-Wahl 1B) ──────────────────
// Die Bestaetigung IST der Text: je Absatz der Fassung eine Zeile mit Haken,
// immer sichtbar, direkt ueber dem Button. Keine Checkbox — der Klick auf
// „Verbindlich buchen" ist die Bestaetigung, die Zeile unter dem Button sagt
// das und nennt die Fassung. DNA: „offen genannt" woertlich — was fliesst,
// dass der Anbieter nachfassen darf (auch wenn der Nutzer schweigt), dass die
// Buchung nichts kostet. Lesbar, bevor die Hand zum Button geht.

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

/** Die Zeile unter dem Button: Fassung und gewaehlter Termin. */
export function AcknowledgementFooterLine({ ack, slotLine, className = '' }: { ack: BookingAcknowledgement | null; slotLine: string | null; className?: string }) {
  const { t } = useTranslation('results');
  // „booking-ack-v1" ist die Kennung des Servers; der Nutzer liest „v1".
  const parts = [
    ack ? t('schedule.ackConfirmLine', { count: ack.lines.length, version: ack.version.replace(/^booking-ack-/, '') }) : null,
    slotLine,
  ].filter(Boolean);
  return <p className={`text-center text-body-3xs text-fg-tertiary ${className}`}>{parts.join(' · ')}</p>;
}

// ─── Nicht gebucht (Phase 4, Canvas-Wahl 2A) ─────────────────────────────────
// Der Button weicht einem neutralen grauen Kasten — kein Rot, denn dem Nutzer
// ist nichts passiert. Drei Saetze: was, warum nicht er, was jetzt gilt. Zwei
// Wege: zurueck in die Liste oder bleiben. Slot-Chips und Nachricht bleiben
// stehen. Dasselbe Muster fuer SLOT_TAKEN und ACKNOWLEDGEMENT_OUTDATED, mit
// anderem Satz. Kein Decline-Code, keine Schuld auf keiner Seite (DNA).

export function BookingFailureCard({ failure, onOtherProvider, onRetry, onReread, onPickSlot }: {
  failure: BookingFailure;
  /** Schliesst die Schublade und laesst die Liste stehen; fehlt er (eigene Seite), bleibt nur „spaeter erneut". */
  onOtherProvider?: () => void;
  onRetry: () => void;
  /** Fassung veraltet: Text neu laden, Zustand zuruecknehmen. */
  onReread: () => void;
  /** Slot vergeben: Termine neu laden, Auswahl loeschen. */
  onPickSlot: () => void;
}) {
  const { t } = useTranslation('results');
  const k = failure.kind;
  const title = t(`schedule.fail.${k}.title`);
  const body = t(`schedule.fail.${k}.body`);
  return (
    <div role="status" className="rounded-xl border border-stroke bg-surface-secondary px-4 py-3.5">
      <p className="text-body-xs font-bold text-fg">{title}</p>
      <p className="mt-1.5 text-body-3xs leading-relaxed text-fg-secondary">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {k === 'not_completed' && onOtherProvider && (
          <Button size="sm" variant="secondary" type="button" onClick={onOtherProvider}>{t('schedule.fail.otherProvider')}</Button>
        )}
        {k === 'not_completed' && (
          <Button size="sm" variant={onOtherProvider ? 'ghost' : 'secondary'} type="button" onClick={onRetry}>{t('schedule.fail.retryLater')}</Button>
        )}
        {k === 'slot_taken' && (
          <Button size="sm" variant="secondary" type="button" onClick={onPickSlot}>{t('schedule.fail.pickOtherSlot')}</Button>
        )}
        {k === 'acknowledgement_outdated' && (
          <Button size="sm" variant="secondary" type="button" onClick={onReread}>{t('schedule.fail.reread')}</Button>
        )}
        {k === 'generic' && (
          <Button size="sm" variant="secondary" type="button" onClick={onRetry}>{t('schedule.fail.retryNow')}</Button>
        )}
      </div>
      <p className="mt-2.5 text-body-3xs text-fg-tertiary">{t('schedule.fail.keepNote')}</p>
    </div>
  );
}
