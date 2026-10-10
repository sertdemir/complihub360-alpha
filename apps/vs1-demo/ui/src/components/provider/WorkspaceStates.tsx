import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { TechnicalDetails } from '../results/RiskMapState';
import { referenceOf } from '../../api/client';
import { fetchApplication, type Application, type LifecycleStatus } from '../../api/application';
import { fetchSubscription, type SubscriptionView } from '../../api/subscription';
import { useRequestContext } from '../../lib/requestContext';

// ─── Partner-Arbeitsbereich · ehrliche Zustaende (TKT-PROV-12) ───────────────
// Canvas „Partner-Dashboard ohne Fixtures", Wahl A2 · B3 (09.10.2026);
// Figma: Screens-Datei, Seite „Partner ohne Fixtures (TKT-PROV-12)",
// A2 3628:711 · B3 3628:847. Copy wortgleich aus `common:states.partner.*`
// (fuenfte Abnahme im Copy-Waechter).

export type LoadFailedSurface =
  | 'requests' | 'appointments' | 'invoices' | 'currentPeriod'
  | 'plan' | 'performance' | 'notifications' | 'coverage' | 'overview';

/** A2 · Laden fehlgeschlagen. Der Zustand IST die Flaeche: Ueberschrift je
 *  Flaeche, ein Satz, „Erneut versuchen" und der Weg zum Support, dazu die
 *  Referenz-ID — dasselbe Muster wie `riskMapFailed`. `section` setzt ihn
 *  eine Stufe kleiner, fuer Seiten mit mehreren Abrufen (/billing). */
export function LoadFailedState({
  surface,
  error,
  onRetry,
  section = false,
}: {
  surface: LoadFailedSurface;
  error: unknown;
  onRetry: () => void;
  section?: boolean;
}) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';
  const Heading = section ? 'h2' : 'h1';
  return (
    <div role="status" className={section ? 'flex max-w-[720px] flex-col gap-3 py-2' : 'flex max-w-[720px] flex-col gap-3'}>
      <Heading className={section
        ? 'text-[17px] font-semibold leading-snug text-fg'
        : 'text-balance font-serif text-[30px] font-bold leading-tight text-fg'}>
        {t(`states.partner.loadFailed.${surface}`)}
      </Heading>
      <p className="text-pretty text-body-sm leading-relaxed text-fg-secondary">{t('states.partner.loadFailed.message')}</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button size="sm" onClick={onRetry}>{t('states.actions.tryAgain')}</Button>
        <Button size="sm" variant="secondary" onClick={() => navigate(`/${locale}/contact`)}>{t('states.actions.contactSupport')}</Button>
      </div>
      <TechnicalDetails reference={referenceOf(error)} />
    </div>
  );
}

// ─── B3 · Bereitschaft ───────────────────────────────────────────────────────

/** Bei diesen Status ist die Verifizierung durch (Spec A: buchbar, sobald
 *  Tarif und Zahlungsmittel stimmen). */
const VERIFIED: ReadonlySet<LifecycleStatus> = new Set(['active', 'limited', 'reverification_due']);
/** Hier laeuft die Pruefung noch. Bei draft, paused, suspended und terminated
 *  steht keine Liste: Dort waere „Verifizierung laeuft" falsch, und diese
 *  Lagen haben eigene Hinweise (ApplicationStatusBanner). */
const IN_REVIEW: ReadonlySet<LifecycleStatus> = new Set(['submitted', 'under_verification', 'more_info_required', 'approved_pending_activation']);

/** Andere Sperrgruende als „kein Zahlungsmittel" (gescheiterte Belastung,
 *  widerrufenes Mandat, offene Rechnung …) nennt /billing mit eigenem Satz.
 *  Hier faellt die Zeile dann weg — „Noch kein Zahlungsmittel" waere bei einer
 *  hinterlegten, aber abgelehnten Karte falsch, „hinterlegt ✓" ebenso. */
const PAYMENT_OK_UNLESS = new Set(['payment_failed', 'withdrawn_authorization']);

export type ReadinessKey = 'verification' | 'plan' | 'payment';

export interface ReadinessItem {
  key: ReadinessKey;
  done: boolean;
  title: string;
  sub?: string;
  /** Ziel im Partner-Bereich (relativ zu /:locale/partner-dashboard). */
  action?: { label: string; to: string };
}

/** Rein, damit die Tests die Lagen ohne DOM pruefen koennen. `markt` und
 *  `t` kommen von der Seite (Sprache). Gibt `null` zurueck, wenn die Liste
 *  fuer den Lifecycle-Status nichts Wahres sagen kann. */
export function readinessItems(
  app: Application,
  sub: SubscriptionView | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
  markt: (code: string) => string,
  locale: string,
  bereich: (slug: string) => string = (s) => s,
): ReadinessItem[] | null {
  const status = app.provider.lifecycle_status;
  if (!VERIFIED.has(status) && !IN_REVIEW.has(status)) return null;
  const items: ReadinessItem[] = [];

  if (VERIFIED.has(status)) {
    // Bereichsnamen aus dem Code in der Sprache der Seite; das Label der API
    // ist englisch. Ohne Uebersetzung bleibt das Label.
    const areas = (sub?.released_categories ?? []).map((c) => { const n = bereich(c.code); return n && n !== c.code ? n : c.label; });
    const markets = [...new Set(app.services
      .flatMap((s) => s.coverage)
      .filter((c) => c.status === 'approved' || c.status === 'limited')
      .map((c) => c.country_code))].map(markt);
    items.push({
      key: 'verification', done: true, title: t('common:states.partner.readiness.verified'),
      sub: areas.length && markets.length
        ? t('common:states.partner.readiness.verifiedSub', { areas: joinList(areas, locale), markets: joinList(markets, locale) })
        : undefined,
    });
  } else {
    items.push({ key: 'verification', done: false, title: t('common:states.partner.readiness.verifying'), sub: t('common:states.partner.readiness.verifyingSub') });
  }

  const running = sub?.subscription ?? null;
  if (running) {
    const plan = sub?.plans.find((p) => p.code === running.plan_code)?.label ?? running.plan_code;
    const cycle = t(running.cadence === 'annual' ? 'providerws:subscription.cadenceAnnualAdj' : 'providerws:subscription.cadenceMonthlyAdj');
    items.push({ key: 'plan', done: true, title: t('common:states.partner.readiness.plan'), sub: t('common:states.partner.readiness.planSub', { plan, cycle }) });
  } else {
    items.push({ key: 'plan', done: false, title: t('common:states.partner.readiness.noPlan'), action: { label: t('common:states.partner.readiness.noPlanAction'), to: 'subscription' } });
  }

  const reasons = app.provider.billing_block_reasons ?? [];
  if (reasons.includes('no_payment_method')) {
    items.push({
      key: 'payment', done: false, title: t('common:states.partner.readiness.noPayment'),
      sub: t('common:states.partner.readiness.noPaymentSub'),
      action: { label: t('common:states.partner.readiness.noPaymentAction'), to: 'billing' },
    });
  } else if (!reasons.some((r) => PAYMENT_OK_UNLESS.has(r))) {
    // Den Namen der Karte kennt nur der Abgleich mit Stripe (billing/sync) —
    // ohne ihn steht die Zeile ohne Unterzeile, statt etwas zu raten.
    items.push({ key: 'payment', done: true, title: t('common:states.partner.readiness.payment') });
  }
  return items;
}

/** „A, B und C" ohne eigene Copy: Intl.ListFormat in der Sprache der Seite. */
function joinList(parts: string[], locale: string): string {
  try {
    // Die TS-Lib dieses Projekts kennt ListFormat (ES2021) nicht; die Browser schon.
    const LF = (Intl as unknown as { ListFormat?: new (l: string, o: object) => { format: (p: string[]) => string } }).ListFormat;
    return LF ? new LF(locale, { style: 'long', type: 'conjunction' }).format(parts) : parts.join(', ');
  } catch {
    return parts.join(', ');
  }
}

/** B3 · Noch keine Termine / Anfragen. Ohne `items` (Abruf gescheitert oder
 *  ein Status, fuer den die Liste nichts Wahres sagt) bleiben Ueberschrift,
 *  Erklaerung und Schlusssatz — nie eine geratene Liste. */
export function ReadinessEmpty({
  kind,
  items,
}: {
  kind: 'appointments' | 'requests';
  items: ReadinessItem[] | null;
}) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';
  return (
    <div className="space-y-3.5 rounded-xl border border-dashed border-stroke bg-surface-secondary/60 px-6 py-5">
      <div className="space-y-1.5">
        <h2 className="text-[17px] font-semibold text-fg">{t(`states.partner.empty.${kind}`)}</h2>
        <p className="max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('states.partner.empty.howBookingWorks')}</p>
      </div>
      {items && (
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-start gap-3" data-readiness={it.key} data-done={it.done}>
              <span
                aria-hidden
                className={'mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border text-[12px] font-bold '
                  + (it.done ? 'border-success-500/40 bg-success-50 text-success-700' : 'border-warning-500/50 bg-warning-50 text-warning-700')}
              >
                {it.done ? '✓' : '!'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-fg">{it.title}</span>
                {it.sub && <span className="block text-[12px] text-fg-tertiary">{it.sub}</span>}
              </span>
              {it.action && (
                <Button size="sm" variant="secondary" onClick={() => navigate(`/${locale}/partner-dashboard/${it.action!.to}`)}>
                  {it.action.label}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12px] text-fg-tertiary">{t('states.partner.empty.closing')}</p>
    </div>
  );
}

/** Laedt Bewerbung und Tarif fuer B3. Scheitert einer der Abrufe, bleibt die
 *  Liste weg (`null`) — der leere Zustand steht trotzdem. */
export function useReadiness(enabled: boolean): ReadinessItem[] | null {
  const { t } = useTranslation(['common', 'providerws']);
  const { markt, bereich, locale } = useRequestContext();
  const [items, setItems] = useState<ReadinessItem[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all([fetchApplication(), fetchSubscription().catch(() => null)])
      .then(([app, sub]) => { if (!cancelled) setItems(readinessItems(app, sub, t, markt, locale, bereich)); })
      .catch(() => { if (!cancelled) setItems(null); });
    return () => { cancelled = true; };
  }, [enabled, locale]);
  return items;
}
