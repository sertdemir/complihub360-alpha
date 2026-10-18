import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailCheck } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { apiFetch, referenceOf } from '../../api/client';
import { FieldError, errorAria } from '../ui/FieldError';
import { FailureNote } from '../ui/FailureNote';
import { errorCodeOf, errorFieldOf } from '../../lib/serverErrors';
import { myProviderKey } from '../../api/provider';

// ─── Change-Email drawer (Figma 2652:234 · wiring map B8) ────────────────────
// Verify-first: a single-use link (1h) goes to the NEW address; the change
// applies only after the click. The current address stays active until then.
//
// Punkt 2 (Wahl E1 · C3, 17.10.2026; Figma 3780:27181): kein Server-Text mehr.
// Gleiche Adresse (SAME_ADDRESS) und ungueltige Adresse stehen am Feld; alles
// andere als Hinweis ueber den Knoepfen, der Hauptknopf heisst „Try Again“.

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
  // Ein echter Sendefehler: nur die Referenz, der Text kommt aus den Keys.
  const [failed, setFailed] = useState<{ reference: { id: string; at: string } | null } | null>(null);
  // V2 (11.10.2026): ein Feld — der Knopf bleibt aktiv, das Absenden prueft,
  // der Satz steht am Feld (role="alert") und der Fokus geht hinein.
  const [emailError, setEmailError] = useState<null | 'invalid' | 'same'>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEmail(''); setBusy(false); setSent(false); setFailed(null); setEmailError(null); }, [open]);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const submit = async () => {
    if (busy) return;
    if (!valid) { setEmailError('invalid'); inputRef.current?.focus(); return; }
    setBusy(true); setFailed(null); setEmailError(null);
    try {
      await apiFetch(`/api/v1/provider/${await myProviderKey()}/change-email`, {
        method: 'POST',
        body: JSON.stringify({ new_email: email.trim() }),
      });
      setSent(true);
    } catch (e) {
      // Bemaengelt der Server die Adresse, steht das am Feld; alles andere
      // ueber den Knoepfen — nie der Server-Text.
      if (errorFieldOf(e) === 'new_email') { setEmailError('invalid'); inputRef.current?.focus(); }
      else if (errorCodeOf(e) === 'SAME_ADDRESS') { setEmailError('same'); inputRef.current?.focus(); }
      else setFailed({ reference: referenceOf(e) });
    }
    setBusy(false);
  };

  return (
    <Drawer
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
          <div className="w-full space-y-3">
            {failed && <FailureNote heading={t('changeEmail.sendFailed.heading')} message={t('changeEmail.sendFailed.message')} reference={failed.reference} />}
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>{t('changeEmail.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
                {busy ? '…' : failed ? t('common:states.actions.tryAgain') : t('changeEmail.sendVerification')}
              </Button>
            </div>
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
          <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{t('changeEmail.currentAddress')}</p>
            <p className="mt-0.5 text-[13px] font-medium text-fg">{currentEmail}</p>
          </div>
          <div>
            <label htmlFor="change-email-new" className="mb-1.5 block text-[11px] text-fg-tertiary">{t('changeEmail.newAddress')}</label>
            <input
              id="change-email-new"
              ref={inputRef}
              type="email"
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
              placeholder="new-address@yourfirm.com"
              {...errorAria('change-email-new', !!emailError)}
              className={'w-full rounded-lg border px-3 py-2.5 text-[13px] text-fg outline-none placeholder:text-fg-tertiary focus:border-fg-brand '
                + (emailError ? 'border-error-500 bg-error-bg dark:bg-red-500/10' : 'border-elevate/10 bg-elevate/5')}
            />
            <FieldError id="change-email-new" alert message={emailError === 'same' ? t('changeEmail.sameAddress') : emailError ? t('common:contactSend.field.email') : null} className="mt-1.5" />
          </div>
          <p className="text-[11px] leading-relaxed text-fg-tertiary">
            {t('changeEmail.notePrefix')}<span className="font-medium text-fg-secondary">{t('changeEmail.noteNew')}</span>{t('changeEmail.noteSuffix')}
          </p>
        </div>
      )}
    </Drawer>
  );
}
