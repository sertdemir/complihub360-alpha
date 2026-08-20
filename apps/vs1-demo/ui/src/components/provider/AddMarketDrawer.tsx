import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { fetchCoverage, addMarket } from '../../api/provider';
import { cn } from '../../lib/utils';

// ─── Add-Market drawer (Figma 2651:50 · wiring map B5) ───────────────────────
// Extends the provider's public coverage. New markets go through a 2-business-
// day re-verification before they rank — the drawer says so up front.

// Demand figures are design-fixture data; country names + the note template are
// translated via the providerws namespace.
const CANDIDATES: { code: string; labelKey: string; requests: number; partners: number }[] = [
  { code: 'NL', labelKey: 'addMarket.countryNl', requests: 31, partners: 12 },
  { code: 'CH', labelKey: 'addMarket.countryCh', requests: 19, partners: 9 },
  { code: 'FR', labelKey: 'addMarket.countryFr', requests: 44, partners: 21 },
  { code: 'IT', labelKey: 'addMarket.countryIt', requests: 38, partners: 17 },
  { code: 'ES', labelKey: 'addMarket.countryEs', requests: 27, partners: 14 },
  { code: 'PL', labelKey: 'addMarket.countryPl', requests: 16, partners: 6 },
];

interface AddMarketDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdded: (country: string) => void;
}

export function AddMarketDrawer({ open, onClose, onAdded }: AddMarketDrawerProps) {
  const { t } = useTranslation('providerws');
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
      setError(e instanceof Error ? e.message : t('addMarket.errorFallback'));
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
      eyebrow={t('addMarket.eyebrow')}
      title={t('addMarket.title')}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-[11px] leading-snug text-fg-tertiary">{t('addMarket.footerNote')}</p>
          <Button variant="accent" size="sm" onClick={submit} disabled={!selected || busy}>
            {busy ? '…' : selected ? t('addMarket.addSelected', { code: selected }) : t('addMarket.addButton')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[12px] leading-relaxed text-fg-secondary">
          {t('addMarket.coverageToday', { markets: covered.length ? covered.join(' · ') : '—' })}
        </p>
        {added && (
          <div className="rounded-lg border border-fg-brand/30 bg-fg-brand/10 px-3.5 py-2.5 text-[12px] text-fg-secondary">
            <span className="font-semibold text-fg">{t('addMarket.addedTitle', { code: added })}</span>{t('addMarket.addedBody')}
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
                selected === c.code ? 'border-fg-brand bg-fg-brand/10' : 'border-elevate/10 bg-elevate/[0.03] hover:border-elevate/25',
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Globe size={15} className="shrink-0 text-fg-tertiary" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-fg">{t(c.labelKey)}</span>
                  <span className="block text-[11px] text-fg-tertiary">{t('addMarket.candidateNote', { requests: c.requests, partners: c.partners })}</span>
                </span>
              </span>
              <Tag tone={selected === c.code ? 'brand' : 'neutral'}>{c.code}</Tag>
            </button>
          ))}
          {options.length === 0 && <p className="text-[12px] text-fg-tertiary">{t('addMarket.allCovered')}</p>}
        </div>
      </div>
    </Drawer>
  );
}
