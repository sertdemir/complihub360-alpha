import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { UserShell } from '../../components/user/UserShell';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Monogram } from '../../components/user/PartnerCard';
import { PartnerDrawer } from '../../components/user/PartnerDrawer';
import { usePriceText } from '../../components/results/ProviderStates';
import { useRequestContext } from '../../lib/requestContext';
import { fetchSavedProviders, forgetProvider, type SavedProvider } from '../../api/savedProviders';
import type { AnonProvider } from '../../api/search';

// ─── Saved Providers (Handover 1.0 §5 "Add to Selection") ────────────────────
// Bis 24.10.2026 eine ComingSoon-Seite: es gab keinen Knopf zum Merken. Jetzt
// merkt die Karte der Risk Map ("Add to Selection"), hier steht die Auswahl.
//
//   - Anonym bis zur Buchung (ADR-0004): dieselben Felder wie die Karte, kein
//     Name. Der Buchstabe ist die Position in DIESER Liste.
//   - Die Liste ist kein Detail-Aufruf und kostet keinen Anbieter etwas. Erst
//     "View details" oeffnet das Profil — wie auf der Risk Map.
//   - Ehrlich in jedem Zustand: laden, leer, nicht ladbar, ein Anbieter nicht
//     mehr verfuegbar.

type Load = { kind: 'loading' } | { kind: 'ready'; list: SavedProvider[] } | { kind: 'error' };

/** Die Schublade erwartet einen Anbieter aus der Suche. Ohne Suche gibt es
 *  keinen Match-Wert — NaN, und die Schublade zeigt keinen Kasten. */
function toAnon(s: Extract<SavedProvider, { available: true }>): AnonProvider {
  return {
    public_ref: s.public_ref, title: s.title, letter: s.letter, descriptor: s.descriptor,
    area_codes: s.area_codes, descriptor_region: s.descriptor_region, region: s.descriptor_region,
    active_since: null, specializations: s.specializations, languages: [], rating: null,
    completed_count: s.completed_count, avg_response_hours: s.avg_response_hours,
    billing_model: s.billing_model, is_verified: true, match: Number.NaN, match_tier: 'moderate',
    price_range: s.price_range, timeline_days: s.timeline_days, markets_covered: s.markets,
  };
}

export function SavedProvidersPage() {
  const { t, i18n } = useTranslation('userws');
  const { t: tr } = useTranslation('results');
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState<{ provider: AnonProvider; sessionId: string | null; startAt: 'profil' | 'termin' } | null>(null);
  const [removeFailed, setRemoveFailed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoad({ kind: 'loading' });
    fetchSavedProviders()
      .then((list) => { if (alive) setLoad({ kind: 'ready', list }); })
      .catch(() => { if (alive) setLoad({ kind: 'error' }); });
    return () => { alive = false; };
  }, [reloadKey]);

  // Optimistisch entfernen. Scheitert es, kommt NUR dieser Eintrag an seinen
  // Platz zurueck — ein Schnappschuss der ganzen Liste holte sonst einen
  // Eintrag zurueck, der inzwischen wirklich geloescht ist.
  const remove = useCallback(async (item: SavedProvider & { public_ref: string }) => {
    if (load.kind !== 'ready') return;
    const at = load.list.indexOf(item);
    setRemoveFailed(null);
    setLoad((prev) => (prev.kind === 'ready' ? { kind: 'ready', list: prev.list.filter((s) => s !== item) } : prev));
    try {
      await forgetProvider(item.public_ref);
    } catch {
      setLoad((prev) => {
        if (prev.kind !== 'ready') return prev;
        const list = [...prev.list];
        list.splice(Math.min(at, list.length), 0, item);
        return { kind: 'ready', list };
      });
      setRemoveFailed(item.public_ref);
    }
  }, [load]);

  const dateFmt = new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <UserShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
            <span className="text-fg-accent">{t('savedProviders.title')}</span>
          </h1>
          <p className="mt-1 max-w-[70ch] text-body-sm text-fg-secondary">{t('savedProviders.sub')}</p>
        </div>

        {load.kind === 'loading' && <p role="status" className="text-body-sm text-fg-tertiary">{t('savedProviders.loading')}</p>}

        {load.kind === 'error' && (
          <Banner
            status="error"
            title={t('savedProviders.loadFailedTitle')}
            action={<Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>{t('savedProviders.retry')}</Button>}
          >
            {t('savedProviders.loadFailedBody')}
          </Banner>
        )}

        {load.kind === 'ready' && load.list.length === 0 && (
          <div className="rounded-xl border border-stroke-subtle bg-surface-secondary px-6 py-10 text-center">
            <h2 className="font-serif text-[20px] font-bold text-fg">{t('savedProviders.emptyTitle')}</h2>
            <p className="mx-auto mt-2 max-w-[52ch] text-body-sm leading-relaxed text-fg-secondary">{t('savedProviders.emptyBody')}</p>
            <div className="mt-5 flex justify-center">
              <Button onClick={() => navigate(`/${locale}/dashboard/sessions`)}>{t('savedProviders.emptyCta')}</Button>
            </div>
          </div>
        )}

        {load.kind === 'ready' && load.list.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {load.list.map((s) => (
              <li key={`${s.public_ref}-${s.saved_at}`} className="flex">
                {s.available ? (
                  <SavedCard
                    s={s}
                    savedOn={t('savedProviders.savedOn', { date: dateFmt.format(new Date(s.saved_at)) })}
                    removeFailed={removeFailed === s.public_ref}
                    onBook={() => setOpen({ provider: toAnon(s), sessionId: s.session_id, startAt: 'termin' })}
                    onDetails={() => setOpen({ provider: toAnon(s), sessionId: s.session_id, startAt: 'profil' })}
                    onRemove={() => remove(s)}
                    bookLabel={tr('card.book')}
                    detailsLabel={tr('snapshot.providerDetails')}
                  />
                ) : (
                  <div className="flex w-full flex-col justify-between gap-4 rounded-xl border border-dashed border-stroke bg-surface-secondary p-4">
                    <p className="text-body-sm text-fg-secondary">{t('savedProviders.unavailable')}</p>
                    {/* Ohne Ref kein Entfernen: der Server koennte den Eintrag nicht
                        finden, und ein Knopf, der nur lokal wirkt, kaeme beim
                        naechsten Laden zurueck. Praktisch unerreichbar — ein
                        geloeschter Anbieter nimmt den Eintrag per FK mit. */}
                    {s.public_ref && (
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" onClick={() => remove(s as SavedProvider & { public_ref: string })}>{t('savedProviders.remove')}</Button>
                        {removeFailed === s.public_ref && <p role="alert" className="text-center text-[10.5px] text-error-700 dark:text-red-300">{t('savedProviders.removeFailed')}</p>}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <PartnerDrawer
        open={open !== null}
        onClose={() => setOpen(null)}
        provider={open?.provider ?? null}
        sessionId={open?.sessionId ?? null}
        startAt={open?.startAt ?? 'profil'}
      />
    </UserShell>
  );
}

function SavedCard({ s, savedOn, removeFailed, onBook, onDetails, onRemove, bookLabel, detailsLabel }: {
  s: Extract<SavedProvider, { available: true }>;
  savedOn: string;
  removeFailed: boolean;
  onBook: () => void;
  onDetails: () => void;
  onRemove: () => void;
  bookLabel: string;
  detailsLabel: string;
}) {
  const { t } = useTranslation('userws');
  const { t: tr } = useTranslation('results');
  const { beschreibung, markt } = useRequestContext();
  const priceText = usePriceText();
  const markets = s.markets.map(markt);
  const days = s.timeline_days
    ? s.timeline_days.min === s.timeline_days.max
      ? tr('card.days', { count: s.timeline_days.min })
      : tr('card.daysRange', { min: s.timeline_days.min, max: s.timeline_days.max })
    : null;
  const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex gap-1">
      <dt className="shrink-0 text-fg-tertiary">{label}:</dt>
      <dd className="min-w-0 text-fg-secondary">{children}</dd>
    </div>
  );
  return (
    <div className="flex w-full flex-col rounded-xl border border-stroke-subtle bg-surface p-4 shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]">
      <div className="flex items-center gap-2.5">
        <Monogram letter={s.letter} />
        <div className="min-w-0 flex-1">
          <p className="text-body-xs font-bold leading-snug text-fg">{s.title}</p>
          <p className="text-[10.5px] leading-snug text-fg-secondary">{beschreibung({ areaCodes: s.area_codes, region: s.descriptor_region, fallback: s.descriptor })}</p>
        </div>
      </div>
      <p className="mt-2.5 text-[10.5px] text-fg-tertiary">{savedOn}</p>
      {s.specializations.length > 0 && (
        <ul aria-label={tr('matchStates.factExpertise')} className="mt-2 flex flex-wrap gap-1">
          {s.specializations.slice(0, 3).map((x) => (
            <li key={x} className="rounded-full bg-surface-secondary px-2 py-[2px] text-[10px] font-semibold text-fg-secondary">{x}</li>
          ))}
        </ul>
      )}
      <dl className="mt-2 flex flex-col gap-0.5 text-[10.5px]">
        {markets.length > 0 && <Fact label={tr('card.markets')}>{markets.join(' · ')}</Fact>}
        <Fact label={tr('matchStates.factPrice')}>{priceText(s.price_range)}</Fact>
        {days && <Fact label={tr('card.timeline')}>{days}</Fact>}
        {s.avg_response_hours != null && <Fact label={t('savedProviders.response')}>{tr('rankBasis.hours', { hours: s.avg_response_hours })}</Fact>}
        {(s.completed_count ?? 0) > 0 && <Fact label={tr('card.completed')}>{s.completed_count}</Fact>}
      </dl>
      <div className="mt-auto flex flex-col items-center gap-2 pt-5">
        <Button variant="primary" className="w-full" onClick={onBook}>{bookLabel}</Button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={onDetails} className="text-body-3xs font-semibold text-fg-brand underline underline-offset-2 hover:text-brand">
            {detailsLabel}
          </button>
          <button type="button" onClick={onRemove} className="text-body-3xs font-semibold text-fg-secondary underline underline-offset-2 hover:text-fg">
            {t('savedProviders.remove')}
          </button>
        </div>
        {removeFailed && <p role="alert" className="text-center text-[10.5px] text-error-700 dark:text-red-300">{t('savedProviders.removeFailed')}</p>}
      </div>
    </div>
  );
}
