import { type ReactNode, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Banner, BannerLink } from '../ui/Banner';
import { useAuthStore } from '../../store/useAuthStore';
import { useBetaAgreementGate } from '../../lib/agreementGate';

// ─── Beta-Vereinbarung vor der Risk Map (Variantenwahl 1A + 3B, 23.11.2026) ──
// /results ist oeffentlich: der Gast sieht seine Risk Map ohne Konto. Wer aber
// ueber die Schublade ein Konto anlegt, kommt per Mail-Link EINGELOGGT hierher
// zurueck und konnte buchen, merken und Antworten bearbeiten, ohne das Blatt
// gesehen zu haben — der AuthGuard sitzt nur vor dem Workspace. Diese Huelle
// schliesst die Luecke an einer Stelle: eingeloggt und ohne geltende Annahme
// fuehrt der Weg zuerst ueber den Schritt, danach zurueck hierher.
//
// Der Gast bleibt unberuehrt. Anbieter und Admins haben kein Blatt (4C).
// Das Gate faellt bei einem Ausfall offen aus (agreementGate.ts); die Buchung
// prueft der Server noch einmal (409 AGREEMENT_REQUIRED).

/** Merkt, dass der Nutzer im Schritt abgelehnt hat — fuer den Hinweis danach. */
const DECLINED_KEY = 'ch360_beta_declined';
/** Derselbe Schluessel, aus dem ResultsRiskMap das Profil liest. */
const PROFILE_KEY = 'ch360_last_profile';

export function markBetaDeclined(): void {
  try { sessionStorage.setItem(DECLINED_KEY, '1'); } catch { /* kein Speicher: kein Hinweis */ }
}

function readDeclined(): boolean {
  try { return sessionStorage.getItem(DECLINED_KEY) === '1'; } catch { return false; }
}

function clearDeclined(): void {
  try { sessionStorage.removeItem(DECLINED_KEY); } catch { /* nichts zu tun */ }
}

/** Der Wizard reicht das Profil nur im Router-State weiter. Geht der Weg erst
 *  ueber den Schritt, waere es danach weg — also vorher ablegen. */
function keepProfile(state: unknown): void {
  const profile = (state as { searchProfile?: unknown } | null)?.searchProfile;
  if (!profile) return;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* kein Speicher */ }
}

export function ResultsBetaGate({ children }: { children: ReactNode }) {
  const { isLoggedIn, role, loading } = useAuthStore();
  const { locale } = useParams();
  const location = useLocation();
  const lang = locale || 'en';
  const asUser = !loading && isLoggedIn && (role === null || role === 'user');
  const gate = useBetaAgreementGate(asUser, lang);

  if (asUser && gate === 'loading') return <div className="min-h-screen bg-surface" aria-busy="true" />;
  if (asUser && gate === 'required') {
    keepProfile(location.state);
    return <Navigate to={`/${lang}/beta-agreement?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <>
      {!loading && !isLoggedIn && <DeclinedNotice lang={lang} returnTo={location.pathname} />}
      {children}
    </>
  );
}

/** 3B: Wer ablehnt, behaelt seine Karte und erfaehrt, was das heisst. Ruhiger
 *  Hinweis, kein Alarm: dem Nutzer ist nichts passiert. */
function DeclinedNotice({ lang, returnTo }: { lang: string; returnTo: string }) {
  const { t } = useTranslation('legal');
  const [show, setShow] = useState(readDeclined);
  if (!show) return null;
  const close = () => { clearDeclined(); setShow(false); };
  return (
    <Banner
      status="brand"
      variant="strip"
      title={t('betaStep.declined.title')}
      innerClassName="mx-auto max-w-[1320px] px-6 lg:px-10"
      onClose={close}
      closeLabel={t('betaStep.declined.close')}
      actions={
        <>
          <BannerLink as={Link} to={`/${lang}/terms`}>{t('betaStep.declined.read')}</BannerLink>
          <BannerLink as={Link} to={`/${lang}/login?redirect=${encodeURIComponent(returnTo)}`}>{t('betaStep.declined.signIn')}</BannerLink>
        </>
      }
    >
      {t('betaStep.declined.body')}
    </Banner>
  );
}
