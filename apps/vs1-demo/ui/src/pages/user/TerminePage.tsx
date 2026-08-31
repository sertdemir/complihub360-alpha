import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { fetchUserBookings, cancelBooking, markOutcome, providerWebsiteHref, type UserBooking, type BookingStatus } from '../../api/bookings';
import { ReviewDrawer, type ReviewTarget } from '../../components/user/ReviewDrawer';
import { RescheduleDrawer, type RescheduleTarget } from '../../components/user/RescheduleDrawer';
import { ConfirmDrawer, type ConfirmSpec } from '../../components/provider/ConfirmDrawer';
import { EmptyState } from '../../components/user/EmptyState';

// ─── User Dashboard · Termine (bookings) ─────────────────────────────────────
// Mirrors the Figma "User · Termine / Buchungen v2" screen: the booking IS the
// paid lead — provider identity is visible from booking time (v2 §5 stage 3).
// Replaces the retired engagement-request center as the primary nav item.
// Live rows come from GET /api/v1/bookings.

interface Row {
  id: string;
  // Die rohen Zeitpunkte bleiben an der Zeile. Die .ics-Datei braucht sie —
  // sie aus den formatierten Anzeigezeilen zurueckzulesen waere Unsinn.
  slotStartIso: string;
  slotEndIso: string | null;
  dateLine: string;   // "Mo, 12. Aug 2026"
  timeLine: string;   // "10:00–10:30 · Video-Call"
  provider: string;   // clear name — revealed at booking
  providerKey: string;
  website: string | null;  // affiliate 1b — post-booking reveal only
  meta: string;
  status: BookingStatus;
  needsOutcome?: boolean; // slot passed, outcome not recorded (watchdog §1)
}


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
      slotStartIso: b.slotStart,
      slotEndIso: b.slotEnd,
      dateLine: df.format(start),
      timeLine: `${tf.format(start)}${end ? `–${tf.format(end)}` : ''} · Video-Call`,
      provider: b.providerName + (b.providerRegion ? ` — ${b.providerRegion}` : ''),
      providerKey: b.providerKey,
      website: b.providerWebsite,
      meta: b.message || '—',
      status: b.status,
      needsOutcome: b.status === 'confirmed' && start.getTime() < Date.now(),
    };
  });
}

// Client-side .ics so the card action is real without a mail roundtrip.
//
// Bis 2026-08-31 fehlten DTSTART, DTEND, UID und DTSTAMP — die eine Aktion,
// deren ganzer Zweck das Datum ist, trug keins. Kalender wiesen das VEVENT ab
// oder legten einen Eintrag ohne Zeit an; der Knopf hat nie funktioniert.
// RFC 5545: Zeitpunkte als UTC-Instants (…Z), Text mit \\ \; \, und
// Zeilenumbruechen als \n maskiert statt plattgeklopft.
export const icsUtc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
export const icsEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function icsHref(r: Pick<Row, 'id' | 'slotStartIso' | 'slotEndIso' | 'provider' | 'meta'>): string {
  const start = icsUtc(r.slotStartIso);
  // Ohne Ende waere der Eintrag punktfoermig; 30 Minuten sind die Slot-Laenge
  // der Buchungsstrecke (POST /scheduling setzt slot_end genauso).
  const end = icsUtc(r.slotEndIso ?? new Date(new Date(r.slotStartIso).getTime() + 30 * 60 * 1000).toISOString());
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CompliHub360//Termine//DE', 'BEGIN:VEVENT',
    `UID:${r.id}@complihub360.com`,
    `DTSTAMP:${icsUtc(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEsc(`CompliHub360 Erstgespräch — ${r.provider}`)}`,
    `DESCRIPTION:${icsEsc(r.meta)}`,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function TerminePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  // Kein Fixture-Rueckfall mehr (Befund 2026-08-30): useApiData behielt bei
  // einem leeren Ergebnis die Fixture, und ein neues Konto sah zwei erfundene
  // Termine im September. Die Abschnitts-Leertexte darunter gab es laengst —
  // sie kamen nur nie zum Vorschein.
  const [data, setData] = useState<Row[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchUserBookings()
      .then((b) => { if (alive) setData(toRows(b, locale)); })
      .catch(() => { if (alive) setData([]); });
    return () => { alive = false; };
  }, [locale]);
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, BookingStatus>>({});
  const [reviewFor, setReviewFor] = useState<ReviewTarget | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [rescheduleFor, setRescheduleFor] = useState<RescheduleTarget | null>(null);
  // Optimistic slot overrides after a successful reschedule (id → new ISO).
  const [moved, setMoved] = useState<Record<string, string>>({});
  const df = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const tf = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const rows = (data ?? []).map((r) => {
    if (cancelled.has(r.id)) return { ...r, status: 'cancelled' as BookingStatus, needsOutcome: false };
    if (outcomes[r.id]) return { ...r, status: outcomes[r.id], needsOutcome: false };
    if (moved[r.id]) {
      const start = new Date(moved[r.id]);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return { ...r, slotStartIso: start.toISOString(), slotEndIso: end.toISOString(), dateLine: df.format(start), timeLine: `${tf.format(start)}–${tf.format(end)} · Video-Call`, needsOutcome: false };
    }
    return r;
  });
  const upcoming = rows.filter((r) => r.status === 'confirmed' && !r.needsOutcome);
  const past = rows.filter((r) => r.status !== 'confirmed' || r.needsOutcome);

  // Stornieren fragt nach (Befund 2026-08-31): vorher galt EIN Klick auf
  // einen Textlink, der aussah wie ».ics« daneben — ohne Rueckfrage, ohne
  // Rueckweg, und die Lead-Gebuehr ist bezahlt. Der ConfirmDrawer nennt die
  // Folgen, erst dann laeuft die Absage.
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const onCancel = (r: Row) => {
    setConfirm({
      title: t('termine.cancelConfirmTitle', { provider: r.provider }),
      consequence: t('termine.cancelConfirmBody', { date: `${r.dateLine}, ${r.timeLine}` }),
      confirmLabel: t('termine.cancelConfirmCta'),
      onConfirm: () => {
        setCancelled((s) => new Set(s).add(r.id));
        cancelBooking(r.id).catch(() => {});
      },
    });
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
        {r.website && !r.needsOutcome && (
          // Affiliate 1b: provider website, revealed only post-booking.
          // Routed through the counted outclick endpoint. Hidden in the
          // outcome-open state, where the row's primary action is different.
          <a
            href={providerWebsiteHref(r.providerKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-fg-brand hover:underline"
          >
            {t('termine.website')} ↗
          </a>
        )}
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
            <button type="button" onClick={() => setRescheduleFor({ bookingId: r.id, providerKey: r.providerKey, providerName: r.provider, currentLine: `${r.dateLine} · ${r.timeLine}` })} className="hover:underline">{t('termine.reschedule')}</button>
            {' · '}
            <button type="button" onClick={() => onCancel(r)} className="hover:underline">{t('termine.cancel')}</button>
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
            <Trans t={t} i18nKey="termine.title" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
          </h1>
          <p className="mt-1 text-body-sm text-fg-secondary">{t('termine.sub')}</p>
        </div>
        {data !== null && rows.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={t('termine.emptyTitle')}
            body={t('termine.emptyBody')}
            cta={{ label: t('termine.emptyCta'), onClick: () => navigate(`/${locale}/wizard`) }}
            steps={[
              { title: t('termine.emptyStep1Title'), body: t('termine.emptyStep1Body') },
              { title: t('termine.emptyStep2Title'), body: t('termine.emptyStep2Body') },
              { title: t('termine.emptyStep3Title'), body: t('termine.emptyStep3Body') },
            ]}
          />
        ) : (
        <>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('termine.upcoming')}</p>
        <div className="space-y-2.5">{upcoming.length ? upcoming.map(card) : <p className="text-body-sm text-fg-tertiary">{t('termine.emptyUpcoming')}</p>}</div>
        <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('termine.past')}</p>
        <div className="space-y-2.5">{past.length ? past.map(card) : <p className="text-body-sm text-fg-tertiary">{t('termine.emptyPast')}</p>}</div>
        </>
        )}
      </div>
      <ReviewDrawer target={reviewFor} onClose={() => setReviewFor(null)} onSubmitted={(id) => setReviewed((s) => new Set(s).add(id))} />
      <RescheduleDrawer target={rescheduleFor} onClose={() => setRescheduleFor(null)} onRescheduled={(id, iso) => setMoved((m) => ({ ...m, [id]: iso }))} />
      <ConfirmDrawer
        spec={confirm}
        onClose={() => setConfirm(null)}
        labels={{
          eyebrow: t('termine.cancelConfirmEyebrow'),
          cancel: t('termine.cancelConfirmBack'),
          confirm: t('termine.cancelConfirmCta'),
          fallbackTitle: t('termine.cancel'),
        }}
      />
    </UserShell>
  );
}
