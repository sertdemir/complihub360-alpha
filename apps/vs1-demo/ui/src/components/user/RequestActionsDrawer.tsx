import { useEffect, useState } from 'react';
import { BellRing, MessageSquare, XCircle } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { remindEngagement, withdrawEngagement } from '../../api/thread';

// ─── Request-Actions drawer (Figma 2654:135 · wiring map B14) ────────────────
// The "⋯" menu on a user request card. Remind re-sends the provider mail with
// fresh magic links; withdraw is terminal and burns all open links — hence the
// explicit two-step confirm.

export interface RequestActionsTarget {
  uuid: string;
  idLine: string;
  company: string;
  statusLabel: string;
  /** Raw engagement status — remind/withdraw only while awaiting confirm. */
  rawStatus?: string;
}

interface RequestActionsDrawerProps {
  target: RequestActionsTarget | null;
  onClose: () => void;
  onOpenThread: (uuid: string) => void;
  onWithdrawn: (uuid: string) => void;
}

const OPEN_STATUSES = ['created', 'delivered', 'viewed'];

export function RequestActionsDrawer({ target, onClose, onOpenThread, onWithdrawn }: RequestActionsDrawerProps) {
  const [busy, setBusy] = useState<'remind' | 'withdraw' | null>(null);
  const [reminded, setReminded] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBusy(null); setReminded(false); setConfirmWithdraw(false); setError('');
  }, [target?.uuid]);

  const actionable = !!target?.rawStatus && OPEN_STATUSES.includes(target.rawStatus);

  const remind = async () => {
    if (!target) return;
    setBusy('remind'); setError('');
    try {
      await remindEngagement(target.uuid);
      setReminded(true);
    } catch {
      setError('Reminder failed — try again in a moment.');
    }
    setBusy(null);
  };

  const withdraw = async () => {
    if (!target) return;
    setBusy('withdraw'); setError('');
    try {
      await withdrawEngagement(target.uuid);
      onWithdrawn(target.uuid);
      onClose();
    } catch {
      setError('Withdraw failed — try again in a moment.');
    }
    setBusy(null);
  };

  return (
    <Drawer
      forceDark
      open={!!target}
      onClose={onClose}
      side="right"
      size="md"
      eyebrow={target ? `REQUEST ${target.idLine.split(' ')[0].replace('RQ-', '')}` : 'REQUEST'}
      title="Request actions"
    >
      {target && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[13px] font-semibold text-fg">{target.company}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag tone={actionable ? 'warning' : 'neutral'}>{target.statusLabel}</Tag>
              <span className="text-[11px] text-fg-tertiary">{target.idLine}</span>
            </div>
          </div>

          {/* Remind */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start gap-3">
              <BellRing size={16} className="mt-0.5 shrink-0 text-fg-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">Send reminder</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">
                  Re-sends the request mail with fresh confirmation links · reminders don't hurt the provider's ranking, missed confirms do.
                </p>
              </div>
              <Button size="sm" variant="accent" onClick={remind} disabled={!actionable || busy !== null || reminded}>
                {busy === 'remind' ? '…' : reminded ? 'Sent ✓' : 'Remind'}
              </Button>
            </div>
            {reminded && (
              <p className="mt-2.5 rounded-md border border-fg-brand/30 bg-fg-brand/10 px-3 py-2 text-[11px] text-fg-secondary">
                Reminder delivered — the provider received a fresh 24h confirmation link. A note was added to the thread.
              </p>
            )}
          </div>

          {/* Thread */}
          <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <MessageSquare size={16} className="mt-0.5 shrink-0 text-fg-brand" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-fg">Open thread</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">Full history — your opening message, replies and system notes.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { onClose(); onOpenThread(target.uuid); }}>Open</Button>
          </div>

          {/* Withdraw */}
          <div className="rounded-lg border border-error-500/25 bg-error-500/[0.06] p-4">
            <div className="flex items-start gap-3">
              <XCircle size={16} className="mt-0.5 shrink-0 text-error-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">Withdraw request</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">
                  Ends this request permanently and deactivates every mailed action link. Can't be undone.
                </p>
              </div>
              {!confirmWithdraw ? (
                <Button size="sm" variant="ghost" onClick={() => setConfirmWithdraw(true)} disabled={!actionable || busy !== null}>
                  Withdraw
                </Button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmWithdraw(false)} disabled={busy !== null}>Keep</Button>
                  <Button size="sm" variant="accent" onClick={withdraw} disabled={busy !== null}>
                    {busy === 'withdraw' ? '…' : 'Yes, withdraw'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {!actionable && (
            <p className="text-[11px] leading-relaxed text-fg-tertiary">
              Remind and withdraw are only available while the request awaits the provider's confirmation.
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">{error}</p>
          )}
        </div>
      )}
    </Drawer>
  );
}
