import { useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/admin/AdminShell';
import { Card } from '../../components/ui/Card';

// ─── Admin · design-first placeholder ─────────────────────────────────────────
// Providers / Security / Privacy / Alerts / Status are fully specified in Figma
// (page "Admin") and get wired as their data sources land. This keeps nav
// honest instead of dead links.

const COPY: Record<string, { title: string; gold: string; sub: string }> = {
  providers: { title: 'Provider Network', gold: 'Network', sub: 'Coverage, responsiveness and SLA health per partner — lands with the provider_profiles schema.' },
  security: { title: 'Security Posture', gold: 'Posture', sub: 'Auth failures and abuse signals — lands with per-failure security events.' },
  privacy: { title: 'Privacy Pipeline', gold: 'Privacy', sub: 'Gate decisions per document — lands with the documents list endpoint.' },
  alerts: { title: 'Alerts', gold: 'Alerts', sub: 'Configurable thresholds on any admin metric — design final, build scheduled.' },
  status: { title: 'System Status', gold: 'Status', sub: 'Uptime, response times and cert expiry — served by Uptime Kuma.' },
};

export function AdminComingSoonPage() {
  const seg = useLocation().pathname.split('/').pop() || 'providers';
  const c = COPY[seg] ?? COPY.providers;
  const [pre, post] = c.title.split(c.gold);

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1160px] flex-col gap-6">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-fg">
            {pre}
            <span className="text-fg-accent">{c.gold}</span>
            {post}
          </h1>
          <p className="mt-1 text-[13px] text-fg-secondary">{c.sub}</p>
        </div>
        <Card className="p-8 text-center">
          <p className="text-[14px] font-semibold text-fg">Screen designed · wiring scheduled</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-fg-secondary">
            The full layout lives on the Figma page <span className="font-medium text-fg">Admin</span>. This route activates
            as soon as its backend data source ships.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
