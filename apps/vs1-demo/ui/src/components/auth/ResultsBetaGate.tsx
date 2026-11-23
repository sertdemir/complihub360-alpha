import { type ReactNode, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info, X } from 'lucide-react';
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
    <div role="status" className="border-b border-stroke-brand-soft bg-brand-light">
      <div className="mx-auto flex max-w-[1320px] items-start gap-3 px-6 py-3.5 lg:px-10">
        <Info size={18} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden />
        <div className="min-w-0 flex-1 text-body-xs leading-relaxed text-fg">
          <p className="font-semibold">{t('betaStep.declined.title')}</p>
          <p className="mt-0.5 text-fg-secondary">{t('betaStep.declined.body')}</p>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            <Link to={`/${lang}/terms`} className="font-semibold text-fg-brand underline underline-offset-2">{t('betaStep.declined.read')}</Link>
            <Link to={`/${lang}/login?redirect=${encodeURIComponent(returnTo)}`} className="font-semibold text-fg-brand underline underline-offset-2">{t('betaStep.declined.signIn')}</Link>
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t('betaStep.declined.close')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-fg-secondary hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
