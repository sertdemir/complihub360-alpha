import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Tag } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Card } from '../../components/ui/Card';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { LoadFailedState, ReadinessEmpty, useReadiness } from '../../components/provider/WorkspaceStates';
import { money } from '../../api/billing';
import {
  fetchProviderBookings, reportProposal, reportAttendance, submitReview, reviewFailureFrom,
  type AttendanceOutcome, type BookingAttendance, type BookingStatus, type LeadProposal, type ProviderBookingLead,
  type Disclosure,
} from '../../api/bookings';
import { DateMark } from '../../components/ui/DateMark';
import { useRequestContext } from '../../lib/requestContext';
import { FieldError } from '../../components/ui/FieldError';
import { FailureNote } from '../../components/ui/FailureNote';

// ─── Provider · Termine & Leads ──────────────────────────────────────────────
// Matchmaking v2: the booking IS the paid lead. The dossier (user identity +
// intake context) is delivered at booking time — no confirm gate, no unlock.
// Replaces the retired request/confirm pipeline as the primary nav item.
//
// Phase 4 (ADR-0005, Canvas-Wahl 3A): unter jedem Termin eine Abrechnungs-
// zeile — Band, durchgestrichener Standard, Endbetrag, Rabattzaehler, Status —
// und darunter der 10 %-Block fuer den Nutzer mit zwei Umschaltern („Angebot
// erstellt?", „10 % ausgewiesen?"). Spec B sagt „auf jedem Lead", nicht
// „irgendwo": der Anbieter sieht im selben Blick, was er zahlt und was er
// schuldet. Zaehler statt Prozentgewirr.
//
// Phase 5 (ADR-0007, Canvas-Wahl 1B): ist der Slot vorbei, fragt die Karte
// „Wie ist der Termin verlaufen?" mit drei Auswahlkarten, jede mit ihrem
// Folge-Satz (Gebuehr, Frist, Guthaben). Bei „nicht erschienen" steht die
// Zehn-Minuten-Bedingung als Frage, die der Anbieter mit „Ja, so melden"
// bejaht — Teil der Meldung, kein Kleingedrucktes. Danach eine Zeile unter
// der Karte: wer fehlte, bis wann der Nutzer neu buchen kann, ob er
// widersprochen hat.

// Regel-Fassung 1 (attendance_policy v1): 14 Tage Frist, 30 % Guthaben. Die
// Folge-Saetze nennen sie, bevor der Server geantwortet hat; die Antwort
// traegt dann die echte Frist. Aendert sich die Fassung, aendert sich hier
// die Zahl — nicht still im Text.
const REBOOK_DAYS = 14;
const CREDIT_PCT = 30;

interface Row {
  id: string;
  /** Freigabe der Nutzerdaten (disclosure.ts) — nur bei 'released' stehen Firma, Kontakt und Anliegen da. */
  disclosure: Disclosure;
  start: string;        // ISO — Datumsmarke
  dateLine: string;
  timeLine: string;
  /** Dauer aus Slot-Beginn und -Ende; fehlt das Ende, steht keine Dauer da. */
  minutes?: number;
  /** Firma aus der Anfrage (2 V1). null: nicht angegeben — nie aus der Domain geraten. */
  company: string | null;
  email: string;
  category?: string;
  /** Maerkte des Leads — aus dem Ledger, sonst das Land der Anfrage. */
  countries: string[];
  meta: string;
  status: BookingStatus;
  leadCharged: boolean;
  lead: ProviderBookingLead | null;
  /** Der Rabatt, den der Nutzer von diesem Anbieter erwartet (eingefroren zur Buchung). */
  userDiscountPct: number | null;
  proposal: LeadProposal | null;
  att: BookingAttendance;
  /** Hat der Anbieter den Lead schon bewertet (vom Server)? */
  reviewed: boolean;
}

const STATUS_TONE: Record<BookingStatus, 'success' | 'neutral' | 'error' | 'warning'> = {
  confirmed: 'success', completed: 'neutral', cancelled: 'error', no_show: 'warning',
};

// Angleich an das User-Dashboard (Figma „Provider · Termine & Leads (So 18.10.)",
// 3793:263): Abschnitts-Eyebrows wie „Braucht Ihre Antwort" beim User,
// Workspace-Karten, Baender auf elevate, Status-Tags in Versalien, Drawer-Kaesten
// wie im User-Drawer.
const EYEBROW = 'text-[10px] font-extrabold uppercase tracking-[0.09em]';
const TAG_UP = 'text-[10.5px] font-extrabold uppercase tracking-[0.04em]';
const DRAWER_BOX = 'rounded-lg border border-elevate/10 bg-elevate/[0.03] px-4 py-3';
const DRAWER_EYEBROW = 'text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary';

const BAND_LABEL: Record<1 | 2 | 3 | 4, string> = { 1: 'Focused', 2: 'Core', 3: 'Advanced', 4: 'Strategic' };

export function LeadsPage() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const { bereich, markt } = useRequestContext();
  const { data, state, error, reload } = useWorkspaceData<Row[]>(async () => {
    const df = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const tf = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
    return (await fetchProviderBookings()).map((b) => {
      const start = new Date(b.slotStart); const end = b.slotEnd ? new Date(b.slotEnd) : null;
      return {
        id: b.id,
        dateLine: df.format(start),
        start: b.slotStart,
        timeLine: `${tf.format(start)}${end ? `–${tf.format(end)}` : ''}`,
        minutes: end ? Math.round((end.getTime() - start.getTime()) / 60_000) : undefined,
        company: b.userCompany,
        disclosure: b.disclosure,
        email: b.userEmail ?? '—',
        category: b.category ?? undefined,
        countries: b.countries?.length ? b.countries : b.country ? [b.country] : [],
        meta: b.message ?? '—',
        status: b.status,
        leadCharged: b.leadCharged,
        lead: b.lead,
        userDiscountPct: b.userDiscountPct,
        proposal: b.proposal,
        att: b.attendance,
        reviewed: b.reviewed,
      };
    });
  }, [locale]);
  const rows = data ?? [];
  // B3: die Bereitschafts-Liste nur laden, wenn wirklich nichts da ist.
  const readiness = useReadiness(state === 'ready' && rows.length === 0);
  const [dossierFor, setDossierFor] = useState<Row | null>(null);
  // Two-sided reviews (alerts concept §2): provider rates the lead after the
  // appointment — feeds the internal lead-quality signal.
  const [leadRating, setLeadRating] = useState(0);
  const [leadRated, setLeadRated] = useState<Set<string>>(new Set());
  // V2 (11.10.2026): der Knopf bleibt aktiv; ohne Sterne steht der Satz an der
  // Sternreihe und der Fokus geht auf den ersten Stern.
  const [ratingMissing, setRatingMissing] = useState(false);
  // Wie die Nutzer-Bewertung (Punkt 1, R3/E1): „bewertet" erst nach dem OK
  // des Servers. Bis 19.10.2026 stand „✓ Lead rated" sofort da, und ein
  // Fehler verschwand in `.catch(() => {})` — der Anbieter hielt die
  // Bewertung fuer gesendet. 409 ist kein Fehler, sondern ein Hinweis.
  const [rateState, setRateState] = useState<'idle' | 'sending' | 'already' | 'notHeld' | { failed: { id: string; at: string } | null }>('idle');
  const openDossier = (r: Row | null) => { setDossierFor(r); setLeadRating(0); setRatingMissing(false); setRateState('idle'); };
  const rateLead = async (r: Row) => {
    if (rateState === 'sending') return;
    if (leadRating < 1) { setRatingMissing(true); document.querySelector<HTMLElement>('#lead-rating button')?.focus(); return; }
    setRatingMissing(false);
    setRateState('sending');
    try {
      await submitReview({ bookingId: r.id, fromRole: 'provider', rating: leadRating, categories: [] });
      setLeadRated((s) => new Set(s).add(r.id));
      setRateState('idle');
    } catch (e) {
      const f = reviewFailureFrom(e);
      if (f.kind === 'already_reviewed') { setLeadRated((s) => new Set(s).add(r.id)); setRateState('already'); }
      else if (f.kind === 'not_held') setRateState('notHeld');
      else setRateState({ failed: f.reference });
    }
  };

  // Selbstauskunft je Lead: lokal sofort, dann an den Server. Antwortet er
  // nicht, bleibt der alte Stand stehen — kein erfundenes „gemeldet".
  const [proposals, setProposals] = useState<Record<string, LeadProposal | null>>({});
  const [proposalBusy, setProposalBusy] = useState<string | null>(null);
  // Scheitert die Meldung, steht das am Lead — vorher blieb der Umschalter
  // still auf dem alten Stand, und der Partner hielt sie fuer gesendet
  // (Testlauf Phase 4, 2026-10-09).
  const [proposalFailed, setProposalFailed] = useState<string | null>(null);
  const proposalOf = (r: Row) => (r.id in proposals ? proposals[r.id] : r.proposal);
  const report = async (r: Row, next: { proposalIssued: boolean; discountShown: boolean }) => {
    setProposalBusy(r.id);
    setProposalFailed(null);
    try {
      const saved = await reportProposal(r.id, next);
      setProposals((p) => ({ ...p, [r.id]: saved }));
    } catch {
      // Der Server hat nicht gespeichert; der Umschalter zeigt weiter den alten Stand.
      setProposalFailed(r.id);
    }
    setProposalBusy(null);
  };

  // Phase 5: die Anwesenheits-Meldung — lokal sofort, dann an den Server.
  // Antwortet er nicht, bleibt die Frage stehen (kein erfundenes „gemeldet").
  const [reported, setReported] = useState<Record<string, { status: BookingStatus; att: BookingAttendance }>>({});
  const [attChoice, setAttChoice] = useState<Record<string, AttendanceOutcome | null>>({});
  const [attBusy, setAttBusy] = useState<string | null>(null);
  const [attFailed, setAttFailed] = useState<string | null>(null);
  // V2 (11.10.2026): „Melden" bleibt aktiv; ohne Wahl steht der Satz an der
  // Auswahl (je Termin) und der Fokus geht auf die erste Moeglichkeit.
  const [attMissing, setAttMissing] = useState<string | null>(null);
  const sendAttendance = async (r: Row) => {
    if (attBusy === r.id) return;
    const outcome = attChoice[r.id];
    if (!outcome) { setAttMissing(r.id); document.querySelector<HTMLElement>(`#att-${r.id} [role="radio"]`)?.focus(); return; }
    setAttMissing(null);
    setAttBusy(r.id); setAttFailed(null);
    try {
      const res = await reportAttendance(r.id, outcome);
      setReported((m) => ({ ...m, [r.id]: { status: res.status, att: { ...r.att, attendanceReportable: false, noShowBy: res.noShowBy, noShowReportedAt: new Date().toISOString(), rebookDeadline: res.rebookDeadline, rebookOpen: !!res.rebookDeadline } } }));
    } catch {
      setAttFailed(r.id);
    }
    setAttBusy(null);
  };
  const effective = rows.map((r) => (reported[r.id] ? { ...r, status: reported[r.id].status, att: reported[r.id].att } : r));
  // Rueckmeldung offen zuoberst: das Einzige auf der Seite, das eine Handlung verlangt.
  const reportOpen = effective.filter((r) => r.att.attendanceReportable);
  const upcoming = effective.filter((r) => r.status === 'confirmed' && !r.att.attendanceReportable);
  const past = effective.filter((r) => r.status !== 'confirmed');

  const toggle = (label: string, on: boolean, onClick: () => void, disabled: boolean) => (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={'rounded-full border px-2.5 py-[3px] text-[11px] font-semibold transition-colors disabled:opacity-60 '
        + (on ? 'border-brand bg-brand text-white' : 'border-stroke bg-surface text-fg-secondary hover:border-brand hover:text-fg-brand')}
    >
      {label}
    </button>
  );

  const leadLine = (r: Row) => {
    const l = r.lead;
    if (!l) return null;
    const discounted = l.discountPct > 0 && l.finalFeeCents !== l.standardFeeCents;
    const counter = l.discountSequence
      ? t('termine.leadDiscountCounter', { pct: l.discountPct, n: l.discountSequence })
      : l.feeEnabled ? t('termine.leadStandardFee') : t('termine.leadNoFee');
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stroke-subtle bg-elevate/[0.03] px-6 py-2.5 text-[12px]">
        <span className="rounded-md bg-brand-light px-2 py-[2px] text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-brand">
          {t('termine.leadBand', { band: l.band, label: BAND_LABEL[l.band] })}
        </span>
        {discounted && <s className="text-fg-tertiary">{money(l.standardFeeCents, l.currency)}</s>}
        <span className="font-semibold tabular-nums text-fg">{l.feeEnabled ? money(l.finalFeeCents, l.currency) : money(0, l.currency)}</span>
        <span className="text-fg-secondary">{counter}</span>
        <span className="ml-auto text-fg-tertiary">{t(`termine.leadPayment.${l.paymentStatus === 'n/a' ? 'na' : l.paymentStatus}`)}</span>
      </div>
    );
  };

  const discountBlock = (r: Row) => {
    if (r.userDiscountPct === null) return null;
    const p = proposalOf(r);
    const busy = proposalBusy === r.id;
    const issued = !!p?.proposalIssued;
    const shown = !!p?.discountShown;
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-stroke-subtle bg-elevate/[0.03] px-6 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-fg">{t('termine.userDiscountTitle', { pct: r.userDiscountPct })}</p>
          <p className="text-[11px] text-fg-tertiary">{t('termine.userDiscountHint')}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary">
          <span>{t('termine.proposalIssued')}</span>
          {toggle(t('termine.yes'), issued, () => report(r, { proposalIssued: true, discountShown: shown }), busy)}
          {toggle(t('termine.notYet'), !!p && !issued, () => report(r, { proposalIssued: false, discountShown: false }), busy)}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary">
          <span>{t('termine.discountShown', { pct: r.userDiscountPct })}</span>
          {toggle(t('termine.yes'), shown, () => report(r, { proposalIssued: true, discountShown: true }), busy || !issued)}
          {toggle(t('termine.no'), issued && !shown, () => report(r, { proposalIssued: true, discountShown: false }), busy || !issued)}
        </div>
        {proposalFailed === r.id && (
          <p role="alert" className="w-full text-right text-[11px] text-error-500">{t('termine.proposalSaveFailed')}</p>
        )}
      </div>
    );
  };

  // ── Phase 5: Anwesenheit melden (1B) ───────────────────────────────────────
  const dateOnly = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  const plusDays = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString(); };
  const tf = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const attendanceBlock = (r: Row) => {
    const choice = attChoice[r.id] ?? null;
    const busy = attBusy === r.id;
    const deadline = dateOnly(plusDays(REBOOK_DAYS));
    const fee = r.lead && r.lead.feeEnabled && r.lead.paymentStatus === 'captured' ? r.lead : null;
    const start = new Date(r.start);
    const options: Array<{ key: AttendanceOutcome; title: string; body: string }> = [
      { key: 'attended', title: t('termine.attAttended'), body: t('termine.attAttendedBody') },
      { key: 'user_no_show', title: t('termine.attUserNoShow'), body: fee
        ? t('termine.attUserNoShowBody', { deadline, pct: CREDIT_PCT, amount: money(Math.round(fee.finalFeeCents * CREDIT_PCT / 100), fee.currency) })
        : t('termine.attUserNoShowBodyNoFee', { deadline }) },
      { key: 'platform_failure', title: t('termine.attPlatform'), body: t('termine.attPlatformBody') },
    ];
    return (
      <div className="space-y-3 border-t border-stroke-subtle bg-elevate/[0.03] px-6 py-4">
        <p className="text-[13px] font-semibold text-fg">{t('termine.attQuestion')}</p>
        <div id={`att-${r.id}`} role="radiogroup" aria-label={t('termine.attQuestion')} className="space-y-2"
          aria-invalid={attMissing === r.id || undefined} aria-describedby={attMissing === r.id ? `att-${r.id}-error` : undefined}>
          {options.map((o) => {
            const on = choice === o.key;
            return (
              <button
                key={o.key} type="button" role="radio" aria-checked={on} disabled={busy}
                onClick={() => { setAttChoice((m) => ({ ...m, [r.id]: o.key })); if (attMissing === r.id) setAttMissing(null); }}
                className={'flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors disabled:opacity-60 '
                  + (on ? 'border-brand bg-brand-light' : 'border-stroke bg-surface hover:border-brand/50')}
              >
                <span aria-hidden className={'mt-[2px] inline-block h-4 w-4 shrink-0 rounded-full border ' + (on ? 'border-[5px] border-brand bg-surface' : 'border-stroke-strong bg-surface')} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-fg">{o.title}</span>
                  <span className="block text-[12px] leading-relaxed text-fg-secondary">{o.body}</span>
                </span>
              </button>
            );
          })}
        </div>
        {choice === 'user_no_show' && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-stroke bg-surface px-3.5 py-2.5">
            <span className="text-[13px] text-fg">{t('termine.attTenMinute', { start: tf.format(start), until: tf.format(new Date(start.getTime() + 10 * 60_000)) })}</span>
            <span className="text-[11.5px] text-fg-tertiary">{t('termine.attTenMinuteHint')}</span>
          </div>
        )}
        <FieldError id={`att-${r.id}`} alert message={attMissing === r.id ? t('termine.attChoiceRequired') : null} />
        {attFailed === r.id && <p role="alert" className="text-[12px] text-fg-secondary">{t('termine.attFailed')}</p>}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" disabled={busy || !choice} onClick={() => setAttChoice((m) => ({ ...m, [r.id]: null }))}>{t('termine.attCancel')}</Button>
          <Button size="sm" disabled={busy} onClick={() => sendAttendance(r)}>
            {busy ? '…' : t(choice === 'user_no_show' ? 'termine.attReportNoShow' : 'termine.attReport')}
          </Button>
        </div>
      </div>
    );
  };
  // Nach der Meldung: eine Zeile, die sagt, wer fehlte und was daraus folgt.
  const attendanceLine = (r: Row) => {
    const a = r.att;
    let key: string | null = null;
    if (a.rebookedFrom) key = 'termine.attRebookedFrom';
    else if (a.noShowBy === 'user') key = a.disputeStatus === 'open' ? 'termine.attLineDispute' : a.rebookOpen ? 'termine.attLineUser' : 'termine.attLineUserClosed';
    else if (a.noShowBy === 'provider') key = 'termine.attLineProvider';
    else if (a.noShowBy === 'platform') key = 'termine.attLinePlatform';
    if (!key) return null;
    return (
      <p className="border-t border-stroke-subtle bg-elevate/[0.03] px-6 py-2.5 text-[12px] text-fg-secondary">
        {t(key, { deadline: a.rebookDeadline ? dateOnly(a.rebookDeadline) : '' })}
      </p>
    );
  };
  const statusTag = (r: Row) => r.att.attendanceReportable
    ? <Tag tone="warning" className={TAG_UP}>{t('termine.status.report_open')}</Tag>
    : r.att.disputeStatus === 'open'
      ? <Tag tone="warning" className={TAG_UP}>{t('termine.status.dispute_open')}</Tag>
      : <Tag tone={STATUS_TONE[r.status]} className={TAG_UP}>{t(`termine.status.${r.status}`)}</Tag>;

  // 2 V1 (2026-10-01): Datumsmarke · Firma · Kontakt · Zeit, Dauer und Thema.
  const minuten = (r: Row) => (r.minutes ? t('termine.minutes', { count: r.minutes }) : '');
  const thema = (r: Row) => [bereich(r.category), r.countries.map(markt).join(', ')].filter(Boolean).join(' · ');
  const card = (r: Row) => (
    <Card key={r.id} styleVariant="workspace">
      <div className="flex items-center gap-4 px-6 py-4">
      <DateMark iso={r.start} locale={locale} size="md" soon={r.id === upcoming[0]?.id} />
      <div className="min-w-0 flex-1">
        {/* Offenlegung noch nicht protokolliert: weder „Firma nicht angegeben"
            noch ein leeres „—" — beides stimmt nicht. Der Grund steht im Dossier. */}
        {r.disclosure !== 'released' ? (
          <p className="truncate text-[15px] font-medium text-fg-tertiary">{t(`termine.disclosure.${r.disclosure}.short`)}</p>
        ) : (<>
          <p className={`truncate text-[15px] ${r.company ? 'font-semibold text-fg' : 'font-medium text-fg-tertiary'}`}>{r.company ?? t('termine.companyMissing')}</p>
          <p className="truncate text-[13px] text-fg-secondary">{r.email}</p>
        </>)}
        <p className="truncate text-[12px] text-fg-tertiary">{[r.dateLine, r.timeLine, minuten(r), thema(r)].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {r.leadCharged && !r.lead && <span className="text-[11px] text-fg-tertiary">{t('termine.leadCharged')}</span>}
          {statusTag(r)}
        </div>
        <Button size="sm" onClick={() => openDossier(r)}>{t('termine.openDossier')}</Button>
      </div>
      </div>
      {r.att.attendanceReportable ? attendanceBlock(r) : attendanceLine(r)}
      {leadLine(r)}
      {discountBlock(r)}
    </Card>
  );

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div>
          <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
            <Trans t={t} i18nKey="termine.title" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
          </h1>
          <p className="mt-1 text-body-sm text-fg-secondary">{t('termine.sub')}</p>
        </div>
        {state === 'loading' && <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {state === 'error' && <LoadFailedState surface="appointments" error={error} onRetry={reload} section />}
        {state === 'ready' && (
          <>
            {reportOpen.length > 0 && (
              <>
                <p className={EYEBROW + ' text-warning-800 dark:text-amber-300'}>{t('termine.reportOpen')} · {reportOpen.length}</p>
                <div className="space-y-2.5">{reportOpen.map(card)}</div>
              </>
            )}
            <p className={EYEBROW + ' text-fg-brand' + (reportOpen.length ? ' pt-3' : '')}>{t('termine.upcoming')}{upcoming.length ? ` · ${upcoming.length}` : ''}</p>
            {/* B3: noch nie ein Termin — der leere Zustand erklaert, wie einer
                entsteht, und was dafuer fehlt. Gibt es vergangene, aber keine
                kommenden, reicht die ruhige Zeile. */}
            <div className="space-y-2.5">{upcoming.length ? upcoming.map(card)
              : rows.length === 0 ? <ReadinessEmpty kind="appointments" items={readiness} />
              : <p className="text-body-sm text-fg-tertiary">{t('termine.emptyUpcoming')}</p>}</div>
            <p className={EYEBROW + ' pt-3 text-fg-tertiary'}>{t('termine.past')}{past.length ? ` · ${past.length}` : ''}</p>
            <div className="space-y-2.5">{past.length ? past.map(card) : <p className="text-body-sm text-fg-tertiary">{t('termine.emptyPast')}</p>}</div>
          </>
        )}
      </div>

      <Drawer
        open={!!dossierFor}
        onClose={() => openDossier(null)}
        eyebrow={t('termine.dossierEyebrow')}
        // Ohne Firmennamen traegt die E-Mail die Ueberschrift — "Company not
        // provided" als Titel sagte, was fehlt, statt wer gebucht hat
        // (Beta-Testbuchung 23.10.2026). Der Hinweis bleibt in der Liste.
        title={dossierFor ? (dossierFor.disclosure !== 'released' ? t(`termine.disclosure.${dossierFor.disclosure}.short`) : dossierFor.company ?? (dossierFor.email && dossierFor.email !== '—' ? dossierFor.email : t('termine.companyMissing'))) : ''}
      >
        {dossierFor && (
          <div className="space-y-4">
            <div className={DRAWER_BOX}>
              <p className={DRAWER_EYEBROW}>{t('termine.dossierContact')}</p>
              <p className="mt-1 text-[14px] text-fg">{dossierFor.disclosure !== 'released' ? t(`termine.disclosure.${dossierFor.disclosure}.reason`) : dossierFor.email}</p>
              <p className="text-[12px] text-fg-tertiary">{dossierFor.dateLine} · {dossierFor.timeLine}</p>
            </div>
            <div className={DRAWER_BOX}>
              <p className={DRAWER_EYEBROW}>{t('termine.dossierContext')}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{dossierFor.disclosure !== 'released' ? t(`termine.disclosure.${dossierFor.disclosure}.context`) : dossierFor.meta}</p>
            </div>
            <p className="text-[12px] text-fg-tertiary">{t('termine.dossierNote')}</p>
            {dossierFor.status === 'completed' && (
              <div className={DRAWER_BOX}>
                <p className={DRAWER_EYEBROW}>{t('termine.rateLead')}</p>
                {rateState === 'already' ? (
                  <div role="status" className="mt-2 text-[12px] leading-relaxed">
                    <p className="font-semibold text-fg">{t('termine.rateAlready.heading')}</p>
                    <p className="text-fg-secondary">{t('termine.rateAlready.message')}</p>
                  </div>
                ) : rateState === 'notHeld' ? (
                  <div role="status" className="mt-2 text-[12px] leading-relaxed">
                    <p className="font-semibold text-fg">{t('termine.rateNotHeld.heading')}</p>
                    <p className="text-fg-secondary">{t('termine.rateNotHeld.message')}</p>
                  </div>
                ) : dossierFor.reviewed || leadRated.has(dossierFor.id) ? (
                  <p role="status" className="mt-2 text-[12px] text-fg-brand">{t('termine.rated')}</p>
                ) : (
                  <>
                    <div className="mt-2 flex items-center gap-2">
                      <div id="lead-rating" className="flex items-center gap-1" role="group" aria-label={t('termine.rateLead')}
                        aria-describedby={ratingMissing ? 'lead-rating-error' : undefined}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" aria-label={t('termine.rateStar', { n })} aria-pressed={n === leadRating}
                            onClick={() => { setLeadRating(n); setRatingMissing(false); if (typeof rateState === 'object') setRateState('idle'); }}
                            className={`text-[20px] leading-none ${n <= leadRating ? 'text-fg-accent' : 'text-stroke-strong hover:text-fg-tertiary'}`}>★</button>
                        ))}
                      </div>
                      <Button size="sm" variant="secondary" disabled={rateState === 'sending'} onClick={() => rateLead(dossierFor)}>
                        {rateState === 'sending' ? '…' : typeof rateState === 'object' ? t('common:states.actions.tryAgain') : t('termine.rateSubmit')}
                      </Button>
                    </div>
                    <FieldError id="lead-rating" alert message={ratingMissing ? t('termine.rateRequired') : null} className="mt-1.5" />
                    {typeof rateState === 'object' && (
                      <FailureNote className="mt-3" heading={t('termine.rateFailed.heading')} message={t('termine.rateFailed.message')} reference={rateState.failed} />
                    )}
                  </>
                )}
                <p className="mt-2 text-[11px] text-fg-tertiary">{t('termine.rateNote')}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </ProviderShell>
  );
}
