import { useEffect, useState } from 'react';
import { Archive, Copy, PencilLine } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { patchSession, duplicateSession } from '../../api/sessions';

// ─── Session-Actions drawer (Figma 2654:89 · wiring map B13) ─────────────────
// The "⋯" menu on a session row: rename (label), duplicate (editable copy),
// archive (soft-hide, reversible server-side). Live rows only.

export interface SessionActionsTarget {
  id: string;
  title: string;
  domain: string;
  country: string;
}

interface SessionActionsDrawerProps {
  target: SessionActionsTarget | null;
  onClose: () => void;
  onChanged: () => void; // refetch the list after any mutation
}

export function SessionActionsDrawer({ target, onClose, onChanged }: SessionActionsDrawerProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'rename' | 'duplicate' | 'archive' | null>(null);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(target?.title ?? '');
    setBusy(null); setDone(''); setError('');
  }, [target?.id]);

  const run = async (kind: 'rename' | 'duplicate' | 'archive', fn: () => Promise<unknown>, msg: string) => {
    setBusy(kind); setError('');
    try {
      await fn();
      setDone(msg);
      onChanged();
      if (kind !== 'rename') setTimeout(onClose, 900);
    } catch {
      setError('Action failed — try again in a moment.');
    }
    setBusy(null);
  };

  return (
    <Drawer forceDark open={!!target} onClose={onClose} side="right" size="md" eyebrow="SESSION" title="Session actions">
      {target && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[13px] font-semibold text-fg">{target.title}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag tone="brand">{target.domain}</Tag>
              <span className="text-[11px] text-fg-tertiary">{target.country}</span>
            </div>
          </div>

          {/* Rename */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2.5">
              <PencilLine size={15} className="shrink-0 text-fg-accent" />
              <p className="text-[13px] font-semibold text-fg">Rename session</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-tertiary focus:border-fg-brand"
                placeholder="Session name"
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busy !== null || name.trim().length < 2 || name.trim() === target.title}
                onClick={() => run('rename', () => patchSession(target.id, { label: name.trim() }), 'Renamed ✓')}
              >
                {busy === 'rename' ? '…' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Duplicate */}
          <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Copy size={15} className="mt-0.5 shrink-0 text-fg-brand" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-fg">Duplicate</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">Creates an editable copy — useful before changing markets or answers.</p>
            </div>
            <Button size="sm" variant="secondary" disabled={busy !== null}
              onClick={() => run('duplicate', () => duplicateSession(target.id), 'Duplicated ✓')}>
              {busy === 'duplicate' ? '…' : 'Duplicate'}
            </Button>
          </div>

          {/* Archive */}
          <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Archive size={15} className="mt-0.5 shrink-0 text-fg-tertiary" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-fg">Archive</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">Hides the session from the list · monitoring pauses · restorable anytime.</p>
            </div>
            <Button size="sm" variant="ghost" disabled={busy !== null}
              onClick={() => run('archive', () => patchSession(target.id, { status: 'archived' }), 'Archived ✓')}>
              {busy === 'archive' ? '…' : 'Archive'}
            </Button>
          </div>

          {done && <p className="rounded-md border border-fg-brand/30 bg-fg-brand/10 px-3 py-2 text-[12px] text-fg-secondary">{done}</p>}
          {error && <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">{error}</p>}
        </div>
      )}
    </Drawer>
  );
}
