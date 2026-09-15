import { forwardRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PartnerCard, MatchBasis } from './PartnerCard';
import { runSearch, type AnonProvider } from '../../api/search';
import type { SearchProfile } from '../wizard/WizardContext';

// ─── Anbieter fuer den Bereich (Canvas 5D, 2026-09-13) ───────────────────────
// Dieselbe Partner-Karte wie auf der Sitzungsseite (PartnerCard — Nutzer-
// Vorgabe 2026-09-13: eine Darstellung, nur „Details ansehen"), hier nach
// Bereich statt nach Sitzung gesucht: POST /search mit dem Bereich als
// einziger Domaene und dem Hauptmarkt des Nutzers. Die Match-Basis zeigt
// dann Markt und diesen einen Bereich. In der linken Spalte zwei je Reihe.

export const DomainProviders = forwardRef<HTMLElement, {
  slug: string;
  areaLabel: string;
  /** Hauptmarkt des Nutzers in diesem Bereich; ohne Sitzung DE. */
  country: string;
}>(function DomainProviders({ slug, areaLabel, country }, ref) {
  const { t, i18n } = useTranslation('userws');
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
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((p, i) => (
            <PartnerCard
              key={p.provider_key}
              provider={p}
              top={i === 0}
              basis={p.match_basis ? <MatchBasis basis={p.match_basis} /> : undefined}
              // Der Bereich reist mit: die Partnerseite zeigt sonst weder den
              // Lage-Satz noch die Matrix — sie wuesste nicht, worauf sie den
              // Anbieter beziehen soll.
              onDetails={() => navigate(`/${locale}/provider/${p.provider_key}?area=${slug}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
});
