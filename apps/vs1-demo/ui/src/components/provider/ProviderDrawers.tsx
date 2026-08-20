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
  const { t, i18n } = useTranslation('providerws');
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
    return q.toLowerCase().split(/\s+/).every((tk) => hay.includes(tk));
  });

  return (
    <Drawer forceDark open={open} onClose={onClose} side="right" size="md" eyebrow={t('searchDrawer.eyebrow')} title={t('searchDrawer.title')}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-elevate/10 bg-elevate/5 px-3 py-2.5 focus-within:border-fg-brand">
          <Search size={15} className="shrink-0 text-fg-tertiary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchDrawer.placeholder')}
            className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-tertiary"
          />
        </div>
        {q.trim().length < 2 && (
          <p className="text-[12px] text-fg-tertiary">{t('searchDrawer.hint')}</p>
        )}
        {q.trim().length >= 2 && rows === null && <p className="text-[12px] text-fg-tertiary">{t('searchDrawer.loading')}</p>}
        {q.trim().length >= 2 && rows !== null && hits.length === 0 && (
          <p className="text-[12px] text-fg-tertiary">{t('searchDrawer.noMatches', { query: q })}</p>
        )}
        <div className="space-y-2">
          {hits.slice(0, 8).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onClose(); navigate(`/${locale}/partner-dashboard/requests?thread=${r.id}`); }}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-elevate/10 bg-elevate/[0.03] px-3.5 py-3 text-left transition-colors hover:border-fg-brand/50"
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
  { labelKey: 'rankingImpact.factorResponsiveness', weight: 40, noteKey: 'rankingImpact.factorResponsivenessNote' },
  { labelKey: 'rankingImpact.factorReplyQuality', weight: 25, noteKey: 'rankingImpact.factorReplyQualityNote' },
  { labelKey: 'rankingImpact.factorCoverageFit', weight: 20, noteKey: 'rankingImpact.factorCoverageFitNote' },
  { labelKey: 'rankingImpact.factorVerifiedStanding', weight: 15, noteKey: 'rankingImpact.factorVerifiedStandingNote' },
];

export function RankingImpactDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('providerws');
  return (
    <Drawer forceDark open={open} onClose={onClose} side="right" size="md" eyebrow={t('rankingImpact.eyebrow')} title={t('rankingImpact.title')}
      footer={<p className="text-[11px] text-fg-tertiary">{t('rankingImpact.footer')}</p>}>
      <div className="space-y-4">
        {FACTORS.map((f) => (
          <div key={f.labelKey}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-fg">{t(f.labelKey)}</span>
              <span className="text-[12px] font-bold text-fg-accent">{f.weight}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevate/10">
              <div className="h-full rounded-full bg-brand-accent" style={{ width: `${f.weight}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-fg-tertiary">{t(f.noteKey)}</p>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

// ── B10 · Help & support ─────────────────────────────────────────────────────
const TOPICS = [
  { titleKey: 'helpDrawer.topicSlaTitle', descKey: 'helpDrawer.topicSlaDesc' },
  { titleKey: 'helpDrawer.topicMagicLinksTitle', descKey: 'helpDrawer.topicMagicLinksDesc' },
  { titleKey: 'helpDrawer.topicRankingTitle', descKey: 'helpDrawer.topicRankingDesc' },
  { titleKey: 'helpDrawer.topicBillingTitle', descKey: 'helpDrawer.topicBillingDesc' },
];

export function HelpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('providerws');
  return (
    <Drawer forceDark open={open} onClose={onClose} side="right" size="md" eyebrow={t('helpDrawer.eyebrow')} title={t('helpDrawer.title')}
      footer={
        <a href="mailto:support@complihub360.com" className="w-full">
          <Button variant="accent" size="sm" className="w-full">{t('helpDrawer.contactSupport')}</Button>
        </a>
      }>
      <div className="space-y-2">
        {TOPICS.map((x) => (
          <div key={x.titleKey} className="rounded-lg border border-elevate/10 bg-elevate/[0.03] px-3.5 py-3">
            <p className="text-[13px] font-semibold text-fg">{t(x.titleKey)}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">{t(x.descKey)}</p>
          </div>
        ))}
        <p className="pt-2 text-[11px] text-fg-tertiary">{t('helpDrawer.medianResponse')}</p>
      </div>
    </Drawer>
  );
}
