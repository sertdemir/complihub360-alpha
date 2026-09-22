import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { fetchMyProvider } from '../../api/provider';
import type { LifecycleStatus } from '../../api/application';

// ─── Bewerbungsstand ueber dem Workspace ─────────────────────────────────────
// Ersetzt das Onboarding-Modal (localStorage, 2026-08-29) seit Phase 2: der
// Stand kommt aus /me/provider (lifecycle_status), nicht aus dem Browser.
// Solange das Konto nicht aktiv ist, steht ueber jeder Workspace-Seite ein
// Hinweis mit dem naechsten Schritt — sachlich, ohne Countdown. Auf den
// beiden Onboarding-Seiten selbst nicht: dort ist der Stand der Inhalt.

const SHOW: Partial<Record<LifecycleStatus, 'draft' | 'more_info_required' | 'submitted'>> = {
  draft: 'draft', more_info_required: 'more_info_required',
  submitted: 'submitted', under_verification: 'submitted', approved_pending_activation: 'submitted',
};

export function ApplicationStatusBanner() {
  const { t, i18n } = useTranslation('providerws');
  const { pathname } = useLocation();
  const [status, setStatus] = useState<LifecycleStatus | null>(null);
  useEffect(() => { fetchMyProvider().then((m) => setStatus(m.lifecycle_status)).catch(() => {}); }, []);
  if (!status || /partner-dashboard\/(application|verification)/.test(pathname)) return null;
  const kind = SHOW[status];
  if (!kind) return null;
  const base = `/${i18n.resolvedLanguage || 'en'}/partner-dashboard`;
  const target = kind === 'submitted' ? 'verification' : 'application';
  return (
    <Banner status={kind === 'more_info_required' ? 'warning' : 'brand'} className="mb-5" title={t(`shell.applicationBanner.${kind}`)}
      action={<Link to={`${base}/${target}`}><Button size="sm" variant="secondary">{t(`shell.applicationBanner.cta.${target}`)}</Button></Link>} />
  );
}
