import { useEffect, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { fetchEngagementDetail, postThreadMessage, type EngagementDetail, type Proposal } from '../../api/thread';

// ─── Thread drawer (Figma: Request-thread 2654:2 / Reply 2649:2) ─────────────
// The shared engagement history, opened from BOTH workspaces. `viewer` decides
// which side the composer posts as and how bubbles align. B1: the provider can
// attach a structured proposal (Provider Flows §5), rendered as a card for
// both sides. Copy lives in the 'userws' namespace (thread.*); raw api values
// (status, engagement_model, author) stay canonical and are mapped for display.

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
  withdrawn: 'neutral',
};

const STATUS_LABEL_KEY: Record<string, string> = {
  created: 'statusCreated',
  delivered: 'statusDelivered',
  viewed: 'statusViewed',
  confirmed: 'statusConfirmed',
  replied: 'statusReplied',
  declined: 'statusDeclined',
  expired: 'statusExpired',
  withdrawn: 'statusWithdrawn',
};

// Canonical values (also what gets POSTed as engagement_model) → display keys.
const MODELS = ['Fixed fee', 'Retainer', 'Hourly'];
const MODEL_KEY: Record<string, string> = {
  'Fixed fee': 'modelFixedFee',
  'Retainer': 'modelRetainer',
  'Hourly': 'modelHourly',
};

const AUTHOR_KEY: Record<string, string> = {
  user: 'authorUser',
  provider: 'authorProvider',
  system: 'authorSystem',
};

function relTime(iso: string, t: TFunction): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return t('thread.minAgo', { count: Math.max(1, m) });
  const h = Math.floor(m / 60);
  if (h < 24) return t('thread.hoursAgo', { count: h });
  return t('thread.daysAgo', { count: Math.floor(h / 24) });
}

function ProposalCard({ p }: { p: Proposal }) {
  const { t } = useTranslation('userws');
  return (
    <div className="mt-2 rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/[0.07] px-3 py-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d4af37]">
        <FileText size={11} /> {t('thread.proposal')}
      </p>
      <div className="space-y-1 text-[12px] leading-relaxed">
        {p.price_range && (
          <p><span className="text-fg-tertiary">{t('thread.price')}</span><span className="font-semibold text-fg">{p.price_range}</span></p>
        )}
        {p.timeline && (
          <p><span className="text-fg-tertiary">{t('thread.timeline')}</span><span className="text-fg-secondary">{p.timeline}</span></p>
        )}
        {p.engagement_model && (
          <p><span className="text-fg-tertiary">{t('thread.model')}</span><span className="text-fg-secondary">{MODEL_KEY[p.engagement_model] ? t(`thread.${MODEL_KEY[p.engagement_model]}`) : p.engagement_model}</span></p>
        )}
        {!!p.deliverables?.length && (
          <div>
            <p className="text-fg-tertiary">{t('thread.deliverables')}</p>
            <ul className="mt-0.5 space-y-0.5">
              {p.deliverables.map((d) => (
                <li key={d} className="flex gap-1.5 text-fg-secondary"><span className="text-[#d4af37]">·</span>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ThreadDrawer({ open, engagementId, viewer, onClose }: ThreadDrawerProps) {
  const { t } = useTranslation('userws');
  const [detail, setDetail] = useState<EngagementDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // B1: proposal composer (provider only)
  const [proposalOpen, setProposalOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [timeline, setTimeline] = useState('');
  const [model, setModel] = useState('');
  const [deliverables, setDeliverables] = useState('');

  useEffect(() => {
    if (!open || !engagementId) return;
    setDetail(null); setLoadFailed(false);
    setProposalOpen(false); setPrice(''); setTimeline(''); setModel(''); setDeliverables('');
    fetchEngagementDetail(engagementId)
      .then(setDetail)
      .catch(() => setLoadFailed(true));
  }, [open, engagementId]);

  const buildProposal = (): Proposal | undefined => {
    if (!proposalOpen) return undefined;
    const p: Proposal = {
      ...(price.trim() ? { price_range: price.trim() } : {}),
      ...(timeline.trim() ? { timeline: timeline.trim() } : {}),
      ...(model ? { engagement_model: model } : {}),
      ...(deliverables.trim() ? { deliverables: deliverables.split('\n').map((d) => d.trim()).filter(Boolean).slice(0, 10) } : {}),
    };
    return Object.keys(p).length ? p : undefined;
  };

  const send = async () => {
    if (!engagementId || draft.trim().length < 2) return;
    setSending(true);
    try {
      await postThreadMessage(engagementId, viewer, draft.trim(), buildProposal());
      setDraft(''); setProposalOpen(false); setPrice(''); setTimeline(''); setModel(''); setDeliverables('');
      setDetail(await fetchEngagementDetail(engagementId));
    } catch { /* keep draft for retry */ }
    setSending(false);
  };

  const e = detail?.engagement;
  const tAuthor = (author: string) => (AUTHOR_KEY[author] ? t(`thread.${AUTHOR_KEY[author]}`) : author);

  return (
    <Drawer
      forceDark
      open={open}
      onClose={onClose}
      side="right"
      size="md"
      eyebrow={e ? t('thread.eyebrow', { id: e.id.slice(0, 8).toUpperCase() }) : t('thread.eyebrowFallback')}
      title={e ? `${e.country} · ${e.category}` : t('thread.titleFallback')}
      headerExtra={e && (
        <div className="mt-1 flex items-center gap-2">
          <Tag tone={STATUS_TONE[e.status] ?? 'neutral'}>{STATUS_LABEL_KEY[e.status] ? t(`thread.${STATUS_LABEL_KEY[e.status]}`) : e.status}</Tag>
          <span className="text-[11px] text-fg-tertiary">{t('thread.opened', { time: relTime(e.created_at, t) })}</span>
        </div>
      )}
      footer={
        <div className="w-full space-y-2">
          {viewer === 'provider' && proposalOpen && (
            <div className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/[0.05] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d4af37]">
                  <FileText size={11} /> {t('thread.attachProposal')}
                </p>
                <button type="button" aria-label={t('thread.removeProposal')} onClick={() => setProposalOpen(false)} className="text-fg-tertiary hover:text-fg">
                  <X size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={price} onChange={(ev) => setPrice(ev.target.value)} placeholder={t('thread.pricePlaceholder')}
                  className="rounded-md border border-elevate/10 bg-elevate/5 px-2.5 py-1.5 text-[12px] text-fg outline-none placeholder:text-fg-tertiary focus:border-[#d4af37]/60" />
                <input value={timeline} onChange={(ev) => setTimeline(ev.target.value)} placeholder={t('thread.timelinePlaceholder')}
                  className="rounded-md border border-elevate/10 bg-elevate/5 px-2.5 py-1.5 text-[12px] text-fg outline-none placeholder:text-fg-tertiary focus:border-[#d4af37]/60" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {MODELS.map((m) => (
                  <button key={m} type="button" onClick={() => setModel(model === m ? '' : m)}
                    className={
                      'rounded-full border px-2.5 py-1 text-[11px] transition-colors ' +
                      (model === m ? 'border-[#d4af37]/60 bg-[#d4af37]/15 text-fg' : 'border-elevate/10 text-fg-tertiary hover:text-fg')
                    }>
                    {MODEL_KEY[m] ? t(`thread.${MODEL_KEY[m]}`) : m}
                  </button>
                ))}
              </div>
              <textarea rows={2} value={deliverables} onChange={(ev) => setDeliverables(ev.target.value)}
                placeholder={t('thread.deliverablesPlaceholder')}
                className="mt-2 w-full resize-none rounded-md border border-elevate/10 bg-elevate/5 px-2.5 py-1.5 text-[12px] text-fg outline-none placeholder:text-fg-tertiary focus:border-[#d4af37]/60" />
            </div>
          )}
          <div className="flex w-full items-end gap-2">
            <textarea
              rows={2}
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              placeholder={viewer === 'provider' ? t('thread.replyToClient') : t('thread.replyToProvider')}
              className="flex-1 resize-none rounded-lg border border-elevate/10 bg-elevate/5 px-3 py-2 text-[13px] text-fg placeholder:text-fg-tertiary focus:border-fg-brand focus:outline-none"
            />
            {viewer === 'provider' && !proposalOpen && (
              <Button variant="ghost" size="sm" onClick={() => setProposalOpen(true)}>{t('thread.addProposal')}</Button>
            )}
            <Button variant="accent" size="sm" onClick={send} disabled={sending || draft.trim().length < 2}>
              {sending ? '…' : t('shared.send')}
            </Button>
          </div>
        </div>
      }
    >
      {!detail && !loadFailed && <p className="text-[13px] text-fg-tertiary">{t('thread.loadingThread')}</p>}
      {loadFailed && (
        <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">
          {t('thread.loadError')}
        </p>
      )}
      {detail && (
        <div className="space-y-3">
          {detail.messages.length === 0 && (
            <p className="text-[13px] text-fg-tertiary">{t('thread.noMessages')}</p>
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
                      ? 'border border-elevate/10 bg-transparent text-fg-tertiary'
                      : 'bg-elevate/[0.06] text-fg-secondary')
                }>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
                    {m.author === viewer ? t('thread.you') : tAuthor(m.author)} · {relTime(m.created_at, t)}
                  </p>
                  {m.body}
                  {m.proposal && <ProposalCard p={m.proposal} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
