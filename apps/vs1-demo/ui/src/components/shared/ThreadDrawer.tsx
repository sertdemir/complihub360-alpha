import { useEffect, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { fetchEngagementDetail, postThreadMessage, type EngagementDetail } from '../../api/thread';

// ─── Thread drawer (Figma: Request-thread 2654:2 / Reply 2649:2) ─────────────
// The shared engagement history, opened from BOTH workspaces. `viewer` decides
// which side the composer posts as and how bubbles align.

interface ThreadDrawerProps {
  open: boolean;
  engagementId: string | null;
  viewer: 'user' | 'provider';
  onClose: () => void;
}

const STATUS_TONE: Record<string, 'brand' | 'success' | 'warning' | 'neutral' | 'error'> = {
  created: 'warning',
  delivered: 'warning',
  viewed: 'warning',
  confirmed: 'brand',
  replied: 'success',
  declined: 'error',
  expired: 'neutral',
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ThreadDrawer({ open, engagementId, viewer, onClose }: ThreadDrawerProps) {
  const [detail, setDetail] = useState<EngagementDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !engagementId) return;
    setDetail(null); setLoadFailed(false);
    fetchEngagementDetail(engagementId)
      .then(setDetail)
      .catch(() => setLoadFailed(true));
  }, [open, engagementId]);

  const send = async () => {
    if (!engagementId || draft.trim().length < 2) return;
    setSending(true);
    try {
      await postThreadMessage(engagementId, viewer, draft.trim());
      setDraft('');
      setDetail(await fetchEngagementDetail(engagementId));
    } catch { /* keep draft for retry */ }
    setSending(false);
  };

  const e = detail?.engagement;
  const counterpart = viewer === 'provider' ? 'Client' : 'Provider';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      size="md"
      eyebrow={e ? `REQUEST ${e.id.slice(0, 8).toUpperCase()}` : 'REQUEST'}
      title={e ? `${e.country} · ${e.category}` : 'Thread'}
      headerExtra={e && (
        <div className="mt-1 flex items-center gap-2">
          <Tag tone={STATUS_TONE[e.status] ?? 'neutral'}>{e.status}</Tag>
          <span className="text-[11px] text-fg-tertiary">opened {relTime(e.created_at)}</span>
        </div>
      )}
      footer={
        <div className="flex w-full items-end gap-2">
          <textarea
            rows={2}
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            placeholder={`Reply to ${counterpart.toLowerCase()}…`}
            className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-fg placeholder:text-fg-tertiary focus:border-fg-brand focus:outline-none"
          />
          <Button variant="accent" size="sm" onClick={send} disabled={sending || draft.trim().length < 2}>
            {sending ? '…' : 'Send'}
          </Button>
        </div>
      }
    >
      {!detail && !loadFailed && <p className="text-[13px] text-fg-tertiary">Loading thread…</p>}
      {loadFailed && (
        <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">
          Thread could not be loaded — try again in a moment.
        </p>
      )}
      {detail && (
        <div className="space-y-3">
          {detail.messages.length === 0 && (
            <p className="text-[13px] text-fg-tertiary">No messages yet — start the conversation below.</p>
          )}
          {detail.messages.map((m) => {
            const mine = m.author === viewer;
            return (
              <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                <div className={
                  'max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ' +
                  (mine
                    ? 'bg-[#0e6450]/60 text-fg'
                    : m.author === 'system'
                      ? 'border border-white/10 bg-transparent text-fg-tertiary'
                      : 'bg-white/[0.06] text-fg-secondary')
                }>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
                    {m.author === viewer ? 'You' : m.author} · {relTime(m.created_at)}
                  </p>
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
