import { Play, ArrowRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { generateRiskMapPdf } from '../../lib/riskMapPdf';
import { OBLIGATIONS, STATS } from '../ResultsRiskMap';
import { UserShell } from '../../components/user/UserShell';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { RequestCard } from '../../components/ui/RequestCard';
import { DomainCard } from '../../components/ui/DomainCard';

// ─── User Dashboard · Home v2 ─────────────────────────────────────────────────
// Mirrors "User Dashboard v1 · Home (Desktop)" (2051:45): welcome header with
// gold name · resume panel · active requests (Request Cards) · saved sessions
// (Domain Cards with risk-colored meta). Design fixture until the API lands.

const REQUESTS = [
  {
    id: '14h ago', status: 'awaiting-confirm' as const, statusLabel: 'Awaiting confirmation',
    company: 'Verifizierte Steuerkanzlei · Norditalien', meta: 'VAT registration · Italy · 14h ago',
    action: { label: 'Send reminder', variant: 'secondary' as const },
  },
  {
    id: '2d ago', status: 'active' as const, statusLabel: 'Active',
    company: 'Verifizierter EPR-Spezialist · Deutschland', meta: 'EPR registration · France',
    action: { label: 'Open thread', variant: 'secondary' as const },
  },
  {
    id: '4d ago', status: 'active' as const, statusLabel: 'Active',
    company: 'Verifizierte Datenschutz-Kanzlei · UK', meta: 'GDPR audit · UK · 4d ago',
    action: { label: 'Open thread', variant: 'secondary' as const },
  },
];

const SESSIONS = [
  { eyebrow: 'TAX & VAT · IT', title: 'VAT registration · Italy', meta: '● High risk · threshold reached · Updated 2h ago', risk: 'high' },
  { eyebrow: 'PRODUCT & PACKAGING · FR', title: 'EPR registration · France', meta: '● Medium risk · deadline Q3 2026 · Updated 1d ago', risk: 'medium' },
  { eyebrow: 'DATA & PRIVACY · UK', title: 'GDPR audit & DPA review', meta: '● High risk · cookie consent · Updated 3d ago', risk: 'high' },
  { eyebrow: 'TAX & VAT · ES', title: 'VAT thresholds · Spain', meta: '● Low risk · monitoring only · Updated 7d ago', risk: 'low' },
];

// Traffic light straight off the risk tokens — these were hardcoded to a red and
// an amber that existed in no scale, so they never followed the theme.
const RISK_META: Record<string, string> = {
  high: 'text-risk-high', medium: 'text-risk-medium', low: 'text-risk-low',
};

// Fixture UI labels → userws keys (display only; fixture data stays original).
const STATUS_KEY: Record<string, string> = {
  'Awaiting confirmation': 'awaitingConfirmation', 'Active': 'active',
  'Provider replied': 'providerReplied', 'Provider confirmed': 'providerConfirmed', 'Withdrawn': 'withdrawn',
};
const ACTION_KEY: Record<string, string> = {
  'Send reminder': 'sendReminder', 'Open thread': 'openThread', 'View thread': 'viewThread', 'View request': 'viewRequest',
};

function SectionHeader({ title, count, to }: { title: string; count: string; to: string }) {
  const { t, i18n } = useTranslation('userws');
  const base = `/${i18n.resolvedLanguage || 'en'}`;
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
      <span className="text-[13px] font-semibold text-fg-brand">{count}</span>
      <Link to={`${base}/${to}`} className="ml-auto text-[12px] text-fg-secondary underline-offset-2 hover:underline">{t('shared.seeAll')}</Link>
    </div>
  );
}

export function UserHomePage() {
  // C6: Resume -> results with the stored profile · Start new -> fresh wizard.
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const { t } = useTranslation('userws');
  const { t: tResults } = useTranslation('results');
  const hasProfile = !!localStorage.getItem('ch360_last_profile');
  const tStatus = (label: string) => (STATUS_KEY[label] ? t(`status.${STATUS_KEY[label]}`) : label);
  const tAction = (label: string) => (ACTION_KEY[label] ? t(`actions.${ACTION_KEY[label]}`) : label);
  // A6: same PII-free PDF snapshot as on /results, from the resume panel.
  // Translated at the render point (results namespace); canonical EN fallback.
  // async, seit jspdf erst beim Klick geladen wird (lib/riskMapPdf.ts).
  const exportPdf = async () => {
    let profile = null;
    try { profile = JSON.parse(localStorage.getItem('ch360_last_profile') || 'null'); } catch { /* fixture */ }
    await generateRiskMapPdf({
      profile,
      t: tResults,
      stats: STATS.map((s, i) => ({ value: s.value, label: tResults(`stats.${i}.label`, { defaultValue: s.label }) })),
      obligations: OBLIGATIONS.map((o, i) => ({
        severity: o.severity,
        title: tResults(`obligations.${i}.title`, { defaultValue: o.title }),
        detail: tResults(`obligations.${i}.detail`, { defaultValue: o.detail }),
        market: tResults(`obligations.${i}.market`, { defaultValue: o.market }),
        due: tResults(`obligations.${i}.due`, { defaultValue: o.due }),
        dueSub: tResults(`obligations.${i}.dueSub`, { defaultValue: o.dueSub }),
        stateLabel:
          o.state.kind === 'confirmed' ? tResults('state.confirmed', { defaultValue: 'Confirmed' })
          : o.state.kind === 'likely' ? tResults('state.likely', { defaultValue: 'Likely' })
          : tResults('pdf.questionsOpen', { defaultValue: '{{total}} questions open', total: o.state.count }),
      })),
    });
  };
  const firstName = (useAuthStore((st) => st.userName) || 'Alex').split(/[\s._-]+/)[0];
  return (
    <UserShell>
      <div className="mx-auto max-w-[1140px] space-y-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              <Trans t={t} i18nKey="home.title" values={{ name: firstName }} components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">
              {t('home.sub')}
            </p>
          </div>
          <Button className="mt-1 shrink-0" onClick={() => navigate(`/${locale}/wizard`)}>{t('shared.startNewSearch')}</Button>
        </div>

        <Card styleVariant="filled" className="flex items-center gap-4 border border-brand-accent/25 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-accent/15 text-fg-accent-strong">
            <Play size={16} fill="currentColor" />
          </span>
          <div className="min-w-0 flex-1">
            {/* accent-STRONG, not accent: at 10px this needs the full 4.5:1, and
                gold-500 measures 2.01 on a light card. The strong stop keeps the
                gold in both themes — 6.43 light, 8.49 dark. */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-accent-strong">{t('home.resumeEyebrow')}</p>
            <p className="mt-0.5 text-[16px] font-semibold text-fg">VAT registration · Italy</p>
            <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('home.resumeMeta')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <button type="button" onClick={() => navigate(`/${locale}/results`)} className="text-[12px] font-medium text-fg underline underline-offset-2">{t('home.viewResults')}</button>
            <button type="button" onClick={exportPdf} className="text-[12px] font-medium text-fg underline underline-offset-2">{t('home.exportPdf')}</button>
            <Button size="sm" variant="accent" onClick={() => navigate(hasProfile ? `/${locale}/results` : `/${locale}/wizard`)}>{t('home.resume')} <ArrowRight size={14} className="ml-1" /></Button>
          </div>
        </Card>

        <section className="space-y-3">
          <SectionHeader title={t('home.activeRequests')} count={String(REQUESTS.length)} to="dashboard/requests" />
          <div className="space-y-2.5">
            {REQUESTS.map((r) => (
              <RequestCard
                key={r.company}
                idLine={r.id}
                status={r.status}
                statusLabel={tStatus(r.statusLabel)}
                company={r.company}
                meta={r.meta}
                action={<Button size="sm" variant={r.action.variant}>{tAction(r.action.label)}</Button>}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title={t('home.savedSessions')} count={String(SESSIONS.length)} to="dashboard/sessions" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SESSIONS.map((s) => (
              <DomainCard
                key={s.title}
                eyebrow={s.eyebrow}
                title={s.title}
                meta={<span className={RISK_META[s.risk]}>{s.meta}</span>}
                interactive
              />
            ))}
          </div>
        </section>
      </div>
    </UserShell>
  );
}
