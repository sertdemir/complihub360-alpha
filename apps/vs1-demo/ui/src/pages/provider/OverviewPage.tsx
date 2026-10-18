import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { LoadFailedState } from '../../components/provider/WorkspaceStates';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { SectionHead } from '../../components/ui/SectionHead';
import { Fact } from '../../components/ui/Fact';
import { DateMark } from '../../components/ui/DateMark';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchOverview, type OverviewTask, type ProviderOverviewResponse } from '../../api/performance';
import { fetchMyProvider } from '../../api/provider';
import { money } from '../../api/billing';

// ─── Provider · Übersicht (Startseite) ───────────────────────────────────────
// Phase 6 (ADR-0009 Nr. 5, Canvas-Wahl 1B „Heute zuerst", 10.10.2026) legte
// den Inhalt fest; der Angleich an das User-Dashboard (Canvas A1–A8, Nutzer-
// Wahl 16.10., Figma „Provider · Übersicht (So 18.10.)" Light 3779:313,
// Dark 3780:28493, Review-OK 18.10.) gibt ihm die Form des User-Dashboards:
//   · Begrüßung wie dort (22 px Serif, der Firmenname in Gold), keine
//     erklärende Unterzeile mehr — der Satz steht unter der Heute-Zeile.
//   · Workspace-Karten (Card „workspace"); die eine Sache, die heute eine
//     Handlung braucht, behält den Petrol-Rahmen und den Primärknopf.
//   · Nächste Termine mit Abschnittskopf (Zähler, „Alle anzeigen") und
//     Datumsmarke wie „Als Nächstes" beim User; Konto als Faktenliste.
//   · Bewusst KEINE Kennzahlreihe: der Anbieter kommt wegen seiner Termine,
//     der Rest ist Zustand, der nur auffallen muss, wenn er sich ändert.
// Jede Zeile kommt aus GET /provider/:key/overview; nichts hier ist geschätzt.
// Die Bühne (Gradient) liefert die ProviderShell.

type T = (k: string, o?: Record<string, unknown>) => string;

const EYEBROW = 'text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand';

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
  const base = `/${locale}/provider-dashboard`;
  const { data, state, error, reload } = useWorkspaceData(fetchOverview);

  // Firmenname fuer die Begruessung — dieselbe Quelle wie die Kopfzeile der
  // Shell (/me/provider). Ohne echte Sitzung (Demo) der Design-Platzhalter;
  // mit Sitzung, aber ohne Namen, die Begruessung ohne Namen statt einer
  // erfundenen Firma.
  const session = useAuthStore((s) => s.session);
  const [name, setName] = useState<string | null>(session ? null : 'Schmidt & Partner');
  useEffect(() => {
    let alive = true;
    fetchMyProvider().then((p) => { if (alive && p.name) setName(p.name); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const today = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px]">
        <h1 className="font-serif text-[22px] font-bold leading-tight text-fg">
          {name
            ? <Trans t={tRaw} i18nKey="overview.greeting" values={{ name }} components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
            : t('overview.greetingNoName')}
        </h1>

        {state === 'loading' && <div aria-busy="true" className="mt-6 h-40 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {state === 'error' && <div className="mt-6"><LoadFailedState surface="overview" error={error} onRetry={reload} section /></div>}
        {data && (
          <>
            <section className="mt-6" data-section="today">
              <p className={EYEBROW}>{t('overview.today', { date: today })}</p>
              <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fg-secondary">{t('overview.subtitle')}</p>
              <div className="mt-3 space-y-2.5">
                {data.tasks.length === 0 ? (
                  <Card styleVariant="workspace" className="px-5 py-4">
                    <p className="text-[14px] font-semibold text-fg">{t('overview.nothingOpen')}</p>
                    <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('overview.nothingOpenBody')}</p>
                  </Card>
                ) : (
                  <TaskCard task={data.tasks[0]!} t={t} locale={locale} primary onGo={(to) => navigate(`${base}/${to}`)} />
                )}
                {data.tasks.slice(1).map((task, i) => (
                  <TaskCard key={`${task.kind}-${i}`} task={task} t={t} locale={locale} onGo={(to) => navigate(`${base}/${to}`)} />
                ))}
              </div>
            </section>

            <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
              <UpcomingCard data={data} t={t} locale={locale} allTo={`${base}/termine`} />
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
    <Card styleVariant="workspace" className={'flex items-center gap-4 px-5 py-4 ' + (primary ? 'border-stroke-brand' : '')} data-task={task.kind}>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-fg">{line.title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-fg-secondary">{line.body}</p>
      </div>
      <Button size="sm" variant={primary ? 'primary' : 'secondary'} onClick={() => onGo(task.to)}>{t(`overview.go.${task.to}`)}</Button>
    </Card>
  );
}

function UpcomingCard({ data, t, locale, allTo }: { data: ProviderOverviewResponse; t: T; locale: string; allTo: string }) {
  const df = new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
  const tf = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  return (
    <Card styleVariant="workspace" className="px-6 py-5" data-section="upcoming">
      <SectionHead
        title={t('overview.upcomingTitle')}
        count={data.upcoming.length || undefined}
        action={{ label: t('overview.seeAll'), to: allTo }}
      />
      {data.upcoming.length === 0 ? (
        <p className="text-[13px] text-fg-tertiary">{t('overview.upcomingEmpty')}</p>
      ) : (
        <ul>
          {data.upcoming.map((b, i) => {
            const start = new Date(b.slot_start); const end = b.slot_end ? new Date(b.slot_end) : null;
            return (
              <li key={b.id} className={'flex items-center gap-3.5 py-3 ' + (i > 0 ? 'border-t border-stroke-subtle' : '')}>
                {/* Die Uebersicht kennt nur den Zeitpunkt (Overview-Antwort);
                    Firma und Thema stehen auf der Termine-Seite. */}
                <DateMark iso={b.slot_start} locale={locale} size="md" soon={i === 0} />
                <div className="min-w-0 flex-1">
                  <p className="text-body-xs font-bold text-fg">{df.format(start)} · {tf.format(start)}{end ? `–${tf.format(end)}` : ''}</p>
                  {b.rebooked_from && <p className="text-body-3xs text-fg-tertiary">{t('overview.rebooked')}</p>}
                </div>
                <Tag tone="success">{t('overview.confirmed')}</Tag>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-fg-tertiary">
        {t('overview.upcomingCount', { count: data.upcoming.length })}
        {' · '}
        {data.status.calendar_connected ? t('overview.calendarConnected') : t('overview.calendarNotConnected')}
      </p>
    </Card>
  );
}

function AccountCard({ data, t, locale }: { data: ProviderOverviewResponse; t: T; locale: string }) {
  const s = data.status;
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  const closed = s.booking_closed_reason === 'paused' ? t('overview.closedPaused') : s.booking_closed_reason === 'ooo' ? t('overview.closedOoo') : null;
  return (
    <Card styleVariant="workspace" className="px-6 pb-2 pt-5" data-section="account">
      <SectionHead title={t('overview.accountTitle')} className="mb-1" />
      <dl className="text-[13px]">
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

