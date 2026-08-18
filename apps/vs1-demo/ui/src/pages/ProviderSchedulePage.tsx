import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Eye } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useApiData } from '../lib/useApiData';
import { fetchSlots, createBooking, type BookingConfirmation } from '../api/bookings';

// ─── Native Scheduling (stage 3) — Phase-3 wiring ────────────────────────────
// Mirrors the Figma "Scheduling — Buchung" screens: slot picker (from
// GET /provider/:key/slots) + booking summary. Booking = the paid lead + the
// two-sided identity reveal (spec §11 P7) — confirmed instantly, charged even
// on a later no-show (the provider receives the dossier at booking).

function fixtureSlots(): string[] {
  const out: string[] = [];
  const d = new Date(); d.setHours(0, 0, 0, 0);
  let days = 0;
  while (days < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    days++;
    for (const [h, m] of [[9, 0], [9, 30], [10, 0], [10, 30], [11, 0], [14, 0], [14, 30], [15, 0]] as const) {
      const s = new Date(d); s.setHours(h, m, 0, 0); out.push(s.toISOString());
    }
  }
  return out;
}

export function ProviderSchedulePage() {
  const { key = '' } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('results');
  const locale = i18n.resolvedLanguage || 'en';
  const { data: slots } = useApiData<string[]>(() => fetchSlots(key), fixtureSlots());
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const df = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }), [locale]);
  const tf = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }), [locale]);
  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const iso of slots) {
      const day = df.format(new Date(iso));
      m.set(day, [...(m.get(day) ?? []), iso]);
    }
    return [...m.entries()].slice(0, 5);
  }, [slots, df]);

  const book = async () => {
    if (!selected) return;
    setState('sending');
    try {
      const res = await createBooking(key, selected, message.trim() || undefined);
      setConfirmation(res);
    } catch {
      // fixture mode: simulate the reveal so the funnel stays demo-able
      setConfirmation({
        booking: { id: 'demo', provider_key: key, slot_start: selected, slot_end: selected, status: 'confirmed' },
        provider_identity: { name: 'Studio Bianchi SRL — Steuerkanzlei, Mailand', website_url: null, contact_email: 'kontakt@studiobianchi.example' },
      });
    }
    setState('done');
  };

  if (state === 'done' && confirmation) {
    return (
      <div className="min-h-screen bg-surface text-fg">
        <header className="flex items-center justify-between border-b border-stroke-subtle bg-surface-secondary px-8 py-4">
          <Logo className="h-[30px] w-auto" />
        </header>
        <main className="mx-auto max-w-[640px] px-6 py-16">
          <div className="rounded-2xl border border-brand bg-surface-secondary p-8 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-brand">{t('schedule.doneEyebrow')}</p>
            <h1 className="mt-2 font-serif text-[26px] font-bold text-fg">{t('schedule.doneTitle')}</h1>
            <p className="mt-2 text-[14px] text-fg-secondary">
              {df.format(new Date(confirmation.booking.slot_start))} · {tf.format(new Date(confirmation.booking.slot_start))}
            </p>
            {/* Stage-3 reveal */}
            <div className="mt-6 rounded-xl border border-stroke-subtle bg-surface px-5 py-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('schedule.revealLabel')}</p>
              <p className="mt-1 text-[16px] font-semibold text-fg">{confirmation.provider_identity.name}</p>
              {confirmation.provider_identity.contact_email && (
                <p className="text-[13px] text-fg-secondary">{confirmation.provider_identity.contact_email}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate(`/${locale}/dashboard/termine`)}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-[14px] font-semibold text-fg-on-brand"
            >
              {t('schedule.toAppointments')} <ArrowRight size={15} />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-fg">
      <header className="flex items-center justify-between border-b border-stroke-subtle bg-surface-secondary px-8 py-4">
        <Logo className="h-[30px] w-auto" />
        <button type="button" onClick={() => navigate(-1)} className="text-[13px] font-medium text-fg-brand hover:underline">
          ← {t('schedule.back')}
        </button>
      </header>
      <main className="mx-auto max-w-[1080px] space-y-6 px-6 py-10">
        <div>
          <h1 className="font-serif text-[28px] font-bold text-fg">{t('schedule.title')}</h1>
          <p className="mt-1 text-[14px] text-fg-secondary">{t('schedule.sub')}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          <section className="rounded-2xl border border-stroke-subtle bg-surface-secondary p-7">
            {byDay.map(([day, isos]) => (
              <div key={day} className="mb-5">
                <p className="mb-2 text-[13px] font-semibold text-fg">{day}</p>
                <div className="flex flex-wrap gap-2">
                  {isos.map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelected(iso)}
                      className={`rounded-lg border px-4 py-2 text-[13px] transition-colors ${selected === iso ? 'border-brand font-semibold text-fg-brand' : 'border-stroke-subtle text-fg-secondary hover:border-stroke'}`}
                    >
                      {tf.format(new Date(iso))}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
          <aside className="h-fit space-y-4 rounded-2xl border border-stroke-subtle bg-surface-secondary p-7">
            <h2 className="text-[15px] font-semibold text-fg">{t('schedule.summaryTitle')}</h2>
            <p className="text-[13px] text-fg-secondary">
              {selected ? `${df.format(new Date(selected))} · ${tf.format(new Date(selected))} · 30 Min` : t('schedule.pickSlot')}
            </p>
            <div className="flex items-start gap-2.5 rounded-lg border border-brand/40 px-3.5 py-3">
              <Eye size={16} className="mt-0.5 shrink-0 text-fg-brand" />
              <p className="text-[12px] leading-relaxed text-fg-secondary">{t('schedule.revealNote')}</p>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={t('schedule.messagePh')}
              className="w-full rounded-lg border border-stroke-subtle bg-transparent px-3.5 py-2.5 text-[13px] text-fg placeholder:text-fg-tertiary focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              disabled={!selected || state === 'sending'}
              onClick={book}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[14px] font-semibold text-fg-on-brand disabled:opacity-50"
            >
              {t('schedule.confirmCta')}
            </button>
            <p className="text-center text-[11px] text-fg-tertiary">{t('schedule.freeNote')}</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
