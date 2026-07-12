import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { fetchProviderRequests, type ProviderRequest } from '../../api/requests';

// ─── Provider workspace drawers (wiring map B4 · B6 · B10) ───────────────────
// Search (2651:2): live filter over the real request inbox, result click
// deep-links to /requests?thread=<id>. Ranking impact (2653:50): read-only
// factor breakdown. Help (2652:2): support entry points.

// ── B4 · Search ──────────────────────────────────────────────────────────────
export function SearchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ProviderRequest[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    fetchProviderRequests().then(setRows).catch(() => setRows([]));
  }, [open]);

  const hits = (rows ?? []).filter((r) => {
    if (q.trim().length < 2) return false;
    const hay = `${r.idLine} ${r.company} ${r.tag ?? ''} ${r.meta} ${r.statusLabel}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).every((t) => hay.includes(t));
  });

  return (
    <Drawer forceDark open={open} onClose={onClose} side="right" size="md" eyebrow="WORKSPACE" title="Search requests">
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-fg-brand">
          <Search size={15} className="shrink-0 text-fg-tertiary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Request ID, client, category, country …"
            className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-tertiary"
          />
        </div>
        {q.trim().length < 2 && (
          <p className="text-[12px] text-fg-tertiary">Type at least two characters — searches your live request inbox.</p>
        )}
        {q.trim().length >= 2 && rows === null && <p className="text-[12px] text-fg-tertiary">Loading…</p>}
        {q.trim().length >= 2 && rows !== null && hits.length === 0 && (
          <p className="text-[12px] text-fg-tertiary">No matches for “{q}”.</p>
        )}
        <div className="space-y-2">
          {hits.slice(0, 8).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onClose(); navigate(`/${locale}/partner-dashboard/requests?thread=${r.id}`); }}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition-colors hover:border-fg-brand/50"
            >
              <span>
                <span className="block text-[13px] font-semibold text-fg">{r.idLine}</span>
                <span className="block text-[11px] text-fg-tertiary">{r.company} · {r.meta}</span>
              </span>
              <Tag tone={r.status === 'active' ? 'brand' : 'warning'}>{r.statusLabel}</Tag>
            </button>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

// ── B6 · Ranking impact (read-only) ──────────────────────────────────────────
const FACTORS = [
  { label: 'Responsiveness (confirm < 24h)', weight: 40, note: 'Ø 6.2h — your strongest lever' },
  { label: 'Reply quality & completion', weight: 25, note: 'client-confirmed engagements' },
  { label: 'Coverage fit (markets · languages)', weight: 20, note: '2 markets · 3 languages' },
  { label: 'Verified-Partner standing', weight: 15, note: 'active · renews automatically' },
];

export function RankingImpactDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer forceDark open={open} onClose={onClose} side="right" size="md" eyebrow="RANKING" title="What moves your rank"
      footer={<p className="text-[11px] text-fg-tertiary">Recalculated weekly · declines never lower your rank — only missed confirms do.</p>}>
      <div className="space-y-4">
        {FACTORS.map((f) => (
          <div key={f.label}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-fg">{f.label}</span>
              <span className="text-[12px] font-bold text-fg-accent">{f.weight}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#d4af37]" style={{ width: `${f.weight}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-fg-tertiary">{f.note}</p>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

// ── B10 · Help & support ─────────────────────────────────────────────────────
export function HelpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const TOPICS = [
    { t: 'How the 24h confirm SLA works', d: 'What counts, what pauses it, and how reminders escalate.' },
    { t: 'Magic links & security', d: 'Single-use links, expiry, and why identity unlocks after confirm.' },
    { t: 'How ranking is calculated', d: 'The four factors and their weights.' },
    { t: 'Billing & invoices', d: 'Per-confirm pricing, Stripe invoices, payment methods.' },
  ];
  return (
    <Drawer forceDark open={open} onClose={onClose} side="right" size="md" eyebrow="SUPPORT" title="Help & support"
      footer={
        <a href="mailto:support@complihub360.com" className="w-full">
          <Button variant="accent" size="sm" className="w-full">Contact support</Button>
        </a>
      }>
      <div className="space-y-2">
        {TOPICS.map((x) => (
          <div key={x.t} className="rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <p className="text-[13px] font-semibold text-fg">{x.t}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">{x.d}</p>
          </div>
        ))}
        <p className="pt-2 text-[11px] text-fg-tertiary">Median support response: 4h on business days.</p>
      </div>
    </Drawer>
  );
}
