import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRequestContext } from '../../lib/requestContext';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { AnonNotice, Monogram, OriginLine, RankBasis } from './PartnerCard';
import { AcknowledgementList, BookingFailureCard } from './BookingAcknowledgement';
import { SharingReviewDialog, useSharedRows, type SharingTopic } from './SharingReview';
import { goToBookingConfirmed } from '../../lib/bookingConfirmed';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Banner } from '../ui/Banner';
import { ApiError } from '../../api/client';
import {
  bookingFailureFrom, createBooking, fetchAcknowledgement, fetchProviderDetail, fetchSlots,
  type BookingAcknowledgement, type BookingFailure, type ProviderDetail,
} from '../../api/bookings';
import type { AnonProvider } from '../../api/search';

// ─── Partner-Schublade ───────────────────────────────────────────────────────
// Canvas "Partnerseite" 1C, Nutzer-Entscheidung 2026-09-15: der Anbieter
// oeffnet als rechte Schublade ueber der Bereichsseite, nicht als eigene Seite.
// Die Liste der Anbieter bleibt sichtbar, ✕ oder Escape fuehren zurueck —
// vergleichen heisst: naechste Karte, naechste Schublade.
//
// Die Schublade traegt den GANZEN Weg bis zur Buchung (Nutzer 2026-09-15:
// „wenn ich auf Termin buchen klicke, soll sich der Content im Sidesheet
// aendern und direkt dort gebucht werden"). Drei Schritte in EINEM Panel:
//
//   profil   Passung · Leistungen · Qualifikation · Preise
//   termin   Termine nach Tag, Nachricht — der Knopf oeffnet die Pruefung (I2)
//   danach   die Bestaetigung als eigene Seite (E3), erst dort Name und
//            Kontakt (Stufe 3) — lib/bookingConfirmed
//
// Der Kopf und der Fuss wechseln mit dem Schritt; „← Zurueck" fuehrt vom
// Termin zurueck aufs Profil, ohne die Schublade zu verlassen. Die Hoehe
// bleibt fest (Nutzer-Vorgabe 2026-09-05), damit der Wechsel nicht springt.
//
// Die volle Partnerseite (pages/ProviderDetailPage) bleibt bestehen und ist
// ueber ihre Route erreichbar. Sie wird erst wieder verlinkt, wenn es eine
// Partner-UEBERSICHTSSEITE und dafuer einen Navigationspunkt „Partner" gibt.
//
// Was hier NICHT passiert: einen Anbieter erfinden. Schlaegt die Buchung fehl,
// steht das da — keine Bestaetigung fuer einen Termin, den es nicht gibt.
// (Die alte Buchungsseite fiel dafuer auf eine Fixture-Identitaet zurueck,
// „Studio Bianchi SRL" fuer jeden Schluessel; das ist mit diesem Stand weg.)
//
// Phase 4 (ADR-0005, Canvas-Wahl 1B · 2A): vor dem Button steht die
// Bestaetigung mit Fassung — drei Zeilen, was fliesst, Nachfassrecht, 10 %.
// Die Buchung traegt die Fassung zurueck. Scheitert die Belastung des
// Anbieters, gibt es keinen Termin und keinen Namen; der Button weicht einem
// neutralen Kasten, Slots und Nachricht bleiben stehen.
//
// EN-Launch Schritt 2 (2026-10-10): I2 — der Knopf oeffnet die Pruefung
// mit Haekchen, erst "Confirm and Book" bucht; F3 — der Kasten zeigt den
// abgenommenen Zustand fuer jeden Grund; E3 — die Bestaetigung ist eine
// eigene Seite.

type Detail = { kind: 'loading' } | { kind: 'ready'; d: ProviderDetail } | { kind: 'missing' } | { kind: 'error' };
type Step = 'profil' | 'termin';

export function PartnerDrawer({ open, onClose, provider, basisNode, sessionMessage, sessionId, sessionLabel, requestScope, opportunity, booking, onBooked }: {
  open: boolean;
  onClose: () => void;
  /** Die Sitzung hinter der Suche — Bereich und Maerkte der Opportunity
   *  kommen daraus; ohne Sitzung leitet der Server sie aus dem Angebot ab. */
  sessionId?: string | null;
  /** Ohne Sitzung: Bereich und Markt der Suche (Bereichsseite), damit die
   *  Buchung nicht alle Maerkte des Angebots berechnet. */
  opportunity?: { areaCode: string; countries: string[] } | null;
  /** Der Anbieter aus der Suche — traegt Match-Zahl und Pseudonym schon; die
   *  Schublade muss dafuer nichts nachladen. */
  provider: AnonProvider | null;
  /** Woraus die Match-Zahl besteht, meist <MatchBasis basis={p.match_basis} />. */
  basisNode?: React.ReactNode;
  /** Vorschlag fuer die Nachricht an den Anbieter, z. B. der Sitzungstitel. */
  sessionMessage?: string;
  /** Titel der Sitzung — die Bestaetigung sagt, woher der Anbieter kam. */
  sessionLabel?: string | null;
  /** Bereiche und Maerkte der Anfrage. Daraus nennt der Pruefdialog (I2) das
   *  Thema, das der Anbieter mit der Buchung sieht — nach derselben Regel wie
   *  der Server (leadCharge.deriveOpportunity). */
  requestScope?: { areas: string[]; markets: string[] } | null;
  /** Ein bereits bestehender Termin bei diesem Anbieter — dann steht sein
   *  Klarname im Kopf, nicht mehr das Pseudonym. */
  booking?: { name: string; slotStart: string } | null;
  /** Die frische Buchung nach oben melden, damit die Liste dahinter sofort
   *  den Klarnamen und den Termin traegt. */
  onBooked?: (publicRef: string, b: { name: string; slotStart: string }) => void;
}) {
  const { t, i18n } = useTranslation('results');
  // 3 V3: Beschreibung in der Sprache des Nutzers statt der englischen Server-Zeile.
  const { beschreibung } = useRequestContext();
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';

  const [detail, setDetail] = useState<Detail>({ kind: 'loading' });
  const [step, setStep] = useState<Step>('profil');
  const [slots, setSlots] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<BookingFailure | null>(null);
  const [ack, setAck] = useState<BookingAcknowledgement | null>(null);
  const [ackKey, setAckKey] = useState(0);
  const [slotsKey, setSlotsKey] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const sharedRows = useSharedRows();

  // Phase 3: die Schublade spricht den Anbieter nur ueber den opaken Ref an.
  const key = provider?.public_ref ?? '';

  // Jeder neu geoeffnete Anbieter faengt beim Profil an — sonst stuende der
  // naechste Anbieter im Buchungsschritt des vorigen.
  useEffect(() => {
    if (!open) return;
    setStep('profil');
    setSelected(null);
    setMessage(sessionMessage ?? '');
    setSending(false);
    setFailure(null);
    setReviewOpen(false);
  }, [open, key, sessionMessage]);

  // Die Bestaetigung in der Sprache des Nutzers — geladen, sobald der
  // Termin-Schritt offen ist; neu geladen, wenn der Server eine neuere
  // Fassung meldet.
  useEffect(() => {
    if (step !== 'termin') return;
    let alive = true;
    fetchAcknowledgement(locale)
      .then((a) => { if (alive) setAck(a); })
      .catch(() => { if (alive) setAck(null); });
    return () => { alive = false; };
  }, [step, locale, ackKey]);

  useEffect(() => {
    if (!open || !key) return;
    let alive = true;
    setDetail({ kind: 'loading' });
    fetchProviderDetail(key)
      .then((d) => { if (alive) setDetail(d ? { kind: 'ready', d } : { kind: 'missing' }); })
      .catch((err) => {
        if (!alive) return;
        setDetail(err instanceof ApiError && err.status === 404 ? { kind: 'missing' } : { kind: 'error' });
      });
    return () => { alive = false; };
  }, [open, key]);

  // Termine erst laden, wenn sie gebraucht werden.
  useEffect(() => {
    if (step !== 'termin' || !key) return;
    let alive = true;
    setSlots(null);
    fetchSlots(key)
      .then((s) => { if (alive) setSlots(s); })
      .catch(() => { if (alive) setSlots([]); });
    return () => { alive = false; };
  }, [step, key, slotsKey]);

  const df = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }), [locale]);
  const tf = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }), [locale]);
  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const iso of slots ?? []) {
      const day = df.format(new Date(iso));
      m.set(day, [...(m.get(day) ?? []), iso]);
    }
    return [...m.entries()].slice(0, 5);
  }, [slots, df]);

  const book = async () => {
    if (!selected || !ack) return;
    setSending(true);
    setFailure(null);
    try {
      const res = await createBooking(key, selected, {
        message: message.trim() || undefined,
        acknowledgementVersion: ack.version,
        language: locale,
        sessionId: sessionId ?? undefined,
        areaCode: opportunity?.areaCode,
        countries: opportunity?.countries,
      });
      // Die Liste dahinter erfaehrt es sofort — ohne Neuladen, ohne dass der
      // Mandant die Schublade schliessen und suchen muss.
      onBooked?.(key, { name: res.provider_identity.name, slotStart: res.booking.slot_start });
      setReviewOpen(false);
      // E3 (Canvas 09.10.2026): die Bestaetigung ist eine eigene Seite.
      if (provider) {
        goToBookingConfirmed(navigate, locale, {
          confirmation: res,
          provider: { letter: provider.letter, title: provider.title },
          sessionLabel: sessionLabel ?? null,
          message: message.trim(),
        });
      }
    } catch (err) {
      // Kein erfundener Anbieter als Rueckfall: der Termin ist nicht gebucht,
      // und genau das steht dann da — in dem Satz, der zur Lage passt.
      setReviewOpen(false);
      setFailure(bookingFailureFrom(err));
    }
    setSending(false);
  };

  const slotLine = selected ? `${df.format(new Date(selected))} · ${tf.format(new Date(selected))} · ${t('schedule.duration')}` : null;

  if (!provider) return null;
  // Das Thema, das der Anbieter sieht — dieselbe Regel wie der Server
  // (deriveOpportunity): der erste angefragte Bereich, den er anbietet, und
  // die angefragten Maerkte, in denen er freigegeben ist.
  const topic: SharingTopic | 'unspecified' = opportunity
    ? { area: opportunity.areaCode, markets: opportunity.countries }
    : requestScope
      ? {
          area: requestScope.areas.find((a) => provider.area_codes?.includes(a)) ?? (provider.area_codes?.length === 1 ? provider.area_codes[0] : null),
          markets: requestScope.markets.filter((m) => (provider.markets_covered ?? (provider.match_basis?.country ? [provider.match_basis.country] : [])).includes(m)),
        }
      : 'unspecified';
  const reviewRows = sharedRows(ack?.sharedFields ?? ['email', 'company_name', 'message'], { message, topic });
  const d = detail.kind === 'ready' ? detail.d : null;
  const beschreibungText = beschreibung({ areaCodes: provider.area_codes, region: provider.descriptor_region, fallback: provider.descriptor });
  const meta = [
    beschreibungText,
    provider.active_since ? t('snapshot.activeSince', { year: provider.active_since }) : null,
    provider.completed_count ? `${provider.completed_count} ${t('detail.mandates')}` : null,
  ].filter(Boolean).join(' · ');

  const title = step === 'profil' ? (booking?.name ?? provider.title) : t('schedule.title');
  const eyebrow = t('detail.crumbProviders');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      fixedHeight
      eyebrow={eyebrow}
      title={title}
      headerExtra={
        step === 'profil' ? (
          <div>
            <div className="flex items-center gap-3">
              <Monogram letter={provider.letter} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-body-3xs text-fg-tertiary">{meta}</p>
                {booking ? (
                  <>
                    <OriginLine letter={provider.letter} title={provider.title} />
                    <span className="mt-1 inline-flex rounded-full bg-brand-light px-2 py-[2px] text-body-4xs font-extrabold uppercase tracking-[0.06em] text-fg-brand">
                      {t('snapshot.bookedOn', { when: new Date(booking.slotStart).toLocaleString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) })}
                    </span>
                  </>
                ) : provider.is_verified && (
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-accent/55 px-2 py-[2px] text-body-4xs font-extrabold uppercase tracking-[0.06em] text-fg-accent-strong">
                    <ShieldCheck size={12} strokeWidth={2.2} aria-hidden /> {t('snapshot.verifiedPartner')}
                  </span>
                )}
              </div>
              <span className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px] bg-accent text-body-xs font-extrabold text-primary-950">
                {provider.match}
              </span>
            </div>
            {/* Canvas 3B: warum ohne Namen — dort, wo die Frage entsteht. */}
            {!booking && <AnonNotice className="mt-3" />}
          </div>
        ) : step === 'termin' ? (
          <div>
            <button
              type="button"
              onClick={() => setStep('profil')}
              className="inline-flex items-center gap-1.5 text-body-3xs font-bold text-brand underline underline-offset-2 hover:text-brand-700"
            >
              <ArrowLeft size={13} aria-hidden /> {t('schedule.back')}
            </button>
            <p className="mt-1.5 text-body-3xs text-fg-tertiary">{provider.title} · {t('schedule.sub')}</p>
          </div>
        ) : undefined
      }
      footer={
        step === 'profil' && d?.bookable_chargeable === false ? (
          // Wie die Detailseite (Nutzer-Entscheidung 2026-10-01): kein Knopf
          // und keine Termine, wenn nicht gebucht werden kann. Vorher fuehrte
          // die Schublade bis zur Terminwahl und dann in die 409 (Testlauf
          // Phase 4, 2026-10-09). Der Grund bleibt Sache des Anbieters.
          <div>
            <p className="text-body-sm font-bold text-fg">{t('detail.notBookableTitle')}</p>
            <p className="mt-1.5 text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.notBookableNote')}</p>
          </div>
        ) : step === 'profil' ? (
          <>
            <Button size="lg" shape="soft" fullWidth type="button" onClick={() => setStep('termin')}>
              {t('detail.bookCta')} <ArrowRight size={15} />
            </Button>
            <p className="mt-2 text-center text-body-3xs text-fg-tertiary">{t('detail.drawerBookNote')}</p>
          </>
        ) : step === 'termin' ? (
          failure ? (
            // Canvas 2A: der Kasten steht an der Stelle des Buttons; Slots und
            // Nachricht im Body bleiben, der Nutzer verliert nichts.
            <BookingFailureCard
              failure={failure}
              onOtherProvider={onClose}
              onRetry={() => setFailure(null)}
              onReread={() => { setFailure(null); setAckKey((k) => k + 1); }}
              onPickSlot={() => { setFailure(null); setSelected(null); setSlotsKey((k) => k + 1); }}
            />
          ) : (
            <>
              {/* Abgenommene Zustands-Copy (Checklist v1.0, "Booking processing").
                  Der Knopf bleibt gesperrt, solange die Anfrage laeuft — das ist
                  die Vorgabe "prevent duplicate submission". */}
              {sending && (
                <Banner status="info" title={t('common:states.bookingProcessing.heading')} className="mb-3">
                  {t('common:states.bookingProcessing.message')}
                </Banner>
              )}
              {/* I2 (Canvas 09.10.2026): der Knopf oeffnet die Pruefung —
                  gebucht wird erst dort, mit Haekchen ("Confirm and Book"). */}
              <Button
                size="lg"
                shape="soft"
                fullWidth
                type="button"
                disabled={!selected || !ack || sending}
                onClick={() => setReviewOpen(true)}
                className="disabled:opacity-50"
              >
                {t('detail.bookCta')} <ArrowRight size={15} />
              </Button>
              <p className="mt-2 text-center text-body-3xs text-fg-tertiary">{selected ? slotLine : t('schedule.pickSlotDrawer')}</p>
            </>
          )
        ) : undefined
      }
    >
      {step === 'profil' && (
        <Profil provider={provider} detail={detail} d={d} basisNode={basisNode} />
      )}

      {step === 'termin' && (
        <>
          {slots === null ? (
            <p className="text-body-xs text-fg-tertiary">{t('detail.slotsLoading')}</p>
          ) : byDay.length === 0 ? (
            <p className="text-body-xs leading-relaxed text-fg-tertiary">{t('schedule.noSlots')}</p>
          ) : (
            byDay.map(([day, isos]) => (
              <div key={day} className="mb-4">
                <p className="mb-1.5 text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{day}</p>
                <div className="flex flex-wrap gap-1.5">
                  {isos.map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      aria-pressed={selected === iso}
                      onClick={() => setSelected(iso)}
                      className={'rounded-lg border px-3 py-1.5 text-body-3xs font-bold transition-colors '
                        + (selected === iso
                          ? 'border-brand bg-brand text-white'
                          : 'border-stroke text-fg hover:border-brand hover:text-fg-brand')}
                    >
                      {tf.format(new Date(iso))}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}

          <div className="mt-5 border-t border-stroke-subtle pt-4">
            <label htmlFor="partner-message" className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">
              {t('schedule.messageLabel')}
            </label>
            <textarea
              id="partner-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={t('schedule.messagePh')}
              className="mt-2 w-full rounded-lg border border-stroke-subtle bg-transparent px-3.5 py-2.5 text-body-xs text-fg placeholder:text-fg-tertiary focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Canvas 1B: die Bestaetigung ist der Text selbst — je Absatz der
              Fassung eine Zeile mit Haken, direkt ueber dem Button. Sie
              ersetzt den frueheren Hinweiskasten „Nach der Buchung werden
              Name und Kontakt sichtbar": das steht jetzt in Zeile 1. */}
          <div className="mt-5 border-t border-stroke-subtle pt-4">
            <AcknowledgementList ack={ack} />
          </div>
        </>
      )}

      <SharingReviewDialog
        open={reviewOpen}
        onGoBack={() => setReviewOpen(false)}
        onConfirm={book}
        sending={sending}
        ack={ack}
        rows={reviewRows}
      />
    </Drawer>
  );
}

// ─── Schritt 1: das Profil ───────────────────────────────────────────────────
function Profil({ provider, detail, d, basisNode }: {
  provider: AnonProvider;
  detail: Detail;
  d: ProviderDetail | null;
  basisNode?: React.ReactNode;
}) {
  const { t } = useTranslation('results');
  return (
    <>
      {/* Passung — dieselbe Haken-Liste wie auf der Karte, aus der geklickt
          wurde. Die Zahl oben ist damit nicht nur eine Behauptung. */}
      {basisNode && (
        <section>
          <h3 className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('matchBasis.groupFit')} · {provider.match} %</h3>
          <div className="mt-2">{basisNode}</div>
        </section>
      )}
      {/* Canvas 2B/2C: warum der Anbieter an dieser Stelle steht — mit der
          Zeile, die sagt, was NICHT zaehlt. */}
      {(d?.rank_basis ?? provider.rank_basis) && (
        <section className={basisNode ? 'mt-5 border-t border-stroke-subtle pt-4' : ''}>
          <h3 className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('rankBasis.group')}</h3>
          <div className="mt-2"><RankBasis basis={(d?.rank_basis ?? provider.rank_basis)!} compact /></div>
        </section>
      )}

      {detail.kind === 'loading' && (
        <p className={(basisNode ? 'mt-5 ' : '') + 'text-body-xs text-fg-tertiary'}>{t('detail.loading')}</p>
      )}
      {(detail.kind === 'missing' || detail.kind === 'error') && (
        <p className={(basisNode ? 'mt-5 ' : '') + 'text-body-xs leading-relaxed text-fg-tertiary'}>
          {detail.kind === 'missing' ? t('detail.notFoundBody') : t('detail.errorBody')}
        </p>
      )}

      {d && (
        <>
          <section className="mt-5 border-t border-stroke-subtle pt-4">
            <h3 className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('detail.servicesTitle')}</h3>
            {d.services?.length ? (
              <ul className="mt-2 flex flex-col gap-2">
                {d.services.map((s) => (
                  <li key={s.title}>
                    <p className="text-body-xs font-bold text-fg">{s.title}</p>
                    {!!s.includes?.length && (
                      <p className="mt-0.5 text-body-3xs leading-relaxed text-fg-secondary">{s.includes.join(' · ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : provider.specializations.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {provider.specializations.map((s) => (
                  <span key={s} className="inline-flex rounded-full border border-stroke px-3 py-1 text-body-3xs font-bold text-fg">{s}</span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.servicesNone')}</p>
            )}
            {!!d.excluded_services?.length && (
              <p className="mt-2 text-body-3xs leading-relaxed text-fg-tertiary">
                {t('detail.servicesExcluded', { list: d.excluded_services.join(' · ') })}
              </p>
            )}
            <p className="mt-2.5 text-body-3xs text-fg-secondary">
              {[
                `${t('detail.coverage')}: ${(d.markets ?? []).join(' · ') || '—'}`,
                `${t('detail.languages')}: ${d.languages.join(' · ') || '—'}`,
                d.work_mode,
              ].filter(Boolean).join(' · ')}
            </p>
          </section>

          {!!d.credentials?.length && (
            <section className="mt-5 border-t border-stroke-subtle pt-4">
              <h3 className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('detail.credentialsTitle')}</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {d.credentials.map((c) => (
                  <li key={c.label} className="flex items-start gap-2">
                    <span className="mt-[2px] shrink-0 text-fg-accent-strong"><ShieldCheck size={12} strokeWidth={2.2} aria-hidden /></span>
                    <span className="min-w-0">
                      <span className="block text-body-xs font-bold text-fg">{c.label}</span>
                      {c.note && <span className="mt-0.5 block text-body-3xs text-fg-tertiary">{c.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-5 border-t border-stroke-subtle pt-4">
            <h3 className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('detail.pricingTitle')}</h3>
            {d.pricing_table?.length ? (
              <div className="mt-2 flex flex-col gap-1.5">
                {d.pricing_table.map((r) => (
                  <div key={r.service} className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 text-body-xs text-fg">{r.service}</span>
                    <strong className="shrink-0 text-body-xs text-fg-brand">{r.price}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-body-3xs text-fg-tertiary">{t('detail.pricingOnRequest')}</p>
            )}
            <p className="mt-2 text-body-3xs text-fg-tertiary">
              {t('detail.billing')}: {t(`snapshot.billing.${d.billing_model}`)}
            </p>
          </section>

        </>
      )}
    </>
  );
}
