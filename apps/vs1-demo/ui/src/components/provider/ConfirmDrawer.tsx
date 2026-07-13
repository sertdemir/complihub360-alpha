import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';

// ─── Confirm drawer (Figma 2651:90 · wiring map B9) ──────────────────────────
// Reusable guard for destructive actions: states the consequence, requires the
// keyword for the hard cases, and only then runs the action.

export interface ConfirmSpec {
  title: string;
  consequence: string;
  confirmLabel: string;
  /** When set, the user must type this word to enable the confirm button. */
  keyword?: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDrawer({ spec, onClose }: { spec: ConfirmSpec | null; onClose: () => void }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setTyped(''); setBusy(false); }, [spec?.title]);

  const armed = !spec?.keyword || typed.trim().toUpperCase() === spec.keyword.toUpperCase();

  const run = async () => {
    if (!spec) return;
    setBusy(true);
    await spec.onConfirm();
    setBusy(false);
    onClose();
  };

  return (
    <Drawer
      forceDark
      open={!!spec}
      onClose={onClose}
      side="right"
      size="sm"
      eyebrow="CONFIRM"
      title={spec?.title ?? 'Are you sure?'}
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="accent" size="sm" onClick={run} disabled={!armed || busy}>
            {busy ? '…' : spec?.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      }
    >
      {spec && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-error-500/25 bg-error-500/[0.06] px-4 py-3">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-error-500" />
            <p className="text-[12px] leading-relaxed text-fg-secondary">{spec.consequence}</p>
          </div>
          {spec.keyword && (
            <div>
              <p className="mb-1.5 text-[11px] text-fg-tertiary">Type <span className="font-semibold text-fg">{spec.keyword}</span> to confirm:</p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-tertiary focus:border-error-500"
                placeholder={spec.keyword}
              />
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
