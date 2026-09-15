import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { MatchBasis } from './PartnerCard';
import { ApiError } from '../../api/client';
import { fetchProviderDetail, type ProviderDetail } from '../../api/bookings';
import type { AnonProvider } from '../../api/search';

// ─── Partner-Schublade ───────────────────────────────────────────────────────
// Canvas "Partnerseite" 1C, Nutzer-Entscheidung 2026-09-15: der Anbieter
// oeffnet als rechte Schublade ueber der Bereichsseite, nicht als eigene Seite.
// Die Liste der Anbieter bleibt sichtbar, ✕ oder Escape fuehren zurueck —
// vergleichen heisst: naechste Karte, naechste Schublade.
//
// Die volle Partnerseite (pages/ProviderDetailPage) bleibt bestehen und ist
// ueber ihre Route erreichbar. Sie wird erst wieder verlinkt, wenn es eine
// Partner-UEBERSICHTSSEITE und dafuer einen Navigationspunkt „Partner" gibt —
// ohne beides waere eine eigene Seite ein Sprung aus dem Arbeitsbereich
// heraus, aus dem nur der Zurueck-Knopf zurueckfuehrt.
//
// Kompromiss aus dem Canvas, hier bewusst so umgesetzt: weniger Platz. Die
// Schublade zeigt Passung, Leistungen mit Abdeckung und die Preise — die
// Matrix, die Bewertungs-Zitate und die Terminliste bleiben der Seite
// vorbehalten. Der bezahlte Detail-Open ist derselbe: das Oeffnen ruft
// GET /provider/:key/detail und damit `provider_detail_opened`.

type State = { kind: 'loading' } | { kind: 'ready'; d: ProviderDetail } | { kind: 'missing' } | { kind: 'error' };

export function PartnerDrawer({ open, onClose, provider, basisNode, onBook }: {
  open: boolean;
  onClose: () => void;
  /** Der Anbieter aus der Suche — traegt Match-Zahl und Pseudonym schon; die
   *  Schublade muss dafuer nichts nachladen. */
  provider: AnonProvider | null;
  /** Woraus die Match-Zahl besteht, meist <MatchBasis basis={p.match_basis} />. */
  basisNode?: React.ReactNode;
  onBook: (key: string) => void;
}) {
  const { t } = useTranslation('results');
  const [state, setState] = useState<State>({ kind: 'loading' });
  const key = provider?.provider_key ?? '';

  useEffect(() => {
    if (!open || !key) return;
    let alive = true;
    setState({ kind: 'loading' });
    fetchProviderDetail(key)
      .then((d) => { if (alive) setState(d ? { kind: 'ready', d } : { kind: 'missing' }); })
      .catch((err) => {
        if (!alive) return;
        setState(err instanceof ApiError && err.status === 404 ? { kind: 'missing' } : { kind: 'error' });
      });
    return () => { alive = false; };
  }, [open, key]);

  if (!provider) return null;
  const d = state.kind === 'ready' ? state.d : null;
  const meta = [
    provider.region,
    provider.active_since ? t('snapshot.activeSince', { year: provider.active_since }) : null,
    provider.completed_count ? `${provider.completed_count} ${t('detail.mandates')}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={t('detail.crumbProviders')}
      title={provider.pseudonym_label}
      headerExtra={
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
      }
      footer={
        <>
          <Button size="lg" shape="soft" fullWidth type="button" onClick={() => onBook(key)}>
            {t('detail.bookCta')} <ArrowRight size={15} />
          </Button>
          <p className="mt-2 text-center text-body-3xs text-fg-tertiary">{t('detail.drawerBookNote')}</p>
        </>
      }
    >
      {/* Passung — dieselbe Haken-Liste wie auf der Karte, aus der geklickt
          wurde. Die Zahl oben ist damit nicht nur eine Behauptung. */}
      {basisNode && (
        <section>
          <h3 className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('detail.ringMatch')}</h3>
          <div className="mt-2">{basisNode}</div>
        </section>
      )}

      {state.kind === 'loading' && (
        <p className={(basisNode ? 'mt-5 ' : '') + 'text-body-xs text-fg-tertiary'}>{t('detail.loading')}</p>
      )}
      {(state.kind === 'missing' || state.kind === 'error') && (
        <p className={(basisNode ? 'mt-5 ' : '') + 'text-body-xs leading-relaxed text-fg-tertiary'}>
          {state.kind === 'missing' ? t('detail.notFoundBody') : t('detail.errorBody')}
        </p>
      )}

      {d && (
        <>
          {/* Leistungen und Abdeckung */}
          <section className={(basisNode ? 'mt-5 border-t border-stroke-subtle pt-4' : '')}>
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

          {/* Qualifikation — nur, wenn der Anbieter Nachweise hinterlegt hat. */}
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

          {/* Preise */}
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
    </Drawer>
  );
}

/** Kleiner Helfer für die Aufrufer: die Match-Basis als Knoten, wenn es sie gibt. */
export function basisFor(p: AnonProvider) {
  return p.match_basis ? <MatchBasis basis={p.match_basis} /> : undefined;
}
