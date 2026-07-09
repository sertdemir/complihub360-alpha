import { AdminShell } from '../../components/admin/AdminShell';
import { Banner } from '../../components/ui/Banner';
import { KPICard, EntityCard } from '../../components/ui/Cards';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Tag, type TagProps } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { useApiData } from '../../lib/useApiData';
import { fetchAdminStats, fmtMsLeft, fmtHours, relTime, type AdminStats } from '../../api/admin';

// ─── Admin · Control Center (Figma Admin page 2966:4) ────────────────────────
// One aggregated view: funnel KPIs, SLA watchlist, privacy pipeline and the
// audit stream. Data via GET /api/v1/admin/stats with a design fixture
// fallback that mirrors the Figma frame.

const FIXTURE: AdminStats = {
  stats: { requestsToday: 12, requestsTotal: 87, confirmRate: 0.92, replyRate: 0.81, avgConfirmMs: 6.2 * 3_600_000, breaches: 1 },
  watchlist: [
    { id: 'RQ-313C', provider_key: 'dahlmann-cpa', country: 'DE', category: 'vat', status: 'created', msLeft: 4 * 3_600_000 + 2 * 60_000 },
    { id: 'RQ-778E', provider_key: 'dahlmann-cpa', country: 'NL', category: 'vat_oss', status: 'created', msLeft: 18.7 * 3_600_000 },
    { id: 'RQ-9F21', provider_key: 'meridian-legal', country: 'FR', category: 'corporate', status: 'created', msLeft: 22.2 * 3_600_000 },
    { id: 'RQ-4A07', provider_key: 'baltika-tax', country: 'DE', category: 'vat', status: 'confirmed', msLeft: 31 * 3_600_000 },
    { id: 'RQ-2C55', provider_key: 'nova-compliance', country: 'ES', category: 'privacy', status: 'confirmed', msLeft: 44 * 3_600_000 },
  ],
  privacy: { uploads: 24, piiRedacted: 61, consentRate: 0.78, aiBlocks: 5 },
  security: { invalidTokenBlocks: 3, aiGateBlocks: 5 },
  events: [
    { type: 'primary_request_submitted', payload: { provider: 'dahlmann-cpa' }, created_at: new Date(Date.now() - 2 * 3_600_000).toISOString() },
    { type: 'provider_confirmed_via_magic_link', payload: {}, created_at: new Date(Date.now() - 5 * 3_600_000).toISOString() },
    { type: 'document_uploaded', payload: {}, created_at: new Date(Date.now() - 8 * 3_600_000).toISOString() },
    { type: 'document_ai_blocked', payload: { reason: 'NO_CONSENT' }, created_at: new Date(Date.now() - 26 * 3_600_000).toISOString() },
  ],
};

function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

function watchTone(msLeft: number | null): { label: string; tone: TagProps['tone'] } {
  if (msLeft !== null && msLeft < 6 * 3_600_000) return { label: 'at risk', tone: 'error' };
  return { label: 'on track', tone: 'success' };
}

const EVENT_KIND: Record<string, string> = {
  primary_request_submitted: 'FUNNEL',
  provider_confirmed_via_magic_link: 'FUNNEL',
  provider_replied_via_magic_link: 'FUNNEL',
  document_uploaded: 'PRIVACY',
  document_ai_blocked: 'PRIVACY',
  document_ai_requested: 'PRIVACY',
};

export function AdminOverviewPage() {
  const { data, source } = useApiData(fetchAdminStats, FIXTURE);
  const { stats, watchlist, privacy, security, events } = data;
  const atRisk = watchlist.find((w) => w.msLeft !== null && w.msLeft < 6 * 3_600_000);

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1160px] flex-col gap-6">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-fg">
            <span className="text-fg-accent">Control</span> Center
          </h1>
          <p className="mt-1 text-[13px] text-fg-secondary">
            Platform health, funnel and compliance signals — aggregated live from the audit log. Admin access only.
            {source === 'fixture' && <span className="ml-2 text-fg-tertiary">· demo data</span>}
          </p>
        </div>

        {atRisk && (
          <Banner
            status="error"
            title={`SLA breach risk — request ${atRisk.id.slice(0, 7).toUpperCase()} has ${fmtMsLeft(atRisk.msLeft)} left`}
            action={<Button variant="danger" size="sm">Open watchlist</Button>}
          >
            {`${atRisk.provider_key} has not ${atRisk.status === 'confirmed' ? 'replied' : 'confirmed'} yet · auto-escalation at deadline.`}
          </Banner>
        )}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KPICard label="REQUESTS · TODAY" value={String(stats.requestsToday)} trend={{ value: `${stats.requestsTotal} total`, direction: 'up' }} />
          <KPICard label="CONFIRM RATE" value={pct(stats.confirmRate)} trend={{ value: 'confirmed or replied', direction: 'up' }} />
          <KPICard label="Ø CONFIRM TIME" value={fmtHours(stats.avgConfirmMs)} trend={{ value: 'approx. · 30d', direction: 'down' }} />
          <KPICard label="SLA BREACHES" value={String(stats.breaches)} trend={{ value: 'see watchlist', direction: 'neutral' }} />
        </div>

        <section>
          <h2 className="text-[15px] font-semibold text-fg">SLA Watchlist</h2>
          <p className="mb-3 mt-0.5 text-[12px] text-fg-tertiary">Open requests sorted by remaining time · escalation at 24h/48h</p>
          <Table density="default">
            <THead>
              <TR>
                <TH>Request</TH>
                <TH>Provider · Scope</TH>
                <TH numeric>Time left</TH>
                <TH>State</TH>
                <TH>Action</TH>
              </TR>
            </THead>
            <TBody>
              {watchlist.map((w) => {
                const t = watchTone(w.msLeft);
                return (
                  <TR key={w.id}>
                    <TD bold>{w.id.slice(0, 8).toUpperCase()}</TD>
                    <TD>{w.provider_key} · {w.country} {w.category}</TD>
                    <TD numeric>{fmtMsLeft(w.msLeft)}{w.status === 'confirmed' ? ' · reply' : ''}</TD>
                    <TD><Tag tone={w.status === 'confirmed' ? 'warning' : t.tone}>{w.status === 'confirmed' ? 'awaiting reply' : t.label}</Tag></TD>
                    <TD><span className="cursor-pointer text-fg-brand">{t.tone === 'error' ? 'Escalate · Open' : 'View'}</span></TD>
                  </TR>
                );
              })}
              {watchlist.length === 0 && (
                <TR><TD bold>—</TD><TD>No open requests</TD><TD numeric>—</TD><TD>—</TD><TD>—</TD></TR>
              )}
            </TBody>
          </Table>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-fg">Privacy & AI Gate</h2>
          <p className="mb-3 mt-0.5 text-[12px] text-fg-tertiary">Redaction pipeline + consent enforcement · last 7 days</p>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KPICard label="DOCUMENT UPLOADS" value={String(privacy.uploads)} trend={{ value: 'all sanitized pre-storage', direction: 'neutral' }} />
            <KPICard label="PII REDACTED" value={String(privacy.piiRedacted)} trend={{ value: 'email · phone · IBAN', direction: 'neutral' }} />
            <KPICard label="AI CONSENT RATE" value={pct(privacy.consentRate)} trend={{ value: 'explicit opt-in', direction: 'up' }} />
            <KPICard label="AI GATE BLOCKS" value={String(privacy.aiBlocks)} trend={{ value: 'deterministic denials', direction: 'neutral' }} />
          </div>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-fg">Security & Audit</h2>
          <p className="mb-3 mt-0.5 text-[12px] text-fg-tertiary">Auth failures, magic-link misuse and the live audit stream</p>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="flex flex-col gap-3">
              <EntityCard
                name={`${security.invalidTokenBlocks} blocked magic-link attempts`}
                meta="SECURITY · invalid, expired or reused tokens"
                trailing={<span className="text-[11px] text-fg-tertiary">7d</span>}
                unread={security.invalidTokenBlocks > 0}
              />
              <EntityCard
                name={`${security.aiGateBlocks} AI gate denials`}
                meta="PRIVACY · consent missing or restricted content"
                trailing={<span className="text-[11px] text-fg-tertiary">7d</span>}
              />
              <EntityCard
                name="Rate limiting active · 100 req/min"
                meta="SECURITY · per-IP auto-throttle"
                trailing={<span className="text-[11px] text-fg-tertiary">always on</span>}
              />
            </div>
            <div className="flex flex-col gap-3">
              {events.slice(0, 4).map((e, i) => (
                <EntityCard
                  key={i}
                  name={e.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}
                  meta={`${EVENT_KIND[e.type] ?? 'SYSTEM'}${e.payload && Object.keys(e.payload).length ? ' · ' + Object.entries(e.payload).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : ''}`}
                  trailing={<span className="text-[11px] text-fg-tertiary">{relTime(e.created_at)}</span>}
                  unread={i === 0}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
