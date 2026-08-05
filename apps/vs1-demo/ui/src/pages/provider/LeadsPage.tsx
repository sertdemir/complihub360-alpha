import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Tag } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { useApiData } from '../../lib/useApiData';
import { fetchProviderBookings, submitReview, type BookingStatus } from '../../api/bookings';
import { DEMO_PROVIDER_KEY } from '../../api/provider';

// ─── Provider · Termine & Leads ──────────────────────────────────────────────
// Matchmaking v2: the booking IS the paid lead. The dossier (user identity +
// intake context) is delivered at booking time — no confirm gate, no unlock.
// Replaces the retired request/confirm pipeline as the primary nav item.

interface Row {
  id: string;
  dateLine: string;
  timeLine: string;
  company: string;      // user identity — revealed at booking
  email: string;
  meta: string;
  status: BookingStatus;
  leadCharged: boolean;
}

const FIXTURE: Row[] = [
  { id: 'fx-1', dateLine: 'Mo, 12. Aug 2026', timeLine: '10:00–10:30 · Video-Call', company: 'Acme GmbH — E-Commerce, München', email: 'alex.weber@acme.example', meta: 'VAT-Registrierung Italien · D2C + Amazon · €145k IT-Umsatz', status: 'confirmed', leadCharged: true },
  { id: 'fx-2', dateLine: 'Mi, 14. Aug 2026', timeLine: '09:30–10:00 · Video-Call', company: 'Brunnen Living Ltd. — Möbel, London', email: 'ops@brunnen.example', meta: 'OSS-Meldung + Fiskalvertretung · Marketplace EU-weit', status: 'confirmed', leadCharged: true },
  { id: 'fx-3', dateLine: 'Di, 29. Jul 2026', timeLine: '11:00–11:30 · Video-Call', company: 'Acme GmbH — E-Commerce, München', email: 'alex.weber@acme.example', meta: 'VAT-Registrierung Italien · stattgefunden', status: 'completed', leadCharged: true },
];

const STATUS_TONE: Record<BookingStatus, 'success' | 'neutral' | 'error' | 'warning'> = {
  confirmed: 'success', completed: 'neutral', cancelled: 'error', no_show: 'warning',
};

export function LeadsPage() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const { data: rows } = useApiData<Row[]>(async () => {
    const df = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const tf = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
    return (await fetchProviderBookings(DEMO_PROVIDER_KEY)).map((b) => {
      const start = new Date(b.slotStart); const end = b.slotEnd ? new Date(b.slotEnd) : null;
      return {
        id: b.id,
        dateLine: df.format(start),
        timeLine: `${tf.format(start)}${end ? `–${tf.format(end)}` : ''} · Video-Call`,
        company: b.userEmail ? b.userEmail.split('@')[1] ?? b.userEmail : '—',
        email: b.userEmail ?? '—',
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
    submitReview({ bookingId: r.id, providerKey: DEMO_PROVIDER_KEY, fromRole: 'provider', rating: leadRating, categories: [] }).catch(() => {});
  };
  const upcoming = rows.filter((r) => r.status === 'confirmed');
  const past = rows.filter((r) => r.status !== 'confirmed');

  const card = (r: Row) => (
    <div key={r.id} className="flex items-center gap-5 rounded-xl border border-stroke bg-surface-secondary/40 px-6 py-4">
      <div className="w-[175px] shrink-0">
        <p className="text-[14px] font-medium text-fg">{r.dateLine}</p>
        <p className="text-[12px] text-fg-tertiary">{r.timeLine}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-fg">{r.company}</p>
        <p className="truncate text-[12px] text-fg-tertiary">{r.meta}</p>
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
            <Trans t={t} i18nKey="termine.title" components={{ accent: <span className="text-fg-accent" /> }} />
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
        title={dossierFor?.company ?? ''}
        forceDark
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
                          className={`text-[20px] leading-none ${n <= leadRating ? 'text-[#d4af37]' : 'text-white/20 hover:text-white/40'}`}>★</button>
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
