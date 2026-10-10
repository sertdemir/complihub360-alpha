import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarDays, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button, outlineBrandClass } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Monogram } from './PartnerCard';
import { useAuthStore } from '../../store/useAuthStore';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import type { BookingAcknowledgement, BookingConfirmation, SharedPreview } from '../../api/bookings';

// ─── Pruefen, was geteilt wird (I2) · Buchung bestaetigt (E3) ────────────────
// Figma: Section 3634:2866 — I2 3634:3519, E3 3634:3117. Abgenommen 09.10.2026.
//
// Checklist v1.0 "Information Sharing Confirmation": vor der Buchung eine
// Liste dessen, was der Anbieter bekommt, ein Bestaetigungs-Haekchen (nie
// vorausgewaehlt) und "Confirm and Book · Go Back". Danach (Booking confirmed):
// "We have shared only the information shown in your booking confirmation" —
// die Bestaetigung zeigt deshalb DIESELBE Liste.
//
// Die Liste ist mehr als `shared_fields` (email, company_name, message): der
// Anbieter sieht mit dem Lead auch das Thema — Bereich und Maerkte. Bis
// 2026-10-10 stand das nirgends; eine Bestaetigung, die es verschweigt, waere
// genau die Behauptung, die die Checkliste verbietet.

export interface SharedRow {
  key: string;
  label: string;
  value: string;
  /** Wert fehlt — die Zeile sagt das, statt leer zu stehen. */
  missing?: boolean;
}

export interface SharingTopic {
  area: string | null;
  markets: string[];
}

/** Die Zeilen, die der Anbieter bekommt — mit den echten Werten des Kontos. */
export function useSharedRows() {
  const { t, i18n } = useTranslation(['results']);
  const user = useAuthStore((s) => s.user);
  const userName = useAuthStore((s) => s.userName);
  const locale = i18n.resolvedLanguage || 'en';
  const region = (() => {
    try { return new Intl.DisplayNames([locale], { type: 'region' }); } catch { return null; }
  })();
  const market = (c: string) => {
    try { return region?.of(c) ?? c; } catch { return c; }
  };
  const area = (slug: string) => {
    const d = DOMAIN_BY_SLUG[slug];
    return d ? t(`results:domains.${d.i18nKey}`, { defaultValue: d.label }) : slug;
  };
  /** `topic`: 'unspecified', wo die Flaeche das Thema vorab nicht kennt — die
   *  Zeile steht trotzdem da, denn der Anbieter sieht es. */
  /** `preview`: die Werte vom Server (B1, Schritt 4) — was die Buchung
   *  festhaelt bzw. festgehalten hat. Liegen sie vor, zeigt die Liste NUR sie;
   *  sonst (Demo, aelterer Server) die Werte aus der Sitzung des Browsers. */
  return (fields: string[], opts: { message: string; topic: SharingTopic | 'unspecified' | null; preview?: SharedPreview | null }): SharedRow[] => {
    const fromServer = opts.preview ?? null;
    const company = fromServer
      ? (fromServer.company_name ?? '').trim()
      : (user?.user_metadata?.company_name as string | undefined)?.trim()
        // Demo-Login ohne echte Sitzung: der Design-Platzhalter wie in der Shell.
        || (!user && userName ? 'Acme GmbH' : '');
    const email = fromServer ? (fromServer.email ?? '') : (user?.email ?? '');
    const value = (key: string): { value: string; missing?: boolean } => {
      if (key === 'company_name') return company ? { value: company } : { value: t('results:sharing.notProvided'), missing: true };
      if (key === 'email') return email ? { value: email } : { value: t('results:sharing.notProvided'), missing: true };
      if (key === 'message') {
        const m = opts.message.trim();
        return m ? { value: m.length > 140 ? `${m.slice(0, 140)} …` : m } : { value: t('results:sharing.noMessage'), missing: true };
      }
      return { value: '—', missing: true };
    };
    const rows: SharedRow[] = fields.map((key) => ({ key, label: t(`results:sharing.fields.${key}`, { defaultValue: key }), ...value(key) }));
    if (opts.topic === 'unspecified') {
      rows.push({ key: 'topic', label: t('results:sharing.fields.topic'), value: t('results:sharing.topicUnspecified') });
    } else if (opts.topic && (opts.topic.area || opts.topic.markets.length)) {
      rows.push({
        key: 'topic',
        label: t('results:sharing.fields.topic'),
        value: [opts.topic.area ? area(opts.topic.area) : null, opts.topic.markets.map(market).join(', ') || null].filter(Boolean).join(' · '),
      });
    }
    return rows;
  };
}

export function SharedFieldList({ rows, className = '' }: { rows: SharedRow[]; className?: string }) {
  return (
    <dl className={`flex flex-col ${className}`}>
      {rows.map((r, i) => (
        <div key={r.key} className={'grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2 ' + (i ? 'border-t border-stroke-subtle' : '')}>
          <dt className="text-body-3xs text-fg-tertiary">{r.label}</dt>
          <dd className={'min-w-0 break-words text-body-xs ' + (r.missing ? 'italic text-fg-tertiary' : 'font-semibold text-fg')}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** I2 — der Dialog vor der Buchung. "Confirm and Book" bucht erst mit
 *  Haekchen; ohne steht der Fehler am Haekchen und der Fokus geht dorthin —
 *  kein grauer, unerklaerter Knopf. */
export function SharingReviewDialog({ open, onGoBack, onConfirm, sending, ack, rows }: {
  open: boolean;
  onGoBack: () => void;
  onConfirm: () => void;
  sending: boolean;
  ack: BookingAcknowledgement | null;
  rows: SharedRow[];
}) {
  const { t } = useTranslation(['common', 'results']);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);
  const boxRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setChecked(false); setError(false); } }, [open]);
  const confirm = () => {
    if (!checked) {
      setError(true);
      boxRef.current?.focus();
      return;
    }
    onConfirm();
  };
  return (
    <Modal
      open={open}
      onClose={sending ? () => {} : onGoBack}
      size="md"
      hideClose
      title={<span className="font-serif text-[24px] font-bold">{t('common:states.sharingReview.heading')}</span>}
      footer={
        <>
          <Button variant="ghost" onClick={onGoBack} disabled={sending}>{t('common:states.sharingReview.goBack')}</Button>
          <Button onClick={confirm} loading={sending}>{t('common:states.sharingReview.confirmAndBook')}</Button>
        </>
      }
    >
      <p className="text-body-sm leading-relaxed text-fg-secondary">{t('common:states.sharingReview.body')}</p>
      <div className="mt-4 rounded-xl border border-stroke-subtle bg-surface-secondary px-4 py-1.5">
        <SharedFieldList rows={rows} />
      </div>
      {ack && ack.lines.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2" aria-label={t('results:sharing.termsTitle', { version: ack.version.replace(/^booking-ack-/, '') })}>
          {ack.lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check size={14} strokeWidth={2.4} className="mt-[3px] shrink-0 text-fg-brand" aria-hidden />
              <span className="text-body-3xs leading-relaxed text-fg-secondary">{line}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={'mt-4 rounded-lg border px-3.5 py-3 ' + (error ? 'border-error-500' : 'border-stroke')}>
        <Checkbox
          ref={boxRef}
          checked={checked}
          error={error}
          aria-describedby={error ? 'sharing-confirm-error' : undefined}
          onChange={(e) => { setChecked(e.target.checked); if (e.target.checked) setError(false); }}
          label={<span className="text-body-sm font-semibold">{t('common:states.sharingReview.confirmation')}</span>}
        />
        {error && (
          <p id="sharing-confirm-error" role="alert" className="mt-2 text-body-3xs text-error-700 dark:text-error-300">
            {t('results:sharing.confirmRequired')}
          </p>
        )}
      </div>
    </Modal>
  );
}

/** E3 — die Bestaetigung als eigene Seite: links Zustand, Termin und der
 *  Anbieter mit Namen, rechts, was geteilt wurde. */
export function BookingConfirmedView({ confirmation, provider, sessionLabel, rows, onViewProfile, onViewBooking }: {
  confirmation: BookingConfirmation;
  provider: { letter: string; title: string };
  sessionLabel?: string | null;
  rows: SharedRow[];
  onViewProfile: () => void;
  onViewBooking: () => void;
}) {
  const { t, i18n } = useTranslation(['common', 'results']);
  const locale = i18n.resolvedLanguage || 'en';
  const start = new Date(confirmation.booking.slot_start);
  const when = `${start.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · ${start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · ${t('results:schedule.duration')}`;
  const id = confirmation.provider_identity;
  const initials = id.name.split(/\s+/).filter((w) => /^[A-Za-zÀ-ž]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || provider.letter;
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px]">
      <section aria-labelledby="booked-heading" className="flex flex-col gap-4">
        <span className="text-body-2xs font-semibold uppercase tracking-[0.16em] text-fg-brand">{t('results:schedule.doneEyebrow')}</span>
        <h1 id="booked-heading" className="font-serif text-[2.375rem] font-bold leading-[1.12] text-fg">{t('common:states.bookingConfirmed.heading')}</h1>
        <p className="max-w-[600px] text-body-md leading-relaxed text-fg-secondary">{t('common:states.bookingConfirmed.message')}</p>
        <p className="inline-flex w-fit items-center gap-2.5 rounded-lg bg-brand-light px-3.5 py-3 text-body-xs font-semibold text-fg-brand">
          <CalendarDays size={15} aria-hidden /> {when}
        </p>
        <div className="rounded-xl border border-stroke-subtle bg-surface px-[18px] py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{t('results:schedule.revealLabel')}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-stroke-brand font-serif text-body font-bold text-fg-brand">{initials}</span>
            <div className="min-w-0">
              <p className="text-body font-bold text-fg">{id.name}</p>
              <p className="flex items-center gap-1.5 text-body-3xs text-fg-tertiary">
                <Monogram letter={provider.letter} size={18} />
                {sessionLabel ? t('results:reveal.wasInRiskMap', { title: provider.title, riskMap: sessionLabel }) : t('results:reveal.was', { title: provider.title })}
              </p>
            </div>
          </div>
          {(id.contact_email || id.website_url) && (
            <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-body-xs text-fg-secondary">
              {id.contact_email && <span>{id.contact_email}</span>}
              {id.website_url && (
                <a href={id.website_url} target="_blank" rel="noreferrer" className="font-semibold text-fg-brand underline underline-offset-2">
                  {id.website_url.replace(/^https?:\/\//, '')}
                </a>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5 pt-1">
          <Button size="lg" shape="soft" onClick={onViewProfile}>{t('common:states.actions.viewProviderProfile')}</Button>
          <Button size="lg" shape="soft" variant="outline" className={outlineBrandClass} onClick={onViewBooking}>
            {t('common:states.actions.viewBooking')} <ArrowRight size={15} />
          </Button>
        </div>
      </section>
      <aside className="flex flex-col gap-3.5 lg:pt-9">
        <div className="rounded-xl border border-stroke-subtle bg-surface-secondary px-5 py-[18px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{t('results:sharing.sharedTitle')}</p>
          <SharedFieldList rows={rows} className="mt-2" />
          <p className="mt-2 text-[11px] text-fg-tertiary">{t('results:sharing.notOthers')}</p>
        </div>
        <p className="text-body-3xs leading-relaxed text-fg-tertiary">{t('results:schedule.doneNote')}</p>
      </aside>
    </div>
  );
}
