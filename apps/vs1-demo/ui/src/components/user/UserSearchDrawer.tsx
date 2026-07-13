import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Tag } from '../ui/Tag';
import { fetchUserRequests, type UserRequestRow } from '../../api/requests';
import { fetchSessions, type SessionRowData } from '../../api/sessions';

// ─── User search drawer (Figma 2654:176 · wiring map B16) ────────────────────
// One search box over the user's live workspace: provider requests + saved
// sessions. Request hits deep-link into the thread (C12 infra); session hits
// land on /sessions.

export function UserSearchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const [q, setQ] = useState('');
  const [requests, setRequests] = useState<UserRequestRow[] | null>(null);
  const [sessions, setSessions] = useState<SessionRowData[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    fetchUserRequests().then(setRequests).catch(() => setRequests([]));
    fetchSessions().then(setSessions).catch(() => setSessions([]));
  }, [open]);

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (hay: string) => q.trim().length >= 2 && terms.every((t) => hay.toLowerCase().includes(t));

  const requestHits = (requests ?? []).filter((r) => hit(`${r.id} ${r.company} ${r.meta} ${r.statusLabel}`)).slice(0, 6);
  const sessionHits = (sessions ?? [])
    .filter((s) => s.status === 'active')
    .filter((s) => hit(`${s.label ?? ''} ${s.country ?? ''} ${(s.categories ?? []).join(' ')} ${(s.markets ?? []).join(' ')}`))
    .slice(0, 4);
  const loading = q.trim().length >= 2 && (requests === null || sessions === null);
  const empty = q.trim().length >= 2 && !loading && requestHits.length === 0 && sessionHits.length === 0;

  return (
    <Drawer forceDark open={open} onClose={onClose} side="right" size="md" eyebrow="WORKSPACE" title="Search">
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-fg-brand">
          <Search size={15} className="shrink-0 text-fg-tertiary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Requests, sessions, providers …"
            className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-tertiary"
          />
        </div>
        {q.trim().length < 2 && (
          <p className="text-[12px] text-fg-tertiary">Type at least two characters — searches your requests and saved sessions.</p>
        )}
        {loading && <p className="text-[12px] text-fg-tertiary">Loading…</p>}
        {empty && <p className="text-[12px] text-fg-tertiary">No matches for “{q}”.</p>}

        {requestHits.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">Requests</p>
            {requestHits.map((r) => (
              <button
                key={r.uuid}
                type="button"
                onClick={() => { onClose(); navigate(`/${locale}/dashboard/requests?thread=${r.uuid}`); }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition-colors hover:border-fg-brand/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-fg">{r.company}</span>
                  <span className="block truncate text-[11px] text-fg-tertiary">{r.id} · {r.meta}</span>
                </span>
                <Tag tone={r.bucket === 'replied' ? 'success' : r.bucket === 'confirm' ? 'warning' : 'brand'}>{r.statusLabel}</Tag>
              </button>
            ))}
          </div>
        )}

        {sessionHits.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">Sessions</p>
            {sessionHits.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onClose(); navigate(`/${locale}/dashboard/sessions`); }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition-colors hover:border-fg-brand/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-fg">
                    {s.label || `${s.categories?.[0] ?? 'session'} · ${(s.country ?? '').toUpperCase()}`}
                  </span>
                  <span className="block truncate text-[11px] text-fg-tertiary">
                    {(s.country ?? '—').toUpperCase()} · {(s.categories ?? []).join(', ') || 'compliance'}
                  </span>
                </span>
                <Tag tone="neutral">session</Tag>
              </button>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
