import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useApiData } from '../lib/useApiData';
import { fetchSlots, fetchAcknowledgement, createBooking, bookingFailureFrom, type BookingAcknowledgement, type BookingFailure } from '../api/bookings';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { AcknowledgementList, BookingFailureCard } from '../components/user/BookingAcknowledgement';
import { SharingReviewDialog, useSharedRows } from '../components/user/SharingReview';
import { goToBookingConfirmed } from '../lib/bookingConfirmed';

// ─── Native Scheduling (stage 3) — Phase-3 wiring ────────────────────────────
// Mirrors the Figma "Scheduling — Buchung" screens: slot picker (from
// GET /p/:ref/slots) + booking summary. Booking = the paid lead + the
// two-sided identity reveal (spec §11 P7) — confirmed instantly, charged even
// on a later no-show (the provider receives the dossier at booking).
//
// Phase 4 (ADR-0005, Canvas-Wahl 1B · 2A): die Bestaetigung mit Fassung steht
// ueber dem Button, die Buchung traegt sie zurueck; scheitert die Belastung
// des Anbieters, gibt es keinen Termin — der Button weicht einem neutralen
// Kasten, Auswahl und Nachricht bleiben.

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
  const { ref: key = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('results');
  const locale = i18n.resolvedLanguage || 'en';
  const { data: slots } = useApiData<string[]>(() => fetchSlots(key), fixtureSlots());
  // `?slot=` kommt von einem Termin-Chip: wer dort einen Termin angetippt hat,
  // soll ihn hier nicht noch einmal suchen muessen.
  const [selected, setSelected] = useState<string | null>(params.get('slot'));
  // `?session=` kommt von der Detailseite: die Sitzung, aus der die Suche kam.
  const sessionId = params.get('session');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending'>('idle');
  const [failure, setFailure] = useState<BookingFailure | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const sharedRows = useSharedRows();
  const [ack, setAck] = useState<BookingAcknowledgement | null>(null);
  const [ackKey, setAckKey] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchAcknowledgement(locale).then((a) => { if (alive) setAck(a); }).catch(() => { if (alive) setAck(null); });
    return () => { alive = false; };
  }, [locale, ackKey]);

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
    if (!selected || !ack) return;
    setState('sending');
    setFailure(null);
    try {
      const res = await createBooking(key, selected, { message: message.trim() || undefined, acknowledgementVersion: ack.version, language: locale, sessionId: sessionId ?? undefined });
      setReviewOpen(false);
      // E3: dieselbe Bestaetigungsseite wie aus der Schublade. Den Titel des
      // Anbieters kennt diese Seite nicht — der Buchstabe faellt dann weg,
      // der Klarname steht ohnehin da.
      goToBookingConfirmed(navigate, locale, {
        confirmation: res,
        provider: { letter: '', title: t('snapshot.verifiedPartner') },
        sessionLabel: null,
        message: message.trim(),
      });
    } catch (err) {
      // Frueher stand hier eine Fixture-Identitaet („Studio Bianchi SRL") fuer
      // JEDEN Schluessel, damit der Trichter vorfuehrbar bleibt. Das ist eine
      // Bestaetigung fuer einen Termin, den es nicht gibt, mit dem Namen eines
      // Anbieters, der nichts davon weiss. Ein Fehler sagt jetzt, dass nicht
      // gebucht wurde — in dem Satz, der zur Lage passt.
      setReviewOpen(false);
      setFailure(bookingFailureFrom(err));
      setState('idle');
    }
  };
  const slotLine = selected ? `${df.format(new Date(selected))} · ${tf.format(new Date(selected))} · 30 Min` : null;

  return (
    <div className="min-h-screen bg-surface text-fg">
      <header className="flex items-center justify-between border-b border-stroke-subtle bg-surface-secondary px-8 py-4">
        <Logo className="h-[36px] w-auto" />
        <button type="button" onClick={() => navigate(-1)} className="text-body-xs font-medium text-fg-brand hover:underline">
          ← {t('schedule.back')}
        </button>
      </header>
      <main className="mx-auto max-w-[1080px] space-y-6 px-6 py-10">
        <div>
          <h1 className="font-serif text-[28px] font-bold text-fg">{t('schedule.title')}</h1>
          <p className="mt-1 text-body-sm text-fg-secondary">{t('schedule.sub')}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          <section className="rounded-xl border border-stroke-subtle bg-surface-secondary p-7">
            {byDay.map(([day, isos]) => (
              <div key={day} className="mb-5">
                <p className="mb-2 text-body-xs font-semibold text-fg">{day}</p>
                <div className="flex flex-wrap gap-2">
                  {isos.map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelected(iso)}
                      className={`rounded-lg border px-4 py-2 text-body-xs transition-colors ${selected === iso ? 'border-brand font-semibold text-fg-brand' : 'border-stroke-subtle text-fg-secondary hover:border-stroke'}`}
                    >
                      {tf.format(new Date(iso))}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
          <aside className="h-fit space-y-4 rounded-xl border border-stroke-subtle bg-surface-secondary p-7">
            <h2 className="text-body-md font-semibold text-fg">{t('schedule.summaryTitle')}</h2>
            <p className="text-body-xs text-fg-secondary">
              {slotLine ?? t('schedule.pickSlot')}
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={t('schedule.messagePh')}
              className="w-full rounded-lg border border-stroke-subtle bg-transparent px-3.5 py-2.5 text-body-xs text-fg placeholder:text-fg-tertiary focus:outline-none focus:ring-1 focus:ring-brand"
            />
            {/* Canvas 1B: die Bestaetigung ist der Text selbst, ueber dem Button. */}
            <AcknowledgementList ack={ack} className="border-t border-stroke-subtle pt-4" />
            {failure ? (
              // F3: der Kasten steht an der Stelle des Buttons, fuer jeden Grund.
              <BookingFailureCard
                failure={failure}
                onRetry={() => setFailure(null)}
                onReread={() => { setFailure(null); setAckKey((k) => k + 1); }}
                onPickSlot={() => { setFailure(null); setSelected(null); }}
              />
            ) : (
              <>
                <Button
                  size="lg"
                  shape="soft"
                  fullWidth
                  type="button"
                  disabled={!selected || !ack || state === 'sending'}
                  onClick={() => setReviewOpen(true)}
                  className="disabled:opacity-50"
                >
                  {t('detail.bookCta')} <ArrowRight size={15} />
                </Button>
                {/* Abgenommene Zustands-Copy (Checklist v1.0, "Booking processing"). */}
                {state === 'sending' && (
                  <Banner status="info" title={t('common:states.bookingProcessing.heading')}>
                    {t('common:states.bookingProcessing.message')}
                  </Banner>
                )}
              </>
            )}
            <SharingReviewDialog
              open={reviewOpen}
              onGoBack={() => setReviewOpen(false)}
              onConfirm={book}
              sending={state === 'sending'}
              ack={ack}
              rows={sharedRows(ack?.sharedFields ?? ['email', 'company_name', 'message'], { message, topic: 'unspecified', preview: ack?.sharedPreview })}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
