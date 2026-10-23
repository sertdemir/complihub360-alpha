import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchAgreement, type UserAgreement } from '../../api/agreements';
import { LegalShell, Section } from './LegalPages';

// ─── Beta-Vereinbarung unter /terms (Canvas-Wahl 1A + 3A, 22.10.2026) ────────
// In der geschlossenen Beta ersetzt das Blatt in neun Saetzen die AGB-Seite;
// der Footer-Link heisst „Beta-Vereinbarung". Der Text kommt vom Server
// (user_agreements), versioniert und in der Sprache des Besuchers; nichts
// davon steht im Code. Die AGB-Entwurfsseite (TermsPage) bleibt fuer den
// Launch erhalten, ist bis dahin aber nicht verlinkt.

export const BETA_CONTACT_EMAIL = 'demet@complihub360.com';

export function BetaAgreementPage() {
  const { locale } = useParams();
  const { t, i18n } = useTranslation('legal');
  const lang = locale || i18n.resolvedLanguage || 'en';
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'ok'; agreement: UserAgreement }>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    fetchAgreement('beta', lang)
      .then((agreement) => { if (alive) setState({ status: 'ok', agreement }); })
      .catch(() => { if (alive) setState({ status: 'error' }); });
    return () => { alive = false; };
  }, [lang, attempt]);

  const title = state.status === 'ok' ? state.agreement.title : t('beta.eyebrow');
  const updated = state.status === 'ok' ? t('beta.meta', { version: state.agreement.version }) : '';

  return (
    <LegalShell title={title} updated={updated}>
      <p className="text-[15px] leading-relaxed text-fg-secondary">{t('beta.lede')}</p>

      {state.status === 'loading' && <p className="text-[13px] text-fg-tertiary" aria-live="polite">{t('beta.loading')}</p>}
      {state.status === 'error' && (
        <div role="status" className="rounded-lg border border-stroke bg-surface px-4 py-3 text-[14px] text-fg-secondary">
          <p>{t('beta.error')}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setAttempt((n) => n + 1)}>{t('beta.retry')}</Button>
        </div>
      )}
      {state.status === 'ok' && (
        <ol className="space-y-10" aria-label={state.agreement.title}>
          {state.agreement.points.map((p, i) => (
            <li key={i}>
              <Section heading={`${String(i + 1).padStart(2, '0')} · ${p.lead}`}>
                <p>{p.text}</p>
              </Section>
            </li>
          ))}
        </ol>
      )}

      <Section heading={t('beta.contactHeading')}>
        <p>
          {t('beta.contact', { email: '' }).replace(/\s+\.\s*/, ' ')}
        </p>
        <p>
          <a href={`mailto:${BETA_CONTACT_EMAIL}`} className="text-fg-brand underline">{BETA_CONTACT_EMAIL}</a>
        </p>
        {isLoggedIn && (
          <p>
            <Link to={`/${lang}/dashboard`} className="text-fg-brand underline">{t('beta.back')}</Link>
          </p>
        )}
      </Section>
    </LegalShell>
  );
}
