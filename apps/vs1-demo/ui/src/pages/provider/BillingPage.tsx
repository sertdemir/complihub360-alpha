import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { KPICard } from '../../components/ui/Cards';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Tag } from '../../components/ui/Tag';
import { InvoiceDetailDrawer } from '../../components/provider/InvoiceDetailDrawer';
import { useApiData } from '../../lib/useApiData';
import { fetchInvoices, fetchBillingPreview, openBillingPortal, syncBillingReadiness, money, type Invoice, type BillingPreview, type BillingReadiness } from '../../api/billing';

// ─── Provider /billing ────────────────────────────────────────────────────────
// Mirrors "Provider Dashboard v1 · /billing (Desktop · payment-failed)"
// (1911:370): payment-failed banner · 4 month KPIs · invoice history table.
// B7: rows come from the invoices table; a row click opens the detail drawer.
//
// Phase 4 (ADR-0005, Canvas-Wahl 4A): oben ein Status-Kasten mit zwei
// Zustaenden. Gesperrt: jeder Grund als Satz mit dem Weg zur Behebung, Button
// ins Portal, „Jetzt pruefen". Bereit: eine gruene Zeile mit Karte, Plan,
// Mandat, Pruefzeit. Der Satz „Sie bleiben sichtbar" nimmt die Angst, die
// Spec A §14 ohnehin ausschliesst. Beim Rueckweg aus dem Portal (`?from=portal`)
// stoesst die Seite den Sync an — nie im Buchungspfad.

const FIXTURE: Invoice[] = [
  { id: 'f-026', invoice_number: 'INV-026', period: '2026-05', amount_cents: 216400, currency: 'EUR', status: 'failed',
    issued_at: '2026-06-01', due_at: '2026-06-15', paid_at: null,
    line_items: [
      { label: 'Booking leads', qty: 22, unit_cents: 9200, amount_cents: 202400 },
      { label: 'Profile detail opens', qty: 70, unit_cents: 200, amount_cents: 14000 },
    ] },
  { id: 'f-025', invoice_number: 'INV-025', period: '2026-04', amount_cents: 189200, currency: 'EUR', status: 'paid',
    issued_at: '2026-05-01', due_at: '2026-05-15', paid_at: '2026-05-03',
    line_items: [
      { label: 'Booking leads', qty: 19, unit_cents: 9200, amount_cents: 174800 },
      { label: 'Profile detail opens', qty: 72, unit_cents: 200, amount_cents: 14400 },
    ] },
  { id: 'f-024', invoice_number: 'INV-024', period: '2026-03', amount_cents: 152400, currency: 'EUR', status: 'paid',
    issued_at: '2026-04-01', due_at: '2026-04-15', paid_at: '2026-04-02',
    line_items: [
      { label: 'Booking leads', qty: 16, unit_cents: 9200, amount_cents: 147200 },
      { label: 'Profile detail opens', qty: 26, unit_cents: 200, amount_cents: 5200 },
    ] },
  { id: 'f-023', invoice_number: 'INV-023', period: '2026-02', amount_cents: 173200, currency: 'EUR', status: 'paid',
    issued_at: '2026-03-01', due_at: '2026-03-15', paid_at: '2026-03-02',
    line_items: [
      { label: 'Booking leads', qty: 18, unit_cents: 9200, amount_cents: 165600 },
      { label: 'Profile detail opens', qty: 38, unit_cents: 200, amount_cents: 7600 },
    ] },
  { id: 'f-022', invoice_number: 'INV-022', period: '2026-01', amount_cents: 160800, currency: 'EUR', status: 'paid',
    issued_at: '2026-02-01', due_at: '2026-02-15', paid_at: '2026-02-01',
    line_items: [
      { label: 'Booking leads', qty: 17, unit_cents: 9200, amount_cents: 156400 },
      { label: 'Profile detail opens', qty: 22, unit_cents: 200, amount_cents: 4400 },
    ] },
];

// Design fixture for the current-cycle preview (Pricing v2, ADR-0003):
// Growth, zwei rabattierte Leads verbraucht, einer offen.
const PREVIEW_FIXTURE: BillingPreview = {
  period: '2026-09',
  currency: 'USD',
  subscription: {
    plan_code: 'growth', label: 'Growth', cadence: 'monthly', status: 'active',
    current_period_start: '2026-09-01', current_period_end: '2026-10-01',
    monthly_cents: 9900, annual_cents: 99000, category_allowance: 5, analytics_level: 'enhanced', api_eligible: false,
  },
  discount: { pct: 10, count: 3, used: 2, remaining: 1, cycle_start: '2026-09-01' },
  leads: { count: 2, standard_cents: 24800, discount_cents: 2480, final_cents: 22320 },
  readiness: { ready: false, reasons: ['payment_failed'], synced_at: '2026-10-01T08:42:00Z', payment_method: 'Visa ····4242',
    cure_period_days: 7, invoices_in_grace: 1, blocks_at: '2026-10-24', overdue_since: '2026-10-16' },
  credit_balance_cents: 0,
  lines: [{ label: 'Growth · monthly · 2026-09', qty: 1, unit_cents: 9900, amount_cents: 9900 }],
  total_cents: 32220,
  pricing: {
    plans: [
      { code: 'essential', label: 'Essential', monthly_cents: 5900, annual_cents: 59000, currency: 'USD', category_allowance: 1, lead_discount_pct: 0, lead_discount_count: 0 },
      { code: 'growth', label: 'Growth', monthly_cents: 9900, annual_cents: 99000, currency: 'USD', category_allowance: 5, lead_discount_pct: 10, lead_discount_count: 3 },
      { code: 'global', label: 'Global', monthly_cents: 18900, annual_cents: 189000, currency: 'USD', category_allowance: null, lead_discount_pct: 15, lead_discount_count: 6 },
    ],
    bands: [
      { band: 1, label: 'Focused', fee_cents: 9900, currency: 'USD' },
      { band: 2, label: 'Core', fee_cents: 14900, currency: 'USD' },
      { band: 3, label: 'Advanced', fee_cents: 29900, currency: 'USD' },
      { band: 4, label: 'Strategic', fee_cents: 49900, currency: 'USD' },
    ],
  },
};

const STATUS_META: Record<Invoice['status'], { labelKey: string; tone: 'success' | 'error' | 'warning' | 'neutral' }> = {
  paid: { labelKey: 'billing.statusPaid', tone: 'success' },
  failed: { labelKey: 'billing.statusFailedGrace', tone: 'error' },
  open: { labelKey: 'billing.statusOpen', tone: 'warning' },
  void: { labelKey: 'billing.statusVoid', tone: 'neutral' },
};

export function BillingPage() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const { data: invoices } = useApiData(fetchInvoices, FIXTURE);
  const { data: preview } = useApiData(fetchBillingPreview, PREVIEW_FIXTURE);
  const [detail, setDetail] = useState<Invoice | null>(null);

  // Zahlungsbereitschaft: aus der Vorschau, bis ein Sync etwas Neueres weiss.
  const [synced, setSynced] = useState<BillingReadiness | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'busy' | 'not-configured' | 'failed'>('idle');
  const readiness: BillingReadiness | null = synced ?? preview.readiness ?? null;
  const sync = async () => {
    setSyncState('busy');
    try {
      const r = await syncBillingReadiness();
      if (r === 'not-configured') { setSyncState('not-configured'); return; }
      setSynced(r);
      setSyncState('idle');
    } catch {
      setSyncState('failed');
    }
  };
  // `?from=portal`: der Anbieter kommt aus dem Stripe-Portal zurueck — jetzt
  // kann sich etwas geaendert haben (neue Karte, Rechnung bezahlt).
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('from') !== 'portal') return;
    const next = new URLSearchParams(params); next.delete('from'); setParams(next, { replace: true });
    void sync();
  }, []);
  // C3: "Update payment method" → Stripe billing portal; honest note until
  // STRIPE_SECRET_KEY lands on the API.
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalNote, setPortalNote] = useState('');
  const updatePayment = async () => {
    setPortalBusy(true); setPortalNote('');
    try {
      const target = await openBillingPortal();
      if (target === 'not-configured') {
        setPortalNote(t('billing.portalNotConfigured'));
      } else {
        window.location.href = target;
      }
    } catch {
      setPortalNote(t('billing.portalUnavailable'));
    }
    setPortalBusy(false);
  };

  const latest = invoices[0];
  const failed = invoices.find((i) => i.status === 'failed');
  const ytd = invoices.filter((i) => i.period.startsWith('2026')).reduce((n, i) => n + i.amount_cents, 0);
  const cur = preview.currency;
  const planLabel = preview.subscription
    ? `${preview.subscription.label} · ${t(preview.subscription.cadence === 'annual' ? 'billing.planCadenceAnnual' : 'billing.planCadenceMonthly')}`
    : t('billing.planNone');
  const kpis = [
    { label: t('billing.kpiThisMonth'), value: money(preview.total_cents, cur),
      trend: { value: '—', direction: 'neutral' as const, label: t('billing.kpiThisMonthUsage', { leads: preview.leads.count, remaining: preview.discount.remaining }) } },
    { label: t('billing.kpiLastInvoice'), value: latest ? money(latest.amount_cents, latest.currency) : '—',
      trend: latest?.status === 'failed'
        ? { value: '↘', direction: 'down' as const, label: `${latest.invoice_number} · ${t('billing.kpiPaymentFailed')}` }
        : { value: '—', direction: 'neutral' as const, label: latest ? `${latest.invoice_number} · ${latest.status}` : '' } },
    // Naechste Rechnung = Ende des laufenden Zyklus (vorher fest '2026-08-01').
    { label: t('billing.kpiNextInvoice'), value: preview.subscription?.current_period_end ?? '—', trend: { value: '—', direction: 'neutral' as const, label: t('billing.kpiMonthlyFirst') } },
    { label: t('billing.kpiYtd'), value: money(ytd, latest?.currency ?? cur), trend: { value: '↗', direction: 'up' as const, label: t('billing.kpiAcrossMonths', { count: invoices.length }) } },
  ];

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('billing.title')}</h1>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">
            {t('billing.subtitle')}
          </p>
        </div>

        {/* Kulanzfrist (ADR-0006, A2): eine faellige Rechnung sperrt erst nach
            sieben Tagen. Der Hinweis steht AB TAG 1 und VOR dem Status-Kasten —
            der eigentliche Fehler am alten Zustand war nicht die Sperre,
            sondern dass sie unangekuendigt eintrat. Letzter Satz nimmt die
            Angst, die Spec A §14 ohnehin ausschliesst: die Sichtbarkeit
            bleibt unberuehrt. */}
        {!!readiness?.invoices_in_grace && readiness.blocks_at && (
          <section className="rounded-xl border border-warning-500/50 bg-warning-50 px-5 py-4 dark:bg-warning-950/30" aria-labelledby="billing-grace">
            <h2 id="billing-grace" className="text-[15px] font-semibold text-fg">
              {t(readiness.invoices_in_grace === 1 ? 'billing.graceTitleOne' : 'billing.graceTitleMany', { n: readiness.invoices_in_grace })}
            </h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fg-secondary">
              {t('billing.graceBody', {
                since: readiness.overdue_since ? new Date(`${readiness.overdue_since}T00:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '—',
                until: new Date(`${readiness.blocks_at}T00:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
              })}
            </p>
            <p className="mt-2 text-[12px] text-fg-tertiary">{t('billing.graceStillVisible')}</p>
            <div className="mt-3">
              <Button size="sm" onClick={updatePayment} disabled={portalBusy}>
                {portalBusy ? '…' : t('billing.graceOpenPortal')}
              </Button>
            </div>
          </section>
        )}

        {/* Canvas 4A: der Status-Kasten. Gesperrt nennt jeden Grund mit dem
            Weg zur Behebung; bereit ist eine Zeile. */}
        {readiness && (
          readiness.ready ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-success-500/40 bg-success-50 px-5 py-3.5 dark:bg-success-950/30">
              <span className="text-[16px] font-bold text-success-700 dark:text-success-300" aria-hidden>✓</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">{t('billing.readyTitle')}</p>
                <p className="text-[12px] text-fg-secondary">
                  {[readiness.payment_method, planLabel, readiness.synced_at ? t('billing.readinessChecked', { when: new Date(readiness.synced_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) }) : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={sync} disabled={syncState === 'busy'}>{syncState === 'busy' ? '…' : t('billing.checkNow')}</Button>
            </div>
          ) : (
            <section className="rounded-xl border border-warning-500/50 bg-warning-50 px-5 py-4 dark:bg-warning-950/30" aria-labelledby="billing-readiness">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 id="billing-readiness" className="text-[15px] font-semibold text-fg">{t('billing.blockedTitle')}</h2>
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">
                  {t('billing.readinessLabel')}{readiness.synced_at ? ` · ${t('billing.readinessChecked', { when: new Date(readiness.synced_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) })}` : ''}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {readiness.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-[13px] text-fg">
                    <span className="mt-[1px] font-bold text-warning-700 dark:text-warning-300" aria-hidden>!</span>
                    <span>{t(`billing.reason.${r}`)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={updatePayment} disabled={portalBusy}>{portalBusy ? '…' : t('billing.changePaymentInPortal')}</Button>
                <Button size="sm" variant="secondary" onClick={sync} disabled={syncState === 'busy'}>{syncState === 'busy' ? '…' : t('billing.checkNow')}</Button>
              </div>
              <p className="mt-3 text-[12px] text-fg-tertiary">{t('billing.stillVisibleNote')}</p>
            </section>
          )
        )}
        {syncState === 'not-configured' && (
          <p className="rounded-lg border border-elevate/10 bg-elevate/[0.04] px-4 py-3 text-[12px] text-fg-secondary">{t('billing.portalNotConfigured')}</p>
        )}
        {syncState === 'failed' && (
          <p className="rounded-lg border border-elevate/10 bg-elevate/[0.04] px-4 py-3 text-[12px] text-fg-secondary">{t('billing.syncFailed')}</p>
        )}

        {failed && (
          <Banner
            status="error"
            title={t('billing.paymentFailedBanner', { invoice: failed.invoice_number })}
            action={<Button size="sm" variant="danger" onClick={updatePayment} disabled={portalBusy}>{portalBusy ? '…' : t('billing.updatePaymentMethod')}</Button>}
          >
            {t('billing.paymentFailedBody')}
          </Banner>
        )}
        {portalNote && (
          <p className="rounded-lg border border-elevate/10 bg-elevate/[0.04] px-4 py-3 text-[12px] text-fg-secondary">{portalNote}</p>
        )}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((k) => (
            <KPICard key={k.label} label={k.label} value={k.value} trend={k.trend} />
          ))}
        </div>

        {/* Laufender Zyklus (Pricing v2, ADR-0003): Abo-Zeile des Monats plus
            die Lead-Belastungen des Zyklus aus dem Ledger — Standard, Rabatt,
            Endbetrag, wie Spec B es verlangt. */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-fg">{t('billing.currentPeriodTitle', { period: preview.period })}</h2>
              <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('billing.currentPeriodHint')}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-fg-tertiary">{t('billing.planLabel')}: <span className="font-semibold text-fg">{planLabel}</span></p>
              {preview.discount.count > 0 && (
                <p className="text-[12px] text-fg-brand">{t('billing.discountRemaining', { remaining: preview.discount.remaining, count: preview.discount.count, pct: preview.discount.pct })}</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-stroke bg-surface-secondary/40">
            {preview.lines.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-fg-tertiary">{t('billing.currentPeriodEmpty')}</p>
            ) : preview.lines.map((l) => (
              <div key={l.label} className="flex items-center justify-between border-b border-stroke px-5 py-3 text-[13px] last:border-b-0">
                <span className="min-w-0 truncate text-fg-secondary">{l.label}</span>
                <span className="ml-4 shrink-0 tabular-nums text-fg">{l.qty} × {money(l.unit_cents, cur)} = <span className="font-semibold">{money(l.amount_cents, cur)}</span></span>
              </div>
            ))}
            {preview.leads.count > 0 && (
              <div className="flex items-center justify-between border-b border-stroke px-5 py-3 text-[13px]">
                <span className="min-w-0 truncate text-fg-secondary">{t('billing.leadsLine', { count: preview.leads.count, discount: money(preview.leads.discount_cents, cur) })}</span>
                <span className="ml-4 shrink-0 tabular-nums text-fg"><s className="text-fg-tertiary">{money(preview.leads.standard_cents, cur)}</s> <span className="font-semibold">{money(preview.leads.final_cents, cur)}</span></span>
              </div>
            )}
            <div className="flex items-center justify-between px-5 py-3 text-[13px]">
              <span className="font-semibold text-fg">{t('billing.currentPeriodTotal')}</span>
              <span className="font-bold tabular-nums text-fg-accent">{money(preview.total_cents, cur)}</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">{t('billing.historyTitle')}</h2>
            <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('billing.historyHint')}</p>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t('billing.colInvoice')}</TH>
                <TH>{t('billing.colPeriod')}</TH>
                <TH numeric>{t('billing.colTotal')}</TH>
                <TH>{t('billing.colStatus')}</TH>
                <TH>{t('billing.colActions')}</TH>
              </TR>
            </THead>
            <TBody>
              {invoices.map((inv) => {
                const m = STATUS_META[inv.status];
                return (
                  <TR key={inv.id} className="cursor-pointer transition-colors hover:bg-elevate/[0.04]" onClick={() => setDetail(inv)}>
                    <TD bold>{inv.invoice_number}</TD>
                    <TD>{inv.period}</TD>
                    <TD numeric>{money(inv.amount_cents, inv.currency)}</TD>
                    <TD><Tag tone={m.tone}>{t(m.labelKey)}</Tag></TD>
                    <TD className="text-fg-secondary">{inv.status === 'failed' ? t('billing.rowActionFailed') : t('billing.rowActionView')}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </section>
      </div>
      <InvoiceDetailDrawer invoice={detail} onClose={() => setDetail(null)} />
    </ProviderShell>
  );
}
