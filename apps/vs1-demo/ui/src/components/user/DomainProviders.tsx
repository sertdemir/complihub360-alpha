import { forwardRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { ProviderMatchCard } from '../ui/ProviderMatchCard';
import { runSearch, type AnonProvider } from '../../api/search';
import type { SearchProfile } from '../wizard/WizardContext';

// ─── Anbieter fuer den Bereich (Canvas 5D, 2026-09-13) ───────────────────────
// Dieselbe Anbieter-Karte wie auf der Sitzungsseite (ProviderMatchCard),
// hier nach Bereich statt nach Sitzung gesucht: POST /search mit dem Bereich
// als einziger Domaene und dem Hauptmarkt des Nutzers. Pseudonym, Match,
// Spezialisierungen, Bewertung, Antwortzeit, Abrechnungsmodell — Klarnamen
// erst nach Buchung. Ab vier Anbietern zwei Reihen (Nutzer-Vorgabe).

export const DomainProviders = forwardRef<HTMLElement, {
  slug: string;
  areaLabel: string;
  /** Hauptmarkt des Nutzers in diesem Bereich; ohne Sitzung DE. */
  country: string;
  onRequest: (p: AnonProvider) => void;
}>(function DomainProviders({ slug, areaLabel, country, onRequest }, ref) {
  const { t, i18n } = useTranslation('userws');
  const { t: tr } = useTranslation('results');
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';
  const [providers, setProviders] = useState<AnonProvider[] | null>(null);

  useEffect(() => {
    let alive = true;
    runSearch({ country, categories: [slug] as SearchProfile['categories'] })
      .then((r) => { if (alive) setProviders(r.providers ?? []); })
      // Ohne Suche keine Anbieter — die Karte sagt das, statt zu erfinden.
      .catch(() => { if (alive) setProviders([]); });
    return () => { alive = false; };
  }, [slug, country]);

  return (
    <section ref={ref} className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-body-md font-bold text-fg">
          {t('domainPage.providersTitle', { area: areaLabel })}{' '}
          {providers && providers.length > 0 && <span className="text-fg-brand">{providers.length}</span>}
        </h2>
      </div>
      {providers === null ? (
        <p className="text-body-xs text-fg-tertiary">{t('shared.loading')}</p>
      ) : providers.length === 0 ? (
        <p className="text-body-xs text-fg-tertiary">{t('domainPage.providersNone')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => {
            const basis = p.match_basis;
            return (
              <ProviderMatchCard
                key={p.provider_key}
                title={p.pseudonym_label}
                eyebrow={[p.region, p.active_since ? t('domainPage.providerSince', { year: p.active_since }) : null].filter(Boolean).join(' · ')}
                match={t('domainPage.providerMatch', { pct: p.match })}
                matchTier={p.match_tier}
                isVerified={p.is_verified}
                tags={p.specializations.slice(0, 3)}
                matchBasis={basis ? (
                  <p className="text-body-3xs text-fg-secondary">
                    <span className={basis.country_covered ? 'font-bold text-risk-low' : 'text-fg-tertiary'}>
                      {basis.country_covered
                        ? t('domainPage.providerCoversCountry', { cc: basis.country ?? country })
                        : t('domainPage.providerMissesCountry', { cc: basis.country ?? country })}
                    </span>
                    {basis.domains_matched.includes(slug) && <span> · {t('domainPage.providerCoversArea')}</span>}
                  </p>
                ) : undefined}
                countries={p.languages.join(' · ')}
                rating={p.rating != null ? t('domainPage.providerRating', { rating: p.rating.toLocaleString(locale), count: p.completed_count ?? 0 }) : undefined}
                responseTime={p.avg_response_hours != null ? t('domainPage.providerReply', { hours: p.avg_response_hours }) : undefined}
                billing={tr(`snapshot.billing.${p.billing_model}`, { defaultValue: p.billing_model })}
                onDetails={() => navigate(`/${locale}/provider/${p.provider_key}`)}
                action={
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/${locale}/provider/${p.provider_key}`)}>{t('domainPage.providerDetails')}</Button>
                    <Button size="sm" onClick={() => onRequest(p)}>{t('domainPage.providerRequest')}</Button>
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
});
