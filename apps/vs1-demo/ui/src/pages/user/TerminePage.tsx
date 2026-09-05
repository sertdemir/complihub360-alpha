import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, CalendarPlus, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useWizardDrawer } from '../../components/user/WizardDrawer';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { fetchUserBookings, cancelBooking, markOutcome, providerWebsiteHref, type UserBooking, type BookingStatus } from '../../api/bookings';
import { ReviewDrawer, type ReviewTarget } from '../../components/user/ReviewDrawer';
import { RescheduleDrawer, type RescheduleTarget } from '../../components/user/RescheduleDrawer';
import { ConfirmDrawer, type ConfirmSpec } from '../../components/provider/ConfirmDrawer';
import { EmptyState } from '../../components/user/EmptyState';
import { Tabs, TabList, Tab } from '../../components/ui/Tabs';
import { useSearchParams } from 'react-router-dom';
import { fetchUserRequests, type UserRequestRow } from '../../api/requests';
import { AnfragenTab } from './AnfragenTab';

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

// "In den Kalender" ist ein Button, kein <a download> — so trägt er dieselbe
// Gestalt wie jede andere Aktion. Der Anker entsteht nur für den Klick.
function ladeIcs(r: Pick<Row, 'id' | 'slotStartIso' | 'slotEndIso' | 'provider' | 'meta'>) {
  const a = document.createElement('a');
  a.href = icsHref(r);
  a.download = 'complihub-termin.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ─── Datums-Blockmarke (3B) ──────────────────────────────────────────────────
// Tag gross, Monat klein — in jeder Sprache gleich breit, der nächste Termin
// in Petrol. Das Jahr fällt aus der Marke; dafür trägt die Zeile daneben die
// volle Datumszeile (bewusst hingenommene Kante der gewählten Variante).
function DatumsMarke({ iso, locale, soon }: { iso: string; locale: string; soon?: boolean }) {
  const d = new Date(iso);
  return (
    <div
      aria-hidden="true"
      className={`grid h-[60px] w-[60px] shrink-0 place-content-center rounded-xl border text-center leading-tight ${
        soon ? 'border-stroke-brand bg-brand-light text-fg-brand' : 'border-stroke bg-surface text-fg'
      }`}
    >
      <span className="text-[22px] font-bold">{d.getDate()}</span>
      <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${soon ? '' : 'text-fg-tertiary'}`}>
        {d.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}
      </span>
    </div>
  );
}

// ─── ⋯-Menü (3B) ─────────────────────────────────────────────────────────────
// Seiten-lokal, weil das Design-System (noch) kein Aktionsmenü kennt: NavMenu
// ist Navigation, SelectMenu ein Formularfeld. Wiederholt sich das Muster auf
// einer zweiten Fläche, gehört es nach components/ui.
function AktionenMenu({ label, items }: {
  label: string;
  items: { label: string; danger?: boolean; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-md border border-stroke bg-surface text-fg-secondary transition-colors hover:text-fg"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-20 min-w-[180px] rounded-lg border border-stroke bg-surface p-1 shadow-md">
          {items.map((i) => (
            <button
              key={i.label}
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); i.onClick(); }}
              className={`block w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                i.danger
                  ? 'text-error-700 hover:bg-error-bg/60 dark:text-red-300 dark:hover:bg-red-500/10'
                  : 'text-fg hover:bg-surface-secondary'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TerminePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('userws');
  const { openWizard } = useWizardDrawer();
  const locale = i18n.resolvedLanguage || 'en';
  // Kein Fixture-Rueckfall mehr (Befund 2026-08-30): useApiData behielt bei
  // einem leeren Ergebnis die Fixture, und ein neues Konto sah zwei erfundene
  // Termine im September.
  const [data, setData] = useState<Row[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchUserBookings()
      .then((b) => { if (alive) setData(toRows(b, locale)); })
      .catch(() => { if (alive) setData([]); });
    return () => { alive = false; };
  }, [locale]);
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
      return { ...r, slotStartIso: start.toISOString(), slotEndIso: end.toISOString(), dateLine: df.format(start), timeLine: `${tf.format(start)}–${tf.format(end)} · Video-Call`, needsOutcome: false };
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
    bookingId: r.id, providerKey: r.providerKey, providerName: r.provider,
    currentLine: `${r.dateLine} · ${r.timeLine}`,
  });

  // ── Terminzeile (3B) ────────────────────────────────────────────────────────
  const card = (r: Row, opts: { flatTop?: boolean } = {}) => (
    <div
      key={r.id}
      className={`flex items-center gap-4 border border-stroke bg-surface-secondary/40 px-5 py-4 ${
        opts.flatTop ? 'rounded-b-xl border-t-0' : 'rounded-xl'
      }`}
    >
      <DatumsMarke iso={r.slotStartIso} locale={locale} soon={next?.id === r.id} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-fg">{r.provider}</p>
        <p className="truncate text-[12px] text-fg-tertiary">{r.dateLine} · {r.timeLine}{r.meta !== '—' ? ` · ${r.meta}` : ''}</p>
        {r.website && !r.needsOutcome && (
          // Affiliate 1b: provider website, revealed only post-booking.
          // Routed through the counted outclick endpoint.
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
      <div className="flex shrink-0 items-center gap-2.5">
        <Tag tone={r.needsOutcome ? 'warning' : STATUS_TONE[r.status]}>
          {r.needsOutcome ? t('termine.status.outcome_open') : t(`termine.status.${r.status}`)}
        </Tag>
        {r.status === 'confirmed' && !r.needsOutcome && (
          <>
            <Button size="sm" variant="outline" iconLeft={<CalendarPlus size={14} />} onClick={() => ladeIcs(r)}>
              {t('termine.addToCalendar')}
            </Button>
            <AktionenMenu
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
            : <Button variant="accent" size="sm" onClick={() => setReviewFor({ bookingId: r.id, providerKey: r.providerKey, providerName: r.provider })}>{t('termine.review')}</Button>
        )}
        {r.status === 'no_show' && (
          <span className="max-w-[260px] text-right text-[12px] text-fg-tertiary">{t('termine.noShowNote')}</span>
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
        <DatumsMarke iso={r.slotStartIso} locale={locale} soon={next?.id === r.id} />
        <Tag tone={STATUS_TONE[r.status]}>{t(`termine.status.${r.status}`)}</Tag>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-fg">{r.provider}</p>
        <p className="text-[12px] text-fg-tertiary">{r.dateLine} · {r.timeLine}{r.meta !== '—' ? ` · ${r.meta}` : ''}</p>
        {r.website && (
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
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {r.status === 'confirmed' && (
          <>
            <Button size="sm" variant="outline" iconLeft={<CalendarPlus size={14} />} onClick={() => ladeIcs(r)}>
              {t('termine.addToCalendar')}
            </Button>
            <AktionenMenu
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
            : <Button variant="accent" size="sm" onClick={() => setReviewFor({ bookingId: r.id, providerKey: r.providerKey, providerName: r.provider })}>{t('termine.review')}</Button>
        )}
        {r.status === 'no_show' && (
          <span className="text-[12px] text-fg-tertiary">{t('termine.noShowNote')}</span>
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
            <DatumsMarke iso={next.slotStartIso} locale={locale} soon />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-brand/70">
                {t('termine.nextLabel')} · {nextRelativ}
              </p>
              <p className="truncate font-serif text-[26px] font-bold leading-tight text-fg-brand">{next.provider}</p>
              <p className="truncate text-[13px] text-fg-brand">
                {next.dateLine} · {next.timeLine}{next.meta !== '—' ? ` · ${next.meta}` : ''}
              </p>
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
