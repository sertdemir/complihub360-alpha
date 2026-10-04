import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tag } from '../../components/ui/Tag';
import { useApiData } from '../../lib/useApiData';
import { money, type PlanCode } from '../../api/billing';
import {
  fetchSubscription, selectPlan,
  type Cadence, type SubscriptionPlan, type SubscriptionView, type RunningSubscription, type SelectFailure,
} from '../../api/subscription';

// ─── Provider /subscription — die Tarifwahl (TKT-PROV-09) ────────────────────
// Canvas-Wahl des Nutzers (2026-10-04): A3 · B1 · C1 · D2 · E2 · F2 · G3.
//
//   A3  Seitenkopf als Passungsfrage, mit den freigegebenen Hauptkategorien
//       des Anbieters. Die Zahl kommt aus SEINEN Daten, nicht aus einer
//       Empfehlung von uns ("we do not create needs. We identify them").
//   B1  Umschalter monatlich/jaehrlich ueber den Tarifen; die Regel steht
//       EINMAL darunter. Der Jahresvorteil steht in MONATEN, nie als
//       Prozentzahl — eine Prozent-Ersparnis liest sich wie eine Verkaufsaktion.
//   C1  Drei Karten mit gleichem Gewicht. Kein "beliebtester Tarif": die Zahl
//       dafuer haben wir nicht, und ein erfundenes Siegel waere Druck.
//   D2  Was ein Tarif NICHT aendert — die vier Punkte aus Spec B einzeln.
//       Technisch haelt ein pgTAP-Waechter jede Preis-Tabelle aus dem
//       Matching-View heraus; gesagt hat es dem Anbieter bisher niemand.
//   E2  Bestaetigungsschritt mit Preis, Beginn, erster Rechnung und
//       Verlaengerung — plus dem Satz, dass ein Tarif allein nicht buchbar
//       macht. Ohne ihn wartet jemand auf Buchungen, die nie kommen.
//   F2  Laeuft schon ein Tarif: der echte Grund, warum ein Wechsel hier nicht
//       geht (Spec B hat Pro rata und Kuendigungsfristen offen gelassen).
//   G3  Konto kann nicht: Grund beim Namen, dazu was NICHT betroffen ist.
//
// Verworfen und warum, damit es niemand "verbessert": C3 (Empfehlung zuerst)
// ist Lenkung, D3 (Zusage in jeder Karte) klingt dreimal wie eine
// Rechtfertigung, F3 (alle Tarife sichtbar) weckt die Erwartung eines
// Wechsels, G1 (ohne Grund) ist vage, E3 (Hinweis danach) sagt es zu spaet.

const PARTNER_MAIL = 'partners@complihub360.com';

// Entwurfsdaten fuer den lokalen Lauf: kein Abo, zwei freigegebene Bereiche,
// Preise wie in `plan_catalog`. Dieselbe Rolle wie die Fixtures auf /billing.
const FIXTURE: SubscriptionView = {
  subscription: null,
  plans: [
    { code: 'essential', label: 'Essential', currency: 'USD', monthly_cents: 5900, annual_cents: 59000, category_allowance: 1, lead_discount_pct: 0, lead_discount_count: 0 },
    { code: 'growth', label: 'Growth', currency: 'USD', monthly_cents: 9900, annual_cents: 99000, category_allowance: 5, lead_discount_pct: 10, lead_discount_count: 3 },
    { code: 'global', label: 'Global', currency: 'USD', monthly_cents: 18900, annual_cents: 189000, category_allowance: null, lead_discount_pct: 15, lead_discount_count: 6 },
  ],
  released_categories: [
    { code: 'tax-vat', label: 'Tax & VAT' },
    { code: 'customs', label: 'Customs' },
  ],
  eligibility: { can_start: true, reason: null },
};

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Einen Monat weiter — fuer "die erste Rechnung kommt mit dieser Periode". */
function addOneMonth(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

export function SubscriptionPage() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const { data } = useApiData(fetchSubscription, FIXTURE);

  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [pending, setPending] = useState<SubscriptionPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState<RunningSubscription | null>(null);
  const [failure, setFailure] = useState<SelectFailure | null>(null);

  const running = started ?? data.subscription;
  const plans = data.plans;
  const released = data.released_categories;

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    setFailure(null);
    const r = await selectPlan(pending.code as PlanCode, cadence);
    setBusy(false);
    if (r.ok) { setStarted(r.subscription); setPending(null); return; }
    setFailure(r.reason);
    setPending(null);
  };

  // ── G3 · das Konto kann derzeit keinen Tarif beginnen ─────────────────────
  // Grund beim Namen, was NICHT betroffen ist, und der Weg zu einem Menschen
  // ohne Formular davor. Nicht "gesperrt": es ist nichts entschieden.
  if (!data.eligibility.can_start || failure === 'not-eligible') {
    const reason = data.eligibility.reason ?? 'suspended';
    return (
      <ProviderShell>
        <div className="mx-auto max-w-[1140px] space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-fg-brand">{t('subscription.eyebrow')}</p>
            <h1 className="mt-1 max-w-3xl font-serif text-[30px] font-bold leading-tight text-fg">
              {t(`subscription.blocked.${reason}.title`)}
            </h1>
            <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-fg-secondary">
              {t(`subscription.blocked.${reason}.body`, { mail: PARTNER_MAIL })}
            </p>
          </div>
          <div>
            <Button size="sm" variant="secondary" onClick={() => { window.location.href = `mailto:${PARTNER_MAIL}`; }}>
              {t('subscription.contact')}
            </Button>
          </div>
        </div>
      </ProviderShell>
    );
  }

  // ── F2 · es laeuft schon ein Tarif ────────────────────────────────────────
  // Der laufende Tarif mit allem, was ihn ausmacht — und der echte Grund,
  // warum ein Wechsel hier nicht geht. Kein Knopf, der sicher fehlschlaegt.
  if (running) {
    const plan = plans.find((p) => p.code === running.plan_code);
    const cur = plan?.currency ?? 'USD';
    const price = plan
      ? running.cadence === 'annual' ? money(plan.annual_cents, cur) : money(plan.monthly_cents, cur)
      : '—';
    const rows: Array<[string, string]> = [
      [t('subscription.running.price'), running.cadence === 'annual' ? t('subscription.running.perYear', { price }) : t('subscription.running.perMonth', { price })],
      [t('subscription.running.renewal'), formatDate(running.renewal_date ?? running.current_period_end, locale)],
    ];
    if (plan) {
      rows.push([t('subscription.running.categories'), plan.category_allowance == null
        ? t('subscription.allowanceAll')
        : t('subscription.running.categoriesUsed', { allowance: plan.category_allowance, used: released.length })]);
      if (plan.lead_discount_count > 0) {
        rows.push([t('subscription.running.discount'), t('subscription.running.discountValue', { pct: plan.lead_discount_pct, n: plan.lead_discount_count })]);
      }
    }
    return (
      <ProviderShell>
        <div className="mx-auto max-w-[1140px] space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-fg-brand">{t('subscription.eyebrow')}</p>
            <h1 className="mt-1 font-serif text-[30px] font-bold leading-tight text-fg">{t('subscription.running.title')}</h1>
          </div>

          {started && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-success-500/40 bg-success-50 px-5 py-3.5 dark:bg-success-950/30">
              <span className="text-[16px] font-bold text-success-700 dark:text-success-300" aria-hidden>✓</span>
              <p className="text-[13px] text-fg">{t('subscription.startedNote')}</p>
            </div>
          )}

          <section className="max-w-[760px] space-y-4 rounded-xl border border-stroke bg-surface-secondary/40 px-6 py-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="flex-1 text-[18px] font-semibold text-fg">
                {plan?.label ?? running.plan_code} · {t(running.cadence === 'annual' ? 'subscription.cadenceAnnualAdj' : 'subscription.cadenceMonthlyAdj')}
              </h2>
              <Tag tone="success">{t('subscription.running.badge')}</Tag>
            </div>
            <dl className="space-y-2.5">
              {rows.map(([k, v]) => (
                <div key={k} className="flex gap-3 text-[13px]">
                  <dt className="w-[150px] shrink-0 text-fg-tertiary">{k}</dt>
                  <dd className="min-w-0 font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <hr className="border-stroke" />
            {/* Der echte Grund, nicht nur die Einschraenkung: Spec B hat die
                Regeln fuer anteilige Abrechnung und Kuendigungsfristen offen
                gelassen. "Confidence without pretending certainty." */}
            <p className="rounded-lg bg-elevate/[0.04] px-4 py-3.5 text-[13px] leading-relaxed text-fg-secondary">
              {t('subscription.running.noChangeReason', { mail: PARTNER_MAIL })}
            </p>
          </section>
        </div>
      </ProviderShell>
    );
  }

  // ── A3 · B1 · C1 · D2 — die Wahl ──────────────────────────────────────────
  const priceOf = (p: SubscriptionPlan) => (cadence === 'annual' ? p.annual_cents : p.monthly_cents);
  const altOf = (p: SubscriptionPlan) => (cadence === 'annual'
    ? t('subscription.orMonthly', { price: money(p.monthly_cents, p.currency) })
    : t('subscription.orAnnual', { price: money(p.annual_cents, p.currency) }));

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-7">
        {/* A3 — Passungsfrage statt Kaufaufforderung. */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-fg-brand">{t('subscription.eyebrow')}</p>
          <h1 className="mt-1 font-serif text-[30px] font-bold leading-tight text-fg">{t('subscription.title')}</h1>
          <p className="mt-2 max-w-[760px] text-body-sm leading-relaxed text-fg-secondary">{t('subscription.subtitle')}</p>
          {released.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-fg-tertiary">{t(released.length === 1 ? 'subscription.releasedLeadOne' : 'subscription.releasedLeadMany', { n: released.length })}</span>
              {released.map((c) => <Tag key={c.code} tone="brand">{c.label}</Tag>)}
            </div>
          )}
        </div>

        {/* B1 — Umschalter ueber den Tarifen, die Regel EINMAL darunter. */}
        <div>
          <div role="group" aria-label={t('subscription.cadenceLabel')} className="inline-flex rounded-lg border border-stroke bg-surface p-1">
            {(['monthly', 'annual'] as Cadence[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cadence === c}
                onClick={() => setCadence(c)}
                className={[
                  'rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors',
                  cadence === c ? 'bg-brand text-fg-on-brand' : 'text-fg-secondary hover:text-fg',
                ].join(' ')}
              >
                {t(c === 'annual' ? 'subscription.cadenceAnnual' : 'subscription.cadenceMonthly')}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[13px] text-fg-secondary">{t('subscription.annualRule')}</p>
        </div>

        {/* C1 — drei Karten, gleiches Gewicht, kein Siegel. */}
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <section key={p.code} className="flex flex-col rounded-xl border border-stroke bg-surface px-5 py-5">
              <div className="flex-1 space-y-3">
                <h2 className="text-[16px] font-semibold text-fg">{p.label}</h2>
                <p className="flex items-baseline gap-1.5">
                  <span className="font-serif text-[32px] font-bold leading-none tabular-nums text-fg">{money(priceOf(p), p.currency)}</span>
                  <span className="text-[13px] text-fg-tertiary">{t(cadence === 'annual' ? 'subscription.perYear' : 'subscription.perMonth')}</span>
                </p>
                <p className="text-[12px] text-fg-tertiary">{altOf(p)}</p>
                <hr className="border-stroke" />
                <dl className="space-y-1.5 text-[12px]">
                  <div className="flex gap-2.5">
                    <dt className="w-[96px] shrink-0 text-fg-tertiary">{t('subscription.featCategories')}</dt>
                    <dd className="min-w-0 text-fg">{p.category_allowance == null
                      ? t('subscription.allowanceAll')
                      : p.category_allowance === 1
                        ? t('subscription.allowanceOne')
                        : t('subscription.allowanceMany', { n: p.category_allowance })}</dd>
                  </div>
                  <div className="flex gap-2.5">
                    <dt className="w-[96px] shrink-0 text-fg-tertiary">{t('subscription.featDiscount')}</dt>
                    <dd className="min-w-0 text-fg">
                      {p.lead_discount_count === 0
                        ? t('subscription.discountNone')
                        : t('subscription.discountValue', { pct: p.lead_discount_pct, n: p.lead_discount_count })}
                    </dd>
                  </div>
                </dl>
              </div>
              <Button className="mt-5 w-full" onClick={() => { setFailure(null); setPending(p); }}>
                {t('subscription.choose', { plan: p.label })}
              </Button>
            </section>
          ))}
        </div>

        {/* D2 — was ein Tarif NICHT aendert. Eigene Flaeche, die vier Punkte
            aus Spec B einzeln: ein Sammelsatz liesse offen, was gemeint ist. */}
        <section className="rounded-xl border border-brand/20 bg-brand/[0.05] px-6 py-5" aria-labelledby="subscription-promise">
          <h2 id="subscription-promise" className="text-[16px] font-semibold text-fg">{t('subscription.promiseTitle')}</h2>
          <p className="mt-1 text-[13px] text-fg-secondary">{t('subscription.promiseLead')}</p>
          <ul className="mt-3 space-y-2">
            {['rank', 'match', 'reviews', 'profile'].map((k) => (
              <li key={k} className="flex items-start gap-2.5 text-[13px] text-fg">
                <span className="mt-[2px] shrink-0 text-fg-tertiary" aria-hidden>✕</span>
                <span>{t(`subscription.promise.${k}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        {failure === 'exists' && (
          <p className="rounded-lg border border-stroke bg-elevate/[0.04] px-4 py-3 text-[13px] text-fg-secondary">
            {t('subscription.failExists')}
          </p>
        )}
        {failure === 'failed' && (
          <p className="rounded-lg border border-stroke bg-elevate/[0.04] px-4 py-3 text-[13px] text-fg-secondary">
            {t('subscription.failGeneric', { mail: PARTNER_MAIL })}
          </p>
        )}
      </div>

      {/* E2 — der Bestaetigungsschritt. Preis, Beginn, erste Rechnung und
          Verlaengerung stehen beieinander, BEVOR etwas entsteht; und der Satz
          zur Buchbarkeit hat eine eigene Flaeche statt einer Zeile im Fliesstext.
          Angemessen, weil sich ein Abo nicht selbst beenden laesst. */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        size="sm"
        title={pending ? t('subscription.confirmTitle', {
          plan: pending.label,
          cadence: t(cadence === 'annual' ? 'subscription.cadenceAnnualLower' : 'subscription.cadenceMonthlyLower'),
        }) : ''}
        footer={pending ? (
          <div className="flex gap-2">
            <Button onClick={confirm} disabled={busy}>{busy ? '…' : t('subscription.confirmStart', { plan: pending.label })}</Button>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>{t('subscription.back')}</Button>
          </div>
        ) : undefined}
      >
        {pending && (() => {
          const start = new Date().toISOString().slice(0, 10);
          const facts: Array<[string, string]> = [
            [t('subscription.factPrice'), cadence === 'annual'
              ? t('subscription.running.perYear', { price: money(pending.annual_cents, pending.currency) })
              : t('subscription.running.perMonth', { price: money(pending.monthly_cents, pending.currency) })],
            [t('subscription.factStart'), t('subscription.factStartValue', { date: formatDate(start, locale) })],
            [t('subscription.factInvoice'), t('subscription.factInvoiceValue')],
            [t('subscription.factRenewal'), formatDate(
              cadence === 'annual'
                ? `${Number(start.slice(0, 4)) + 1}${start.slice(4)}`
                : addOneMonth(start),
              locale,
            )],
          ];
          return (
            <div className="space-y-4">
              <dl className="space-y-2.5">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex gap-3 text-[13px]">
                    <dt className="w-[134px] shrink-0 text-fg-tertiary">{k}</dt>
                    <dd className="min-w-0 font-medium text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-lg border border-warning-500/50 bg-warning-50 px-4 py-3 dark:bg-warning-950/30">
                <p className="text-[13px] font-semibold text-fg">{t('subscription.notBookableTitle')}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-fg-secondary">{t('subscription.notBookableBody')}</p>
              </div>
            </div>
          );
        })()}
      </Modal>
    </ProviderShell>
  );
}
