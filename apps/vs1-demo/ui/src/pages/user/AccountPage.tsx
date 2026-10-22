import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchMyAgreements, type UserAgreementState } from '../../api/agreements';
import { resetAgreementGate } from '../../lib/agreementGate';
import { BETA_CONTACT_EMAIL } from '../legal/BetaAgreementPage';

// ─── Konto · Nachweis der Beta-Vereinbarung (Canvas-Wahl 3C, 22.10.2026) ─────
// Fassung, Zeitpunkt, Sprache, Volltext, Ausstieg. Der Nachweis gehoert dem
// Nutzer, nicht nur der Datenbank („Remember the relationship"). Ist die
// geltende Fassung noch nicht angenommen, fuehrt die Karte in den Schritt.
// Heute die einzige Karte der Seite; beim Launch kommt die AGB-Annahme dazu.

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-stroke-subtle py-3 last:border-b-0">
      <dt className="w-[120px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{label}</dt>
      <dd className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-fg">{children}</dd>
    </div>
  );
}

export function AccountPage() {
  const { t, i18n } = useTranslation('legal');
  const lang = i18n.resolvedLanguage || 'en';
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'ok'; beta: UserAgreementState | null }>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    fetchMyAgreements(lang)
      .then((m) => { if (alive) setState({ status: 'ok', beta: m.beta ?? null }); })
      .catch(() => { if (alive) setState({ status: 'error' }); });
    return () => { alive = false; };
  }, [lang]);

  const fmt = (iso: string) => new Date(iso).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
  const langName = (code: string | null) => (code ? t(`account.langs.${code}`, { defaultValue: code.toUpperCase() }) : '');
  const signOut = () => { resetAgreementGate(); logout(); navigate(`/${lang}/login`); };

  return (
    <UserShell>
      <h1 className="font-serif text-[22px] font-bold leading-tight text-fg">{t('account.title')}</h1>
      <section className="mt-5 max-w-[560px] rounded-xl border border-stroke bg-surface p-6 shadow-sm" aria-labelledby="beta-agreement-card">
        <h2 id="beta-agreement-card" className="font-serif text-[17px] font-bold text-fg">{t('account.cardTitle')}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{t('account.cardLead')}</p>

        {state.status === 'loading' && <p className="mt-4 text-[13px] text-fg-tertiary" aria-live="polite">{t('account.loading')}</p>}
        {state.status === 'error' && <p role="status" className="mt-4 text-[13px] text-fg-secondary">{t('account.error')}</p>}
        {state.status === 'ok' && (
          <dl className="mt-4">
            <Row label={t('account.version')}>
              {state.beta?.acceptedVersion ? (
                <>
                  <span className="font-medium">{state.beta.acceptedVersion}</span>
                  {state.beta.acceptedVersion === state.beta.currentVersion && (
                    <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-fg-brand">{t('account.current')}</span>
                  )}
                </>
              ) : (
                <span className="text-fg-secondary">{t('account.notAccepted')}</span>
              )}
            </Row>
            <Row label={t('account.acceptedAt')}>
              {state.beta?.acceptedAt ? (
                <span className="font-medium">{fmt(state.beta.acceptedAt)} · {langName(state.beta.language)}</span>
              ) : state.beta?.required ? (
                <Button size="sm" onClick={() => navigate(`/${lang}/beta-agreement?redirect=${encodeURIComponent(`/${lang}/dashboard/account`)}`)}>{t('account.acceptNow')}</Button>
              ) : (
                <span className="text-fg-secondary">—</span>
              )}
            </Row>
            <Row label={t('account.fullText')}>
              <Link to={`/${lang}/terms`} className="font-semibold text-fg-brand underline-offset-2 hover:underline">{t('account.read')} →</Link>
            </Row>
            <Row label={t('account.exit')}>
              <button type="button" onClick={signOut} className="font-semibold text-fg-brand underline-offset-2 hover:underline">{t('account.signOut')} →</button>
              <span className="text-fg-tertiary">·</span>
              <a href={`mailto:${BETA_CONTACT_EMAIL}`} className="font-semibold text-fg-brand underline-offset-2 hover:underline">{t('account.write')} →</a>
            </Row>
          </dl>
        )}
        <p className="mt-4 text-[12px] leading-relaxed text-fg-secondary">{t('account.note')}</p>
      </section>
    </UserShell>
  );
}
