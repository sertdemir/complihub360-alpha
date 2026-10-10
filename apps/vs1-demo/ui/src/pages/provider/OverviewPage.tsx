import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { LoadFailedState } from '../../components/provider/WorkspaceStates';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { fetchOverview, type OverviewTask, type ProviderOverviewResponse } from '../../api/performance';
import { money } from '../../api/billing';

// ─── Provider · Übersicht (Startseite) ───────────────────────────────────────
// Phase 6 (ADR-0009 Nr. 5, Canvas-Wahl 1B „Heute zuerst", 10.10.2026).
// Figma: Screens-Datei, Seite „Performance & Übersicht (Phase 6)", 3667:3.
//
// Oben die eine Sache, die heute eine Handlung braucht — oder „Nichts offen".
// Links die naechsten Termine, rechts der Kontostand als Faktenliste. Keine
// Kacheln mit grossen Zahlen: der Anbieter kommt wegen seiner Termine, der
// Rest ist Zustand, der nur auffallen muss, wenn er sich aendert. Jede Zeile
// kommt aus GET /provider/:key/overview; nichts hier ist geschaetzt.
//
// Ersetzt die stillgelegte Anfragen-Seite als Landung nach dem Login.

type T = (k: string, o?: Record<string, unknown>) => string;

/** Aufgabe → Satz. Die Reihenfolge des Servers ist die der Dringlichkeit. */
function taskLine(task: OverviewTask, t: T, locale: string): { title: string; body: string } {
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  switch (task.kind) {
    case 'attendance_report': return { title: t('overview.task.attendance_report', { count: task.count }), body: t('overview.task.attendance_reportBody') };
    case 'dispute_open': return { title: t('overview.task.dispute_open', { count: task.count }), body: t('overview.task.dispute_openBody') };
    case 'evidence_expiring': return { title: t('overview.task.evidence_expiring', { type: task.evidence_type ?? t('overview.evidenceGeneric'), date: date(task.expires_at) }), body: t('overview.task.evidence_expiringBody') };
    case 'billing_blocked': return { title: t('overview.task.billing_blocked'), body: t('overview.task.billing_blockedBody') };
    case 'enforcement': return { title: t('overview.task.enforcement'), body: task.appeal_at ? t('overview.task.enforcementAppealed') : t('overview.task.enforcementBody') };
  }
}

export function OverviewPage() {
  const navigate = useNavigate();
  const { t: tRaw, i18n } = useTranslation('providerws');
  const t = tRaw as unknown as T;
  const locale = i18n.resolvedLanguage || 'en';
  const base = `/${locale}/partner-dashboard`;
  const { data, state, error, reload } = useWorkspaceData(fetchOverview);

  const today = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('overview.title')}</h1>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('overview.subtitle')}</p>
        </div>

        {state === 'loading' && <div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {state === 'error' && <LoadFailedState surface="overview" error={error} onRetry={reload} section />}
        {data && (
          <>
            <section className="space-y-2.5" data-section="today">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('overview.today', { date: today })}</p>
              {data.tasks.length === 0 ? (
                <Card styleVariant="filled" className="px-5 py-4">
                  <p className="text-[14px] font-semibold text-fg">{t('overview.nothingOpen')}</p>
                  <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('overview.nothingOpenBody')}</p>
                </Card>
              ) : (
                <TaskCard task={data.tasks[0]!} t={t} locale={locale} primary onGo={(to) => navigate(`${base}/${to}`)} />
              )}
              {data.tasks.slice(1).map((task, i) => (
                <TaskCard key={`${task.kind}-${i}`} task={task} t={t} locale={locale} onGo={(to) => navigate(`${base}/${to}`)} />
              ))}
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <UpcomingCard data={data} t={t} locale={locale} onAll={() => navigate(`${base}/termine`)} />
              <AccountCard data={data} t={t} locale={locale} />
            </div>
          </>
        )}
      </div>
    </ProviderShell>
  );
}

function TaskCard({ task, t, locale, primary = false, onGo }: { task: OverviewTask; t: T; locale: string; primary?: boolean; onGo: (to: string) => void }) {
  const line = taskLine(task, t, locale);
  return (
    <Card styleVariant={primary ? 'outlined' : 'filled'} className={'flex items-center gap-4 px-5 py-4 ' + (primary ? 'border-stroke-brand/50' : '')} data-task={task.kind}>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-fg">{line.title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-fg-secondary">{line.body}</p>
      </div>
      <Button size="sm" variant={primary ? 'primary' : 'secondary'} onClick={() => onGo(task.to)}>{t(`overview.go.${task.to}`)}</Button>
    </Card>
  );
}

function UpcomingCard({ data, t, locale, onAll }: { data: ProviderOverviewResponse; t: T; locale: string; onAll: () => void }) {
  const df = new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
  const tf = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  return (
    <Card styleVariant="outlined" className="p-5" data-section="upcoming">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('overview.upcomingTitle')}</p>
      {data.upcoming.length === 0 ? (
        <p className="mt-3 text-[13px] text-fg-tertiary">{t('overview.upcomingEmpty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-stroke">
          {data.upcoming.map((b) => {
            const start = new Date(b.slot_start); const end = b.slot_end ? new Date(b.slot_end) : null;
            return (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[13px] text-fg">
                  <span className="font-semibold">{df.format(start)} · {tf.format(start)}{end ? `–${tf.format(end)}` : ''}</span>
                  {b.rebooked_from && <span className="ml-2 text-[11px] text-fg-tertiary">{t('overview.rebooked')}</span>}
                </span>
                <Tag tone="success">{t('overview.confirmed')}</Tag>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-fg-tertiary">
        <span>
          {t('overview.upcomingCount', { count: data.upcoming.length })}
          {' · '}
          {data.status.calendar_connected ? t('overview.calendarConnected') : t('overview.calendarNotConnected')}
        </span>
        <button type="button" onClick={onAll} className="font-medium text-fg-brand underline-offset-2 hover:underline">{t('overview.allAppointments')}</button>
      </div>
    </Card>
  );
}

function AccountCard({ data, t, locale }: { data: ProviderOverviewResponse; t: T; locale: string }) {
  const s = data.status;
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  const closed = s.booking_closed_reason === 'paused' ? t('overview.closedPaused') : s.booking_closed_reason === 'ooo' ? t('overview.closedOoo') : null;
  return (
    <Card styleVariant="outlined" className="p-5" data-section="account">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('overview.accountTitle')}</p>
      <dl className="mt-2 divide-y divide-stroke text-[13px]">
        <Fact label={t('overview.verified')}>
          <Tag tone={s.verified ? 'success' : 'neutral'}>{s.verified ? t('overview.yes') : t('overview.inReview')}</Tag>
        </Fact>
        <Fact label={t('overview.bookable')} note={closed ?? (s.billing_ready ? t('overview.bookableNote') : t('overview.billingNotReady'))}>
          <Tag tone={s.booking_open && s.billing_ready ? 'success' : 'warning'}>{s.booking_open && s.billing_ready ? t('overview.yes') : t('overview.no')}</Tag>
        </Fact>
        {data.plan ? (
          <Fact label={t('overview.planLeads', { plan: data.plan.label })} note={t('overview.sinceCycle', { date: date(data.plan.discount.cycle_start) })}>
            <span className="font-semibold text-fg">
              {data.plan.discount.count > 0
                ? t('overview.discountUsed', { used: data.plan.discount.used, count: data.plan.discount.count })
                : t('overview.noDiscount')}
            </span>
          </Fact>
        ) : (
          <Fact label={t('overview.plan')}><span className="text-fg-tertiary">{t('overview.noPlan')}</span></Fact>
        )}
        <Fact label={t('overview.leadsCycle')}>
          <span className="font-semibold tabular-nums text-fg">{data.leads.count} · {money(data.leads.final_cents, data.leads.currency)}</span>
        </Fact>
        {data.credit_balance_cents > 0 && (
          <Fact label={t('overview.credit')} note={t('overview.creditNote')}>
            <span className="font-semibold tabular-nums text-fg">{money(data.credit_balance_cents, data.leads.currency)}</span>
          </Fact>
        )}
        {data.expiring_evidence.map((e) => (
          <Fact key={e.id} label={t('overview.evidenceExpiring', { type: e.evidence_type ?? t('overview.evidenceGeneric') })}>
            <Tag tone="warning">{t('overview.until', { date: date(e.expires_at) })}</Tag>
          </Fact>
        ))}
      </dl>
    </Card>
  );
}

function Fact({ label, note, children }: { label: string; note?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="flex items-center gap-2 text-right">
        {children}
        {note && <span className="text-[11px] text-fg-tertiary">{note}</span>}
      </dd>
    </div>
  );
}
