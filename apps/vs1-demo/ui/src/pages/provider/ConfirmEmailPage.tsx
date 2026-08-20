import { useEffect, useState } from 'react';
import { useSearchParams, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';

// ─── Public e-mail-change confirmation (wiring map B8) ───────────────────────
// Landing for the verify link. Redeems the token once and reports the result —
// same public dark surface as the magic-link action page.

export function ConfirmEmailPage() {
  const { t } = useTranslation('providerws');
  const [params] = useSearchParams();
  const { locale = 'en' } = useParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) { setState('failed'); return; }
    const base = import.meta.env.VITE_API_URL || '';
    fetch(`${base}/api/v1/provider/confirm-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(import.meta.env.VITE_DEV_API_KEY ? { 'x-api-key': import.meta.env.VITE_DEV_API_KEY as string } : {}),
      },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('invalid');
        const d = await res.json();
        setEmail(d.contact_email || '');
        setState('done');
      })
      .catch(() => setState('failed'));
  }, [token]);

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[#0b1620] px-4">
      <div className="w-full max-w-[440px] rounded-2xl border border-elevate/10 bg-surface p-8 text-center shadow-[0_18px_50px_-12px_rgba(0,0,0,0.65)]">
        <div className="mb-6 flex justify-center"><Logo lockup="horizontal" tone="on-petrol" markClassName="h-9" /></div>
        {state === 'working' && <p className="text-[14px] text-fg-secondary">{t('confirmEmail.working')}</p>}
        {state === 'done' && (
          <>
            <CheckCircle2 size={36} className="mx-auto text-fg-brand" />
            <h1 className="mt-4 font-serif text-[24px] font-bold text-fg">
              {t('confirmEmail.doneTitlePre')}<span className="text-fg-accent">{t('confirmEmail.doneTitleGold')}</span>{t('confirmEmail.doneTitlePost')}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-secondary">
              {t('confirmEmail.doneBody', { email })}
            </p>
            <Link to={`/${locale}/partner-dashboard/settings`} className="mt-6 inline-block rounded-xl bg-brand-accent px-6 py-3 text-[14px] font-bold text-fg-on-accent">
              {t('confirmEmail.backToSettings')}
            </Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <XCircle size={36} className="mx-auto text-error-500" />
            <h1 className="mt-4 font-serif text-[24px] font-bold text-fg">{t('confirmEmail.failedTitle')}</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-secondary">
              {t('confirmEmail.failedBody')}
            </p>
            <Link to={`/${locale}/partner-dashboard/settings`} className="mt-6 inline-block rounded-xl border border-elevate/20 px-6 py-3 text-[14px] font-semibold text-fg">
              {t('confirmEmail.openSettings')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
