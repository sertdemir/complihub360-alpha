import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Tag } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { useApiData } from '../../lib/useApiData';
import { fetchProviderBookings, submitReview, type BookingStatus } from '../../api/bookings';
import { DateMark } from '../../components/ui/DateMark';
import { useRequestContext } from '../../lib/requestContext';

// ─── Provider · Termine & Leads ──────────────────────────────────────────────
// Matchmaking v2: the booking IS the paid lead. The dossier (user identity +
// intake context) is delivered at booking time — no confirm gate, no unlock.
// Replaces the retired request/confirm pipeline as the primary nav item.

interface Row {
  id: string;
  start: string;        // ISO — Datumsmarke
  dateLine: string;
  timeLine: string;
  /** Dauer aus Slot-Beginn und -Ende; fehlt das Ende, steht keine Dauer da. */
  minutes?: number;
  /** Firma aus der Anfrage (2 V1). null: nicht angegeben — nie aus der Domain geraten. */
  company: string | null;
  email: string;
  category?: string;
  country?: string;
  meta: string;
  status: BookingStatus;
  leadCharged: boolean;
}

// Kein "Video-Call" mehr: das Format kennen wir nicht, nur die Dauer.
const FIXTURE: Row[] = [
  { id: 'fx-1', start: '2026-08-12T10:00:00', dateLine: 'Mo., 12. Aug. 2026', timeLine: '10:00–10:30', minutes: 30, company: 'Acme GmbH', email: 'alex.weber@acme.example', category: 'tax-vat', country: 'IT', meta: 'VAT-Registrierung Italien · D2C + Amazon · €145k IT-Umsatz', status: 'confirmed', leadCharged: true },
  { id: 'fx-2', start: '2026-08-14T09:30:00', dateLine: 'Mi., 14. Aug. 2026', timeLine: '09:30–10:00', minutes: 30, company: 'Brunnen Living Ltd.', email: 'ops@brunnen.example', category: 'tax-vat', country: 'GB', meta: 'OSS-Meldung + Fiskalvertretung · Marketplace EU-weit', status: 'confirmed', leadCharged: true },
  { id: 'fx-3', start: '2026-07-29T11:00:00', dateLine: 'Di., 29. Juli 2026', timeLine: '11:00–11:30', minutes: 30, company: null, email: 'alex.weber@acme.example', category: 'tax-vat', country: 'IT', meta: 'VAT-Registrierung Italien · stattgefunden', status: 'completed', leadCharged: true },
];

const STATUS_TONE: Record<BookingStatus, 'success' | 'neutral' | 'error' | 'warning'> = {
  confirmed: 'success', completed: 'neutral', cancelled: 'error', no_show: 'warning',
};

export function LeadsPage() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const { bereich, markt } = useRequestContext();
  const { data: rows } = useApiData<Row[]>(async () => {
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
        email: b.userEmail ?? '—',
        category: b.category ?? undefined,
        country: b.country ?? undefined,
        meta: b.message ?? '—',
        status: b.status,
        leadCharged: b.leadCharged,
      };
    });
  }, FIXTURE);
  const [dossierFor, setDossierFor] = useState<Row | null>(null);
  // Two-sided reviews (alerts concept §2): provider rates the lead after the
  // appointment — feeds the internal lead-quality signal.
  const [leadRating, setLeadRating] = useState(0);
  const [leadRated, setLeadRated] = useState<Set<string>>(new Set());
  const rateLead = (r: Row) => {
    if (leadRating < 1) return;
    setLeadRated((s) => new Set(s).add(r.id));
    submitReview({ bookingId: r.id, fromRole: 'provider', rating: leadRating, categories: [] }).catch(() => {});
  };
  const upcoming = rows.filter((r) => r.status === 'confirmed');
  const past = rows.filter((r) => r.status !== 'confirmed');

  // 2 V1 (2026-10-01): Datumsmarke · Firma · Kontakt · Zeit, Dauer und Thema.
  const minuten = (r: Row) => (r.minutes ? t('termine.minutes', { count: r.minutes }) : '');
  const thema = (r: Row) => [bereich(r.category), markt(r.country)].filter(Boolean).join(' · ');
  const card = (r: Row) => (
    <div key={r.id} className="flex items-center gap-4 rounded-xl border border-stroke bg-surface-secondary/40 px-5 py-4">
      <DateMark iso={r.start} locale={locale} size="md" soon={r.id === upcoming[0]?.id} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] ${r.company ? 'font-semibold text-fg' : 'font-medium text-fg-tertiary'}`}>{r.company ?? t('termine.companyMissing')}</p>
        <p className="truncate text-[13px] text-fg-secondary">{r.email}</p>
        <p className="truncate text-[12px] text-fg-tertiary">{[r.dateLine, r.timeLine, minuten(r), thema(r)].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {r.leadCharged && <span className="text-[11px] text-fg-tertiary">{t('termine.leadCharged')}</span>}
          <Tag tone={STATUS_TONE[r.status]}>{t(`termine.status.${r.status}`)}</Tag>
        </div>
        <Button size="sm" onClick={() => setDossierFor(r)}>{t('termine.openDossier')}</Button>
      </div>
    </div>
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('termine.upcoming')}</p>
        <div className="space-y-2.5">{upcoming.length ? upcoming.map(card) : <p className="text-body-sm text-fg-tertiary">{t('termine.emptyUpcoming')}</p>}</div>
        <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('termine.past')}</p>
        <div className="space-y-2.5">{past.length ? past.map(card) : <p className="text-body-sm text-fg-tertiary">{t('termine.emptyPast')}</p>}</div>
      </div>

      <Drawer
        open={!!dossierFor}
        onClose={() => setDossierFor(null)}
        eyebrow={t('termine.dossierEyebrow')}
        title={dossierFor ? (dossierFor.company ?? t('termine.companyMissing')) : ''}
      >
        {dossierFor && (
          <div className="space-y-4">
            <div className="rounded-lg border border-stroke bg-surface-secondary/40 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('termine.dossierContact')}</p>
              <p className="mt-1 text-[14px] text-fg">{dossierFor.email}</p>
              <p className="text-[12px] text-fg-tertiary">{dossierFor.dateLine} · {dossierFor.timeLine}</p>
            </div>
            <div className="rounded-lg border border-stroke bg-surface-secondary/40 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('termine.dossierContext')}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{dossierFor.meta}</p>
            </div>
            <p className="text-[12px] text-fg-tertiary">{t('termine.dossierNote')}</p>
            {dossierFor.status === 'completed' && (
              <div className="rounded-lg border border-stroke bg-surface-secondary/40 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('termine.rateLead')}</p>
                {leadRated.has(dossierFor.id) ? (
                  <p className="mt-2 text-[12px] text-fg-brand">{t('termine.rated')}</p>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" aria-label={`${n}`} onClick={() => setLeadRating(n)}
                          className={`text-[20px] leading-none ${n <= leadRating ? 'text-fg-accent' : 'text-white/20 hover:text-white/40'}`}>★</button>
                      ))}
                    </div>
                    <Button size="sm" variant="secondary" disabled={leadRating < 1} onClick={() => rateLead(dossierFor)}>OK</Button>
                  </div>
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
