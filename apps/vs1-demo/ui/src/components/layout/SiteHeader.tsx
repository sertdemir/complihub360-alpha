import { useLocation } from 'react-router-dom';
import { GlobalNav } from './GlobalNav';
import { MarketingHeader } from './MarketingHeader';
import { supportedLngs } from '../../i18n/config';

// ─── SiteHeader ───────────────────────────────────────────────────────────────
// Route-aware header dispatcher. The marketing one-pagers get the in-page
// anchor-nav MarketingHeader (audience-specific); every other route keeps the
// multi-page GlobalNav. Rendered once at the app root in place of GlobalNav so
// the two never stack into a double header.
//   /:locale            → entrepreneur landing  → MarketingHeader (entrepreneur)
//   /:locale/providers  → provider landing      → MarketingHeader (provider)
//   else                → GlobalNav
export function SiteHeader() {
  const { pathname } = useLocation();
  const seg = pathname.split('/').filter(Boolean);
  const localeOk = Boolean(seg[0]) && supportedLngs.includes(seg[0]);

  const locale = localeOk ? seg[0] : 'en';
  const userHref = `/${locale}`;
  const providerHref = `/${locale}/providers`;
  const loginHref = `/${locale}/login`;

  if (localeOk && seg.length === 1) {
    return <MarketingHeader audience="entrepreneur" userHref={userHref} providerHref={providerHref} loginHref={loginHref} />;
  }
  if (localeOk && seg.length === 2 && seg[1] === 'providers') {
    return <MarketingHeader audience="provider" userHref={userHref} providerHref={providerHref} loginHref={loginHref} />;
  }
  // The risk-map result and the partner-onboarding wizard carry their own
  // dedicated topbars — no global header.
  if (localeOk && seg.length === 2 && (seg[1] === 'results' || seg[1] === 'partner-onboarding')) {
    return null;
  }
  // The full-view assessment wizard (Figma 1705:262) ships its own topbar.
  if (localeOk && seg[1] === 'wizard') {
    return null;
  }
  // The new provider App-Workspace pages ship the ProviderShell (own sidebar +
  // topbar, always dark) — no global header on top.
  const PROVIDER_WORKSPACE = ['requests', 'performance', 'coverage', 'billing', 'settings', 'notifications', 'help'];
  if (localeOk && seg[1] === 'partner-dashboard' && PROVIDER_WORKSPACE.includes(seg[2])) {
    return null;
  }
  // The user App-Workspace pages (v2, own UserShell) — no global header.
  const USER_WORKSPACE = ['sessions', 'requests', 'notifications', 'library', 'saved-providers', 'exports', 'alerts', 'calendar', 'workbench'];
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
