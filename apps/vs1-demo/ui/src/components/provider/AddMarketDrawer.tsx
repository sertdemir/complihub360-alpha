import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { fetchCoverage, addMarket } from '../../api/provider';
import { cn } from '../../lib/utils';

// ─── Add-Market drawer (Figma 2651:50 · wiring map B5) ───────────────────────
// Extends the provider's public coverage. New markets go through a 2-business-
// day re-verification before they rank — the drawer says so up front.

const CANDIDATES: { code: string; label: string; note: string }[] = [
  { code: 'NL', label: 'Netherlands', note: '31 open requests / 30d · 12 partners' },
  { code: 'CH', label: 'Switzerland', note: '19 open requests / 30d · 9 partners' },
  { code: 'FR', label: 'France', note: '44 open requests / 30d · 21 partners' },
  { code: 'IT', label: 'Italy', note: '38 open requests / 30d · 17 partners' },
  { code: 'ES', label: 'Spain', note: '27 open requests / 30d · 14 partners' },
  { code: 'PL', label: 'Poland', note: '16 open requests / 30d · 6 partners' },
];

interface AddMarketDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdded: (country: string) => void;
}

export function AddMarketDrawer({ open, onClose, onAdded }: AddMarketDrawerProps) {
  const [covered, setCovered] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected(null); setAdded(null); setError('');
    fetchCoverage().then((c) => setCovered(c.countries_supported ?? [])).catch(() => setCovered([]));
  }, [open]);

  const submit = async () => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const next = await addMarket(selected);
      setCovered(next);
      setAdded(selected);
      onAdded(selected);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adding the market failed.');
    }
    setBusy(false);
  };

  const options = CANDIDATES.filter((c) => !covered.includes(c.code));

  return (
    <Drawer
      forceDark
      open={open}
      onClose={onClose}
      side="right"
      size="md"
      eyebrow="COVERAGE"
      title="Add market"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-[11px] leading-snug text-fg-tertiary">New markets need a 2-business-day re-verification before they rank.</p>
          <Button variant="accent" size="sm" onClick={submit} disabled={!selected || busy}>
            {busy ? '…' : selected ? `Add ${selected}` : 'Add market'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[12px] leading-relaxed text-fg-secondary">
          Your coverage today: {covered.length ? covered.join(' · ') : '—'}. Pick the market to expand into — demand figures are the last 30 days.
        </p>
        {added && (
          <div className="rounded-lg border border-fg-brand/30 bg-fg-brand/10 px-3.5 py-2.5 text-[12px] text-fg-secondary">
            <span className="font-semibold text-fg">{added} added</span> — verification pending (≈ 2 business days). You'll see it ranked once verified.
          </div>
        )}
        <div className="space-y-2">
          {options.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setSelected(c.code === selected ? null : c.code)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors',
                selected === c.code ? 'border-fg-brand bg-fg-brand/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25',
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Globe size={15} className="shrink-0 text-fg-tertiary" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-fg">{c.label}</span>
                  <span className="block text-[11px] text-fg-tertiary">{c.note}</span>
                </span>
              </span>
              <Tag tone={selected === c.code ? 'brand' : 'neutral'}>{c.code}</Tag>
            </button>
          ))}
          {options.length === 0 && <p className="text-[12px] text-fg-tertiary">All listed markets are already covered.</p>}
        </div>
      </div>
    </Drawer>
  );
}
