import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { UserShell } from '../../components/user/UserShell';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { EntityCard } from '../../components/ui/Cards';

// ─── User Dashboard · Notifications ───────────────────────────────────────────
// Mirrors "User · Notifications (Desktop)" (2675:3): filter chips + day-grouped
// feed rows (type tag + time + detail). Design fixture data.

const FILTERS = ['All · 212', 'Unread · 64', 'Requests · 76', 'SLA · 18', 'Billing · 26', 'System · 8'];

const FEED = [
  { day: 'Today', items: [
    { title: 'Provider replied · Studio Bianchi SRL', type: 'REQUEST', tone: 'brand' as const, time: '12 min', unread: true,
      desc: 'Proposal received for VAT registration · Italy — €6,500 fixed' },
    { title: 'SLA reminder · Lex Privacy LLP', type: 'SLA', tone: 'warning' as const, time: '4h',
      desc: 'No response in 96h — re-route to another partner available' },
    { title: 'Risk threshold reached · Italy VAT', type: 'MONITORING', tone: 'error' as const, time: '6h',
      desc: '€145k IT revenue crossed the €100k OSS threshold' },
  ]},
  { day: 'Yesterday', items: [
    { title: 'Session refreshed · GDPR audit & DPA review', type: 'SYSTEM', tone: 'neutral' as const, time: '18:34',
      desc: 'New regulatory rules applied — review what changed' },
    { title: 'Export ready · VAT-roadmap.pdf', type: 'EXPORT', tone: 'success' as const, time: '09:12',
      desc: 'Download link sent to your email · expires in 24h' },
  ]},
];

export function UserNotificationsPage() {
  const [filter, setFilter] = useState('All · 212');
  return (
    <UserShell activeDomain="Tax & VAT">
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              <span className="text-fg-accent">Notifications</span>
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">Your alerts, request updates and monitoring events · newest first</p>
          </div>
          <button type="button" className="mt-2 flex shrink-0 items-center gap-1.5 text-[12px] text-fg-secondary transition-colors hover:text-fg">
            <Bookmark size={13} /> Bookmarks (12)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f} size="sm" selected={filter === f} onClick={() => setFilter(f)}>{f}</FilterChip>
          ))}
        </div>

        {FEED.map((group) => (
          <section key={group.day} className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{group.day}</p>
            {group.items.map((n) => (
              <EntityCard
                key={n.title}
                name={n.title}
                badge={<Tag tone={n.tone}>{n.type}</Tag>}
                meta={n.desc}
                trailing={<span className="text-[11px] text-fg-tertiary">{n.time}</span>}
                unread={'unread' in n ? (n as { unread?: boolean }).unread : undefined}
                interactive
                avatar={<span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-[13px] text-fg-tertiary">🔔</span>}
              />
            ))}
          </section>
        ))}
      </div>
    </UserShell>
  );
}
