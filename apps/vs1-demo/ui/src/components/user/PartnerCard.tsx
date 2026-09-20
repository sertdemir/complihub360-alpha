import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { AnonProvider } from '../../api/search';

// ─── Partner-Karte des Arbeitsbereichs ───────────────────────────────────────
// EINE Darstellung fuer Anbieter im Arbeitsbereich (Nutzer-Vorgabe
// 2026-09-13): Sitzungsseite (Canvas G9, gestapelt in der rechten Spalte)
// und Bereichsseite (5D) zeigen dieselbe Karte — Match-Zahl im Kasten,
// „Verified Partner"-Marke, Pseudonym, Region · aktiv seit, Antwortzeit ·
// Abrechnung, darunter die Match-Basis als Haken-Liste und GENAU EIN Knopf:
// „Details ansehen". Keine Anfrage von der Karte aus — eine Anfrage braucht
// den ausgewaehlten Anbieter, der Weg geht ueber die Detailseite.
//
// Der erste Anbieter traegt den goldenen Kasten und die Marke (bester Match),
// alle weiteren den petrolfarbenen. Klarnamen erst nach Buchung — DANN aber
// auch hier: eine Karte, hinter der ein Termin steht, nennt den Anbieter beim
// Namen und den Termin (Nutzer 2026-09-15). Sonst sucht der Mandant in seiner
// eigenen Liste nach einem Pseudonym, dessen Namen er laengst kennt.

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';

export function PartnerCard({ provider: p, top, basis, onDetails, booking, className = '' }: {
  provider: AnonProvider;
  /** Bester Match: goldener Kasten + Verified-Marke. */
  top?: boolean;
  /** Woraus die Match-Zahl besteht — meist <MatchBasis basis={p.match_basis} />. */
  basis?: ReactNode;
  onDetails: () => void;
  /** Gibt es einen Termin bei diesem Anbieter, traegt die Karte seinen
   *  KLARNAMEN statt des Pseudonyms (Stufe 3, spec §5): wer gebucht hat, soll
   *  in seiner Liste nicht weiter ein Pseudonym suchen muessen. */
  booking?: { name: string; slotStart: string } | null;
  className?: string;
}) {
  const { t, i18n } = useTranslation('results');
  const locale = i18n.resolvedLanguage || 'en';
  const when = booking
    ? new Date(booking.slotStart).toLocaleString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <div className={`${CARD} flex flex-col p-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span
          className={'grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px] text-body-xs font-extrabold '
            + (top ? 'bg-accent text-primary-950' : 'bg-brand-light text-fg-brand')}
        >
          {p.match}
        </span>
        <div className="min-w-0 flex-1">
          {booking ? (
            <span className="inline-flex whitespace-nowrap rounded-full bg-brand-light px-2 py-[2px] text-[9px] font-extrabold uppercase tracking-[0.06em] text-fg-brand">
              {t('snapshot.booked')}
            </span>
          ) : top && (
            <span className="inline-flex whitespace-nowrap rounded-full border border-accent/55 px-2 py-[2px] text-[9px] font-extrabold uppercase tracking-[0.06em] text-fg-accent-strong">
              ✓ {t('snapshot.verifiedPartner')}
            </span>
          )}
          {/* Klarnamen sind laenger als Pseudonyme und muessen in einer
              schmalen Spalte umbrechen duerfen, statt aus der Karte zu laufen. */}
          <p className={(top || booking ? 'mt-1 ' : '') + 'break-words text-body-xs font-bold leading-snug text-fg'}>
            {booking ? booking.name : p.pseudonym_label}
          </p>
        </div>
      </div>
      {booking && (
        <p className="mt-2.5 text-[10.5px] font-bold text-fg-brand">{t('snapshot.bookedOn', { when })}</p>
      )}
      <p className={(booking ? 'mt-0.5 ' : 'mt-2.5 ') + 'text-[10.5px] text-fg-tertiary'}>
        {[p.region, p.active_since ? t('snapshot.activeSince', { year: p.active_since }) : null].filter(Boolean).join(' · ')}
      </p>
      <p className="mt-0.5 text-[10.5px] text-fg-tertiary">
        {[p.avg_response_hours != null ? t('snapshot.responseTime', { hours: p.avg_response_hours }) : null,
          t(`snapshot.billing.${p.billing_model}`)].filter(Boolean).join(' · ')}
      </p>
      {/* Die Zahl allein waere eine Behauptung — hier steht, woraus sie
          besteht (DNA-Addendum V2 P1). */}
      {basis && <div className="mt-3 border-t border-stroke-subtle pt-3">{basis}</div>}
      {/* Der einzige gefuellte Knopf: der Weg zum einzelnen Anbieter. */}
      <div className="mt-auto pt-5">
        <Button variant={booking ? 'secondary' : 'primary'} className="w-full" onClick={onDetails}>
          {booking ? t('snapshot.providerBooked') : t('snapshot.providerDetails')}
        </Button>
      </div>
    </div>
  );
}

/** Woraus der Match besteht: Markt abgedeckt oder nicht, dann je angefragtem
 *  Bereich ein Haken oder Strich. Nur der Aufrufer weiss, was der Nutzer
 *  angefragt hat — deshalb kommt `basis` von aussen. */
export function MatchBasis({ basis }: { basis: NonNullable<AnonProvider['match_basis']> }) {
  const { t } = useTranslation('results');
  const matched = new Set(basis.domains_matched);
  const KEY: Record<string, string> = {
    'tax-vat': 'taxVat', 'product-packaging': 'productPackaging', 'data-privacy': 'dataPrivacy',
    'marketing-seo': 'marketingSeo', 'corporate-structure': 'corporateStructure',
    'product-compliance': 'productCompliance', 'logistics-customs': 'logisticsCustoms',
    'legal-advisory': 'legalAdvisory',
  };
  const label = (slug: string) => t(`domains.${KEY[slug] ?? slug}`, { defaultValue: slug });
  const Row = ({ hit, children }: { hit: boolean; children: ReactNode }) => (
    <li className="flex items-baseline gap-2">
      <span aria-hidden className={hit ? 'text-fg-brand' : 'text-fg-tertiary'}>{hit ? '✓' : '–'}</span>
      <span className={hit ? 'text-fg-secondary' : 'text-fg-tertiary'}>{children}</span>
    </li>
  );

  return (
    <ul className="flex flex-col gap-1.5 text-body-xs">
      <Row hit={basis.country_covered}>
        {basis.country_covered
          ? t('matchBasis.market', { country: basis.country ?? '' })
          : t('matchBasis.marketMissing')}
      </Row>
      {basis.domains_requested.map((slug) => (
        <Row key={slug} hit={matched.has(slug)}>{label(slug)}</Row>
      ))}
    </ul>
  );
}
