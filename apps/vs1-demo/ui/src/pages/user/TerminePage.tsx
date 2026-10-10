import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CalendarPlus } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { useWizardDrawer } from '../../components/user/WizardDrawer';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { fetchUserBookings, cancelBooking, markOutcome, disputeNoShow, providerWebsiteHref, type UserBooking, type BookingStatus, type BookingAttendance } from '../../api/bookings';
import { ReviewDrawer, type ReviewTarget } from '../../components/user/ReviewDrawer';
import { RescheduleDrawer, type RescheduleTarget } from '../../components/user/RescheduleDrawer';
import { ConfirmDrawer, type ConfirmSpec } from '../../components/provider/ConfirmDrawer';
import { EmptyState } from '../../components/user/EmptyState';
import { Tabs, TabList, Tab } from '../../components/ui/Tabs';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchUserRequests, type UserRequestRow } from '../../api/requests';
import { AnfragenTab } from './AnfragenTab';
import { useRequestContext } from '../../lib/requestContext';
import { DateMark } from '../../components/ui/DateMark';

// ─── User Dashboard · Termine (bookings) ─────────────────────────────────────
// Die Buchung IST der bezahlte Lead — Anbieter-Identität ist seit der Buchung
// sichtbar (v2 §5 Stufe 3). Live-Zeilen aus GET /api/v1/bookings.
//
// Gestaltung nach dem Canvas "Termine · Varianten" (Nutzer-Wahl 2026-08-31):
//   1  Kopfzeile A + Karte aus C: Titel und Unterzeile bleiben immer stehen;
//      steht ein Termin an, erscheint darunter die "Als Nächstes"-Karte.
//      Ohne anstehenden Termin keine Karte — kein leeres Gehäuse.
//   2B Drei Abschnitte, sortiert danach, wer am Zug ist: "Braucht Ihre
//      Antwort" zuoberst (vorher lag die offene Ergebnisfrage im Archiv,
//      UNTER dem, was erledigt ist), dann Kommend, dann Vergangen.
//   3B Datums-Blockmarke statt Textspalte; die häufigste Aktion (Kalender)
//      steht offen, Verschieben und Stornieren liegen im ⋯-Menü. Vorher
//      standen »Verschieben · Stornieren · .ics« als drei gleich aussehende
//      Textlinks nebeneinander — ein Abbruch sah aus wie ein Dateidownload.
//   4B Die Ergebnisfrage ist eine eigene Leiste ÜBER der Zeile, mit Knöpfen,
//      die austragen, was sie bedeuten — statt "Ja / No-Show" rechts in der
//      gedrängten Ecke.
//
// Phase 5 (ADR-0007, Canvas-Wahl 2B): nach einem Nicht-Ergebnis traegt die
// Karte denselben neutralen grauen Kasten wie „Buchung nicht abgeschlossen"
// aus Phase 4 — Titel, ein Absatz mit Frist und „keine Kosten", zwei Wege
// (neu buchen, anderer Anbieter), darunter der Widerspruch mit Datum. Ein
// Muster fuer Nutzer-No-Show, Anbieter-No-Show und Plattformfehler; nichts
// klingt nach Schuld, nie Rot, kein Modal. Der Nutzer-Draht kennt weder
// Gebuehr noch Guthaben — das alte „Keine Rueckerstattung" ist weg.
//
// Seit 2026-09-01 (Canvas "Anfragen · Varianten", Wahl 1C) traegt die Seite
// ZWEI REITER: Anfragen und Termine — eine Beziehung, zwei Lebensphasen (vor
// und nach der Zusage). Die Seite laedt beide Listen (die Reiter-Zaehler
// brauchen beide), der Anfragen-Inhalt lebt in AnfragenTab. Alte Links auf
// /dashboard/requests leitet App.tsx hierher um (?tab=anfragen).

interface Row {
  id: string;
  // Die rohen Zeitpunkte bleiben an der Zeile. Die .ics-Datei braucht sie —
  // sie aus den formatierten Anzeigezeilen zurückzulesen wäre Unsinn.
  slotStartIso: string;
  slotEndIso: string | null;
  dateLine: string;   // "Mo, 12. Aug 2026"
  timeLine: string;   // "10:00–10:30 · Video-Call"
  provider: string;   // clear name — revealed at booking; before that "Verified Provider"
  publicRef: string | null;
  /** "Tax and VAT · Norditalien" — unter dieser Beschreibung stand der Anbieter vor der Buchung (Canvas 4B). */
  descriptor: string;
  /** 3 V3: Bereichscodes + Region fuer die uebersetzte Beschreibung. */
  areaCodes: string[];
  region: string | null;
  revealed: boolean;
  website: string | null;  // affiliate 1b — post-booking reveal only
  meta: string;
  status: BookingStatus;
  needsOutcome?: boolean; // slot passed, outcome not recorded (watchdog §1)
  /** Canvas F V1: Leistung beim Anbieter pausiert. */
  paused: boolean;
  att: BookingAttendance;
}

// Canvas 4B: die Herkunft eines Termins. Nach der Offenlegung steht unter dem
// Klarnamen, unter welcher Beschreibung der Anbieter vor der Buchung stand —
// so findet der Mandant „welcher war das?" wieder. Einen Buchstaben gibt es
// hier nicht: den kannte nur die Liste, aus der gebucht wurde.
function Herkunft({ r }: { r: Pick<Row, 'descriptor' | 'areaCodes' | 'region' | 'revealed'> }) {
  const { t } = useTranslation('userws');
  const { beschreibung } = useRequestContext();
  const text = beschreibung({ areaCodes: r.areaCodes, region: r.region, fallback: r.descriptor });
  if (!text) return null;
  return (
    <p className="truncate text-[11.5px] text-fg-tertiary">
      {r.revealed ? t('termine.origin', { descriptor: text }) : text}
    </p>
  );
}

// Phase 5: „nicht stattgefunden" ist neutral, kein Warnsignal — der Kasten
// darunter sagt, was daraus folgt.
const STATUS_TONE: Record<BookingStatus, 'success' | 'neutral' | 'error' | 'warning'> = {
  confirmed: 'success', completed: 'neutral', cancelled: 'error', no_show: 'neutral',
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
      // Kein "Video-Call": das Format kennen wir nicht (wie Partner-Termine, 2 V1).
      timeLine: `${tf.format(start)}${end ? `–${tf.format(end)}` : ''}`,
      provider: b.providerName + (b.identityRevealed && b.providerRegion ? ` — ${b.providerRegion}` : ''),
      publicRef: b.publicRef,
      descriptor: b.providerDescriptor,
      areaCodes: b.providerAreaCodes,
      region: b.providerRegion,
      revealed: b.identityRevealed,
      website: b.providerWebsite,
      meta: b.message || '—',
      status: b.status,
      needsOutcome: b.status === 'confirmed' && start.getTime() < Date.now(),
      paused: b.providerPaused,
      att: b.attendance,
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

// "In den Kalender" ist ein Button, kein <a download> — so trägt er dieselbe
// Gestalt wie jede andere Aktion. Der Anker entsteht nur für den Klick.
export function ladeIcs(r: Pick<Row, 'id' | 'slotStartIso' | 'slotEndIso' | 'provider' | 'meta'>) {
  const a = document.createElement('a');
  a.href = icsHref(r);
  a.download = 'complihub-termin.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function TerminePage() {
  const { t, i18n } = useTranslation('userws');
  const { openWizard } = useWizardDrawer();
  const locale = i18n.resolvedLanguage || 'en';
  // Kein Fixture-Rueckfall mehr (Befund 2026-08-30): useApiData behielt bei
  // einem leeren Ergebnis die Fixture, und ein neues Konto sah zwei erfundene
  // Termine im September.
  const [data, setData] = useState<Row[] | null>(null);
  // Phase 5: eine Neubuchung legt eine NEUE Zeile an — danach laden wir neu,
  // statt eine Zeile zu erfinden.
  const [reloadN, setReloadN] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchUserBookings()
      .then((b) => { if (alive) setData(toRows(b, locale)); })
      .catch(() => { if (alive) setData([]); });
    return () => { alive = false; };
  }, [locale, reloadN]);
  // Anfragen fuer den Posteingang unter den Terminen — hier geladen, damit
  // die Seite ihre Ladekette an einem Ort haelt (Waechter-Test).
  const [anfragen, setAnfragen] = useState<UserRequestRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchUserRequests()
      .then((r) => { if (alive) setAnfragen(r); })
      .catch(() => { if (alive) setAnfragen([]); });
    return () => { alive = false; };
  }, []);
  // Kein Anfragen-Reiter mehr (Canvas-Wahl 1C, 2026-09-05): ?tab=anfragen
  // (alte /dashboard/requests-Umleitung) und ein ?thread=-Deep-Link aus Glocke
  // oder Suche scrollen zum Posteingang, sobald er geladen ist.
  const [searchParams] = useSearchParams();
  const zielAnfragen = searchParams.get('tab') === 'anfragen' || !!searchParams.get('thread');
  // Kommend / Vergangen als Reiter ueber dem Karten-Grid.
  const [sicht, setSicht] = useState<'upcoming' | 'past'>('upcoming');
  useEffect(() => {
    if (!zielAnfragen || anfragen === null) return;
    document.getElementById('anfragen')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [zielAnfragen, anfragen]);
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
      return { ...r, slotStartIso: start.toISOString(), slotEndIso: end.toISOString(), dateLine: df.format(start), timeLine: `${tf.format(start)}–${tf.format(end)}`, needsOutcome: false };
    }
    return r;
  });

  // 2B: drei Abschnitte, sortiert danach, wer am Zug ist. "Braucht Ihre
  // Antwort" lag vorher im Archiv-Abschnitt — das einzige auf der Seite, das
  // eine Handlung verlangt, stand unter dem, was erledigt ist.
  const needsAnswer = rows.filter((r) => r.needsOutcome);
  const upcoming = rows
    .filter((r) => r.status === 'confirmed' && !r.needsOutcome)
    .sort((a, b) => a.slotStartIso.localeCompare(b.slotStartIso));
  const past = rows
    .filter((r) => r.status !== 'confirmed')
    .sort((a, b) => b.slotStartIso.localeCompare(a.slotStartIso));
  const next = upcoming[0];

  // "Als Nächstes · heute / morgen / in n Tagen" für die Karte im Kopf.
  const nextRelativ = useMemo(() => {
    if (!next) return null;
    const tage = Math.floor(
      (new Date(next.slotStartIso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
    );
    if (tage <= 0) return t('termine.nextToday');
    if (tage === 1) return t('termine.nextTomorrow');
    return t('termine.nextInDays', { count: tage });
  }, [next, t]);

  // Stornieren fragt nach (Befund 2026-08-31): vorher galt EIN Klick auf
  // einen Textlink — ohne Rueckfrage, ohne Rueckweg, und die Lead-Gebuehr ist
  // bezahlt. Der ConfirmDrawer nennt die Folgen, erst dann laeuft die Absage.
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
  const onReschedule = (r: Row) => setRescheduleFor({
    bookingId: r.id, publicRef: r.publicRef ?? '', providerName: r.provider,
    currentLine: `${r.dateLine} · ${r.timeLine}`,
  });
  // Phase 5: Neubuchung in der Frist — dieselbe Schublade, anderer Wortlaut.
  const onRebook = (r: Row) => setRescheduleFor({
    bookingId: r.id, publicRef: r.publicRef ?? '', providerName: r.provider,
    currentLine: `${r.dateLine} · ${r.timeLine}`, rebook: true,
  });
  // Widerspruch gegen einen gemeldeten Nutzer-No-Show: fragt nach, nennt die
  // Folgen (keine), dann an den Server. Lokal sofort „eingegangen".
  const [disputed, setDisputed] = useState<Set<string>>(new Set());
  const [disputeFailed, setDisputeFailed] = useState<Set<string>>(new Set());
  const onDispute = (r: Row) => {
    setConfirm({
      title: t('termine.after.disputeConfirmTitle', { provider: r.provider }),
      consequence: t('termine.after.disputeConfirmBody'),
      confirmLabel: t('termine.after.disputeConfirmCta'),
      onConfirm: async () => {
        setDisputeFailed((d) => { const n = new Set(d); n.delete(r.id); return n; });
        try {
          await disputeNoShow(r.id);
          setDisputed((d) => new Set(d).add(r.id));
        } catch {
          setDisputeFailed((d) => new Set(d).add(r.id));
        }
      },
    });
  };
  const dateOnly = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  const dateTime = (iso: string) => new Date(iso).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // ── Nach dem Nicht-Ergebnis (Canvas 2B): der neutrale Kasten ─────────────
  const afterCard = (r: Row) => {
    const a = r.att;
    const isDisputed = disputed.has(r.id) || a.disputeStatus === 'open';
    const closed = !a.rebookOpen;
    let title: string; let body: string; let note: string | null = null;
    if (r.status === 'no_show' && a.noShowBy === 'user') {
      title = isDisputed ? t('termine.after.disputeOpenTitle') : t('termine.after.afterTitleUser');
      body = isDisputed ? t('termine.after.disputeOpenBody', { provider: r.provider })
        : closed ? t('termine.after.afterBodyClosed', { provider: r.provider })
        : t('termine.after.afterBodyUser', { provider: r.provider, deadline: dateOnly(a.rebookDeadline ?? '') });
      if (!isDisputed && a.disputeStatus === 'dismissed') note = t('termine.after.disputeDismissedNote');
    } else if (r.status === 'no_show' && a.noShowBy === 'provider') {
      title = t('termine.after.afterTitleProvider');
      body = closed ? t('termine.after.afterBodyProviderClosed') : t('termine.after.afterBodyProvider', { provider: r.provider, deadline: dateOnly(a.rebookDeadline ?? '') });
      note = t('termine.after.afterNoteProvider');
    } else if (r.status === 'cancelled' && a.noShowBy === 'platform') {
      title = t('termine.after.afterTitlePlatform');
      body = closed ? t('termine.after.afterBodyClosed', { provider: r.provider }) : t('termine.after.afterBodyPlatform', { provider: r.provider, deadline: dateOnly(a.rebookDeadline ?? '') });
    } else if (r.status === 'no_show') {
      // Aeltere Zeilen ohne `no_show_by`: sie meinten den Anbieter (ADR-0007).
      title = t('termine.after.afterTitleProvider');
      body = t('termine.after.afterBodyProviderClosed');
    } else return null;
    const canDispute = a.noShowBy === 'user' && !isDisputed && a.disputeStatus === 'none' && !!a.disputeOpenUntil && Date.parse(a.disputeOpenUntil) > Date.now();
    return (
      <div className="space-y-2.5 rounded-lg border border-stroke bg-surface-secondary px-3.5 py-3">
        <p className="text-[13px] font-semibold text-fg">{title}</p>
        <p className="text-[12.5px] leading-relaxed text-fg-secondary">{body}</p>
        {(a.rebookOpen || a.noShowBy === 'provider') && (
          <div className="flex flex-wrap gap-2">
            {a.rebookOpen && <Button size="sm" onClick={() => onRebook(r)}>{t('termine.after.rebook')}</Button>}
            <Link to={`/${locale}/dashboard/sessions`}><Button size="sm" variant="secondary">{t('termine.after.otherProvider')}</Button></Link>
          </div>
        )}
        {canDispute && (
          <p className="text-[11.5px] leading-relaxed text-fg-tertiary">
            <Trans t={t} i18nKey="termine.after.disputeHint" values={{ until: dateTime(a.disputeOpenUntil ?? '') }}
              components={{ dispute: <button type="button" className="font-medium text-fg-brand underline-offset-2 hover:underline" onClick={() => onDispute(r)} /> }} />
          </p>
        )}
        {disputeFailed.has(r.id) && <p role="alert" className="text-[11.5px] text-fg-secondary">{t('termine.after.disputeFailed')}</p>}
        {note && <p className="text-[11.5px] text-fg-tertiary">{note}</p>}
        {a.rebookedFrom && <p className="text-[11.5px] text-fg-tertiary">{t('termine.after.rebookedFrom')}</p>}
      </div>
    );
  };

  // ── Anbieter pausiert (Canvas F V1, 2026-10-01) ────────────────────────────
  // Ohne Grund — der gehoert dem Anbieter und dem Pruefteam —, ohne Angst-
  // Sprache. Absagen ohne Nachteil, und ein Mensch ist erreichbar.
  const pausedNotice = (r: Row) => r.paused && r.status === 'confirmed' && !r.needsOutcome ? (
    <div className="space-y-2.5 rounded-lg bg-brand-light px-3.5 py-3 text-[13px] font-medium leading-relaxed text-fg-brand">
      <p>{t('termine.paused.body')}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onCancel(r)}>{t('termine.paused.cancel')}</Button>
        <Link to={`/${locale}/contact`}><Button size="sm" variant="ghost">{t('termine.paused.talk')}</Button></Link>
      </div>
    </div>
  ) : null;

  // ── Terminzeile (3B) ────────────────────────────────────────────────────────
  const card = (r: Row, opts: { flatTop?: boolean } = {}) => (
    <div
      key={r.id}
      className={`flex items-center gap-4 border border-stroke bg-surface-secondary/40 px-5 py-4 ${
        opts.flatTop ? 'rounded-b-xl border-t-0' : 'rounded-xl'
      }`}
    >
      <DateMark iso={r.slotStartIso} locale={locale} size="lg" soon={next?.id === r.id} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-fg">{r.provider}</p>
        <Herkunft r={r} />
        <p className="truncate text-[12px] text-fg-tertiary">{r.dateLine} · {r.timeLine}{r.meta !== '—' ? ` · ${r.meta}` : ''}</p>
        {r.website && !r.needsOutcome && (
          // Affiliate 1b: provider website, revealed only post-booking.
          // Routed through the counted outclick endpoint.
          <a
            href={providerWebsiteHref(r.publicRef ?? '')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-fg-brand hover:underline"
          >
            {t('termine.website')} ↗
          </a>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Tag tone={r.needsOutcome ? 'warning' : STATUS_TONE[r.status]}>
          {r.needsOutcome ? t('termine.status.outcome_open') : t(`termine.status.${r.status}`)}
        </Tag>
        {r.status === 'confirmed' && !r.needsOutcome && (
          <>
            <Button size="sm" variant="outline" iconLeft={<CalendarPlus size={14} />} onClick={() => ladeIcs(r)}>
              {t('termine.addToCalendar')}
            </Button>
            <ActionMenu
              label={t('termine.moreActions')}
              items={[
                { label: t('termine.reschedule'), onClick: () => onReschedule(r) },
                { label: t('termine.cancel'), danger: true, onClick: () => onCancel(r) },
              ]}
            />
          </>
        )}
        {r.status === 'completed' && (
          reviewed.has(r.id)
            ? <span className="text-[12px] text-fg-brand">{t('termine.reviewed')}</span>
            : <Button variant="primary" size="sm" onClick={() => setReviewFor({ bookingId: r.id, providerName: r.provider })}>{t('termine.review')}</Button>
        )}
      </div>
    </div>
  );

  // ── Ergebnisfrage (4B): eigene Leiste über der Zeile ───────────────────────
  // Vorher standen Frage, zwei Knöpfe und der Status-Tag zusammen rechts in
  // der Zeile — vier Dinge in einer Ecke, und die Frage sah aus wie Routine.
  // Abweichung vom Canvas, bewusst: die Knöpfe sind DS-Buttons (secondary/
  // ghost), keine warnfarbenen Sonderformen — das Design-System kennt keine
  // Warning-Buttons, und eine Einzelanfertigung wäre der schlechtere Tausch.
  const outcomeBlock = (r: Row) => (
    <div key={r.id}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-xl bg-warning-bg px-5 py-2.5 dark:bg-amber-500/15">
        <span className="text-[13px] font-semibold text-warning-800 dark:text-amber-300">{t('termine.outcomeQuestion')}</span>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => onOutcome(r.id, 'completed')}>{t('termine.outcomeYes')}</Button>
          <Button size="sm" variant="ghost" onClick={() => onOutcome(r.id, 'no_show')}>{t('termine.outcomeNo')}</Button>
        </div>
      </div>
      {card(r, { flatTop: true })}
    </div>
  );

  // ── Terminkarte im Grid (Canvas-Wahl 1C, 2026-09-05) ──────────────────────
  // Datumsmarke und Status oben, Anbieter und Zeit in der Mitte, Aktionen am
  // Fuss — dieselben Aktionen wie in der Zeile, nur gestapelt.
  const karte = (r: Row) => (
    <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-stroke bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <DateMark iso={r.slotStartIso} locale={locale} size="lg" soon={next?.id === r.id} />
        <Tag tone={STATUS_TONE[r.status]}>{t(`termine.status.${r.status}`)}</Tag>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-fg">{r.provider}</p>
        <Herkunft r={r} />
        <p className="text-[12px] text-fg-tertiary">{r.dateLine} · {r.timeLine}{r.meta !== '—' ? ` · ${r.meta}` : ''}</p>
        {r.website && (
          <a
            href={providerWebsiteHref(r.publicRef ?? '')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-fg-brand hover:underline"
          >
            {t('termine.website')} ↗
          </a>
        )}
      </div>
      {pausedNotice(r)}
      {afterCard(r)}
      {r.att.rebookedFrom && r.status === 'confirmed' && <p className="text-[11.5px] text-fg-tertiary">{t('termine.after.rebookedFrom')}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {r.status === 'confirmed' && (
          <>
            <Button size="sm" variant="outline" iconLeft={<CalendarPlus size={14} />} onClick={() => ladeIcs(r)}>
              {t('termine.addToCalendar')}
            </Button>
            <ActionMenu
              label={t('termine.moreActions')}
              items={[
                { label: t('termine.reschedule'), onClick: () => onReschedule(r) },
                { label: t('termine.cancel'), danger: true, onClick: () => onCancel(r) },
              ]}
            />
          </>
        )}
        {r.status === 'completed' && (
          reviewed.has(r.id)
            ? <span className="text-[12px] text-fg-brand">{t('termine.reviewed')}</span>
            : <Button variant="primary" size="sm" onClick={() => setReviewFor({ bookingId: r.id, providerName: r.provider })}>{t('termine.review')}</Button>
        )}
      </div>
    </div>
  );

  const kopf = (key: string, n: number, warn = false) => (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${warn ? 'text-warning-800 dark:text-amber-300' : 'text-fg-tertiary'}`}>
      {t(key)} · {n}
    </p>
  );

  return (
    <UserShell>
      {/* Der Gradient-Grund (CLAUDE.md), wie ihn Dashboard und Sitzungen
          tragen — bis 2026-08-31 sass diese Seite als einzige Arbeitsfläche
          auf blankem Weiss. Negative Ränder heben das Shell-Padding auf,
          damit die Tönung randlos steht. */}
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
      <div className="mx-auto max-w-[1140px] space-y-5">
        {/* Canvas-Wahl 1C (2026-09-05): Termine oben als Buehne — H1, "Als
            Naechstes"-Karte, dann Kommend/Vergangen als Reiter ueber einem
            Karten-Grid. Darunter der Anfragen-Posteingang. Nichts ist mehr
            hinter einem Reiter versteckt. */}
        <div>
          <h1 className="font-serif text-[36px] font-bold leading-tight text-fg">
            <Trans t={t} i18nKey="termine.title" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
          </h1>
          <p className="mt-1 text-body-sm text-fg-secondary">{t('termine.sub')}</p>
        </div>

        {/* "Als Naechstes"-Karte, sobald ein Termin ansteht. Ohne "Alle in den
            Kalender"-Knopf: ein Einmal-Download, der beim naechsten Verschieben
            falsch ist, waere schlimmer als kein Knopf — der kommt erst mit
            einem abonnierbaren Feed. */}
        {next && (
          <div className="flex flex-col gap-4 rounded-xl border border-stroke-brand/30 bg-brand-light px-6 py-5 sm:flex-row sm:items-center">
            <DateMark iso={next.slotStartIso} locale={locale} size="lg" soon />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-brand/70">
                {t('termine.nextLabel')} · {nextRelativ}
              </p>
              <p className="truncate font-serif text-[26px] font-bold leading-tight text-fg-brand">{next.provider}</p>
              <p className="truncate text-[13px] text-fg-brand">
                {next.dateLine} · {next.timeLine}{next.meta !== '—' ? ` · ${next.meta}` : ''}
              </p>
              {next.paused && <p className="mt-1 text-[12.5px] font-medium text-fg-brand">{t('termine.paused.short')}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" iconLeft={<CalendarPlus size={14} />} onClick={() => ladeIcs(next)}>
                {t('termine.addToCalendar')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReschedule(next)}>{t('termine.reschedule')}</Button>
            </div>
          </div>
        )}

        {data !== null && rows.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={t('termine.emptyTitle')}
            body={t('termine.emptyBody')}
            cta={{ label: t('termine.emptyCta'), onClick: () => openWizard() }}
            steps={[
              { title: t('termine.emptyStep1Title'), body: t('termine.emptyStep1Body') },
              { title: t('termine.emptyStep2Title'), body: t('termine.emptyStep2Body') },
              { title: t('termine.emptyStep3Title'), body: t('termine.emptyStep3Body') },
            ]}
          />
        ) : (
        <>
        {needsAnswer.length > 0 && (
          <section className="space-y-2.5">
            {kopf('termine.needsAnswer', needsAnswer.length, true)}
            {needsAnswer.map(outcomeBlock)}
          </section>
        )}
        <div>
          <Tabs value={sicht} onValueChange={(v) => setSicht(v as 'upcoming' | 'past')} variant="underline" size="sm">
            <TabList>
              <Tab value="upcoming" badge={upcoming.length}>{t('termine.tabUpcoming')}</Tab>
              <Tab value="past" badge={past.length}>{t('termine.tabPast')}</Tab>
            </TabList>
          </Tabs>
          {(sicht === 'upcoming' ? upcoming : past).length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(sicht === 'upcoming' ? upcoming : past).map(karte)}
            </div>
          ) : (
            <p className="mt-4 text-body-sm text-fg-tertiary">{t(sicht === 'upcoming' ? 'termine.emptyUpcoming' : 'termine.emptyPast')}</p>
          )}
        </div>
        </>
        )}

        <div className="pt-3">
          <AnfragenTab rows={anfragen} />
        </div>
      </div>
      </div>
      <ReviewDrawer target={reviewFor} onClose={() => setReviewFor(null)} onSubmitted={(id) => setReviewed((s) => new Set(s).add(id))} />
      <RescheduleDrawer target={rescheduleFor} onClose={() => setRescheduleFor(null)} onRescheduled={(id, iso, newId) => { if (newId) setReloadN((n) => n + 1); else setMoved((m) => ({ ...m, [id]: iso })); }} />
      <ConfirmDrawer
        spec={confirm}
        onClose={() => setConfirm(null)}
        labels={confirm?.confirmLabel === t('termine.after.disputeConfirmCta') ? {
          eyebrow: t('termine.after.disputeConfirmEyebrow'),
          cancel: t('termine.after.disputeConfirmBack'),
          confirm: t('termine.after.disputeConfirmCta'),
          fallbackTitle: t('termine.after.disputeConfirmEyebrow'),
        } : {
          eyebrow: t('termine.cancelConfirmEyebrow'),
          cancel: t('termine.cancelConfirmBack'),
          confirm: t('termine.cancelConfirmCta'),
          fallbackTitle: t('termine.cancel'),
        }}
      />
    </UserShell>
  );
}
