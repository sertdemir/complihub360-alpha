import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Eye, ShieldCheck } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { ApiError } from '../../api/client';
import {
  createBooking, fetchProviderDetail, fetchSlots,
  type BookingConfirmation, type ProviderDetail,
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
//   termin   Termine nach Tag, Nachricht, verbindlich buchen
//   fertig   Bestaetigung — und erst hier Name und Kontakt (Stufe 3)
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

type Detail = { kind: 'loading' } | { kind: 'ready'; d: ProviderDetail } | { kind: 'missing' } | { kind: 'error' };
type Step = 'profil' | 'termin' | 'fertig';

export function PartnerDrawer({ open, onClose, provider, basisNode, sessionMessage }: {
  open: boolean;
  onClose: () => void;
  /** Der Anbieter aus der Suche — traegt Match-Zahl und Pseudonym schon; die
   *  Schublade muss dafuer nichts nachladen. */
  provider: AnonProvider | null;
  /** Woraus die Match-Zahl besteht, meist <MatchBasis basis={p.match_basis} />. */
  basisNode?: React.ReactNode;
  /** Vorschlag fuer die Nachricht an den Anbieter, z. B. der Sitzungstitel. */
  sessionMessage?: string;
}) {
  const { t, i18n } = useTranslation('results');
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';

  const [detail, setDetail] = useState<Detail>({ kind: 'loading' });
  const [step, setStep] = useState<Step>('profil');
  const [slots, setSlots] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const key = provider?.provider_key ?? '';

  // Jeder neu geoeffnete Anbieter faengt beim Profil an — sonst stuende der
  // naechste Anbieter im Buchungsschritt des vorigen.
  useEffect(() => {
    if (!open) return;
    setStep('profil');
    setSelected(null);
    setMessage(sessionMessage ?? '');
    setSending(false);
    setFailed(false);
    setConfirmation(null);
  }, [open, key, sessionMessage]);

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
  }, [step, key]);

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
    if (!selected) return;
    setSending(true);
    setFailed(false);
    try {
      setConfirmation(await createBooking(key, selected, message.trim() || undefined));
      setStep('fertig');
    } catch {
      // Kein erfundener Anbieter als Rueckfall: der Termin ist nicht gebucht,
      // und genau das steht dann da.
      setFailed(true);
    }
    setSending(false);
  };

  if (!provider) return null;
  const d = detail.kind === 'ready' ? detail.d : null;
  const meta = [
    provider.region,
    provider.active_since ? t('snapshot.activeSince', { year: provider.active_since }) : null,
    provider.completed_count ? `${provider.completed_count} ${t('detail.mandates')}` : null,
  ].filter(Boolean).join(' · ');

  const title = step === 'profil' ? provider.pseudonym_label
    : step === 'termin' ? t('schedule.title')
    : t('schedule.doneTitle');
  const eyebrow = step === 'fertig' ? t('schedule.doneEyebrow') : t('detail.crumbProviders');

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
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-accent text-body-xs font-extrabold text-primary-950">
              {provider.match}
            </span>
            <div className="min-w-0">
              <p className="text-body-3xs text-fg-tertiary">{meta}</p>
              {provider.is_verified && (
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-accent/55 px-2 py-[2px] text-body-4xs font-extrabold uppercase tracking-[0.06em] text-fg-accent-strong">
                  <ShieldCheck size={12} strokeWidth={2.2} aria-hidden /> {t('snapshot.verifiedPartner')}
                </span>
              )}
            </div>
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
            <p className="mt-1.5 text-body-3xs text-fg-tertiary">{provider.pseudonym_label} · {t('schedule.sub')}</p>
          </div>
        ) : undefined
      }
      footer={
        step === 'profil' ? (
          <>
            <Button size="lg" shape="soft" fullWidth type="button" onClick={() => setStep('termin')}>
              {t('detail.bookCta')} <ArrowRight size={15} />
            </Button>
            <p className="mt-2 text-center text-body-3xs text-fg-tertiary">{t('detail.drawerBookNote')}</p>
          </>
        ) : step === 'termin' ? (
          <>
            <Button
              size="lg"
              shape="soft"
              fullWidth
              type="button"
              disabled={!selected || sending}
              onClick={book}
              className="disabled:opacity-50"
            >
              {sending ? t('schedule.sending') : t('schedule.confirmCta')}
            </Button>
            <p className="mt-2 text-center text-body-3xs text-fg-tertiary">
              {selected
                ? `${df.format(new Date(selected))} · ${tf.format(new Date(selected))} · ${t('schedule.duration')}`
                : t('schedule.pickSlotDrawer')}
            </p>
          </>
        ) : (
          <Button size="lg" shape="soft" fullWidth type="button" onClick={() => navigate(`/${locale}/dashboard/termine`)}>
            {t('schedule.toAppointments')} <ArrowRight size={15} />
          </Button>
        )
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

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-brand/40 px-3.5 py-3">
            <Eye size={16} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden />
            <p className="text-body-3xs leading-relaxed text-fg-secondary">{t('schedule.revealNote')}</p>
          </div>

          {failed && (
            <p className="mt-3 text-body-3xs leading-relaxed text-[#8A3B3B] dark:text-[#F1A88C]">{t('schedule.failed')}</p>
          )}
          <p className="mt-3 text-center text-body-3xs text-fg-tertiary">{t('schedule.freeNote')}</p>
        </>
      )}

      {step === 'fertig' && confirmation && (
        <>
          <p className="text-body-sm text-fg">
            {df.format(new Date(confirmation.booking.slot_start))} · {tf.format(new Date(confirmation.booking.slot_start))} · {t('schedule.duration')}
          </p>
          {/* Stufe 3 — ab hier hat der Anbieter einen Namen. */}
          <div className="mt-4 rounded-xl border border-stroke-subtle bg-surface px-5 py-4">
            <p className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('schedule.revealLabel')}</p>
            <p className="mt-1.5 text-body font-bold text-fg">{confirmation.provider_identity.name}</p>
            {confirmation.provider_identity.contact_email && (
              <p className="mt-0.5 text-body-xs text-fg-secondary">{confirmation.provider_identity.contact_email}</p>
            )}
            {confirmation.provider_identity.website_url && (
              <a
                href={confirmation.provider_identity.website_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-body-xs font-bold text-brand underline underline-offset-2 hover:text-brand-700"
              >
                {confirmation.provider_identity.website_url.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          {message.trim() && (
            <div className="mt-4">
              <p className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-tertiary">{t('schedule.messageLabel')}</p>
              <p className="mt-1 text-body-xs leading-relaxed text-fg-secondary">{message.trim()}</p>
            </div>
          )}
          <p className="mt-4 text-body-3xs leading-relaxed text-fg-tertiary">{t('schedule.doneNote')}</p>
        </>
      )}
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
          <h3 className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('detail.ringMatch')}</h3>
          <div className="mt-2">{basisNode}</div>
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
          <section className={basisNode ? 'mt-5 border-t border-stroke-subtle pt-4' : ''}>
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
                `${t('detail.coverage')}: ${(d.countries_supported ?? []).join(' · ') || '—'}`,
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

          <p className="mt-5 border-t border-stroke-subtle pt-4 text-body-3xs leading-relaxed text-fg-tertiary">
            {t('detail.anonNote')}
          </p>
        </>
      )}
    </>
  );
}
