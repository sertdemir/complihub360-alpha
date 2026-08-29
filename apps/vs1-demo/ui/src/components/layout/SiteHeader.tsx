import { useLocation } from 'react-router-dom';
import { GlobalNav } from './GlobalNav';
import { MarketingHeader } from './MarketingHeader';
import { supportedLngs } from '../../i18n/config';

// ─── SiteHeader ───────────────────────────────────────────────────────────────
// Route-aware header dispatcher. The landing page gets the in-page anchor-nav
// MarketingHeader; every other route keeps the multi-page GlobalNav. Rendered
// once at the app root in place of GlobalNav so the two never stack into a
// double header.
//   /:locale  → landing page → MarketingHeader
//   else      → GlobalNav
// The provider landing branch went with that page on 2026-08-18.
export function SiteHeader() {
  const { pathname } = useLocation();
  const seg = pathname.split('/').filter(Boolean);
  const localeOk = Boolean(seg[0]) && supportedLngs.includes(seg[0]);

  const locale = localeOk ? seg[0] : 'en';
  const userHref = `/${locale}`;
  const loginHref = `/${locale}/login`;
  const signupHref = `/${locale}/register`;

  if (localeOk && seg.length === 1) {
    return <MarketingHeader userHref={userHref} loginHref={loginHref} signupHref={signupHref} />;
  }
  // The risk-map result and the partner-onboarding wizard carry their own
  // dedicated topbars — no global header.
  if (localeOk && seg.length === 2 && (seg[1] === 'results' || seg[1] === 'partner-onboarding' || seg[1] === 'provider-intake')) {
    return null;
  }
  // Phase-3 funnel pages (stage-2 detail + scheduling) carry their own slim header.
  if (localeOk && seg[1] === 'provider' && seg.length >= 3 && seg[2] !== 'action' && seg[2] !== 'confirm-email') {
    return null;
  }
  // The full-view assessment wizard (Figma 1705:262) ships its own topbar.
  if (localeOk && seg[1] === 'wizard') {
    return null;
  }
  // The new provider App-Workspace pages ship the ProviderShell (own sidebar +
  // topbar, always dark) — no global header on top.
  const PROVIDER_WORKSPACE = ['requests', 'termine', 'performance', 'coverage', 'billing', 'settings', 'notifications', 'help'];
  if (localeOk && seg[1] === 'partner-dashboard' && PROVIDER_WORKSPACE.includes(seg[2])) {
    return null;
  }
  // The user App-Workspace pages (v2, own UserShell) — no global header.
  const USER_WORKSPACE = ['sessions', 'requests', 'termine', 'notifications', 'library', 'saved-providers', 'exports', 'alerts', 'calendar', 'workbench'];
  if (localeOk && seg[1] === 'dashboard' && (seg.length === 2 || USER_WORKSPACE.includes(seg[2]))) {
    return null;
  }
  // Admin Control Center (own AdminShell) — no global header.
  if (localeOk && seg[1] === 'admin') {
    return null;
  }
  // Provider magic-link action page (standalone interstitial) — no header.
  if (localeOk && seg[1] === 'provider' && seg[2] === 'action') {
    return null;
  }
  // Auth flow pages (own dark split shell) — no marketing header on top.
  if (localeOk && seg[1] === 'auth') {
    return null;
  }
  return <GlobalNav />;
}
