import { useEffect, useState } from 'react';
import { BellRing, MessageSquare, XCircle, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
// Matrix-Befund 6 (2026-09-05): eine abgelaufene Anfrage stand unter "Wartet
// auf Sie", bot aber keine Handlung. Jetzt: schliessen (Zurueckziehen) oder
// einen anderen Anbieter suchen. Erinnern bleibt an die offene Frist gebunden.
const WITHDRAWABLE_STATUSES = [...OPEN_STATUSES, 'expired'];
const FIND_OTHER_STATUSES = ['expired', 'declined'];

// Status labels arrive as English strings (fixture or api) — display mapping only.
const STATUS_KEY: Record<string, string> = {
  'Awaiting confirmation': 'awaitingConfirmation', 'Active': 'active',
  'Provider replied': 'providerReplied', 'Provider confirmed': 'providerConfirmed', 'Withdrawn': 'withdrawn',
  'Declined': 'declined', 'Expired': 'expired',
};

export function RequestActionsDrawer({ target, onClose, onOpenThread, onWithdrawn }: RequestActionsDrawerProps) {
  const { t, i18n } = useTranslation('userws');
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';
  const [busy, setBusy] = useState<'remind' | 'withdraw' | null>(null);
  const [reminded, setReminded] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBusy(null); setReminded(false); setConfirmWithdraw(false); setError('');
  }, [target?.uuid]);

  const raw = target?.rawStatus ?? '';
  const actionable = OPEN_STATUSES.includes(raw);
  const canWithdraw = WITHDRAWABLE_STATUSES.includes(raw);
  const canFindOther = FIND_OTHER_STATUSES.includes(raw);
  const tStatus = (label: string) => (STATUS_KEY[label] ? t(`status.${STATUS_KEY[label]}`) : label);

  const remind = async () => {
    if (!target) return;
    setBusy('remind'); setError('');
    try {
      await remindEngagement(target.uuid);
      setReminded(true);
    } catch {
      setError(t('requestActions.remindError'));
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
      setError(t('requestActions.withdrawError'));
    }
    setBusy(null);
  };

  return (
    <Drawer
      open={!!target}
      onClose={onClose}
      side="right"
      size="md"
      eyebrow={target ? t('requestActions.eyebrow', { id: target.idLine.split(' ')[0].replace('RQ-', '') }) : t('requestActions.eyebrowFallback')}
      title={t('requestActions.title')}
    >
      {target && (
        <div className="space-y-4">
          <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03] px-4 py-3">
            <p className="text-[13px] font-semibold text-fg">{target.company}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag tone={actionable ? 'warning' : 'neutral'}>{tStatus(target.statusLabel)}</Tag>
              <span className="text-[11px] text-fg-tertiary">{target.idLine}</span>
            </div>
          </div>

          {/* Remind */}
          <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03] p-4">
            <div className="flex items-start gap-3">
              <BellRing size={16} className="mt-0.5 shrink-0 text-fg-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">{t('requestActions.remindTitle')}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">
                  {t('requestActions.remindDesc')}
                </p>
              </div>
              <Button size="sm" variant="accent" onClick={remind} disabled={!actionable || busy !== null || reminded}>
                {busy === 'remind' ? '…' : reminded ? t('requestActions.remindSent') : t('requestActions.remind')}
              </Button>
            </div>
            {reminded && (
              <p className="mt-2.5 rounded-md border border-fg-brand/30 bg-fg-brand/10 px-3 py-2 text-[11px] text-fg-secondary">
                {t('requestActions.remindedNote')}
              </p>
            )}
          </div>

          {/* Thread */}
          <div className="flex items-start gap-3 rounded-lg border border-elevate/10 bg-elevate/[0.03] p-4">
            <MessageSquare size={16} className="mt-0.5 shrink-0 text-fg-brand" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-fg">{t('requestActions.threadTitle')}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">{t('requestActions.threadDesc')}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { onClose(); onOpenThread(target.uuid); }}>{t('shared.open')}</Button>
          </div>

          {/* Withdraw */}
          <div className="rounded-lg border border-error-500/25 bg-error-500/[0.06] p-4">
            <div className="flex items-start gap-3">
              <XCircle size={16} className="mt-0.5 shrink-0 text-error-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">{t('requestActions.withdrawTitle')}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">
                  {t('requestActions.withdrawDesc')}
                </p>
              </div>
              {!confirmWithdraw ? (
                <Button size="sm" variant="ghost" onClick={() => setConfirmWithdraw(true)} disabled={!canWithdraw || busy !== null}>
                  {t('requestActions.withdraw')}
                </Button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmWithdraw(false)} disabled={busy !== null}>{t('requestActions.keep')}</Button>
                  <Button size="sm" variant="accent" onClick={withdraw} disabled={busy !== null}>
                    {busy === 'withdraw' ? '…' : t('requestActions.confirmWithdraw')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Anderen Anbieter finden — nur, wenn dieser nicht reagiert oder
              abgelehnt hat (Befund 6). */}
          {canFindOther && (
            <div className="flex items-start gap-3 rounded-lg border border-elevate/10 bg-elevate/[0.03] p-4">
              <Search size={16} className="mt-0.5 shrink-0 text-fg-brand" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">{t('requestActions.findOtherTitle')}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">{t('requestActions.findOtherDesc')}</p>
              </div>
              <Button size="sm" variant="primary" onClick={() => { onClose(); navigate(`/${locale}/wizard`); }}>{t('requestActions.findOther')}</Button>
            </div>
          )}

          {!actionable && (
            <p className="text-[11px] leading-relaxed text-fg-tertiary">
              {raw === 'expired' ? t('requestActions.expiredNote') : t('requestActions.notActionable')}
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
