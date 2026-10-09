import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tag } from '../../components/ui/Tag';
import { useApiData } from '../../lib/useApiData';
import { money, type PlanCode } from '../../api/billing';
import {
  fetchSubscription, selectPlan, scheduleChange, scheduleCancellation, withdrawScheduled,
  type Cadence, type SubscriptionPlan, type SubscriptionView, type RunningSubscription,
  type SelectFailure, type ScheduledChange, type ScheduleOutcome,
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
//   F2  Laeuft schon ein Tarif. Seit ADR-0006 (B2/C2) traegt dieser Zustand
//       Wechsel und Kuendigung — beides VORGEMERKT zum Verlaengerungstermin.
//       Canvas-Wahl 2026-10-09: 1·V2 Fussleiste in der Karte · 2·V3 Dialog mit
//       Vorher/Nachher · 3·V1 Band ueber der Karte · 4·V3 Dialog mit
//       freiwilligem Grund.
//   G3  Konto kann nicht: Grund beim Namen, dazu was NICHT betroffen ist.
//
// Zwei Abweichungen vom Canvas, beide mit Grund:
//   - Das Band traegt `info`, nicht Gold. Compass reserviert Accent-Gold fuer
//     Verified-Partner; ein vorgemerkter Wechsel ist keine Monetarisierungsmarke.
//   - Solange etwas vorgemerkt ist, verschwindet die Fussleiste. Das Backend
//     lehnt eine zweite Vormerkung ab (ALREADY_SCHEDULED) — ein Knopf, der
//     sicher fehlschlaegt, gehoert nicht auf die Flaeche.
//
// Verworfen und warum, damit es niemand "verbessert": C3 (Empfehlung zuerst)
// ist Lenkung, D3 (Zusage in jeder Karte) klingt dreimal wie eine
// Rechtfertigung, F3 (alle Tarife sichtbar) weckt die Erwartung eines
// Wechsels, G1 (ohne Grund) ist vage, E3 (Hinweis danach) sagt es zu spaet.

const PARTNER_MAIL = 'partners@complihub360.com';

// Entwurfsdaten fuer den lokalen Lauf: kein Abo, zwei freigegebene Bereiche,
// Preise wie in `plan_catalog`. Dieselbe Rolle wie die Fixtures auf /billing.
const FIXTURE: SubscriptionView = {
  // Der laufende Tarif ist der Zustand, in dem ein Anbieter die meiste Zeit
  // ist — und seit ADR-0006 der mit den meisten Flaechen. Der Eintritt
  // (subscription: null) bleibt ueber die Tarifwahl erreichbar.
  subscription: {
    plan_code: 'growth', cadence: 'monthly', status: 'active',
    current_period_start: '2026-10-01', current_period_end: '2026-11-01',
    started_at: '2026-06-01T00:00:00Z', renewal_date: '2026-11-01',
  },
  plans: [
    // `fits_released` spiegelt, was der Server zu DIESEM Konto sagt: zwei
    // freigegebene Hauptkategorien, also traegt Essential (1) sie nicht. Ohne
    // das Feld boete die Oberflaeche eine Wahl an, die der Server mit
    // ALLOWANCE_TOO_SMALL ablehnt.
    { code: 'essential', label: 'Essential', currency: 'USD', monthly_cents: 5900, annual_cents: 59000, category_allowance: 1, lead_discount_pct: 0, lead_discount_count: 0, fits_released: false },
    { code: 'growth', label: 'Growth', currency: 'USD', monthly_cents: 9900, annual_cents: 99000, category_allowance: 5, lead_discount_pct: 10, lead_discount_count: 3, fits_released: true },
    { code: 'global', label: 'Global', currency: 'USD', monthly_cents: 18900, annual_cents: 189000, category_allowance: null, lead_discount_pct: 15, lead_discount_count: 6, fits_released: true },
  ],
  released_categories: [
    { code: 'tax-vat', label: 'Tax & VAT' },
    { code: 'customs', label: 'Customs' },
  ],
  eligibility: { can_start: true, reason: null },
  scheduled: null,
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

  // ── Vormerken (ADR-0006 B2/C2) ──────────────────────────────────────────
  // Der vorgemerkte Zustand wird lokal nachgefuehrt, damit die Flaeche nach
  // einer Vormerkung sofort stimmt, ohne auf einen zweiten GET zu warten.
  // `undefined` heisst "noch nichts getan", `null` heisst "zurueckgenommen" —
  // ein blosses `null` koennte sonst nicht von "nie etwas da gewesen"
  // unterschieden werden.
  const [lokalVorgemerkt, setLokalVorgemerkt] = useState<ScheduledChange | null | undefined>(undefined);
  const [dialog, setDialog] = useState<'change' | 'cancel' | null>(null);
  const [zielTarif, setZielTarif] = useState<SubscriptionPlan | null>(null);
  const [zielZahlweise, setZielZahlweise] = useState<Cadence>('monthly');
  const [grund, setGrund] = useState('');
  const [planFehler, setPlanFehler] = useState<Extract<ScheduleOutcome, { ok: false }> | null>(null);

  const running = started ?? data.subscription;
  const plans = data.plans;
  const released = data.released_categories;
  const vorgemerkt = lokalVorgemerkt !== undefined ? lokalVorgemerkt : data.scheduled;

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

  /** Ein Ergebnis einer Vormerkung verarbeiten — Erfolg wie Absage. */
  const verarbeite = (r: ScheduleOutcome) => {
    setBusy(false);
    if (r.ok) {
      setLokalVorgemerkt(r.scheduled);
      setDialog(null);
      setPlanFehler(null);
      setGrund('');
      return;
    }
    setPlanFehler(r);
  };

  const wechselVormerken = async () => {
    if (!zielTarif) return;
    setBusy(true); setPlanFehler(null);
    verarbeite(await scheduleChange(zielTarif.code as PlanCode, zielZahlweise));
  };

  const kuendigungVormerken = async () => {
    setBusy(true); setPlanFehler(null);
    // Der Grund ist freiwillig — leer bleibt leer, nichts wird erzwungen.
    verarbeite(await scheduleCancellation(grund.trim() || undefined));
  };

  const zuruecknehmen = async () => {
    setBusy(true); setPlanFehler(null);
    const r = await withdrawScheduled();
    setBusy(false);
    if (r.ok) setLokalVorgemerkt(null); else setPlanFehler(r);
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
    // Der Stichtag ist der VERLAENGERUNGSTERMIN. `current_period_end` ist der
    // Rabattzyklus und nur bei monatlicher Zahlweise derselbe Tag — wer die
    // beiden verwechselt, beendet ein bezahltes Jahresabo nach vier Wochen.
    const stichtag = vorgemerkt?.effective_on ?? running.renewal_date ?? running.current_period_end;
    const stichtagText = formatDate(stichtag, locale);
    const tagDavor = stichtag
      ? new Date(new Date(`${stichtag.slice(0, 10)}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10)
      : null;

    // Was ueberhaupt vormerkbar ist: nicht der laufende Tarif, und nur, was die
    // freigegebenen Hauptkategorien traegt.
    const wechselbar = plans.filter((p) => p.fits_released !== false && p.code !== running.plan_code);

    const fehlerText = (f: Extract<ScheduleOutcome, { ok: false }>) =>
      f.reason === 'allowance'
        ? t('subscription.manage.errAllowance', { allowance: f.allowance, used: f.used })
        : f.reason === 'already' ? t('subscription.manage.errAlready')
        : f.reason === 'same' ? t('subscription.manage.errSame')
        : t('subscription.manage.errFailed');

    const zielLabel = vorgemerkt?.plan_code
      ? `${plans.find((p) => p.code === vorgemerkt.plan_code)?.label ?? vorgemerkt.plan_code} · ${t(vorgemerkt.cadence === 'annual' ? 'subscription.cadenceAnnualAdj' : 'subscription.cadenceMonthlyAdj')}`
      : null;

    return (
      <ProviderShell>
        <div className="mx-auto max-w-[1140px] space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-fg-brand">{t('subscription.eyebrow')}</p>
            <h1 className="mt-1 font-serif text-[30px] font-bold leading-tight text-fg">{t('subscription.running.title')}</h1>
          </div>

          {/* 3·V1 — das Band. `info`, nicht Gold: Accent-Gold ist in Compass
              dem Verified-Partner vorbehalten, und eine Vormerkung ist keine
              Monetarisierungsmarke. Es steht NEBEN dem laufenden Tarif, nicht
              an seiner Stelle — bis zum Stichtag aendert sich nichts. */}
          {vorgemerkt && (
            <div className="flex max-w-[760px] flex-wrap items-center gap-4 rounded-xl border border-info-500/40 bg-info-50 px-5 py-4 dark:bg-info-950/30">
              <div className="min-w-[320px] flex-1">
                <p className="text-[14px] font-semibold text-fg">
                  {vorgemerkt.action === 'cancellation'
                    ? t('subscription.manage.bandCancel', { date: stichtagText })
                    : t('subscription.manage.bandChange', { date: stichtagText, plan: zielLabel })}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">
                  {t('subscription.manage.bandBody', {
                    requested: formatDate(vorgemerkt.requested_at, locale),
                    plan: plan?.label ?? running.plan_code,
                  })}
                </p>
              </div>
              <Button size="sm" variant="outline" loading={busy} onClick={zuruecknehmen}>
                {t('subscription.manage.withdraw')}
              </Button>
            </div>
          )}

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
            {/* 1·V2 — die Fussleiste. Sie verschwindet, solange etwas
                vorgemerkt ist: das Backend lehnt eine zweite Vormerkung ab
                (ALREADY_SCHEDULED), und ein Knopf, der sicher fehlschlaegt,
                waere ein Versprechen, das die Flaeche nicht halten kann. */}
            {!vorgemerkt && (
              <>
                <hr className="border-stroke" />
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button size="md" variant="outline" onClick={() => { setZielTarif(wechselbar[0] ?? null); setZielZahlweise(running.cadence); setDialog('change'); }}>
                    {t('subscription.manage.change')}
                  </Button>
                  <Button size="md" variant="ghost" onClick={() => setDialog('cancel')}>
                    {t('subscription.manage.cancel')}
                  </Button>
                  <span className="min-w-[260px] flex-1 text-[12px] text-fg-tertiary">
                    {t('subscription.manage.bothTakeEffect', { date: stichtagText })}
                  </span>
                </div>
              </>
            )}
          </section>
        </div>

        {/* 2·V3 — Wechsel mit Vorher/Nachher. Der Zieltarif wird hier gewaehlt:
            ohne Wahl koennte der Vergleich nichts zeigen. */}
        <Modal
          open={dialog === 'change'}
          onClose={() => { setDialog(null); setPlanFehler(null); }}
          size="lg"
          title={zielTarif ? t('subscription.manage.changeTitle', { plan: zielTarif.label }) : t('subscription.manage.change')}
          description={t('subscription.manage.changeIntro')}
          footer={
            <>
              <Button size="md" variant="primary" loading={busy} disabled={!zielTarif} onClick={wechselVormerken}>
                {t('subscription.manage.scheduleFor', { date: stichtagText })}
              </Button>
              <Button size="md" variant="secondary" onClick={() => { setDialog(null); setPlanFehler(null); }}>
                {t('subscription.manage.dismiss')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-fg">{t('subscription.manage.pickTarget')}</legend>
              <div className="flex flex-wrap gap-2">
                {plans.map((p) => {
                  const selbst = p.code === running.plan_code && zielZahlweise === running.cadence;
                  const passt = p.fits_released !== false;
                  const aktiv = zielTarif?.code === p.code;
                  return (
                    <button
                      key={p.code}
                      type="button"
                      disabled={!passt || selbst}
                      onClick={() => setZielTarif(p)}
                      className={`rounded-md border px-3 py-2 text-left text-[13px] transition ${
                        aktiv ? 'border-brand bg-brand-light font-semibold text-fg-brand' : 'border-stroke text-fg-secondary'
                      } ${!passt || selbst ? 'cursor-not-allowed opacity-50' : 'hover:border-stroke-strong'}`}
                    >
                      {p.label}
                      {selbst && <span className="ml-1.5 text-fg-tertiary">· {t('subscription.manage.current')}</span>}
                    </button>
                  );
                })}
              </div>
              {/* Die Grenze steht VOR dem Klick: `fits_released` kommt aus dem
                  GET, damit niemand erst nach der Wahl ein 409 sieht. */}
              {plans.some((p) => p.fits_released === false) && (
                <p className="text-[12px] leading-relaxed text-fg-tertiary">
                  {t('subscription.manage.someTooSmall', { used: released.length })}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(['monthly', 'annual'] as Cadence[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setZielZahlweise(c)}
                    className={`rounded-md border px-3 py-1.5 text-[13px] ${
                      zielZahlweise === c ? 'border-brand bg-brand-light font-semibold text-fg-brand' : 'border-stroke text-fg-secondary'
                    }`}
                  >
                    {t(c === 'annual' ? 'subscription.cadenceAnnual' : 'subscription.cadenceMonthly')}
                  </button>
                ))}
                <span className="text-[12px] text-fg-tertiary">{t('subscription.annualRule')}</span>
              </div>
            </fieldset>

            <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-stroke sm:grid-cols-2">
              <div className="bg-surface-secondary/60 px-[18px] py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-fg-tertiary">
                  {t('subscription.manage.untilDate', { date: formatDate(tagDavor, locale) })}
                </p>
                <p className="mt-2 text-[15px] font-semibold text-fg">
                  {plan?.label ?? running.plan_code} · {t(running.cadence === 'annual' ? 'subscription.cadenceAnnualAdj' : 'subscription.cadenceMonthlyAdj')}
                </p>
                <p className="mt-1 text-[13px] text-fg-secondary">{rows[0][1]}</p>
              </div>
              <div className="border-stroke px-[18px] py-4 sm:border-l">
                <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-fg-brand">
                  {t('subscription.manage.fromDate', { date: stichtagText })}
                </p>
                <p className="mt-2 text-[15px] font-semibold text-fg">
                  {zielTarif ? `${zielTarif.label} · ${t(zielZahlweise === 'annual' ? 'subscription.cadenceAnnualAdj' : 'subscription.cadenceMonthlyAdj')}` : '—'}
                </p>
                <p className="mt-1 text-[13px] text-fg-secondary">
                  {zielTarif
                    ? zielZahlweise === 'annual'
                      ? t('subscription.running.perYear', { price: money(zielTarif.annual_cents, zielTarif.currency) })
                      : t('subscription.running.perMonth', { price: money(zielTarif.monthly_cents, zielTarif.currency) })
                    : '—'}
                </p>
              </div>
            </div>

            <ul className="space-y-1.5 text-[13px] leading-relaxed text-fg-secondary">
              <li>{t('subscription.manage.factProrata')}</li>
              <li>{t('subscription.manage.factWithdraw', { date: stichtagText })}</li>
              <li>{t('subscription.manage.factRanking')}</li>
            </ul>

            {planFehler && <p className="text-[13px] text-error-700 dark:text-error-300">{fehlerText(planFehler)}</p>}
          </div>
        </Modal>

        {/* 4·V3 — Kuendigen. Der Grund ist freiwillig und bleibt es: keine
            Rueckhaltefrage, kein Angebot zum Bleiben, kein Pflichtfeld. */}
        <Modal
          open={dialog === 'cancel'}
          onClose={() => { setDialog(null); setPlanFehler(null); }}
          size="md"
          title={t('subscription.manage.cancelTitle', { date: stichtagText })}
          description={t('subscription.manage.cancelIntro', { plan: plan?.label ?? running.plan_code })}
          footer={
            <>
              <Button size="md" variant="primary" loading={busy} onClick={kuendigungVormerken}>
                {t('subscription.manage.cancelFor', { date: stichtagText })}
              </Button>
              <Button size="md" variant="secondary" onClick={() => { setDialog(null); setPlanFehler(null); }}>
                {t('subscription.manage.dismiss')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="rounded-lg bg-elevate/[0.04] px-3.5 py-3 text-[12px] leading-relaxed text-fg-secondary">
              {t('subscription.manage.cancelKeeps')}
            </p>
            <div>
              <label htmlFor="kuendigungsgrund" className="text-[13px] font-semibold text-fg">
                {t('subscription.manage.reasonLabel')}{' '}
                <span className="font-normal text-fg-tertiary">{t('subscription.manage.optional')}</span>
              </label>
              <p className="mb-2 mt-1 text-[12px] leading-relaxed text-fg-tertiary">{t('subscription.manage.reasonHint')}</p>
              <textarea
                id="kuendigungsgrund"
                rows={3}
                maxLength={500}
                value={grund}
                onChange={(e) => setGrund(e.target.value)}
                placeholder={t('subscription.manage.optional')}
                className="w-full rounded-md border border-stroke bg-surface px-3 py-2 text-[13px] leading-relaxed text-fg"
              />
            </div>
            {planFehler && <p className="text-[13px] text-error-700 dark:text-error-300">{fehlerText(planFehler)}</p>}
          </div>
        </Modal>
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
