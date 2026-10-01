import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequestContext } from '../../lib/requestContext';
import { Check } from 'lucide-react';
import { Button } from '../ui/Button';
import type { AnonProvider, RankBasis as RankBasisData } from '../../api/search';

// ─── Partner-Karte des Arbeitsbereichs ───────────────────────────────────────
// EINE Darstellung fuer Anbieter im Arbeitsbereich (Nutzer-Vorgabe
// 2026-09-13): Sitzungsseite (Canvas G9, gestapelt in der rechten Spalte)
// und Bereichsseite (5D) zeigen dieselbe Karte.
//
// Phase 3 (Canvas-Wahl 2026-09-27, ADR-0004):
//   1A  Monogramm-Kachel mit dem Buchstaben links, Titel „Verified Provider B"
//       und Beschreibung (Bereiche · Region) daneben, Match-Kasten rechts.
//       Der Buchstabe ist die Position in der Antwortliste — der Nutzer redet
//       ueber „B", nicht ueber „die mit 87". Nichts davon schreibt der Anbieter.
//   2B  Eine Hakenliste, zwei Gruppen: „Passt zu Ihrer Anfrage" (Fit, die
//       Prozentzahl) und „Geprueft und gemessen" (warum B ueber C steht).
//       Fakten, keine Gewichte.
//   4B  Hinter einer Buchung traegt die Karte den KLARNAMEN und darunter die
//       Herkunft: „war Verified Provider B" — wer gebucht hat, soll in seiner
//       Liste nicht weiter ein Pseudonym suchen (Nutzer 2026-09-15), aber
//       wiedererkennen, wen er gebucht hat.
//
// Die Verified-Pille entfaellt auf der Karte: sie steckt im Titel, und wer in
// der Liste steht, ist verifiziert — sonst stuende er nicht drin. Der goldene
// Match-Kasten bleibt dem besten Match (`top`) vorbehalten.

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';

/** Buchstaben-Kachel (Canvas 1A). Serif, Petrol-Rand — nimmt den Platz ein,
 *  an dem sonst ein Logo stuende. Compass-Uptake-Kandidat „Monogram". */
export function Monogram({ letter, size = 40, className = '' }: { letter: string; size?: 18 | 22 | 24 | 40 | 48; className?: string }) {
  const font = size >= 40 ? 'text-[18px]' : size >= 24 ? 'text-[12px]' : 'text-[10px]';
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-[10px] border-[1.5px] border-brand/60 bg-surface font-serif font-medium text-fg-brand ${font} ${className}`}
      style={{ width: size, height: size, borderRadius: size <= 24 ? 6 : 10 }}
    >
      {letter}
    </span>
  );
}

export function PartnerCard({ provider: p, top, basis, rankBasis, onDetails, booking, className = '' }: {
  provider: AnonProvider;
  /** Bester Match: goldener Match-Kasten. */
  top?: boolean;
  /** Woraus die Match-Zahl besteht — meist <MatchBasis basis={p.match_basis} />. */
  basis?: ReactNode;
  /** Warum der Anbieter an dieser Stelle steht — meist <RankBasis basis={p.rank_basis} />.
   *  Fehlt er, rendert die Karte ihn selbst aus `p.rank_basis`. */
  rankBasis?: ReactNode;
  onDetails: () => void;
  /** Gibt es einen Termin bei diesem Anbieter, traegt die Karte seinen
   *  KLARNAMEN statt des Titels (Stufe 3, spec §5) — und darunter die
   *  Herkunft „war Verified Provider B". */
  booking?: { name: string; slotStart: string } | null;
  className?: string;
}) {
  const { t, i18n } = useTranslation('results');
  const { beschreibung } = useRequestContext();
  const locale = i18n.resolvedLanguage || 'en';
  const when = booking
    ? new Date(booking.slotStart).toLocaleString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;
  const rank = rankBasis ?? (p.rank_basis ? <RankBasis basis={p.rank_basis} /> : null);
  return (
    <div className={`${CARD} flex flex-col p-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        <Monogram letter={p.letter} />
        <div className="min-w-0 flex-1">
          {/* Klarnamen sind laenger als Titel und muessen in einer schmalen
              Spalte umbrechen duerfen, statt aus der Karte zu laufen. */}
          <p className="break-words text-body-xs font-bold leading-snug text-fg">
            {booking ? booking.name : p.title}
          </p>
          {booking ? (
            <OriginLine letter={p.letter} title={p.title} />
          ) : (
            <p className="text-[10.5px] leading-snug text-fg-secondary">{beschreibung({ areaCodes: p.area_codes, region: p.descriptor_region, fallback: p.descriptor })}</p>
          )}
        </div>
        <span
          className={'grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px] text-body-xs font-extrabold '
            + (top ? 'bg-accent text-primary-950' : 'bg-brand-light text-fg-brand')}
        >
          {p.match}
        </span>
      </div>
      {booking && (
        <p className="mt-2.5 text-[10.5px] font-bold text-fg-brand">{t('snapshot.bookedOn', { when })}</p>
      )}
      <p className={(booking ? 'mt-0.5 ' : 'mt-2.5 ') + 'text-[10.5px] text-fg-tertiary'}>
        {[p.active_since ? t('snapshot.activeSince', { year: p.active_since }) : null,
          p.avg_response_hours != null ? t('snapshot.responseTime', { hours: p.avg_response_hours }) : null,
          t(`snapshot.billing.${p.billing_model}`)].filter(Boolean).join(' · ')}
      </p>
      {/* Die Zahl allein waere eine Behauptung — hier steht, woraus sie
          besteht (DNA-Addendum V2 P1), und darunter, warum der Anbieter an
          dieser Stelle steht (Canvas 2B). */}
      {(basis || rank) && (
        <div className="mt-3 flex flex-col gap-3 border-t border-stroke-subtle pt-3">
          {basis && <Group title={t('matchBasis.groupFit')}>{basis}</Group>}
          {rank && <Group title={t('rankBasis.group')}>{rank}</Group>}
        </div>
      )}
      {/* Der einzige gefuellte Knopf: der Weg zum einzelnen Anbieter. */}
      <div className="mt-auto pt-5">
        <Button variant={booking ? 'secondary' : 'primary'} className="w-full" onClick={onDetails}>
          {booking ? t('snapshot.providerBooked') : t('snapshot.providerDetails')}
        </Button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-fg-tertiary">{title}</p>
      {children}
    </div>
  );
}

/** Herkunftszeile nach der Offenlegung (Canvas 4B): kleine Kachel, der
 *  fruehere Titel durchgestrichen. Ohne Buchstaben — die API kennt ihn nach
 *  der Buchung nicht mehr — steht nur „war Verified Provider". */
export function OriginLine({ letter, title, session, className = '' }: { letter?: string | null; title?: string | null; session?: string | null; className?: string }) {
  const { t } = useTranslation('results');
  const label = title || t('snapshot.verifiedPartner');
  return (
    <p className={`mt-0.5 flex items-center gap-1.5 text-[10.5px] text-fg-tertiary ${className}`}>
      {letter && <Monogram letter={letter} size={18} />}
      <span>
        {session ? t('reveal.wasInSession', { title: label, session }) : t('reveal.was', { title: label })}
      </span>
    </p>
  );
}

const Row = ({ hit, children, value }: { hit: boolean; children: ReactNode; value?: ReactNode }) => (
  <li className="flex items-baseline gap-2">
    <span aria-hidden className={hit ? 'text-fg-brand' : 'text-fg-tertiary'}>{hit ? '✓' : '–'}</span>
    <span className={'min-w-0 flex-1 ' + (hit ? 'text-fg-secondary' : 'text-fg-tertiary')}>{children}</span>
    {value !== undefined && <span className="shrink-0 font-semibold tabular-nums text-fg">{value}</span>}
  </li>
);

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

/** Warum der Anbieter an dieser Stelle steht (Canvas 2B): Verifikationstiefe,
 *  Antwortzeit und Bestaetigungsrate, Bewertungen aus Buchungen. Hoechstens
 *  drei Zeilen als Saetze — mehr gehoert in die Schublade. `compact` zeigt
 *  die Werte rechts (Schublade, Detailseite), sonst stehen sie im Satz. */
export function RankBasis({ basis, compact = false }: { basis: RankBasisData; compact?: boolean }) {
  const { t, i18n } = useTranslation('results');
  const locale = i18n.resolvedLanguage || 'en';
  const verified = basis.verification !== 'none';
  const pct = basis.confirmation_rate != null ? Math.round(basis.confirmation_rate * 100) : null;
  const rating = basis.rating != null ? basis.rating.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;
  const hasReviews = rating !== null && (basis.reviews_count ?? 0) > 0;
  if (compact) {
    return (
      <ul className="flex flex-col gap-1.5 text-body-xs">
        <Row hit={verified} value={`${basis.verified_count}/${basis.required_count}`}>{t(`rankBasis.verification.${basis.verification}`)}</Row>
        {basis.response_hours != null && <Row hit value={t('rankBasis.hours', { hours: basis.response_hours })}>{t('rankBasis.responseLabel')}</Row>}
        {pct !== null && <Row hit value={`${pct} %`}>{t('rankBasis.confirmedLabel')}</Row>}
        <Row hit={hasReviews} value={hasReviews ? `${rating} · ${basis.reviews_count}` : undefined}>
          {hasReviews ? t('rankBasis.reviewsLabel') : t('rankBasis.reviewsNone')}
        </Row>
        <Row hit={false} value={t('rankBasis.never')}>{t('rankBasis.planLabel')}</Row>
      </ul>
    );
  }
  const speed = [
    basis.response_hours != null ? t('rankBasis.response', { hours: basis.response_hours }) : null,
    pct !== null ? t('rankBasis.confirmed', { pct }) : null,
  ].filter(Boolean).join(' · ');
  return (
    <ul className="flex flex-col gap-1.5 text-body-xs">
      <Row hit={verified}>{t(`rankBasis.verificationLine.${basis.verification}`, { verified: basis.verified_count, total: basis.required_count })}</Row>
      {speed && <Row hit>{speed}</Row>}
      <Row hit={hasReviews}>{hasReviews ? t('rankBasis.reviews', { rating, count: basis.reviews_count }) : t('rankBasis.reviewsNone')}</Row>
    </ul>
  );
}

/** Der Petrol-Kasten (Canvas 3B): geprueft, und bewusst ohne Namen — ein
 *  Vertrauenssignal, kein Warnhinweis. Drawer-Kopf und Detailseite an
 *  derselben Stelle. Compass-Uptake-Kandidat „AnonNotice". */
export function AnonNotice({ className = '' }: { className?: string }) {
  const { t } = useTranslation('results');
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border border-brand/40 bg-brand-light px-3.5 py-3 ${className}`}>
      <span aria-hidden className="mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-brand text-white">
        <Check size={11} strokeWidth={3} />
      </span>
      <p className="text-body-3xs leading-relaxed text-fg-secondary">
        <span className="font-bold text-fg">{t('anonNotice.title')}</span>{' '}
        {t('anonNotice.body')}
      </p>
    </div>
  );
}
