import { useEffect, useState } from 'react';
import { AlertCircle, FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { fetchEngagementDetail, postThreadMessage, type EngagementDetail, type Proposal } from '../../api/thread';
import { focusField } from '../ui/FormErrorSummary';
import { FieldError, errorAria } from '../ui/FieldError';
import { TechnicalDetails } from '../results/RiskMapState';
import { referenceOf } from '../../api/client';

// ─── Thread drawer (Figma: Request-thread 2654:2 / Reply 2649:2) ─────────────
// The shared engagement history, opened from BOTH workspaces. `viewer` decides
// which side the composer posts as and how bubbles align. B1: the provider can
// attach a structured proposal (Provider Flows §5), rendered as a card for
// both sides. Copy lives in the 'userws' namespace (thread.*); raw api values
// (status, engagement_model, author) stay canonical and are mapped for display.
//
// Punkt 1 (Canvas-Wahl T2 · C3, 15.10.2026; Figma 3740:4375): scheiterte das
// Senden, passierte sichtbar nichts — wer den Drawer schloss, hielt die
// Nachricht fuer gesendet. Jetzt bleibt sie als Blase „Not sent“ im Verlauf
// stehen, mit „Try Again“, „Edit“ (zurueck ins Feld) und der Referenz.
// Vorher wird der Verlauf einmal neu geladen: bei einer Zeitueberschreitung
// kann die Nachricht doch angekommen sein — dann gilt sie als gesendet, und
// ein zweiter Versuch erzeugt kein Duplikat.

interface FailedMessage {
  body: string;
  proposal?: Proposal;
  reference: { id: string; at: string } | null;
}

/** Ob die Nachricht trotz Fehler im Verlauf steht: gleicher Absender, gleicher
 *  Text, nicht aelter als der Sendeversuch (mit Spiel fuer Uhrabweichung). */
export function arrivedDespiteError(d: EngagementDetail | null, viewer: string, body: string, since: number): boolean {
  return !!d?.messages.some((m) => m.author === viewer && m.body === body && new Date(m.created_at).getTime() >= since - 60_000);
}

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
    <div className="mt-2 rounded-lg border border-brand-accent/35 bg-brand-accent/[0.07] px-3 py-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-accent">
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
                <li key={d} className="flex gap-1.5 text-fg-secondary"><span className="text-fg-accent">·</span>{d}</li>
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
  // Regel V2 (11.10.2026): "Senden" bleibt aktiv. Pflicht ist nur die
  // Nachricht (der Vorschlag ist optional) — ist sie zu kurz, steht der Satz
  // am Feld und der Fokus dort.
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState<FailedMessage | null>(null);
  const draftError = tried && draft.trim().length < 2 ? t('thread.messageTooShort', { min: 2 }) : null;

  useEffect(() => {
    if (!open || !engagementId) return;
    setDetail(null); setLoadFailed(false); setTried(false); setFailed(null);
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

  const clearComposer = () => {
    setDraft(''); setTried(false); setProposalOpen(false); setPrice(''); setTimeline(''); setModel(''); setDeliverables('');
  };

  const deliver = async (body: string, proposal: Proposal | undefined) => {
    if (!engagementId) return;
    setSending(true);
    const since = Date.now();
    try {
      await postThreadMessage(engagementId, viewer, body, proposal);
      setFailed(null);
      setDetail(await fetchEngagementDetail(engagementId).catch(() => detail));
    } catch (err) {
      const fresh = await fetchEngagementDetail(engagementId).catch(() => null);
      if (fresh) setDetail(fresh);
      if (arrivedDespiteError(fresh, viewer, body, since)) setFailed(null);
      else setFailed({ body, proposal, reference: referenceOf(err) });
    }
    setSending(false);
  };

  const send = async () => {
    if (!engagementId || sending) return;
    setTried(true);
    if (draft.trim().length < 2) { focusField('thread-draft'); return; }
    const body = draft.trim();
    const proposal = buildProposal();
    // T2: der Text wandert in den Verlauf — als gesendet oder als „Not sent“.
    clearComposer();
    await deliver(body, proposal);
  };

  const retry = () => { if (failed && !sending) void deliver(failed.body, failed.proposal); };

  const edit = () => {
    if (!failed) return;
    const p = failed.proposal;
    setDraft(failed.body);
    if (p) {
      setProposalOpen(true);
      setPrice(p.price_range ?? ''); setTimeline(p.timeline ?? ''); setModel(p.engagement_model ?? '');
      setDeliverables((p.deliverables ?? []).join('\n'));
    }
    setFailed(null);
    focusField('thread-draft');
  };

  const e = detail?.engagement;
  const tAuthor = (author: string) => (AUTHOR_KEY[author] ? t(`thread.${AUTHOR_KEY[author]}`) : author);

  return (
    <Drawer
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
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/[0.05] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-accent">
                  <FileText size={11} /> {t('thread.attachProposal')}
                </p>
                <button type="button" aria-label={t('thread.removeProposal')} onClick={() => setProposalOpen(false)} className="text-fg-tertiary hover:text-fg">
                  <X size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={price} onChange={(ev) => setPrice(ev.target.value)} placeholder={t('thread.pricePlaceholder')}
                  className="rounded-md border border-elevate/10 bg-elevate/5 px-2.5 py-1.5 text-[12px] text-fg outline-none placeholder:text-fg-tertiary focus:border-brand-accent/60" />
                <input value={timeline} onChange={(ev) => setTimeline(ev.target.value)} placeholder={t('thread.timelinePlaceholder')}
                  className="rounded-md border border-elevate/10 bg-elevate/5 px-2.5 py-1.5 text-[12px] text-fg outline-none placeholder:text-fg-tertiary focus:border-brand-accent/60" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {MODELS.map((m) => (
                  <button key={m} type="button" onClick={() => setModel(model === m ? '' : m)}
                    className={
                      'rounded-full border px-2.5 py-1 text-[11px] transition-colors ' +
                      (model === m ? 'border-brand/60 bg-brand-light text-fg' : 'border-elevate/10 text-fg-tertiary hover:text-fg')
                    }>
                    {MODEL_KEY[m] ? t(`thread.${MODEL_KEY[m]}`) : m}
                  </button>
                ))}
              </div>
              <textarea rows={2} value={deliverables} onChange={(ev) => setDeliverables(ev.target.value)}
                placeholder={t('thread.deliverablesPlaceholder')}
                className="mt-2 w-full resize-none rounded-md border border-elevate/10 bg-elevate/5 px-2.5 py-1.5 text-[12px] text-fg outline-none placeholder:text-fg-tertiary focus:border-brand-accent/60" />
            </div>
          )}
          <div className="flex w-full items-end gap-2">
            <textarea
              id="thread-draft"
              rows={2}
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              placeholder={viewer === 'provider' ? t('thread.replyToClient') : t('thread.replyToProvider')}
              aria-label={viewer === 'provider' ? t('thread.replyToClient') : t('thread.replyToProvider')}
              className={'flex-1 resize-none rounded-lg border bg-elevate/5 px-3 py-2 text-[13px] text-fg placeholder:text-fg-tertiary focus:border-fg-brand focus:outline-none '
                + (draftError ? 'border-error-500' : 'border-elevate/10')}
              {...errorAria('thread-draft', !!draftError)}
            />
            {viewer === 'provider' && !proposalOpen && (
              <Button variant="ghost" size="sm" onClick={() => setProposalOpen(true)}>{t('thread.addProposal')}</Button>
            )}
            <Button variant="primary" size="sm" onClick={send} disabled={sending}>
              {sending ? '…' : t('shared.send')}
            </Button>
          </div>
          <FieldError id="thread-draft" message={draftError} alert />
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
      {failed && (
        <div className="mt-3 flex flex-col items-end gap-1.5">
          <div className="max-w-[85%] rounded-xl border-[1.5px] border-dashed border-error-500/70 px-3.5 py-2.5 text-[13px] leading-relaxed text-fg">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-error-700 dark:text-red-300">
              {t('thread.you')} · {t('thread.notSent')}
            </p>
            {failed.body}
            {failed.proposal && <ProposalCard p={failed.proposal} />}
          </div>
          <div role="alert" className="flex flex-col items-end gap-1 text-right">
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-error-700 dark:text-red-300">
                <AlertCircle size={14} aria-hidden="true" />{t('thread.sendFailed.heading')}
              </span>
              <Button variant="ghost" size="sm" onClick={retry} disabled={sending}>{sending ? '…' : t('common:states.actions.tryAgain')}</Button>
              <Button variant="ghost" size="sm" onClick={edit} disabled={sending}>{t('thread.edit')}</Button>
            </div>
            <p className="text-[12px] leading-relaxed text-fg-secondary">{t('thread.sendFailed.message')}</p>
          </div>
          <TechnicalDetails reference={failed.reference} />
        </div>
      )}
    </Drawer>
  );
}
