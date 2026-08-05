import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { useApiData } from '../../lib/useApiData';
import { fetchUserBookings, cancelBooking, markOutcome, type UserBooking, type BookingStatus } from '../../api/bookings';
import { ReviewDrawer, type ReviewTarget } from '../../components/user/ReviewDrawer';

// ─── User Dashboard · Termine (bookings) ─────────────────────────────────────
// Mirrors the Figma "User · Termine / Buchungen v2" screen: the booking IS the
// paid lead — provider identity is visible from booking time (v2 §5 stage 3).
// Replaces the retired engagement-request center as the primary nav item.
// Fixture-first via useApiData; live rows come from GET /api/v1/bookings.

interface Row {
  id: string;
  dateLine: string;   // "Mo, 12. Aug 2026"
  timeLine: string;   // "10:00–10:30 · Video-Call"
  provider: string;   // clear name — revealed at booking
  providerKey: string;
  meta: string;
  status: BookingStatus;
  needsOutcome?: boolean; // slot passed, outcome not recorded (watchdog §1)
}

const FIXTURE: Row[] = [
  { id: 'fx-1', dateLine: 'Mo, 12. Aug 2026', timeLine: '10:00–10:30 · Video-Call', provider: 'Studio Bianchi SRL — Steuerkanzlei, Mailand', providerKey: 'studio-bianchi', meta: 'VAT-Registrierung Italien · Erstgespräch · Dossier geteilt bei Buchung', status: 'confirmed' },
  { id: 'fx-2', dateLine: 'Do, 15. Aug 2026', timeLine: '14:30–15:00 · Video-Call', provider: 'Hartmann Compliance GmbH — Berlin', providerKey: 'hartmann-compliance', meta: 'EPR / Verpackung DE+IT · Erstgespräch', status: 'confirmed' },
  { id: 'fx-4', dateLine: 'Fr, 1. Aug 2026', timeLine: '09:00–09:30 · Video-Call', provider: 'Hartmann Compliance GmbH — Berlin', providerKey: 'hartmann-compliance', meta: 'EPR / Verpackung DE+IT · Termin vorbei — Ergebnis offen', status: 'confirmed', needsOutcome: true },
  { id: 'fx-3', dateLine: 'Di, 29. Jul 2026', timeLine: '11:00–11:30 · Video-Call', provider: 'Studio Bianchi SRL — Steuerkanzlei, Mailand', providerKey: 'studio-bianchi', meta: 'VAT-Registrierung Italien · stattgefunden', status: 'completed' },
];

const STATUS_TONE: Record<BookingStatus, 'success' | 'neutral' | 'error' | 'warning'> = {
  confirmed: 'success', completed: 'neutral', cancelled: 'error', no_show: 'warning',
};

function toRows(bookings: UserBooking[], locale: string): Row[] {
  const df = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const tf = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  return bookings.map((b) => {
    const start = new Date(b.slotStart);
    const end = b.slotEnd ? new Date(b.slotEnd) : null;
    return {
      id: b.id,
      dateLine: df.format(start),
      timeLine: `${tf.format(start)}${end ? `–${tf.format(end)}` : ''} · Video-Call`,
      provider: b.providerName + (b.providerRegion ? ` — ${b.providerRegion}` : ''),
      providerKey: b.providerKey,
      meta: b.message || '—',
      status: b.status,
      needsOutcome: b.status === 'confirmed' && start.getTime() < Date.now(),
    };
  });
}

// Client-side .ics so the card action is real without a mail roundtrip.
function icsHref(r: Row): string {
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CompliHub360//Termine//DE', 'BEGIN:VEVENT',
    `SUMMARY:CompliHub360 Erstgespräch — ${r.provider.replace(/[,;]/g, ' ')}`,
    `DESCRIPTION:${r.meta.replace(/[,;]/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function TerminePage() {
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const { data } = useApiData<Row[]>(async () => toRows(await fetchUserBookings(), locale), FIXTURE);
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, BookingStatus>>({});
  const [reviewFor, setReviewFor] = useState<ReviewTarget | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const rows = data.map((r) => {
    if (cancelled.has(r.id)) return { ...r, status: 'cancelled' as BookingStatus, needsOutcome: false };
    if (outcomes[r.id]) return { ...r, status: outcomes[r.id], needsOutcome: false };
    return r;
  });
  const upcoming = rows.filter((r) => r.status === 'confirmed' && !r.needsOutcome);
  const past = rows.filter((r) => r.status !== 'confirmed' || r.needsOutcome);

  const onCancel = async (id: string) => {
    setCancelled((s) => new Set(s).add(id));
    cancelBooking(id).catch(() => {});
  };
  // Watchdog outcome check (§1/§3): slot passed → "did it take place?".
  const onOutcome = (id: string, status: 'completed' | 'no_show') => {
    setOutcomes((o) => ({ ...o, [id]: status }));
    markOutcome(id, status).catch(() => {});
  };

  const card = (r: Row) => (
    <div key={r.id} className="flex items-center gap-5 rounded-xl border border-stroke bg-surface-secondary/40 px-6 py-4">
      <div className="w-[175px] shrink-0">
        <p className="text-[14px] font-medium text-fg">{r.dateLine}</p>
        <p className="text-[12px] text-fg-tertiary">{r.timeLine}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-fg">{r.provider}</p>
        <p className="truncate text-[12px] text-fg-tertiary">{r.meta}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Tag tone={r.needsOutcome ? 'warning' : STATUS_TONE[r.status]}>
          {r.needsOutcome ? t('termine.status.outcome_open') : t(`termine.status.${r.status}`)}
        </Tag>
        {r.needsOutcome ? (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-fg-secondary">{t('termine.outcomeQuestion')}</span>
            <Button size="sm" variant="secondary" onClick={() => onOutcome(r.id, 'completed')}>{t('termine.outcomeYes')}</Button>
            <Button size="sm" variant="ghost" onClick={() => onOutcome(r.id, 'no_show')}>{t('termine.outcomeNo')}</Button>
          </div>
        ) : r.status === 'confirmed' ? (
          <p className="text-[12px] text-fg-brand">
            <button type="button" className="hover:underline">{t('termine.reschedule')}</button>
            {' · '}
            <button type="button" onClick={() => onCancel(r.id)} className="hover:underline">{t('termine.cancel')}</button>
            {' · '}
            <a href={icsHref(r)} download="complihub-termin.ics" className="hover:underline">.ics</a>
          </p>
        ) : r.status === 'completed' ? (
          reviewed.has(r.id)
            ? <span className="text-[12px] text-fg-brand">{t('termine.reviewed')}</span>
            : <Button variant="accent" size="sm" onClick={() => setReviewFor({ bookingId: r.id, providerKey: r.providerKey, providerName: r.provider })}>{t('termine.review')}</Button>
        ) : r.status === 'no_show' ? (
          <span className="text-[12px] text-fg-tertiary">{t('termine.noShowNote')}</span>
        ) : null}
      </div>
    </div>
  );

  return (
    <UserShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div>
          <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
            <Trans t={t} i18nKey="termine.title" components={{ accent: <span className="text-fg-accent" /> }} />
          </h1>
          <p className="mt-1 text-body-sm text-fg-secondary">{t('termine.sub')}</p>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('termine.upcoming')}</p>
        <div className="space-y-2.5">{upcoming.length ? upcoming.map(card) : <p className="text-body-sm text-fg-tertiary">{t('termine.emptyUpcoming')}</p>}</div>
        <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('termine.past')}</p>
        <div className="space-y-2.5">{past.length ? past.map(card) : <p className="text-body-sm text-fg-tertiary">{t('termine.emptyPast')}</p>}</div>
      </div>
      <ReviewDrawer target={reviewFor} onClose={() => setReviewFor(null)} onSubmitted={(id) => setReviewed((s) => new Set(s).add(id))} />
    </UserShell>
  );
}
