import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailCheck } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { apiFetch } from '../../api/client';
import { DEMO_PROVIDER_KEY } from '../../api/provider';

// ─── Change-Email drawer (Figma 2652:234 · wiring map B8) ────────────────────
// Verify-first: a single-use link (1h) goes to the NEW address; the change
// applies only after the click. The current address stays active until then.

interface ChangeEmailDrawerProps {
  open: boolean;
  currentEmail: string;
  onClose: () => void;
}

export function ChangeEmailDrawer({ open, currentEmail, onClose }: ChangeEmailDrawerProps) {
  const { t } = useTranslation('providerws');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setEmail(''); setBusy(false); setSent(false); setError(''); }, [open]);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await apiFetch(`/api/v1/provider/${DEMO_PROVIDER_KEY}/change-email`, {
        method: 'POST',
        body: JSON.stringify({ new_email: email.trim() }),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('changeEmail.errorFallback'));
    }
    setBusy(false);
  };

  return (
    <Drawer
      forceDark
      open={open}
      onClose={onClose}
      side="right"
      size="sm"
      eyebrow={t('changeEmail.eyebrow')}
      title={t('changeEmail.title')}
      footer={
        sent ? (
          <Button variant="primary" size="sm" className="ml-auto" onClick={onClose}>{t('changeEmail.done')}</Button>
        ) : (
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>{t('changeEmail.cancel')}</Button>
            <Button variant="accent" size="sm" onClick={submit} disabled={!valid || busy}>
              {busy ? '…' : t('changeEmail.sendVerification')}
            </Button>
          </div>
        )
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-fg-brand/30 bg-fg-brand/10 px-4 py-3.5">
            <MailCheck size={16} className="mt-0.5 shrink-0 text-fg-brand" />
            <p className="text-[13px] leading-relaxed text-fg-secondary">
              {t('changeEmail.sentPrefix')}<span className="font-semibold text-fg">{email.trim()}</span>{t('changeEmail.sentSuffix')}
            </p>
          </div>
          <p className="text-[11px] leading-relaxed text-fg-tertiary">
            {t('changeEmail.untilThenPrefix')}<span className="text-fg-secondary">{currentEmail}</span>{t('changeEmail.untilThenSuffix')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{t('changeEmail.currentAddress')}</p>
            <p className="mt-0.5 text-[13px] font-medium text-fg">{currentEmail}</p>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] text-fg-tertiary">{t('changeEmail.newAddress')}</p>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new-address@yourfirm.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] text-fg outline-none placeholder:text-fg-tertiary focus:border-fg-brand"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-fg-tertiary">
            {t('changeEmail.notePrefix')}<span className="font-medium text-fg-secondary">{t('changeEmail.noteNew')}</span>{t('changeEmail.noteSuffix')}
          </p>
          {error && <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">{error}</p>}
        </div>
      )}
    </Drawer>
  );
}
