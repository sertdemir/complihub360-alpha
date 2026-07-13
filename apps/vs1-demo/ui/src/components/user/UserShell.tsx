import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import {
  Home, LayoutGrid, FolderClosed, Mail, Bell, BookOpen, Bookmark, Download,
  TriangleAlert, Calendar, Search, LogOut, Landmark, Package, ShieldCheck, Megaphone, Building2, Headset,
} from 'lucide-react';
import { Sidebar, SidebarGroup, NavItem, DomainBar, DomainTab } from '../ui/AppShell';
import { LogoMark } from '../ui/Logo';
import { UserSearchDrawer } from './UserSearchDrawer';
import { fetchUserRequests } from '../../api/requests';
import { fetchNotificationsFeed, USER_NOTIFICATIONS_VIEWER } from '../../api/notifications';

// ─── UserShell ────────────────────────────────────────────────────────────────
// The user App-Workspace frame (always dark slate), mirroring the Figma User
// Dashboard v2 two-axis navigation: slim left sidebar (WORKSPACE / LIBRARY /
// SAVED / MONITORING) + global Domain Bar on top of the content column.
// Nav copy lives in the 'userws' namespace; group/domain identifiers stay
// canonical English (React keys + activeDomain matching).

type SidebarItem = {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number | string }>;
  count?: string;
  exact?: boolean;
};

const SIDEBAR: { group: string; groupKey: string; badgeKey?: string; items: SidebarItem[] }[] = [
  {
    group: 'Workspace',
    groupKey: 'groupWorkspace',
    items: [
      { to: 'dashboard', labelKey: 'navDashboard', icon: LayoutGrid, exact: true },
      { to: 'dashboard/sessions', labelKey: 'navSessions', icon: FolderClosed },
      { to: 'dashboard/requests', labelKey: 'navRequests', icon: Mail },
      { to: 'dashboard/notifications', labelKey: 'navNotifications', icon: Bell },
    ],
  },
  {
    group: 'Library',
    groupKey: 'groupLibrary',
    items: [{ to: 'dashboard/library', labelKey: 'navLibrary', icon: BookOpen }],
  },
  {
    group: 'Saved',
    groupKey: 'groupSaved',
    items: [
      { to: 'dashboard/saved-providers', labelKey: 'navSavedProviders', icon: Bookmark },
      { to: 'dashboard/exports', labelKey: 'navExports', icon: Download },
    ],
  },
  {
    group: 'Monitoring',
    groupKey: 'groupMonitoring',
    badgeKey: 'badgeSoon',
    items: [
      { to: 'dashboard/alerts', labelKey: 'navAlerts', icon: TriangleAlert },
      { to: 'dashboard/calendar', labelKey: 'navCalendar', icon: Calendar },
    ],
  },
];

const DOMAINS = [
  { label: 'Tax & VAT', key: 'taxVat', icon: Landmark, dot: 'high' as const },
  { label: 'Product & Packaging', key: 'productPackaging', icon: Package, dot: 'medium' as const },
  { label: 'Data & Privacy', key: 'dataPrivacy', icon: ShieldCheck, dot: 'medium' as const },
  { label: 'Marketing & SEO', key: 'marketingSeo', icon: Megaphone },
  { label: 'Corporate & Structure', key: 'corporateStructure', icon: Building2 },
  { label: 'Full Support', key: 'fullSupport', icon: Headset },
];

const DOT: Record<'high' | 'medium', string> = { high: 'bg-red-400', medium: 'bg-amber-400' };

export function UserShell({ activeDomain, children }: { activeDomain?: string; children: React.ReactNode }) {
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const location = useLocation();
  // Real session identity when present; the design fixture only as fallback.
  const { userName, user, logout } = useAuthStore();
  const displayName = userName || 'Alex Weber';
  const displaySub = user?.email || 'Acme GmbH';
  const initials = displayName.split(/[\s._-]+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const base = `/${locale}`;
  // B16: workspace search drawer · C1: live sidebar badges (hidden in fixture mode).
  const [searchOpen, setSearchOpen] = useState(false);
  const [counts, setCounts] = useState<{ requests?: number; unread?: number }>({});
  useEffect(() => {
    fetchUserRequests()
      .then((rs) => setCounts((c) => ({ ...c, requests: rs.filter((r) => r.bucket === 'confirm' || r.bucket === 'replied').length })))
      .catch(() => {});
    fetchNotificationsFeed(USER_NOTIFICATIONS_VIEWER)
      .then((f) => setCounts((c) => ({ ...c, unread: f.groups.reduce((n, g) => n + g.items.filter((i) => i.unread).length, 0) })))
      .catch(() => {});
  }, []);
  const badgeFor = (to: string): string | undefined => {
    const n = to === 'dashboard/requests' ? counts.requests : to === 'dashboard/notifications' ? counts.unread : undefined;
    return n ? String(n) : undefined;
  };

  return (
    <div className="dark flex h-screen bg-[#1F2937] text-fg">
      <Sidebar
        logo={
          <NavLink to={`${base}/dashboard`} className="flex items-center gap-2">
            <LogoMark tone="on-petrol" className="h-[22px] w-auto" />
            <span className="text-[15px] font-semibold text-white">CompliHub</span>
          </NavLink>
        }
        footer={
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d4af37] text-[11px] font-bold text-[#101411]">{initials}</span>
              <div className="leading-tight">
                <p className="text-[12px] font-semibold text-fg">{displayName}</p>
                <p className="text-[10px] text-fg-tertiary">{displaySub}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label={t('shell.signOut')}
              title={t('shell.signOut')}
              onClick={async () => { await logout(); window.location.href = `/${locale}/login`; }}
              className="text-fg-tertiary transition-colors hover:text-fg"
            >
              <LogOut size={15} />
            </button>
          </div>
        }
      >
        {SIDEBAR.map((g) => (
          <SidebarGroup key={g.group} label={t(`shell.${g.groupKey}`)} badge={g.badgeKey ? t(`shell.${g.badgeKey}`) : undefined}>
            {g.items.map((it) => {
              const target = `${base}/${it.to}`;
              const active = it.exact
                ? location.pathname === target || location.pathname === `${target}/`
                : location.pathname.startsWith(target);
              const Icon = it.icon;
              return (
                <NavLink key={it.to} to={target}>
                  <NavItem icon={<Icon size={16} />} label={t(`shell.${it.labelKey}`)} count={it.count ?? badgeFor(it.to)} active={active} />
                </NavLink>
              );
            })}
          </SidebarGroup>
        ))}
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        <DomainBar
          home={
            <NavLink to={`${base}/dashboard`} className="grid h-9 w-9 place-items-center rounded-lg text-fg-secondary hover:text-fg">
              <Home size={17} />
            </NavLink>
          }
          trailing={
            <button type="button" aria-label={t('shell.search')} onClick={() => setSearchOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-fg-secondary hover:text-fg">
              <Search size={17} />
            </button>
          }
        >
          {DOMAINS.map((d) => {
            const Icon = d.icon;
            return (
              <DomainTab
                key={d.label}
                icon={<Icon size={15} />}
                label={
                  <span className="inline-flex items-center gap-1.5">
                    {t(`domain.${d.key}`)}
                    {d.dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT[d.dot]}`} />}
                  </span>
                }
                active={activeDomain === d.label}
              />
            );
          })}
        </DomainBar>
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
      <UserSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
