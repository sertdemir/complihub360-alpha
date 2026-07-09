import { Play, ArrowRight } from 'lucide-react';
import { UserShell } from '../../components/user/UserShell';
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
    company: 'Studio Bianchi SRL', meta: 'VAT registration · Italy · 14h ago',
    action: { label: 'Send reminder', variant: 'secondary' as const },
  },
  {
    id: '2d ago', status: 'active' as const, statusLabel: 'Active',
    company: 'PackComply GmbH', meta: 'EPR registration · France',
    action: { label: 'Open thread', variant: 'secondary' as const },
  },
  {
    id: '4d ago', status: 'active' as const, statusLabel: 'Active',
    company: 'Lex Privacy LLP', meta: 'GDPR audit · UK · 4d ago',
    action: { label: 'Open thread', variant: 'secondary' as const },
  },
];

const SESSIONS = [
  { eyebrow: 'TAX & VAT · IT', title: 'VAT registration · Italy', meta: '● High risk · threshold reached · Updated 2h ago', risk: 'high' },
  { eyebrow: 'PRODUCT & PACKAGING · FR', title: 'EPR registration · France', meta: '● Medium risk · deadline Q3 2026 · Updated 1d ago', risk: 'medium' },
  { eyebrow: 'DATA & PRIVACY · UK', title: 'GDPR audit & DPA review', meta: '● High risk · cookie consent · Updated 3d ago', risk: 'high' },
  { eyebrow: 'TAX & VAT · ES', title: 'VAT thresholds · Spain', meta: '● Low risk · monitoring only · Updated 7d ago', risk: 'low' },
];

const RISK_META: Record<string, string> = {
  high: 'text-[#e0556b]', medium: 'text-[#e6a514]', low: 'text-fg-tertiary',
};

function SectionHeader({ title, count }: { title: string; count: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
      <span className="text-[13px] font-semibold text-fg-brand">{count}</span>
      <a href="#" className="ml-auto text-[12px] text-fg-secondary underline-offset-2 hover:underline">See all</a>
    </div>
  );
}

export function UserHomePage() {
  return (
    <UserShell activeDomain="Tax & VAT">
      <div className="mx-auto max-w-[1140px] space-y-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              Welcome back, <span className="text-fg-accent">Alex</span>.
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">
              3 active requests · 2 sessions need a refresh · last activity 2h ago
            </p>
          </div>
          <Button className="mt-1 shrink-0">Start new search</Button>
        </div>

        <Card styleVariant="filled" className="flex items-center gap-4 border border-[#d4af37]/25 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d4af37]/15 text-[#d4af37]">
            <Play size={16} fill="currentColor" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-accent">Resume where you left off</p>
            <p className="mt-0.5 text-[16px] font-semibold text-fg">VAT registration · Italy</p>
            <p className="mt-0.5 text-[12px] text-fg-tertiary">Wizard step 4 of 5 · last edit 2h ago · Tax & VAT · DE → IT</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <a href="#" className="text-[12px] font-medium text-fg underline underline-offset-2">View results</a>
            <a href="#" className="text-[12px] font-medium text-fg underline underline-offset-2">Export PDF</a>
            <Button size="sm" variant="accent">Resume <ArrowRight size={14} className="ml-1" /></Button>
          </div>
        </Card>

        <section className="space-y-3">
          <SectionHeader title="Active requests" count="3" />
          <div className="space-y-2.5">
            {REQUESTS.map((r) => (
              <RequestCard
                key={r.company}
                idLine={r.id}
                status={r.status}
                statusLabel={r.statusLabel}
                company={r.company}
                meta={r.meta}
                action={<Button size="sm" variant={r.action.variant}>{r.action.label}</Button>}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Saved sessions" count="6" />
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
